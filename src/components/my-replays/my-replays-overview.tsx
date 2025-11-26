'use client';

import { UserReplayData } from '@/lib/replay-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, BarChart3, Lightbulb, Calendar, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ThreePillars } from './three-pillars';

interface MyReplaysOverviewProps {
  replays: UserReplayData[];
  confirmedPlayerNames?: string[];
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

  // Matchup stats - normalize to show player's race first (using confirmed/suggested player name)
  const matchupStats = activeReplays.reduce((acc, r) => {
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
      acc[normalizedMatchup] = { total: 0, wins: 0, losses: 0 };
    }
    acc[normalizedMatchup].total++;
    if (r.fingerprint.metadata.result === 'Win') acc[normalizedMatchup].wins++;
    if (r.fingerprint.metadata.result === 'Loss') acc[normalizedMatchup].losses++;
    return acc;
  }, {} as Record<string, { total: number; wins: number; losses: number }>);

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

  // Calculate average supply blocks
  const supplyBlockCounts = activeReplays
    .map((r) => r.fingerprint?.economy?.supply_block_count)
    .filter((count): count is number => count != null);
  const avgSupplyBlocks = supplyBlockCounts.length > 0
    ? (supplyBlockCounts.reduce((sum, count) => sum + count, 0) / supplyBlockCounts.length).toFixed(1)
    : null;

  // Calculate progress trends (compare recent 5 games to previous 5 games)
  const sortedByDate = [...activeReplays].sort((a, b) =>
    new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
  );

  const recentGames = sortedByDate.slice(-5);
  const previousGames = sortedByDate.slice(-10, -5);

  // Win rate trend
  const recentWinRate = recentGames.length > 0
    ? (recentGames.filter(r => r.fingerprint.metadata.result === 'Win').length / recentGames.length) * 100
    : 0;
  const previousWinRate = previousGames.length > 0
    ? (previousGames.filter(r => r.fingerprint.metadata.result === 'Win').length / previousGames.length) * 100
    : recentWinRate;
  const winRateTrend = recentWinRate - previousWinRate;

  // Supply block trend
  const recentSupplyBlocks = recentGames
    .map(r => r.fingerprint?.economy?.supply_block_count)
    .filter((c): c is number => c != null);
  const previousSupplyBlocks = previousGames
    .map(r => r.fingerprint?.economy?.supply_block_count)
    .filter((c): c is number => c != null);
  const recentAvgBlocks = recentSupplyBlocks.length > 0
    ? recentSupplyBlocks.reduce((sum, count) => sum + count, 0) / recentSupplyBlocks.length
    : 0;
  const previousAvgBlocks = previousSupplyBlocks.length > 0
    ? previousSupplyBlocks.reduce((sum, count) => sum + count, 0) / previousSupplyBlocks.length
    : recentAvgBlocks;
  const supplyBlockTrend = previousAvgBlocks - recentAvgBlocks; // Positive if improving (fewer blocks)

  // Generate personalized tips
  const tips: string[] = [];

  // Win rate tips
  if (totalGames < 5) {
    tips.push("Keep uploading replays! The more games you track, the better insights you'll get.");
  } else if (parseFloat(winRate) >= 60) {
    tips.push("Great win rate! You're performing well. Keep up the momentum!");
  } else if (parseFloat(winRate) < 45) {
    tips.push("Focus on one matchup at a time to improve your win rate.");
  }

  // Supply block tips
  if (avgSupplyBlocks != null) {
    const avgBlocks = parseFloat(avgSupplyBlocks);
    if (avgBlocks > 8) {
      tips.push("Try setting a mental reminder to build supply every time you build production.");
    } else if (avgBlocks > 4) {
      tips.push("You're getting supply blocked a bit often. Work on building supply proactively!");
    } else if (avgBlocks <= 2) {
      tips.push("Excellent supply management! You're rarely getting blocked.");
    }
  }

  // Execution tips
  if (avgExecution != null) {
    const execution = parseFloat(avgExecution);
    if (execution >= 85) {
      tips.push("Your execution is solid! Focus on decision-making and strategy.");
    } else if (execution < 70) {
      tips.push("Work on hitting your build order timings and managing resources.");
    }
  }

  // Matchup-specific tips
  const worstMatchup = Object.entries(matchupStats)
    .filter(([, stats]) => stats.total >= 3)
    .sort((a, b) => (a[1].wins / a[1].total) - (b[1].wins / b[1].total))[0];
  if (worstMatchup) {
    const matchupWinRate = (worstMatchup[1].wins / worstMatchup[1].total) * 100;
    if (matchupWinRate < 40) {
      tips.push(`Your ${worstMatchup[0]} needs work. Review pro builds for this matchup.`);
    }
  }

  // Progress tips
  if (totalGames >= 10) {
    if (winRateTrend > 10) {
      tips.push("You're improving! Your recent games show a positive trend.");
    } else if (winRateTrend < -10) {
      tips.push("Take a break and watch some replays to see where you can improve.");
    }

    if (supplyBlockTrend > 2) {
      tips.push("Nice! You're getting supply blocked less frequently.");
    }
  }

  // Ensure we always have at least one tip
  if (tips.length === 0) {
    tips.push("Keep playing and tracking your games to unlock personalized tips!");
  }

  // Most played matchup
  const mostPlayedMatchup = Object.entries(matchupStats).sort((a, b) => b[1].total - a[1].total)[0];

  // Best matchup by win rate
  const bestMatchup = Object.entries(matchupStats)
    .filter(([, stats]) => stats.total >= 3) // Minimum 3 games
    .map(([matchup, stats]) => ({
      matchup,
      winRate: (stats.wins / stats.total) * 100,
      games: stats.total,
    }))
    .sort((a, b) => b.winRate - a.winRate)[0];

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

      {/* Tips Section */}
      {tips.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <CardTitle>Tips for Improvement</CardTitle>
            </div>
            <CardDescription>Personalized suggestions based on your recent games</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent Progress */}
      {totalGames >= 10 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Progress</CardTitle>
            <CardDescription>Your last 5 games vs. previous 5 games</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Win Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{recentWinRate.toFixed(1)}%</span>
                  {winRateTrend > 5 && (
                    <div className="flex items-center gap-1 text-green-500">
                      <ArrowUp className="h-4 w-4" />
                      <span className="text-xs">+{winRateTrend.toFixed(1)}%</span>
                    </div>
                  )}
                  {winRateTrend < -5 && (
                    <div className="flex items-center gap-1 text-red-500">
                      <ArrowDown className="h-4 w-4" />
                      <span className="text-xs">{winRateTrend.toFixed(1)}%</span>
                    </div>
                  )}
                  {Math.abs(winRateTrend) <= 5 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Minus className="h-4 w-4" />
                      <span className="text-xs">Steady</span>
                    </div>
                  )}
                </div>
              </div>
              {avgSupplyBlocks != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Supply Blocks</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{recentAvgBlocks.toFixed(1)} avg</span>
                    {supplyBlockTrend > 1 && (
                      <div className="flex items-center gap-1 text-green-500">
                        <ArrowUp className="h-4 w-4" />
                        <span className="text-xs">Improving!</span>
                      </div>
                    )}
                    {supplyBlockTrend < -1 && (
                      <div className="flex items-center gap-1 text-red-500">
                        <ArrowDown className="h-4 w-4" />
                        <span className="text-xs">Needs work</span>
                      </div>
                    )}
                    {Math.abs(supplyBlockTrend) <= 1 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Minus className="h-4 w-4" />
                        <span className="text-xs">Steady</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matchup Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Matchup Breakdown</CardTitle>
          <CardDescription>Your performance in each matchup</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(matchupStats).length === 0 ? (
            <p className="text-sm text-muted-foreground">No games yet. Upload some replays to see your stats!</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(matchupStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([matchup, stats]) => {
                  const matchupWinRate = ((stats.wins / stats.total) * 100).toFixed(1);
                  return (
                    <div key={matchup} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{matchup}</span>
                          <span className="text-sm text-muted-foreground">
                            {stats.wins}W - {stats.losses}L
                          </span>
                        </div>
                        <span className="text-sm font-medium">{matchupWinRate}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${matchupWinRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best Matchup */}
      {bestMatchup && (
        <Card>
          <CardHeader>
            <CardTitle>Best Matchup</CardTitle>
            <CardDescription>Your strongest matchup (min. 3 games)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{bestMatchup.matchup}</p>
                <p className="text-sm text-muted-foreground">{bestMatchup.games} games played</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{bestMatchup.winRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">win rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
