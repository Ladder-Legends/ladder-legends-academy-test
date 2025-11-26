'use client';

import { useMemo } from 'react';
import { UserReplayData, ReplayIndexEntry } from '@/lib/replay-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';
import { ThreePillars } from './three-pillars';
import { MetricsTrendsChart } from './metrics-trends-chart';
import { MatchupTrendsChart } from './matchup-trends-chart';
import { GamesPlayedChart } from './games-played-chart';
import {
  formatTime,
  getScoreColorClass,
  getTimeColorClass,
  getFullMetricsFromReplay,
} from '@/lib/metrics-scoring';
import {
  filterByDateRange,
  type DateRangeOption,
} from '@/hooks/use-chart-preferences';
import { cn } from '@/lib/utils';

interface MyReplaysOverviewProps {
  replays: UserReplayData[];
  confirmedPlayerNames?: string[];
  userId?: string;
  dateRange: DateRangeOption;
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

  // Get player info
  const playerName = replay.player_name || replay.suggested_player || fp.player_name || '';
  const playerRace = fp.race || 'Unknown';

  // Get opponent info
  let opponentName = '';
  let opponentRace = metadata.opponent_race || 'Unknown';
  if (fp.all_players) {
    const playerData = fp.all_players.find(p => p.name === playerName);
    if (playerData) {
      const opponent = fp.all_players.find(p => !p.is_observer && p.team !== playerData.team);
      if (opponent) {
        opponentName = opponent.name;
        opponentRace = opponent.race;
      }
    }
  }

  return {
    id: replay.id,
    filename: replay.filename,
    uploaded_at: replay.uploaded_at,
    game_date: metadata.game_date,
    player_name: playerName,
    player_race: playerRace,
    game_type: replay.game_type || metadata.game_type || '1v1',
    matchup: fp.matchup,
    result: metadata.result as 'Win' | 'Loss',
    duration: metadata.duration || 0,
    map_name: metadata.map,
    opponent_name: opponentName,
    opponent_race: opponentRace,
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

// Date range selector component - exported for use in parent header
const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

export function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {dateRangeOptions.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 px-3 text-xs',
            value === option.value && 'bg-primary text-primary-foreground shadow-sm'
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function MyReplaysOverview({ replays, confirmedPlayerNames = [], userId, dateRange }: MyReplaysOverviewProps) {

  // Filter out observer games (games where we didn't actually play)
  const nonObserverReplays = replays.filter((r) => {
    // If we have all_players data, check if the player was an observer
    if (r.fingerprint.all_players && r.fingerprint.player_name) {
      const playerData = r.fingerprint.all_players.find(p => p.name === r.fingerprint.player_name);
      return playerData && !playerData.is_observer;
    }
    // If we don't have all_players data (older replays), include them
    return true;
  });

  // Apply date range filter
  const activeReplays = useMemo(() => {
    // Create a temp array with the required properties for filterByDateRange
    const withDates = nonObserverReplays.map(r => ({
      ...r,
      game_date: r.fingerprint.metadata.game_date,
    }));
    return filterByDateRange(withDates, dateRange);
  }, [nonObserverReplays, dateRange]);

  // Convert to index entries for time-series charts
  const indexEntries = useMemo(
    () => activeReplays.map(toIndexEntry),
    [activeReplays]
  );

  // Calculate stats
  const totalGames = activeReplays.length;

  // Determine player's race (most common race they play)
  const raceCount = activeReplays.reduce((acc, r) => {
    const race = r.fingerprint.race;
    if (race) {
      acc[race] = (acc[race] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const playerRace = Object.entries(raceCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

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

  // Helper to average an array of numbers
  const avg = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  return (
    <div className="space-y-6">
      {/* Three Pillars */}
      <ThreePillars replays={activeReplays} confirmedPlayerNames={confirmedPlayerNames} />

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
                      <div className="grid grid-cols-2 gap-4">
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
