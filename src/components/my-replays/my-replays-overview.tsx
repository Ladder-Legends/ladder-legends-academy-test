'use client';

import { useMemo } from 'react';
import { UserReplayData, ReplayIndexEntry } from '@/lib/replay-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, BarChart3, Calendar, Eye, Clock, AlertTriangle } from 'lucide-react';
import { ThreePillars } from './three-pillars';
import { MetricsTrendsChart } from './metrics-trends-chart';
import { MatchupTrendsChart } from './matchup-trends-chart';
import { GamesPlayedChart } from './games-played-chart';
import {
  aggregateMetrics,
  formatTime,
  getScoreColorClass,
  getTimeColorClass,
  getFullMetricsFromReplay,
} from '@/lib/metrics-scoring';

interface MyReplaysOverviewProps {
  replays: UserReplayData[];
  confirmedPlayerNames?: string[];
  userId?: string;
}

interface MatchupPillarStats {
  total: number;
  wins: number;
  losses: number;
  // Time-based metrics (primary)
  supplyBlockTimes: number[];
  productionIdleTimes: number[];
  gameDurations: number[];
  // Derived scores (secondary)
  productionScores: number[];
  supplyScores: number[];
}

/**
 * Convert UserReplayData to ReplayIndexEntry format for time-series charts
 */
function toIndexEntry(replay: UserReplayData): ReplayIndexEntry {
  const fp = replay.fingerprint;
  const metadata = fp.metadata;
  const metrics = getFullMetricsFromReplay(replay);

  return {
    id: replay.id,
    filename: replay.filename,
    uploaded_at: replay.uploaded_at,
    game_date: metadata.game_date,
    game_type: replay.game_type || metadata.game_type || '1v1',
    matchup: fp.matchup,
    result: metadata.result as 'Win' | 'Loss',
    duration: metadata.duration || 0,
    map_name: metadata.map,
    opponent_name: '', // Not needed for charts
    reference_id: null,
    reference_alias: null,
    comparison_score: replay.comparison?.execution_score ?? null,
    production_score: metrics.productionScore,
    supply_score: metrics.supplyScore,
    vision_score: null,
    // Time-based metrics (seconds) - PRIMARY
    supply_block_time: metrics.supplyBlockTime,
    production_idle_time: metrics.productionIdleTime,
    detected_build: replay.detection?.build_name ?? null,
    detection_confidence: replay.detection?.confidence ?? null,
  };
}

export function MyReplaysOverview({ replays, confirmedPlayerNames = [], userId }: MyReplaysOverviewProps) {
  // Filter out observer games (games where we didn't actually play)
  const activeReplays = replays.filter((r) => {
    // If we have all_players data, check if the player was an observer
    if (r.fingerprint.all_players && r.fingerprint.player_name) {
      const playerData = r.fingerprint.all_players.find(p => p.name === r.fingerprint.player_name);
      return playerData && !playerData.is_observer;
    }
    // If we don't have all_players data (older replays), include them
    return true;
  });

  // Convert to index entries for time-series charts
  const indexEntries = useMemo(
    () => activeReplays.map(toIndexEntry),
    [activeReplays]
  );

  // Calculate stats
  const totalGames = activeReplays.length;
  const wins = activeReplays.filter((r) => r.fingerprint.metadata.result === 'Win').length;
  const losses = activeReplays.filter((r) => r.fingerprint.metadata.result === 'Loss').length;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';

  // Determine player's race (most common race they play)
  const raceCount = activeReplays.reduce((acc, r) => {
    const race = r.fingerprint.race;
    if (race) {
      acc[race] = (acc[race] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const playerRace = Object.entries(raceCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Aggregate metrics across all replays
  const overallMetrics = useMemo(
    () => aggregateMetrics(activeReplays),
    [activeReplays]
  );

  // Matchup stats with time-based metrics (primary) and derived scores (secondary)
  const matchupStats = useMemo(() => {
    return activeReplays.reduce((acc, r) => {
      if (!r.fingerprint.all_players) return acc;

      // Find player using confirmed/suggested name priority
      let playerData = null;
      for (const confirmedName of confirmedPlayerNames) {
        playerData = r.fingerprint.all_players.find(p => p.name === confirmedName);
        if (playerData) break;
      }
      if (!playerData && r.player_name) {
        playerData = r.fingerprint.all_players.find(p => p.name === r.player_name);
      }
      if (!playerData && r.fingerprint.player_name) {
        playerData = r.fingerprint.all_players.find(p => p.name === r.fingerprint.player_name);
      }

      if (!playerData) return acc;

      // Find opponent(s)
      const opponents = r.fingerprint.all_players.filter(
        p => !p.is_observer && p.team !== playerData.team
      );

      if (opponents.length === 0) return acc;

      const playerRaceInThisGame = playerData.race;
      const opponentRace = opponents[0].race;

      // Create normalized matchup: PlayerRace[0]vOpponentRace[0] (e.g., "TvZ", "PvT")
      const normalizedMatchup = `${playerRaceInThisGame[0]}v${opponentRace[0]}`;

      if (!acc[normalizedMatchup]) {
        acc[normalizedMatchup] = {
          total: 0,
          wins: 0,
          losses: 0,
          supplyBlockTimes: [],
          productionIdleTimes: [],
          gameDurations: [],
          productionScores: [],
          supplyScores: [],
        };
      }
      acc[normalizedMatchup].total++;
      if (r.fingerprint.metadata.result === 'Win') acc[normalizedMatchup].wins++;
      if (r.fingerprint.metadata.result === 'Loss') acc[normalizedMatchup].losses++;

      // Get full metrics for this replay (time-based primary, scores secondary)
      const metrics = getFullMetricsFromReplay(r);

      // Store time-based metrics (primary)
      if (metrics.supplyBlockTime !== null) {
        acc[normalizedMatchup].supplyBlockTimes.push(metrics.supplyBlockTime);
      }
      if (metrics.productionIdleTime !== null) {
        acc[normalizedMatchup].productionIdleTimes.push(metrics.productionIdleTime);
      }
      if (metrics.gameDuration > 0) {
        acc[normalizedMatchup].gameDurations.push(metrics.gameDuration);
      }

      // Store derived scores (secondary)
      if (metrics.productionScore !== null) {
        acc[normalizedMatchup].productionScores.push(metrics.productionScore);
      }
      if (metrics.supplyScore !== null) {
        acc[normalizedMatchup].supplyScores.push(metrics.supplyScore);
      }

      return acc;
    }, {} as Record<string, MatchupPillarStats>);
  }, [activeReplays, confirmedPlayerNames]);

  // Calculate execution score based on available data
  // Priority: 1) comparison.execution_score, 2) calculate from economy metrics
  const executionScores = activeReplays.map((r) => {
    // Use comparison execution score if available
    if (r.comparison?.execution_score != null) {
      return r.comparison.execution_score;
    }

    // Otherwise calculate from economy metrics (if available)
    const economy = r.fingerprint?.economy;
    if (!economy) {
      return 100; // Default score when economy data is not available
    }

    let score = 100;

    // Penalize supply blocks (0-30 points)
    if (economy.supply_block_count != null) {
      const blockPenalty = Math.min(30, economy.supply_block_count * 3);
      score -= blockPenalty;
    }

    // Penalize resource float (0-30 points)
    if (economy['avg_mineral_float_5min+'] != null) {
      const mineralFloat = economy['avg_mineral_float_5min+'];
      // Ideal is ~500, penalize if over 800
      if (mineralFloat > 800) {
        const floatPenalty = Math.min(15, (mineralFloat - 800) / 100);
        score -= floatPenalty;
      }
    }
    if (economy['avg_gas_float_5min+'] != null) {
      const gasFloat = economy['avg_gas_float_5min+'];
      // Ideal is ~200, penalize if over 400
      if (gasFloat > 400) {
        const floatPenalty = Math.min(15, (gasFloat - 400) / 50);
        score -= floatPenalty;
      }
    }

    return Math.max(0, Math.min(100, score));
  });

  const avgExecution = executionScores.length > 0
    ? (executionScores.reduce((sum, score) => sum + score, 0) / executionScores.length).toFixed(1)
    : null;

  // Most played matchup
  const mostPlayedMatchup = Object.entries(matchupStats).sort((a, b) => b[1].total - a[1].total)[0];

  // Helper to average an array of numbers
  const avg = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  return (
    <div className="space-y-6">
      {/* Three Pillars */}
      <ThreePillars replays={replays} confirmedPlayerNames={confirmedPlayerNames} />

      {/* Summary Cards - Row 1: Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground">
              {wins}W - {losses}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGames}</div>
            <p className="text-xs text-muted-foreground">
              {totalGames === 0 ? 'Upload replays to start' : 'replays tracked'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Played</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostPlayedMatchup?.[0] || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {mostPlayedMatchup ? `${mostPlayedMatchup[1].total} games` : 'No games yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgExecution !== null ? `${avgExecution}%` : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {avgExecution !== null ? 'Based on mechanics' : 'No data yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Row 2: Time-Based Metrics (Primary) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Avg Supply Block Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Supply Block Time</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className={`text-2xl font-bold ${
                overallMetrics.avgSupplyBlockTime !== null
                  ? getTimeColorClass(overallMetrics.avgSupplyBlockTime, 600)
                  : 'text-muted-foreground'
              }`}>
                {formatTime(overallMetrics.avgSupplyBlockTime)}
              </span>
              {overallMetrics.avgSupplyScore !== null && (
                <span className={`text-sm ${getScoreColorClass(overallMetrics.avgSupplyScore)}`}>
                  ({Math.round(overallMetrics.avgSupplyScore)}% score)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overallMetrics.avgSupplyBlockPercent !== null
                ? `${overallMetrics.avgSupplyBlockPercent.toFixed(1)}% of game time blocked`
                : 'No data yet'
              }
            </p>
          </CardContent>
        </Card>

        {/* Avg Production Idle Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Production Idle Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className={`text-2xl font-bold ${
                overallMetrics.avgProductionIdleTime !== null
                  ? getTimeColorClass(overallMetrics.avgProductionIdleTime, 600)
                  : 'text-muted-foreground'
              }`}>
                {formatTime(overallMetrics.avgProductionIdleTime)}
              </span>
              {overallMetrics.avgProductionScore !== null && (
                <span className={`text-sm ${getScoreColorClass(overallMetrics.avgProductionScore)}`}>
                  ({Math.round(overallMetrics.avgProductionScore)}% score)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overallMetrics.avgProductionIdlePercent !== null
                ? `${overallMetrics.avgProductionIdlePercent.toFixed(1)}% of game time idle`
                : 'No data yet'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends (Time-Series) - Full Width */}
      {totalGames >= 3 && userId && (
        <MetricsTrendsChart
          replays={indexEntries}
          userId={userId}
          title="Performance Trends"
        />
      )}

      {/* Games Played + Win Rate by Matchup - Same Row */}
      {totalGames >= 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GamesPlayedChart
            replays={indexEntries}
            title="Games Played"
          />
          <MatchupTrendsChart
            replays={indexEntries}
            playerRace={playerRace}
            title="Win Rate by Matchup"
          />
        </div>
      )}

      {/* Matchup Breakdown with Time-Based Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Matchup Performance</CardTitle>
          <CardDescription>Win rate and macro metrics by matchup (time-based)</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(matchupStats).length === 0 ? (
            <p className="text-sm text-muted-foreground">No games yet. Upload some replays to see your stats!</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(matchupStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([matchup, stats]) => {
                  const matchupWinRate = (stats.wins / stats.total) * 100;

                  // Time-based metrics (primary)
                  const avgSupplyBlockTime = avg(stats.supplyBlockTimes);
                  const avgProdIdleTime = avg(stats.productionIdleTimes);
                  const avgDuration = avg(stats.gameDurations) || 600;

                  // Derived scores (secondary)
                  const prodScoreAvg = avg(stats.productionScores);
                  const supplyScoreAvg = avg(stats.supplyScores);

                  return (
                    <div key={matchup} className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0">
                      {/* Matchup Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold">{matchup}</span>
                          <span className="text-sm text-muted-foreground">
                            {stats.total} game{stats.total !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${matchupWinRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                            {matchupWinRate.toFixed(0)}%
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({stats.wins}W-{stats.losses}L)
                          </span>
                        </div>
                      </div>

                      {/* Time-Based Metrics Row (Primary) */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* Vision - Coming Soon */}
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Vision</p>
                            <p className="text-sm font-medium text-muted-foreground">--</p>
                          </div>
                        </div>

                        {/* Production Idle Time (Primary) */}
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                          <Clock className="h-4 w-4" />
                          <div>
                            <p className="text-xs text-muted-foreground">Prod Idle</p>
                            <p className={`text-sm font-bold ${getTimeColorClass(avgProdIdleTime, avgDuration)}`}>
                              {formatTime(avgProdIdleTime)}
                            </p>
                            {prodScoreAvg !== null && (
                              <p className={`text-xs ${getScoreColorClass(prodScoreAvg)}`}>
                                {Math.round(prodScoreAvg)}%
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Supply Block Time (Primary) */}
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                          <AlertTriangle className="h-4 w-4" />
                          <div>
                            <p className="text-xs text-muted-foreground">Supply Block</p>
                            <p className={`text-sm font-bold ${getTimeColorClass(avgSupplyBlockTime, avgDuration)}`}>
                              {formatTime(avgSupplyBlockTime)}
                            </p>
                            {supplyScoreAvg !== null && (
                              <p className={`text-xs ${getScoreColorClass(supplyScoreAvg)}`}>
                                {Math.round(supplyScoreAvg)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
