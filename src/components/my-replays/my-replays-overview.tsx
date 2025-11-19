'use client';

import { UserReplayData } from '@/lib/replay-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, Target, BarChart3 } from 'lucide-react';

interface MyReplaysOverviewProps {
  replays: UserReplayData[];
}

export function MyReplaysOverview({ replays }: MyReplaysOverviewProps) {
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

  const playerRace = Object.entries(raceCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Matchup stats - normalize to show player's race first (using the race from EACH replay)
  const matchupStats = activeReplays.reduce((acc, r) => {
    const matchup = r.fingerprint.matchup;
    const playerRaceInThisGame = r.fingerprint.race?.[0]?.toUpperCase(); // First letter of race (T, Z, or P)

    if (!playerRaceInThisGame) {
      return acc;
    }

    // Matchup format is "WinnerRacevLoserRace"
    // We want to normalize to "PlayerRacevOpponentRace" regardless of who won
    const [firstRace, secondRace] = matchup.split('v');
    let normalizedMatchup: string;

    if (firstRace === playerRaceInThisGame) {
      // Player's race is already first (player won)
      normalizedMatchup = matchup;
    } else if (secondRace === playerRaceInThisGame) {
      // Player's race is second (player lost), flip it
      normalizedMatchup = `${secondRace}v${firstRace}`;
    } else {
      // Neither race matches (shouldn't happen, but skip if it does)
      return acc;
    }

    if (!acc[normalizedMatchup]) {
      acc[normalizedMatchup] = { total: 0, wins: 0, losses: 0 };
    }
    acc[normalizedMatchup].total++;
    if (r.fingerprint.metadata.result === 'Win') acc[normalizedMatchup].wins++;
    if (r.fingerprint.metadata.result === 'Loss') acc[normalizedMatchup].losses++;
    return acc;
  }, {} as Record<string, { total: number; wins: number; losses: number }>);

  // Build detection stats
  const detectedBuilds = activeReplays.filter((r) => r.detection).length;
  const detectionRate = totalGames > 0 ? ((detectedBuilds / totalGames) * 100).toFixed(1) : '0.0';

  // Average execution score (for detected builds)
  const executionScores = activeReplays
    .filter((r) => r.comparison?.execution_score != null)
    .map((r) => r.comparison!.execution_score!);
  const avgExecution = executionScores.length > 0
    ? (executionScores.reduce((sum, score) => sum + score, 0) / executionScores.length).toFixed(1)
    : null;

  // Most played matchup
  const mostPlayedMatchup = Object.entries(matchupStats).sort((a, b) => b[1].total - a[1].total)[0];

  // Best matchup by win rate
  const bestMatchup = Object.entries(matchupStats)
    .filter(([_, stats]) => stats.total >= 3) // Minimum 3 games
    .map(([matchup, stats]) => ({
      matchup,
      winRate: (stats.wins / stats.total) * 100,
      games: stats.total,
    }))
    .sort((a, b) => b.winRate - a.winRate)[0];

  return (
    <div className="space-y-6">
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
              {wins}W - {losses}L ({totalGames} games)
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
            <CardTitle className="text-sm font-medium">Build Detection</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detectionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {detectedBuilds} of {totalGames} games
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
              {executionScores.length > 0 ? `${executionScores.length} detected builds` : 'No detected builds'}
            </p>
          </CardContent>
        </Card>
      </div>

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
