/**
 * Metrics Scoring - Centralized scoring formulas for replay metrics
 *
 * DESIGN PRINCIPLES:
 * 1. Time-based metrics are PRIMARY (supply_block_time, production_idle_time)
 * 2. Scores are DERIVED from time as percentage of game duration
 * 3. Scoring is weighted more heavily (10% of gametime → ~80%, 20% → ~50%)
 * 4. All formulas are configurable via SCORING_CONFIG
 */

import type { ReplayIndexEntry, UserReplayData } from './replay-types';

// ============================================================================
// Configuration - Adjustable scoring weights
// ============================================================================

export const SCORING_CONFIG = {
  /**
   * Supply Block Scoring
   * Formula: score = 100 - (blockPercent * weight)
   * Example: 10% block time at weight 2.0 → 100 - (10 * 2.0) = 80%
   */
  supply: {
    // How severely to penalize supply blocked time
    // Higher = more penalty for same block time
    percentWeight: 2.5, // 10% → 75%, 20% → 50%, 40% → 0%
    // Minimum score (floor)
    minScore: 0,
    // Maximum score (ceiling)
    maxScore: 100,
  },

  /**
   * Production Idle Scoring
   * Formula: score = 100 - (idlePercent * weight)
   * Uses overlapping/merged idle time when available
   */
  production: {
    // How severely to penalize idle time
    percentWeight: 2.0, // 10% → 80%, 20% → 60%, 50% → 0%
    // Minimum score (floor)
    minScore: 0,
    // Maximum score (ceiling)
    maxScore: 100,
  },
};

// ============================================================================
// Type Definitions
// ============================================================================

export interface TimeMetrics {
  /** Total seconds supply blocked */
  supplyBlockTime: number | null;
  /** Total seconds production buildings idle (summed per building) */
  productionIdleTime: number | null;
  /** Merged idle time (overlapping windows counted once) - preferred */
  productionIdleTimeMerged: number | null;
  /** Game duration in seconds */
  gameDuration: number;
}

export interface PercentMetrics {
  /** Supply block as percentage of game duration */
  supplyBlockPercent: number | null;
  /** Production idle as percentage of game duration */
  productionIdlePercent: number | null;
}

export interface DerivedScores {
  /** Supply score (0-100) derived from block time % */
  supplyScore: number | null;
  /** Production score (0-100) derived from idle time % */
  productionScore: number | null;
}

export interface FullMetrics extends TimeMetrics, PercentMetrics, DerivedScores {}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Format seconds as human-readable time string
 * Examples: "12s", "1m 30s", "2m"
 */
export function formatTime(seconds: number | null): string {
  if (seconds === null) return '--';
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Format percentage with one decimal
 */
export function formatPercent(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)}%`;
}

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Calculate score from time percentage using weighted formula
 *
 * @param percent - Time as percentage of game duration (0-100)
 * @param weight - How severely to penalize (higher = steeper)
 * @param minScore - Floor for score
 * @param maxScore - Ceiling for score
 */
function calculateScoreFromPercent(
  percent: number | null,
  weight: number,
  minScore: number,
  maxScore: number
): number | null {
  if (percent === null) return null;

  // Linear formula: score = 100 - (percent * weight)
  const score = 100 - percent * weight;

  return Math.max(minScore, Math.min(maxScore, Math.round(score)));
}

/**
 * Calculate supply score from block time percentage
 */
export function calculateSupplyScore(
  blockTimePercent: number | null
): number | null {
  return calculateScoreFromPercent(
    blockTimePercent,
    SCORING_CONFIG.supply.percentWeight,
    SCORING_CONFIG.supply.minScore,
    SCORING_CONFIG.supply.maxScore
  );
}

/**
 * Calculate production score from idle time percentage
 */
export function calculateProductionScore(
  idleTimePercent: number | null
): number | null {
  return calculateScoreFromPercent(
    idleTimePercent,
    SCORING_CONFIG.production.percentWeight,
    SCORING_CONFIG.production.minScore,
    SCORING_CONFIG.production.maxScore
  );
}

// ============================================================================
// Metrics Extraction
// ============================================================================

/**
 * Extract time metrics from a ReplayIndexEntry
 */
export function extractTimeMetricsFromIndex(
  entry: ReplayIndexEntry
): TimeMetrics {
  return {
    supplyBlockTime: entry.supply_block_time,
    productionIdleTime: entry.production_idle_time,
    productionIdleTimeMerged: null, // Index doesn't have merged time yet
    gameDuration: entry.duration,
  };
}

/**
 * Extract time metrics from full UserReplayData
 */
export function extractTimeMetricsFromReplay(
  replay: UserReplayData
): TimeMetrics {
  const economy = replay.fingerprint?.economy;
  const duration = replay.fingerprint?.metadata?.duration || 0;

  // Calculate production idle time from production_by_building
  let productionIdleTime: number | null = null;
  if (economy?.production_by_building) {
    productionIdleTime = Object.values(economy.production_by_building).reduce(
      (sum, b) => sum + (b.idle_seconds || 0),
      0
    );
  }

  return {
    supplyBlockTime: economy?.total_supply_block_time ?? null,
    productionIdleTime,
    productionIdleTimeMerged: null, // Would come from sc2reader merged_idle_time
    gameDuration: duration,
  };
}

/**
 * Calculate percentage metrics from time metrics
 */
export function calculatePercentMetrics(time: TimeMetrics): PercentMetrics {
  const { supplyBlockTime, productionIdleTime, gameDuration } = time;

  if (gameDuration <= 0) {
    return {
      supplyBlockPercent: null,
      productionIdlePercent: null,
    };
  }

  return {
    supplyBlockPercent:
      supplyBlockTime !== null
        ? (supplyBlockTime / gameDuration) * 100
        : null,
    productionIdlePercent:
      productionIdleTime !== null
        ? (productionIdleTime / gameDuration) * 100
        : null,
  };
}

/**
 * Calculate derived scores from percentage metrics
 */
export function calculateDerivedScores(percent: PercentMetrics): DerivedScores {
  return {
    supplyScore: calculateSupplyScore(percent.supplyBlockPercent),
    productionScore: calculateProductionScore(percent.productionIdlePercent),
  };
}

/**
 * Get full metrics for a replay index entry
 */
export function getFullMetricsFromIndex(entry: ReplayIndexEntry): FullMetrics {
  const time = extractTimeMetricsFromIndex(entry);
  const percent = calculatePercentMetrics(time);
  const scores = calculateDerivedScores(percent);

  return {
    ...time,
    ...percent,
    ...scores,
  };
}

/**
 * Get full metrics for a replay
 */
export function getFullMetricsFromReplay(replay: UserReplayData): FullMetrics {
  const time = extractTimeMetricsFromReplay(replay);
  const percent = calculatePercentMetrics(time);
  const scores = calculateDerivedScores(percent);

  return {
    ...time,
    ...percent,
    ...scores,
  };
}

// ============================================================================
// Aggregation
// ============================================================================

/**
 * Aggregate metrics across multiple replays
 */
export function aggregateMetrics(replays: UserReplayData[]): {
  avgSupplyBlockTime: number | null;
  avgProductionIdleTime: number | null;
  avgSupplyBlockPercent: number | null;
  avgProductionIdlePercent: number | null;
  avgSupplyScore: number | null;
  avgProductionScore: number | null;
  totalGames: number;
} {
  const metrics = replays.map(getFullMetricsFromReplay);

  const supplyTimes = metrics
    .filter((m) => m.supplyBlockTime !== null)
    .map((m) => m.supplyBlockTime!);
  const prodTimes = metrics
    .filter((m) => m.productionIdleTime !== null)
    .map((m) => m.productionIdleTime!);
  const supplyPercents = metrics
    .filter((m) => m.supplyBlockPercent !== null)
    .map((m) => m.supplyBlockPercent!);
  const prodPercents = metrics
    .filter((m) => m.productionIdlePercent !== null)
    .map((m) => m.productionIdlePercent!);
  const supplyScores = metrics
    .filter((m) => m.supplyScore !== null)
    .map((m) => m.supplyScore!);
  const prodScores = metrics
    .filter((m) => m.productionScore !== null)
    .map((m) => m.productionScore!);

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return {
    avgSupplyBlockTime: avg(supplyTimes),
    avgProductionIdleTime: avg(prodTimes),
    avgSupplyBlockPercent: avg(supplyPercents),
    avgProductionIdlePercent: avg(prodPercents),
    avgSupplyScore: avg(supplyScores),
    avgProductionScore: avg(prodScores),
    totalGames: replays.length,
  };
}

/**
 * Aggregate metrics from index entries
 */
export function aggregateMetricsFromIndex(entries: ReplayIndexEntry[]): {
  avgSupplyBlockTime: number | null;
  avgProductionIdleTime: number | null;
  avgSupplyBlockPercent: number | null;
  avgProductionIdlePercent: number | null;
  avgSupplyScore: number | null;
  avgProductionScore: number | null;
  totalGames: number;
} {
  const metrics = entries.map(getFullMetricsFromIndex);

  const supplyTimes = metrics
    .filter((m) => m.supplyBlockTime !== null)
    .map((m) => m.supplyBlockTime!);
  const prodTimes = metrics
    .filter((m) => m.productionIdleTime !== null)
    .map((m) => m.productionIdleTime!);
  const supplyPercents = metrics
    .filter((m) => m.supplyBlockPercent !== null)
    .map((m) => m.supplyBlockPercent!);
  const prodPercents = metrics
    .filter((m) => m.productionIdlePercent !== null)
    .map((m) => m.productionIdlePercent!);
  const supplyScores = metrics
    .filter((m) => m.supplyScore !== null)
    .map((m) => m.supplyScore!);
  const prodScores = metrics
    .filter((m) => m.productionScore !== null)
    .map((m) => m.productionScore!);

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return {
    avgSupplyBlockTime: avg(supplyTimes),
    avgProductionIdleTime: avg(prodTimes),
    avgSupplyBlockPercent: avg(supplyPercents),
    avgProductionIdlePercent: avg(prodPercents),
    avgSupplyScore: avg(supplyScores),
    avgProductionScore: avg(prodScores),
    totalGames: entries.length,
  };
}

// ============================================================================
// Score Color Helpers
// ============================================================================

/**
 * Get Tailwind color class for a score
 */
export function getScoreColorClass(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 85) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get Tailwind color class for time (lower is better)
 */
export function getTimeColorClass(seconds: number | null, gameDuration: number): string {
  if (seconds === null || gameDuration <= 0) return 'text-muted-foreground';
  const percent = (seconds / gameDuration) * 100;
  if (percent <= 5) return 'text-green-500';
  if (percent <= 10) return 'text-yellow-500';
  if (percent <= 20) return 'text-orange-500';
  return 'text-red-500';
}

// ============================================================================
// Matchup Normalization
// ============================================================================

/**
 * Normalize a matchup string so the player's race is always first
 *
 * @param matchup - Original matchup string (e.g., "ZvT", "TvZ")
 * @param playerRace - Player's race ("Terran", "Zerg", "Protoss")
 * @returns Normalized matchup with player's race first (e.g., "TvZ" if player is Terran)
 *
 * Example:
 *   normalizeMatchup("ZvT", "Terran") → "TvZ"
 *   normalizeMatchup("TvZ", "Terran") → "TvZ"
 *   normalizeMatchup("ZvP", "Zerg") → "ZvP"
 */
export function normalizeMatchup(matchup: string | null, playerRace: string | null): string {
  if (!matchup || !playerRace) return matchup || 'Unknown';

  // Extract races from matchup (e.g., "TvZ" → ["T", "Z"])
  const parts = matchup.split('v');
  if (parts.length !== 2) return matchup;

  const [race1, race2] = parts;
  const playerRaceInitial = playerRace[0].toUpperCase();

  // If race2 matches player's race, swap them
  if (race2 === playerRaceInitial && race1 !== playerRaceInitial) {
    return `${race2}v${race1}`;
  }

  return matchup;
}

/**
 * Get race initial from full race name
 */
export function getRaceInitial(race: string | null): string {
  if (!race) return '?';
  return race[0].toUpperCase();
}

/**
 * Expand race initial to full name
 */
export function expandRaceInitial(initial: string): string {
  const map: Record<string, string> = {
    T: 'Terran',
    Z: 'Zerg',
    P: 'Protoss',
    R: 'Random',
  };
  return map[initial] || initial;
}

/**
 * Parse matchup into player and opponent races
 */
export function parseMatchup(matchup: string): { playerRace: string; opponentRace: string } | null {
  const parts = matchup.split('v');
  if (parts.length !== 2) return null;
  return {
    playerRace: expandRaceInitial(parts[0]),
    opponentRace: expandRaceInitial(parts[1]),
  };
}

// ============================================================================
// Nemesis & Player Stats Calculation
// ============================================================================

import type { NemesisSummary, MatchupStats, PlayerStatsSummary } from './replay-types';

/**
 * Calculate nemesis (opponent you lose to most) from replay index entries
 *
 * @param entries - Replay index entries to analyze
 * @param minGames - Minimum games against opponent to be considered (default: 3)
 * @returns Nemesis summary or null if no qualifying opponents
 */
export function calculateNemesis(
  entries: ReplayIndexEntry[],
  minGames: number = 3
): NemesisSummary | null {
  // Group by opponent
  const opponentStats = new Map<string, {
    opponent_race: string;
    games: number;
    losses: number;
    wins: number;
    by_your_race: Record<string, { games: number; losses: number }>;
  }>();

  for (const entry of entries) {
    if (!entry.opponent_name) continue;

    const key = entry.opponent_name;
    if (!opponentStats.has(key)) {
      opponentStats.set(key, {
        opponent_race: entry.opponent_race || 'Unknown',
        games: 0,
        losses: 0,
        wins: 0,
        by_your_race: {},
      });
    }

    const stats = opponentStats.get(key)!;
    stats.games++;
    if (entry.result === 'Loss') stats.losses++;
    if (entry.result === 'Win') stats.wins++;

    // Track by player's race
    const playerRace = entry.player_race || 'Unknown';
    if (!stats.by_your_race[playerRace]) {
      stats.by_your_race[playerRace] = { games: 0, losses: 0 };
    }
    stats.by_your_race[playerRace].games++;
    if (entry.result === 'Loss') {
      stats.by_your_race[playerRace].losses++;
    }
  }

  // Find the opponent with highest loss rate (min games threshold)
  let nemesis: NemesisSummary | null = null;
  let highestLossRate = 0;

  for (const [opponent_name, stats] of opponentStats) {
    if (stats.games < minGames) continue;

    const loss_rate = (stats.losses / stats.games) * 100;
    if (loss_rate > highestLossRate) {
      highestLossRate = loss_rate;
      nemesis = {
        opponent_name,
        opponent_race: stats.opponent_race,
        games_played: stats.games,
        losses: stats.losses,
        wins: stats.wins,
        loss_rate,
        by_your_race: Object.fromEntries(
          Object.entries(stats.by_your_race).map(([race, data]) => [
            race,
            { games: data.games, losses: data.losses, loss_rate: (data.losses / data.games) * 100 },
          ])
        ),
      };
    }
  }

  return nemesis;
}

/**
 * Calculate matchup statistics from replay index entries
 */
export function calculateMatchupStats(entries: ReplayIndexEntry[]): MatchupStats[] {
  const matchupMap = new Map<string, {
    games: number;
    wins: number;
    losses: number;
    supplyBlockTimes: number[];
    productionIdleTimes: number[];
    durations: number[];
  }>();

  for (const entry of entries) {
    if (!entry.matchup) continue;

    if (!matchupMap.has(entry.matchup)) {
      matchupMap.set(entry.matchup, {
        games: 0,
        wins: 0,
        losses: 0,
        supplyBlockTimes: [],
        productionIdleTimes: [],
        durations: [],
      });
    }

    const stats = matchupMap.get(entry.matchup)!;
    stats.games++;
    if (entry.result === 'Win') stats.wins++;
    if (entry.result === 'Loss') stats.losses++;
    if (entry.supply_block_time !== null) {
      stats.supplyBlockTimes.push(entry.supply_block_time);
    }
    if (entry.production_idle_time !== null) {
      stats.productionIdleTimes.push(entry.production_idle_time);
    }
    stats.durations.push(entry.duration);
  }

  const avg = (arr: number[]): number | null =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return Array.from(matchupMap.entries())
    .map(([matchup, stats]) => ({
      matchup,
      games: stats.games,
      wins: stats.wins,
      losses: stats.losses,
      win_rate: (stats.wins / stats.games) * 100,
      avg_supply_block_time: avg(stats.supplyBlockTimes),
      avg_production_idle_time: avg(stats.productionIdleTimes),
      avg_duration: avg(stats.durations) || 0,
    }))
    .sort((a, b) => b.games - a.games);
}

/**
 * Calculate per-player (gamer tag) statistics summary
 *
 * Useful for users with multiple SC2 accounts/names
 */
export function calculatePlayerStats(entries: ReplayIndexEntry[]): PlayerStatsSummary[] {
  const playerMap = new Map<string, ReplayIndexEntry[]>();

  for (const entry of entries) {
    const playerName = entry.player_name || 'Unknown';
    if (!playerMap.has(playerName)) {
      playerMap.set(playerName, []);
    }
    playerMap.get(playerName)!.push(entry);
  }

  return Array.from(playerMap.entries())
    .map(([player_name, playerEntries]) => {
      const games = playerEntries.length;
      const wins = playerEntries.filter((e) => e.result === 'Win').length;
      const losses = playerEntries.filter((e) => e.result === 'Loss').length;

      // Determine primary race (most frequently played)
      const raceCounts = playerEntries.reduce((acc, e) => {
        const race = e.player_race || 'Unknown';
        acc[race] = (acc[race] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const primary_race = Object.entries(raceCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

      return {
        player_name,
        games,
        wins,
        losses,
        win_rate: games > 0 ? (wins / games) * 100 : 0,
        primary_race,
        matchups: calculateMatchupStats(playerEntries),
        nemesis: calculateNemesis(playerEntries),
      };
    })
    .sort((a, b) => b.games - a.games);
}
