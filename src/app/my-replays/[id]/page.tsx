/**
 * Replay Detail Page
 * Comprehensive analysis of a single replay
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import Link from 'next/link';
import type { UserReplayData, TimingComparison } from '@/lib/replay-types';

export default function ReplayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [replay, setReplay] = useState<UserReplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const replayId = params.id as string;

  useEffect(() => {
    if (status === 'authenticated' && replayId) {
      fetchReplay();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, replayId]);

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

  const { fingerprint, detection, comparison } = replay;
  const result = fingerprint.metadata.result;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Link href="/my-replays" className="inline-block mb-6">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Replays
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-6">
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

        {/* Game Info */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Map className="h-4 w-4" />
            {fingerprint.metadata.map}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {fingerprint.metadata.duration
              ? `${Math.floor(fingerprint.metadata.duration / 60)}:${String(Math.floor(fingerprint.metadata.duration % 60)).padStart(2, '0')}`
              : 'N/A'}
          </div>
          <div className="flex items-center gap-1">
            <Swords className="h-4 w-4" />
            vs {fingerprint.metadata.opponent_race}
          </div>
          <div>
            Uploaded {new Date(replay.uploaded_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Detection & Execution */}
        <div className="lg:col-span-1 space-y-6">
          {/* Build Detection */}
          {detection && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Build Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold mb-2">{detection.build_name}</h3>
                  <div className="text-3xl font-bold mb-2">
                    {Math.round(detection.confidence)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                </div>
                <Progress value={detection.confidence} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Execution Score */}
          {comparison && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Execution Score
                </CardTitle>
                <CardDescription>vs {comparison.build_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold mb-2">
                    {Math.round(comparison.execution_score)}%
                  </div>
                  <Badge
                    className="text-lg px-4 py-1"
                    variant={
                      comparison.tier === 'S' || comparison.tier === 'A' ? 'default' : 'secondary'
                    }
                  >
                    {comparison.tier}-Tier
                  </Badge>
                </div>
                <Progress value={comparison.execution_score} className="h-3 mb-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {comparison.tier === 'S' && 'Outstanding execution!'}
                  {comparison.tier === 'A' && 'Great execution!'}
                  {comparison.tier === 'B' && 'Good execution'}
                  {comparison.tier === 'C' && 'Room for improvement'}
                  {comparison.tier === 'D' && 'Needs work'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Economy */}
          {fingerprint.economy && (
            <Card>
              <CardHeader>
                <CardTitle>Economy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Worker Counts</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">3 min:</span>
                      <span>{fingerprint.economy.workers_3min ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">5 min:</span>
                      <span>{fingerprint.economy.workers_5min ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">7 min:</span>
                      <span>{fingerprint.economy.workers_7min ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {fingerprint.economy.supply_block_count !== undefined && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Supply Blocks</span>
                      <Badge variant={fingerprint.economy.supply_block_count === 0 ? 'default' : 'destructive'}>
                        {fingerprint.economy.supply_block_count}
                      </Badge>
                    </div>
                    {fingerprint.economy.total_supply_block_time !== undefined && fingerprint.economy.total_supply_block_time > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: {Math.round(fingerprint.economy.total_supply_block_time)}s
                      </p>
                    )}
                  </div>
                )}

                {fingerprint.economy['avg_mineral_float_5min+'] !== undefined && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Avg Resource Float (5min+)</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Minerals:</span>
                        <span>{fingerprint.economy['avg_mineral_float_5min+']}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gas:</span>
                        <span>{fingerprint.economy['avg_gas_float_5min+'] ?? 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tactical Events */}
          {fingerprint.tactical && (
            <Card>
              <CardHeader>
                <CardTitle>Tactical Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Moveouts</span>
                  <Badge variant="outline">{fingerprint.tactical.moveout_times?.length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Harass</span>
                  <Badge variant="outline">{fingerprint.tactical.harass_count || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Engagements</span>
                  <Badge variant="outline">{fingerprint.tactical.engagement_count || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Detailed Analysis */}
        <div className="lg:col-span-2 space-y-6">
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
                    const Icon =
                      timing.status === 'on_time'
                        ? CheckCircle2
                        : timing.status === 'early'
                          ? AlertCircle
                          : XCircle;

                    const variant =
                      timing.status === 'on_time'
                        ? 'default'
                        : timing.status === 'early'
                          ? 'secondary'
                          : 'destructive';

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <div className="font-medium">
                              {Math.floor(timing.actual)}s
                            </div>
                            <div className="text-muted-foreground">
                              Target: {Math.floor(timing.target)}s
                            </div>
                          </div>
                          <Badge variant={variant} className="min-w-[80px] justify-center">
                            {timing.deviation > 0 ? '+' : ''}
                            {Math.floor(timing.deviation)}s
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Army Composition Comparison */}
          {comparison && comparison.composition_comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Army Composition</CardTitle>
                <CardDescription>Unit counts at key timings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(comparison.composition_comparison).map(([time, units]) => (
                    <div key={time}>
                      <h4 className="font-semibold mb-2">{time}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(units).map(([unit, comp]) => (
                          <div key={unit} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{unit}</span>
                            <div className="text-sm">
                              <span className="font-medium">{comp.actual}</span>
                              <span className="text-muted-foreground"> / {comp.target}</span>
                              {comp.difference !== 0 && (
                                <span
                                  className={`ml-1 ${comp.difference > 0 ? 'text-green-600' : 'text-red-600'}`}
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

          {/* Micro Stats */}
          {fingerprint.micro && (
            <Card>
              <CardHeader>
                <CardTitle>Micro & APM</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Selections per minute</span>
                  <span className="font-medium">
                    {isNaN(fingerprint.micro.avg_selections_per_min)
                      ? 'N/A'
                      : Math.round(fingerprint.micro.avg_selections_per_min)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Camera movements per minute</span>
                  <span className="font-medium">
                    {isNaN(fingerprint.micro.avg_camera_moves_per_min)
                      ? 'N/A'
                      : Math.round(fingerprint.micro.avg_camera_moves_per_min)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Control groups used</span>
                  <span className="font-medium">
                    {fingerprint.micro.control_groups_used || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upgrades */}
          {fingerprint.sequences && fingerprint.sequences.upgrade_sequence && fingerprint.sequences.upgrade_sequence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upgrades Researched</CardTitle>
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
        </div>
      </div>
    </div>
  );
}
