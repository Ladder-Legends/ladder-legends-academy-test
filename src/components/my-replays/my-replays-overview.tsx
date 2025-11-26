'use client';

import { useMemo } from 'react';
import { UserReplayData } from '@/lib/replay-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, BarChart3, Calendar, Cog, Eye } from 'lucide-react';
import { ThreePillars } from './three-pillars';

interface MyReplaysOverviewProps {
  replays: UserReplayData[];
  confirmedPlayerNames?: string[];
}

/**
 * Calculate production score for a replay
 */
function calculateProductionScore(replay: UserReplayData): number | null {
  if (replay.comparison?.execution_score != null) {
    return replay.comparison.execution_score;
  }
  return null;
}

/**
 * Calculate supply score for a replay
 */
function calculateSupplyScore(replay: UserReplayData): number | null {
  const economy = replay.fingerprint?.economy;
  if (!economy) return null;

  const blockCount = economy.supply_block_count;
  const totalBlockTime = economy.total_supply_block_time;

  if (blockCount == null && totalBlockTime == null) return null;

  let score = 100;
  let penalty = 0;

  if (blockCount != null) penalty += blockCount * 10;
  if (totalBlockTime != null) penalty += totalBlockTime * 2;

  if (economy.supply_block_periods?.length) {
    for (const block of economy.supply_block_periods) {
      if (block.start < 300) {
        penalty += (block.duration || 0) * 1;
      }
    }
  }

  score = Math.max(0, score - penalty);
  return Math.min(100, score);
}

interface MatchupPillarStats {
  total: number;
  wins: number;
  losses: number;
  productionScores: number[];
  supplyScores: number[];
}

export function MyReplaysOverview({ replays, confirmedPlayerNames = [] }: MyReplaysOverviewProps) {
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

  const _playerRace = Object.entries(raceCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  void _playerRace; // Currently unused - prepared for player race display feature

  // Matchup stats with pillar scores - normalize to show player's race first
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
        acc[normalizedMatchup] = { total: 0, wins: 0, losses: 0, productionScores: [], supplyScores: [] };
      }
      acc[normalizedMatchup].total++;
      if (r.fingerprint.metadata.result === 'Win') acc[normalizedMatchup].wins++;
      if (r.fingerprint.metadata.result === 'Loss') acc[normalizedMatchup].losses++;

      // Calculate and store pillar scores
      const prodScore = calculateProductionScore(r);
      const supplyScore = calculateSupplyScore(r);
      if (prodScore !== null) acc[normalizedMatchup].productionScores.push(prodScore);
      if (supplyScore !== null) acc[normalizedMatchup].supplyScores.push(supplyScore);

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

  // Helper to get score color class
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  // Helper to average an array of scores
  const avgScore = (scores: number[]): number | null => {
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  return (
    <div className="space-y-6">
      {/* Three Pillars */}
      <ThreePillars replays={replays} confirmedPlayerNames={confirmedPlayerNames} />

      {/* Summary Cards */}
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

      {/* Matchup Breakdown with Pillar Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Matchup Performance</CardTitle>
          <CardDescription>Win rate and pillar scores by matchup</CardDescription>
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
                  const prodAvg = avgScore(stats.productionScores);
                  const supplyAvg = avgScore(stats.supplyScores);

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

                      {/* Pillar Scores Row */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* Vision - Coming Soon */}
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Vision</p>
                            <p className="text-sm font-medium text-muted-foreground">--</p>
                          </div>
                        </div>

                        {/* Production */}
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                          <Cog className="h-4 w-4" />
                          <div>
                            <p className="text-xs text-muted-foreground">Production</p>
                            <p className={`text-sm font-bold ${getScoreColor(prodAvg)}`}>
                              {prodAvg !== null ? `${Math.round(prodAvg)}%` : '--'}
                            </p>
                          </div>
                        </div>

                        {/* Supply */}
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                          <BarChart3 className="h-4 w-4" />
                          <div>
                            <p className="text-xs text-muted-foreground">Supply</p>
                            <p className={`text-sm font-bold ${getScoreColor(supplyAvg)}`}>
                              {supplyAvg !== null ? `${Math.round(supplyAvg)}%` : '--'}
                            </p>
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
