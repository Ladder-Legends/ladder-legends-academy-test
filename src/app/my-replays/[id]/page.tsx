/**
 * Replay Detail Page
 * Comprehensive analysis of a single replay
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Trophy,
  Target,
  TrendingUp,
  Clock,
  Map,
  Swords,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import type { UserReplayData, TimingComparison, ReplayFingerprint } from '@/lib/replay-types';

// Helper function to calculate top issues
interface Issue {
  description: string;
  pointsLost: number;
  tip: string;
  severity: 'critical' | 'warning' | 'info';
}

function calculateTopIssues(replay: UserReplayData): Issue[] {
  const issues: Issue[] = [];
  const { fingerprint, comparison } = replay;
  const economy = fingerprint.economy;

  // Supply block penalties (updated thresholds: <10s minor, 10-30s warning, 30s+ problem)
  if (economy.supply_block_categorization) {
    const { problem_count, problem_time, warning_count, warning_time } = economy.supply_block_categorization;

    if (problem_count > 0) {
      issues.push({
        description: `${problem_count} severe supply block${problem_count > 1 ? 's' : ''} (30s+ each)`,
        pointsLost: Math.round(problem_count * 15 + problem_time / 5),
        tip: 'Set a timer reminder every 30 seconds to check supply. Build depots at 75% supply.',
        severity: 'critical',
      });
    }

    if (warning_count > 0) {
      issues.push({
        description: `${warning_count} moderate supply block${warning_count > 1 ? 's' : ''} (10-30s each)`,
        pointsLost: Math.round(warning_count * 8 + warning_time / 10),
        tip: 'Practice building supply depots earlier. Aim for depots at 15, 23, 31, 39 supply.',
        severity: 'warning',
      });
    }
  }

  // Worker count deficits vs benchmarks
  if (economy.workers_3min !== null && economy.workers_3min < 12) {
    const deficit = 12 - economy.workers_3min;
    issues.push({
      description: `${deficit} workers below benchmark at 3min`,
      pointsLost: deficit * 3,
      tip: 'Continuous SCV production is critical. Never stop making workers early game.',
      severity: 'critical',
    });
  }

  if (economy.workers_5min !== null && economy.workers_5min < 29) {
    const deficit = 29 - economy.workers_5min;
    issues.push({
      description: `${deficit} workers below benchmark at 5min`,
      pointsLost: Math.round(deficit * 2),
      tip: 'Set a 5-minute alarm to check worker count. You should have ~29 workers.',
      severity: 'critical',
    });
  }

  if (economy.workers_7min !== null && economy.workers_7min < 48) {
    const deficit = 48 - economy.workers_7min;
    issues.push({
      description: `${deficit} workers below benchmark at 7min`,
      pointsLost: deficit,
      tip: 'Keep building workers until 7 minutes. Target: 48 workers on 3 bases.',
      severity: 'warning',
    });
  }

  // Late key timings
  if (comparison) {
    Object.entries(comparison.timing_comparison).forEach(([key, timing]) => {
      const absDeviation = Math.abs(timing.deviation);
      if (absDeviation > 15 && timing.deviation > 0) {
        issues.push({
          description: `${key.replace(/_/g, ' ')} was ${Math.round(absDeviation)}s late`,
          pointsLost: Math.round(absDeviation / 2),
          tip: `Review the ${key.replace(/_/g, ' ')} timing in the build guide. Practice until consistent.`,
          severity: absDeviation > 30 ? 'critical' : 'warning',
        });
      }
    });
  }

  // High resource float
  const avgMineralFloat = economy['avg_mineral_float_5min+'] || 0;
  const avgGasFloat = economy['avg_gas_float_5min+'] || 0;
  const totalFloat = avgMineralFloat + avgGasFloat;

  if (totalFloat > 2500) {
    issues.push({
      description: `High average resource float (${Math.round(totalFloat)} resources)`,
      pointsLost: Math.round((totalFloat - 2000) / 200),
      tip: 'Build more production facilities or expand faster to spend your resources.',
      severity: 'warning',
    });
  }

  // Sort by points lost (descending) and return top 3
  return issues
    .sort((a, b) => b.pointsLost - a.pointsLost)
    .slice(0, 3);
}

export default function ReplayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [replay, setReplay] = useState<UserReplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Active tab state with URL sync
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'overview');

  // Selected player for viewing fingerprint (null = use legacy fingerprint)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const replayId = params.id as string;

  // Sync tab changes to URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newUrl = `/my-replays/${replayId}?tab=${value}`;
    router.push(newUrl, { scroll: false });
  };

  useEffect(() => {
    if (status === 'authenticated' && replayId) {
      fetchReplay();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, replayId]);

  // Set initial selected player when replay loads
  useEffect(() => {
    if (replay) {
      // If we have player_fingerprints, default to suggested_player
      if (replay.player_fingerprints && Object.keys(replay.player_fingerprints).length > 0) {
        const initialPlayer = replay.suggested_player || Object.keys(replay.player_fingerprints)[0];
        setSelectedPlayer(initialPlayer);
      }
    }
  }, [replay]);

  const fetchReplay = async () => {
    try {
      const response = await fetch('/api/my-replays');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch replay');
      }

      const foundReplay = data.replays.find((r: UserReplayData) => r.id === replayId);

      if (!foundReplay) {
        setError('Replay not found');
      } else {
        setReplay(foundReplay);
      }
    } catch (err) {
      console.error('Error fetching replay:', err);
      setError(err instanceof Error ? err.message : 'Failed to load replay');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>Please sign in to view replays.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error || !replay) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Replay not found'}</AlertDescription>
        </Alert>
        <Link href="/my-replays" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Replays
          </Button>
        </Link>
      </div>
    );
  }

  // Get the active fingerprint - either selected player's or legacy
  const getActiveFingerprint = (): ReplayFingerprint => {
    if (selectedPlayer && replay.player_fingerprints && replay.player_fingerprints[selectedPlayer]) {
      return replay.player_fingerprints[selectedPlayer];
    }
    return replay.fingerprint;
  };

  const fingerprint = getActiveFingerprint();
  const { detection, comparison } = replay;
  const result = fingerprint.metadata.result;

  // Get all available players from player_fingerprints
  const availablePlayers = replay.player_fingerprints
    ? Object.keys(replay.player_fingerprints)
    : [];
  const hasMultiplePlayers = availablePlayers.length > 1;

  // Recalculate issues based on active fingerprint
  const topIssues = calculateTopIssues({
    ...replay,
    fingerprint: fingerprint,
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Back Button */}
      <Link href="/my-replays" className="inline-block mb-6">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Replays
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{replay.filename}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={result === 'Win' ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                {result}
              </Badge>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {fingerprint.matchup}
              </Badge>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {fingerprint.race}
              </Badge>
            </div>
          </div>
        </div>

        {/* Detailed Game Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Map</div>
                <div className="font-medium">{fingerprint.metadata.map}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Duration</div>
                <div className="font-medium">
                  {fingerprint.metadata.duration
                    ? `${Math.floor(fingerprint.metadata.duration / 60)}:${String(Math.floor(fingerprint.metadata.duration % 60)).padStart(2, '0')}`
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Game Date</div>
                <div className="font-medium">{fingerprint.metadata.game_date ? new Date(fingerprint.metadata.game_date).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Uploaded</div>
                <div className="font-medium">{new Date(replay.uploaded_at).toLocaleDateString()}</div>
              </div>
            </div>
            {/* Player Selection - show when we have fingerprints for multiple players */}
            {hasMultiplePlayers && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground mb-2">
                  Select Player to View Stats
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availablePlayers.map((playerName) => {
                    const playerFingerprint = replay.player_fingerprints![playerName];
                    const isSelected = selectedPlayer === playerName;
                    const isSuggested = replay.suggested_player === playerName;
                    const playerInfo = playerFingerprint?.all_players?.find(p => p.name === playerName);

                    return (
                      <button
                        key={playerName}
                        onClick={() => setSelectedPlayer(playerName)}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-transparent bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{playerName}</span>
                          {playerInfo?.race && (
                            <Badge variant="outline" className="text-xs">{playerInfo.race}</Badge>
                          )}
                          {isSuggested && (
                            <Badge variant="default" className="text-xs bg-orange-500">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {playerInfo?.mmr && <span className="text-muted-foreground">MMR: {playerInfo.mmr}</span>}
                          {playerInfo?.apm && <span className="text-muted-foreground">APM: {playerInfo.apm}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback: Show all players from fingerprint when no player_fingerprints */}
            {!hasMultiplePlayers && fingerprint.all_players && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground mb-2">Players</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fingerprint.all_players
                    .filter(p => !p.is_observer)
                    .map((player, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.name}</span>
                          <Badge variant="outline" className="text-xs">{player.race}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {player.mmr && <span className="text-muted-foreground">MMR: {player.mmr}</span>}
                          {player.apm && <span className="text-muted-foreground">APM: {player.apm}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hero Section */}
      {comparison && (
        <div className="mb-8">
          {/* Execution Score Card */}
          <Card className="border-2 cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => handleTabChange('production')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Execution Score
              </CardTitle>
              <CardDescription>vs {comparison.build_name}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-7xl font-bold mb-4">
                {Math.round(comparison.execution_score)}%
              </div>
              <Badge
                className="text-2xl px-6 py-2 mb-4"
                variant={
                  comparison.tier === 'S' || comparison.tier === 'A' ? 'default' : 'secondary'
                }
              >
                {comparison.tier}-Tier
              </Badge>
              <Progress value={comparison.execution_score} className="h-4 mb-3" />
              <p className="text-sm text-muted-foreground">
                {comparison.tier === 'S' && 'Outstanding execution!'}
                {comparison.tier === 'A' && 'Great execution!'}
                {comparison.tier === 'B' && 'Good execution'}
                {comparison.tier === 'C' && 'Room for improvement'}
                {comparison.tier === 'D' && 'Needs work'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="vision" className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">Vision</TabsTrigger>
          <TabsTrigger value="production" className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">Production</TabsTrigger>
          <TabsTrigger value="supply" className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">Supply</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Build Detection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6" />
                Build Detection
              </CardTitle>
              <CardDescription>Identified build order from your replay</CardDescription>
            </CardHeader>
            <CardContent>
              {detection ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{detection.build_name}</h3>
                      <p className="text-sm text-muted-foreground">Detected Build Order</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-primary">{Math.round(detection.confidence)}%</div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                    </div>
                  </div>
                  <Progress value={detection.confidence} className="h-3" />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-semibold text-muted-foreground">No Build Detected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build detection requires a clear opening sequence
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 3 Critical Issues Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                Top Issues to Fix
              </CardTitle>
              <CardDescription>Focus on these for maximum improvement</CardDescription>
            </CardHeader>
            <CardContent>
              {topIssues.length > 0 ? (
                <div className="space-y-4">
                  {topIssues.map((issue, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        issue.severity === 'critical'
                          ? 'bg-red-50 dark:bg-red-950/20 border-red-500'
                          : 'bg-orange-50 dark:bg-orange-950/20 border-orange-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle
                          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            issue.severity === 'critical' ? 'text-red-500' : 'text-orange-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm">{issue.description}</p>
                            <Badge
                              variant="outline"
                              className={
                                issue.severity === 'critical'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300'
                                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300'
                              }
                            >
                              -{issue.pointsLost} pts
                            </Badge>
                          </div>
                          <div className="flex items-start gap-2 mt-2">
                            <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">{issue.tip}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    Excellent execution!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No major issues detected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          {comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
                <CardDescription>Detailed execution quality metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Timing Accuracy */}
                {(() => {
                  const deviations = Object.values(comparison.timing_comparison).map(t => Math.abs(t.deviation));
                  const avgDeviation = deviations.length > 0
                    ? deviations.reduce((a, b) => a + b, 0) / deviations.length
                    : 0;
                  const grade = avgDeviation <= 5 ? 'A' : avgDeviation <= 10 ? 'B' : avgDeviation <= 20 ? 'C' : 'D';
                  const gradeColor = grade === 'A' ? 'text-green-600 dark:text-green-400' :
                                    grade === 'B' ? 'text-yellow-600 dark:text-yellow-400' :
                                    grade === 'C' ? 'text-orange-600 dark:text-orange-400' :
                                    'text-red-600 dark:text-red-400';

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Timing Accuracy</span>
                        <Badge variant="outline" className={gradeColor}>
                          Grade {grade}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ±{Math.round(avgDeviation)}s average deviation
                      </div>
                      <Progress
                        value={Math.max(0, 100 - (avgDeviation * 4))}
                        className="h-2"
                      />
                    </div>
                  );
                })()}

                {/* Macro Score */}
                {(() => {
                  let macroScore = 100;
                  const penalties: string[] = [];

                  // Worker benchmark penalties
                  const economy = fingerprint.economy;
                  if (economy.workers_3min !== null && economy.workers_3min < 10) {
                    const penalty = (10 - economy.workers_3min) * 2;
                    macroScore -= penalty;
                    penalties.push(`Low workers at 3min (-${penalty})`);
                  }
                  if (economy.workers_5min !== null && economy.workers_5min < 23) {
                    const penalty = (23 - economy.workers_5min) * 1.5;
                    macroScore -= penalty;
                    penalties.push(`Low workers at 5min (-${Math.round(penalty)})`);
                  }
                  if (economy.workers_7min !== null && economy.workers_7min < 44) {
                    const penalty = (44 - economy.workers_7min);
                    macroScore -= penalty;
                    penalties.push(`Low workers at 7min (-${Math.round(penalty)})`);
                  }

                  // Supply block penalties
                  if (economy.supply_block_count !== undefined) {
                    const penalty = economy.supply_block_count * 5;
                    macroScore -= penalty;
                    if (penalty > 0) penalties.push(`Supply blocks (-${penalty})`);
                  }
                  if (economy.total_supply_block_time !== undefined) {
                    const penalty = Math.floor(economy.total_supply_block_time / 10);
                    macroScore -= penalty;
                    if (penalty > 0) penalties.push(`Supply block time (-${penalty})`);
                  }

                  // Resource float penalties (high float = bad)
                  const avgFloat = (economy['avg_mineral_float_5min+'] || 0) + (economy['avg_gas_float_5min+'] || 0);
                  if (avgFloat > 2000) {
                    const penalty = Math.floor((avgFloat - 2000) / 100);
                    macroScore -= penalty;
                    penalties.push(`High resource float (-${penalty})`);
                  }

                  macroScore = Math.max(0, Math.min(100, macroScore));
                  const grade = macroScore >= 90 ? 'A+' : macroScore >= 85 ? 'A' :
                               macroScore >= 80 ? 'B+' : macroScore >= 75 ? 'B' :
                               macroScore >= 70 ? 'C+' : macroScore >= 65 ? 'C' : 'D';
                  const gradeColor = macroScore >= 85 ? 'text-green-600 dark:text-green-400' :
                                    macroScore >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                                    macroScore >= 65 ? 'text-orange-600 dark:text-orange-400' :
                                    'text-red-600 dark:text-red-400';

                  return (
                    <div className="space-y-2 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Macro Score</span>
                        <Badge variant="outline" className={gradeColor}>
                          {grade} ({Math.round(macroScore)}/100)
                        </Badge>
                      </div>
                      {penalties.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {penalties.slice(0, 2).join(', ')}
                          {penalties.length > 2 && ` +${penalties.length - 2} more`}
                        </div>
                      )}
                      <Progress value={macroScore} className="h-2" />
                    </div>
                  );
                })()}

                {/* Production Efficiency */}
                {comparison.production_comparison && (() => {
                  let totalUnits = 0;
                  let onTargetUnits = 0;

                  Object.values(comparison.production_comparison).forEach(minute => {
                    Object.values(minute).forEach(comp => {
                      totalUnits++;
                      // Consider "on target" if within 2 units
                      if (Math.abs(comp.difference) <= 2) {
                        onTargetUnits++;
                      }
                    });
                  });

                  const efficiency = totalUnits > 0 ? (onTargetUnits / totalUnits) * 100 : 0;
                  const grade = efficiency >= 90 ? 'A' : efficiency >= 80 ? 'B' :
                               efficiency >= 70 ? 'C' : 'D';
                  const gradeColor = efficiency >= 80 ? 'text-green-600 dark:text-green-400' :
                                    efficiency >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400';

                  return (
                    <div className="space-y-2 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Production Efficiency</span>
                        <Badge variant="outline" className={gradeColor}>
                          {Math.round(efficiency)}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {onTargetUnits} of {totalUnits} unit benchmarks hit
                      </div>
                      <Progress value={efficiency} className="h-2" />
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Supply - Worker counts, supply blocks, resources */}
        <TabsContent value="supply" className="space-y-6 mt-6">
          {fingerprint.economy && (
            <>
              {/* Worker Counts */}
              <Card>
                <CardHeader>
                  <CardTitle>Worker Counts</CardTitle>
                  <CardDescription>Track your worker production vs benchmarks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">3 min:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fingerprint.economy.workers_3min ?? 'N/A'}</span>
                        {fingerprint.economy.workers_3min !== null && fingerprint.economy.workers_3min !== undefined && (
                          <span className={`text-xs ${fingerprint.economy.workers_3min >= 12 ? 'text-green-500' : 'text-orange-500'}`}>
                            ({fingerprint.economy.workers_3min >= 12 ? '+' : ''}{fingerprint.economy.workers_3min - 12} vs benchmark)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">5 min:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fingerprint.economy.workers_5min ?? 'N/A'}</span>
                        {fingerprint.economy.workers_5min !== null && fingerprint.economy.workers_5min !== undefined && (
                          <span className={`text-xs ${fingerprint.economy.workers_5min >= 29 ? 'text-green-500' : 'text-orange-500'}`}>
                            ({fingerprint.economy.workers_5min >= 29 ? '+' : ''}{fingerprint.economy.workers_5min - 29} vs benchmark)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">7 min:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fingerprint.economy.workers_7min ?? 'N/A'}</span>
                        {fingerprint.economy.workers_7min !== null && fingerprint.economy.workers_7min !== undefined && (
                          <span className={`text-xs ${fingerprint.economy.workers_7min >= 48 ? 'text-green-500' : 'text-orange-500'}`}>
                            ({fingerprint.economy.workers_7min >= 48 ? '+' : ''}{fingerprint.economy.workers_7min - 48} vs benchmark)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Target benchmarks for standard macro builds
                  </p>
                </CardContent>
              </Card>

              {/* Supply Blocks with Timeline */}
              {fingerprint.economy.supply_block_count !== undefined && (
                <Card className="cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => handleTabChange('supply')}>
                  <CardHeader>
                    <CardTitle>Supply Blocks</CardTitle>
                    <CardDescription>
                      {fingerprint.economy.supply_block_count === 0
                        ? 'Perfect! No supply blocks detected'
                        : `${fingerprint.economy.supply_block_count} supply block${fingerprint.economy.supply_block_count > 1 ? 's' : ''} detected`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Blocks</span>
                      <Badge variant={fingerprint.economy.supply_block_count === 0 ? 'default' : 'destructive'}>
                        {fingerprint.economy.supply_block_count}
                      </Badge>
                    </div>

                    {/* Severity Breakdown */}
                    {fingerprint.economy.supply_block_categorization && (
                      <div className="space-y-2 mb-2">
                        {fingerprint.economy.supply_block_categorization.minor_count > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                              <span className="text-muted-foreground">Minor (&lt;10s)</span>
                            </div>
                            <span className="font-medium">{fingerprint.economy.supply_block_categorization.minor_count} ({Math.round(fingerprint.economy.supply_block_categorization.minor_time)}s)</span>
                          </div>
                        )}
                        {fingerprint.economy.supply_block_categorization.warning_count > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-orange-500 rounded-full" />
                              <span className="text-muted-foreground">Warning (10-30s)</span>
                            </div>
                            <span className="font-medium">{fingerprint.economy.supply_block_categorization.warning_count} ({Math.round(fingerprint.economy.supply_block_categorization.warning_time)}s)</span>
                          </div>
                        )}
                        {fingerprint.economy.supply_block_categorization.problem_count > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                              <span className="text-muted-foreground">Problem (30s+)</span>
                            </div>
                            <span className="font-medium text-destructive">{fingerprint.economy.supply_block_categorization.problem_count} ({Math.round(fingerprint.economy.supply_block_categorization.problem_time)}s)</span>
                          </div>
                        )}
                      </div>
                    )}

                    {fingerprint.economy.total_supply_block_time !== undefined && fingerprint.economy.total_supply_block_time > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Total block time: {Math.round(fingerprint.economy.total_supply_block_time)}s
                      </p>
                    )}

                    {/* Supply Block Timeline */}
                    {fingerprint.economy.supply_block_periods && fingerprint.economy.supply_block_periods.length > 0 && fingerprint.metadata.duration && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-3">Supply Block Timeline</p>
                        <div className="relative h-16 bg-muted/20 rounded-lg border">
                          {/* Time markers */}
                          <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 pb-1 text-[10px] text-muted-foreground">
                            <span>0:00</span>
                            {[3, 6, 9, 12].map(minute => {
                              const seconds = minute * 60;
                              if (seconds < fingerprint.metadata.duration!) {
                                return (
                                  <span key={minute}>
                                    {minute}:00
                                  </span>
                                );
                              }
                              return null;
                            })}
                            <span>
                              {Math.floor(fingerprint.metadata.duration / 60)}:
                              {String(Math.floor(fingerprint.metadata.duration % 60)).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Supply block bars */}
                          <div className="absolute inset-0 pb-4 pointer-events-none">
                            {fingerprint.economy.supply_block_periods.map((block, index) => {
                              const startPercent = (block.start / fingerprint.metadata.duration!) * 100;
                              const widthPercent = (block.duration / fingerprint.metadata.duration!) * 100;

                              const color = block.severity === 'problem'
                                ? 'bg-red-500'
                                : block.severity === 'warning'
                                ? 'bg-orange-500'
                                : 'bg-yellow-500';

                              const startMin = Math.floor(block.start / 60);
                              const startSec = Math.floor(block.start % 60);
                              const endMin = Math.floor(block.end / 60);
                              const endSec = Math.floor(block.end % 60);

                              return (
                                <div
                                  key={index}
                                  className={`h-8 ${color} opacity-80 hover:opacity-100 transition-opacity cursor-help rounded-sm border-l-2 border-r-2 border-white/40 pointer-events-auto`}
                                  style={{
                                    position: 'absolute',
                                    left: `${startPercent}%`,
                                    width: `${widthPercent}%`,
                                    top: 0,
                                  }}
                                  title={`Started: ${startMin}:${String(startSec).padStart(2, '0')} | Ended: ${endMin}:${String(endSec).padStart(2, '0')} | Duration: ${Math.round(block.duration)}s`}
                                >
                                  {/* Start marker */}
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/60" />
                                  {/* End marker */}
                                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/60" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-yellow-500 rounded" />
                            <span className="text-muted-foreground">Minor (&lt;10s)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-orange-500 rounded" />
                            <span className="text-muted-foreground">Warning (10-30s)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-red-500 rounded" />
                            <span className="text-muted-foreground">Problem (30s+)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Resource Float */}
              {fingerprint.economy['avg_mineral_float_5min+'] !== undefined && (
                <Card className="cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => handleTabChange('supply')}>
                  <CardHeader>
                    <CardTitle>Resource Float</CardTitle>
                    <CardDescription>Unspent resources over time (5min+)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Minerals</div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Avg:</span>
                            <span className="font-medium">{fingerprint.economy['avg_mineral_float_5min+']}</span>
                          </div>
                          {fingerprint.economy['max_mineral_float_5min+'] && (
                            <div className="flex justify-between text-sm">
                              <span>Max:</span>
                              <span className="font-medium text-orange-500">{fingerprint.economy['max_mineral_float_5min+']}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Gas</div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Avg:</span>
                            <span className="font-medium">{fingerprint.economy['avg_gas_float_5min+'] ?? 'N/A'}</span>
                          </div>
                          {fingerprint.economy['max_gas_float_5min+'] && (
                            <div className="flex justify-between text-sm">
                              <span>Max:</span>
                              <span className="font-medium text-orange-500">{fingerprint.economy['max_gas_float_5min+']}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline Visualization */}
                    {fingerprint.resource_timeline && fingerprint.metadata.duration && (
                      <div className="space-y-4 mt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>Mineral Float Timeline</span>
                            <span className="text-right">
                              Yellow: 500+ | Orange: 750+ | Red: 1000+
                            </span>
                          </div>
                          <div className="relative h-10 bg-muted/30 rounded">
                            {Object.entries(fingerprint.resource_timeline)
                              .filter(([time]) => parseInt(time) >= 300)
                              .map(([time, resources]) => {
                                const timestamp = parseInt(time);
                                const position = (timestamp / fingerprint.metadata.duration!) * 100;
                                const minerals = resources.minerals;
                                const color = minerals >= 1000 ? 'bg-red-500' : minerals >= 750 ? 'bg-orange-500' : minerals >= 500 ? 'bg-yellow-500' : null;

                                if (!color) return null;

                                const min = Math.floor(timestamp / 60);
                                const sec = timestamp % 60;

                                return (
                                  <div
                                    key={`minerals-${time}`}
                                    className={`h-10 ${color} opacity-60 hover:opacity-100 transition-opacity`}
                                    style={{
                                      position: 'absolute',
                                      left: `${position}%`,
                                      width: '1%',
                                      top: 0,
                                    }}
                                    title={`${min}:${String(sec).padStart(2, '0')} - ${minerals} minerals`}
                                  />
                                );
                              })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>Gas Float Timeline</span>
                            <span className="text-right">
                              Yellow: 500+ | Orange: 750+ | Red: 1000+
                            </span>
                          </div>
                          <div className="relative h-10 bg-muted/30 rounded">
                            {Object.entries(fingerprint.resource_timeline)
                              .filter(([time]) => parseInt(time) >= 300)
                              .map(([time, resources]) => {
                                const timestamp = parseInt(time);
                                const position = (timestamp / fingerprint.metadata.duration!) * 100;
                                const gas = resources.gas;
                                const color = gas >= 1000 ? 'bg-red-500' : gas >= 750 ? 'bg-orange-500' : gas >= 500 ? 'bg-yellow-500' : null;

                                if (!color) return null;

                                const min = Math.floor(timestamp / 60);
                                const sec = timestamp % 60;

                                return (
                                  <div
                                    key={`gas-${time}`}
                                    className={`h-10 ${color} opacity-60 hover:opacity-100 transition-opacity`}
                                    style={{
                                      position: 'absolute',
                                      left: `${position}%`,
                                      width: '1%',
                                      top: 0,
                                    }}
                                    title={`${min}:${String(sec).padStart(2, '0')} - ${gas} gas`}
                                  />
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}

                    {((fingerprint.economy['avg_mineral_float_5min+'] || 0) + (fingerprint.economy['avg_gas_float_5min+'] || 0)) > 2000 && (
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          High resource float detected. Consider adding more production or expanding faster.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab 3: Production - Build order, timings, unit production */}
        <TabsContent value="production" className="space-y-6 mt-6">
          {/* Timing Comparison */}
          {comparison && comparison.timing_comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Timing Comparison</CardTitle>
                <CardDescription>How your timings compare to the target build</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(comparison.timing_comparison).map(([key, timing]) => {
                    // Format time as M:SS
                    const formatTime = (seconds: number) => {
                      const mins = Math.floor(seconds / 60);
                      const secs = Math.floor(seconds % 60);
                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                    };

                    // Determine status color based on deviation
                    const deviation = timing.deviation;
                    const absDeviation = Math.abs(deviation);

                    // Green (on time): within ±5s
                    // Yellow (acceptable): within ±10s
                    // Red (off): > 10s
                    const badgeColor =
                      absDeviation <= 5 ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' :
                      absDeviation <= 10 ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';

                    const Icon =
                      absDeviation <= 5 ? CheckCircle2 :
                      absDeviation <= 10 ? AlertCircle :
                      XCircle;

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${absDeviation <= 5 ? 'text-green-500' : absDeviation <= 10 ? 'text-yellow-500' : 'text-red-500'}`} />
                          <span className="font-medium capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm font-mono">
                            <span className="font-semibold">{formatTime(timing.actual)}</span>
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-muted-foreground">{formatTime(timing.target)}</span>
                          </div>
                          <Badge variant="outline" className={`min-w-[60px] justify-center font-mono ${badgeColor}`}>
                            {deviation > 0 ? '+' : ''}
                            {Math.floor(deviation)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Production Timeline Comparison (Cumulative) */}
          {comparison && comparison.production_comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Production Timeline (Cumulative)</CardTitle>
                <CardDescription>Total units produced minute-by-minute vs benchmark</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(comparison.production_comparison).map(([minute, units]) => (
                    <div key={minute}>
                      <h4 className="font-semibold mb-2">Minute {minute}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(units).map(([unit, comp]) => (
                          <div key={unit} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium">{unit}</span>
                            <div className="text-sm">
                              <span className="font-medium">{comp.actual}</span>
                              <span className="text-muted-foreground"> / {comp.target}</span>
                              {comp.difference !== 0 && (
                                <span
                                  className={`ml-1 text-xs ${comp.difference > 0 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  ({comp.difference > 0 ? '+' : ''}
                                  {comp.difference})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upgrades */}
          {fingerprint.sequences && fingerprint.sequences.upgrade_sequence && fingerprint.sequences.upgrade_sequence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upgrades Researched</CardTitle>
                <CardDescription>Tech progression during the game</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {fingerprint.sequences.upgrade_sequence.map((upgrade, index) => (
                    <Badge key={index} variant="outline">
                      {upgrade}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Timings */}
          {fingerprint.timings && Object.keys(fingerprint.timings).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>All Building Timings</CardTitle>
                <CardDescription>Complete timing breakdown for all buildings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(fingerprint.timings)
                    .filter(([_, time]) => time !== null)
                    .sort(([_, a], [__, b]) => (a as number) - (b as number))
                    .map(([key, time]) => (
                      <div key={key} className="p-2 border rounded text-sm">
                        <div className="font-medium capitalize mb-1">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-muted-foreground">
                          {Math.floor(time as number / 60)}:{String(Math.floor(time as number % 60)).padStart(2, '0')}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 4: Vision - Positioning and map awareness */}
        <TabsContent value="vision" className="space-y-6 mt-6">
          {/* Positioning */}
          {fingerprint.positioning && (
            <Card>
              <CardHeader>
                <CardTitle>Building Positioning</CardTitle>
                <CardDescription>Proxy buildings and placement analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Proxy Buildings</span>
                  <Badge variant={fingerprint.positioning.proxy_buildings > 0 ? 'default' : 'outline'}>
                    {fingerprint.positioning.proxy_buildings}
                  </Badge>
                </div>
                {fingerprint.positioning.avg_building_distance_from_main !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg. Distance from Main</span>
                    <span className="font-medium text-sm">
                      {Math.round(fingerprint.positioning.avg_building_distance_from_main)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
