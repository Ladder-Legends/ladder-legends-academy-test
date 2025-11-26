/**
 * Time-Series Aggregation Utilities for Replay Analysis
 *
 * Provides:
 * 1. Time period grouping (daily/weekly/monthly/all-time)
 * 2. Async computation to avoid UI blocking
 * 3. Aggregation functions for metrics over time
 */

import type { ReplayIndexEntry, ReplayFingerprint, UserReplayData } from './replay-types';

// ============================================================================
// Types
// ============================================================================

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

export interface TimeSeriesDataPoint {
  date: string; // ISO date string for the period start
  label: string; // Display label (e.g., "Nov 25", "Week 48", "Nov 2025")
  replayCount: number;
  wins: number;
  losses: number;
  winRate: number;
  avgSupplyScore: number | null;
  avgProductionScore: number | null;
  avgSupplyBlockTime: number | null;
  avgProductionIdleTime: number | null;
  replayIds: string[]; // IDs of replays in this period
}

export interface TimeSeriesData {
  period: TimePeriod;
  startDate: string;
  endDate: string;
  dataPoints: TimeSeriesDataPoint[];
  totals: {
    replayCount: number;
    wins: number;
    losses: number;
    winRate: number;
    avgSupplyScore: number | null;
    avgProductionScore: number | null;
    avgSupplyBlockTime: number | null;
    avgProductionIdleTime: number | null;
  };
}

export interface MatchupTimeSeriesData {
  matchup: string;
  data: TimeSeriesData;
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get the start of the day for a given date (UTC)
 */
export function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/**
 * Get the start of the week (Monday) for a given date (UTC)
 */
export function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getUTCDay();
  const diff = start.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  start.setUTCDate(diff);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/**
 * Get the start of the month for a given date (UTC)
 */
export function getStartOfMonth(date: Date): Date {
  const start = new Date(date);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/**
 * Get period key and label for a date based on the time period type
 */
export function getPeriodKeyAndLabel(date: Date, period: TimePeriod): { key: string; label: string } {
  switch (period) {
    case 'daily': {
      const start = getStartOfDay(date);
      const key = start.toISOString().split('T')[0];
      const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { key, label };
    }
    case 'weekly': {
      const start = getStartOfWeek(date);
      const weekNum = getWeekNumber(start);
      const key = `${start.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
      const label = `Week ${weekNum}`;
      return { key, label };
    }
    case 'monthly': {
      const start = getStartOfMonth(date);
      const key = `${start.getUTCFullYear()}-${(start.getUTCMonth() + 1).toString().padStart(2, '0')}`;
      const label = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return { key, label };
    }
    case 'all-time': {
      return { key: 'all', label: 'All Time' };
    }
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Group replays by time period
 */
export function groupReplaysByPeriod(
  replays: ReplayIndexEntry[],
  period: TimePeriod
): Map<string, { entries: ReplayIndexEntry[]; label: string }> {
  const groups = new Map<string, { entries: ReplayIndexEntry[]; label: string }>();

  for (const replay of replays) {
    // Use game_date if available, otherwise fall back to uploaded_at
    const dateStr = replay.game_date || replay.uploaded_at;
    if (!dateStr) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const { key, label } = getPeriodKeyAndLabel(date, period);

    if (!groups.has(key)) {
      groups.set(key, { entries: [], label });
    }
    groups.get(key)!.entries.push(replay);
  }

  return groups;
}

/**
 * Calculate aggregated metrics for a group of replays
 */
export function aggregateMetrics(entries: ReplayIndexEntry[]): {
  replayCount: number;
  wins: number;
  losses: number;
  winRate: number;
  avgSupplyScore: number | null;
  avgProductionScore: number | null;
  avgSupplyBlockTime: number | null;
  avgProductionIdleTime: number | null;
} {
  const replayCount = entries.length;
  const wins = entries.filter(e => e.result === 'Win').length;
  const losses = replayCount - wins;
  const winRate = replayCount > 0 ? (wins / replayCount) * 100 : 0;

  // Calculate average supply score (excluding nulls)
  const supplyScores = entries
    .map(e => e.supply_score)
    .filter((s): s is number => s !== null);
  const avgSupplyScore = supplyScores.length > 0
    ? supplyScores.reduce((a, b) => a + b, 0) / supplyScores.length
    : null;

  // Calculate average production score (excluding nulls)
  const productionScores = entries
    .map(e => e.production_score)
    .filter((s): s is number => s !== null);
  const avgProductionScore = productionScores.length > 0
    ? productionScores.reduce((a, b) => a + b, 0) / productionScores.length
    : null;

  // Calculate average supply block time (seconds)
  const supplyBlockTimes = entries
    .map(e => e.supply_block_time)
    .filter((t): t is number => t !== null);
  const avgSupplyBlockTime = supplyBlockTimes.length > 0
    ? supplyBlockTimes.reduce((a, b) => a + b, 0) / supplyBlockTimes.length
    : null;

  // Calculate average production idle time (seconds)
  const productionIdleTimes = entries
    .map(e => e.production_idle_time)
    .filter((t): t is number => t !== null);
  const avgProductionIdleTime = productionIdleTimes.length > 0
    ? productionIdleTimes.reduce((a, b) => a + b, 0) / productionIdleTimes.length
    : null;

  return {
    replayCount,
    wins,
    losses,
    winRate,
    avgSupplyScore,
    avgProductionScore,
    avgSupplyBlockTime,
    avgProductionIdleTime,
  };
}

/**
 * Build time-series data from replay index entries
 */
export function buildTimeSeriesData(
  replays: ReplayIndexEntry[],
  period: TimePeriod
): TimeSeriesData {
  const groups = groupReplaysByPeriod(replays, period);

  // Convert groups to data points
  const dataPoints: TimeSeriesDataPoint[] = [];
  const sortedKeys = Array.from(groups.keys()).sort();

  for (const key of sortedKeys) {
    const group = groups.get(key)!;
    const metrics = aggregateMetrics(group.entries);

    dataPoints.push({
      date: key,
      label: group.label,
      replayCount: metrics.replayCount,
      wins: metrics.wins,
      losses: metrics.losses,
      winRate: metrics.winRate,
      avgSupplyScore: metrics.avgSupplyScore,
      avgProductionScore: metrics.avgProductionScore,
      avgSupplyBlockTime: metrics.avgSupplyBlockTime,
      avgProductionIdleTime: metrics.avgProductionIdleTime,
      replayIds: group.entries.map(e => e.id),
    });
  }

  // Calculate totals
  const totals = aggregateMetrics(replays);

  // Determine date range
  const dates = replays
    .map(r => r.game_date || r.uploaded_at)
    .filter((d): d is string => d !== null)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()));

  const startDate = dates.length > 0
    ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString()
    : new Date().toISOString();
  const endDate = dates.length > 0
    ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
    : new Date().toISOString();

  return {
    period,
    startDate,
    endDate,
    dataPoints,
    totals,
  };
}

/**
 * Build time-series data for a specific matchup
 */
export function buildMatchupTimeSeries(
  replays: ReplayIndexEntry[],
  matchup: string,
  period: TimePeriod
): MatchupTimeSeriesData {
  const matchupReplays = replays.filter(r => r.matchup === matchup);
  return {
    matchup,
    data: buildTimeSeriesData(matchupReplays, period),
  };
}

// ============================================================================
// Enhanced Metrics (requires full UserReplayData)
// ============================================================================

export interface EnhancedTimeSeriesDataPoint extends TimeSeriesDataPoint {
  avgSupplyBlockTime: number | null;
  avgProductionIdleTime: number | null;
  avgMineralFloat: number | null;
  avgGasFloat: number | null;
}

/**
 * Calculate enhanced metrics that require full fingerprint data
 */
export function calculateEnhancedMetrics(
  replays: UserReplayData[]
): {
  avgSupplyBlockTime: number | null;
  avgProductionIdleTime: number | null;
  avgMineralFloat: number | null;
  avgGasFloat: number | null;
} {
  const supplyBlockTimes: number[] = [];
  const productionIdleTimes: number[] = [];
  const mineralFloats: number[] = [];
  const gasFloats: number[] = [];

  for (const replay of replays) {
    const fp = replay.fingerprint;

    // Supply block time
    if (fp.economy.total_supply_block_time !== undefined) {
      supplyBlockTimes.push(fp.economy.total_supply_block_time);
    }

    // Production idle time
    if (fp.economy.production_by_building) {
      const totalIdle = Object.values(fp.economy.production_by_building)
        .reduce((sum, b) => sum + (b.idle_seconds || 0), 0);
      productionIdleTimes.push(totalIdle);
    }

    // Mineral float
    const mineralFloat = fp.economy['avg_mineral_float_5min+'];
    if (mineralFloat !== undefined) {
      mineralFloats.push(mineralFloat);
    }

    // Gas float
    const gasFloat = fp.economy['avg_gas_float_5min+'];
    if (gasFloat !== undefined) {
      gasFloats.push(gasFloat);
    }
  }

  return {
    avgSupplyBlockTime: supplyBlockTimes.length > 0
      ? supplyBlockTimes.reduce((a, b) => a + b, 0) / supplyBlockTimes.length
      : null,
    avgProductionIdleTime: productionIdleTimes.length > 0
      ? productionIdleTimes.reduce((a, b) => a + b, 0) / productionIdleTimes.length
      : null,
    avgMineralFloat: mineralFloats.length > 0
      ? mineralFloats.reduce((a, b) => a + b, 0) / mineralFloats.length
      : null,
    avgGasFloat: gasFloats.length > 0
      ? gasFloats.reduce((a, b) => a + b, 0) / gasFloats.length
      : null,
  };
}

// ============================================================================
// Async Computation (avoids UI blocking)
// ============================================================================

/**
 * Run computation in idle callback to avoid UI blocking
 */
export function computeAsync<T>(
  compute: () => T,
  onComplete: (result: T) => void,
  onError?: (error: Error) => void
): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      try {
        const result = compute();
        onComplete(result);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      try {
        const result = compute();
        onComplete(result);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }, 0);
  }
}

/**
 * Build time-series data asynchronously
 */
export function buildTimeSeriesDataAsync(
  replays: ReplayIndexEntry[],
  period: TimePeriod,
  onComplete: (data: TimeSeriesData) => void,
  onError?: (error: Error) => void
): void {
  computeAsync(
    () => buildTimeSeriesData(replays, period),
    onComplete,
    onError
  );
}

// ============================================================================
// Single Replay Timeline Extraction
// ============================================================================

export interface SupplyTimelinePoint {
  time: number; // seconds
  current: number;
  max: number;
  blocked: boolean;
}

export interface ResourceTimelinePoint {
  time: number; // seconds
  minerals: number;
  gas: number;
}

/**
 * Extract supply timeline from fingerprint
 */
export function extractSupplyTimeline(fingerprint: ReplayFingerprint): SupplyTimelinePoint[] {
  const timeline: SupplyTimelinePoint[] = [];

  if (!fingerprint.supply_timeline) {
    return timeline;
  }

  // Get supply block periods for marking blocked status
  const blockPeriods = fingerprint.economy.supply_block_periods || [];

  // Convert timeline to array
  const times = Object.keys(fingerprint.supply_timeline)
    .map(Number)
    .sort((a, b) => a - b);

  for (const time of times) {
    const data = fingerprint.supply_timeline[time];
    const blocked = blockPeriods.some(bp => time >= bp.start && time <= bp.end);

    timeline.push({
      time,
      current: data.current,
      max: data.max,
      blocked,
    });
  }

  return timeline;
}

/**
 * Extract resource timeline from fingerprint
 */
export function extractResourceTimeline(fingerprint: ReplayFingerprint): ResourceTimelinePoint[] {
  const timeline: ResourceTimelinePoint[] = [];

  if (!fingerprint.resource_timeline) {
    return timeline;
  }

  const times = Object.keys(fingerprint.resource_timeline)
    .map(Number)
    .sort((a, b) => a - b);

  for (const time of times) {
    const data = fingerprint.resource_timeline[time];
    timeline.push({
      time,
      minerals: data.minerals,
      gas: data.gas,
    });
  }

  return timeline;
}

/**
 * Interpolate checkpoints to full timeline
 */
export function interpolateCheckpoints(
  checkpoints: Record<string, number>,
  gameDuration: number,
  intervalSeconds: number = 30
): Array<{ time: number; value: number }> {
  const result: Array<{ time: number; value: number }> = [];

  // Convert keys to numbers and sort
  const times = Object.keys(checkpoints)
    .map(Number)
    .sort((a, b) => a - b);

  if (times.length === 0) {
    return result;
  }

  // Get values as numbers (keys are always strings in JS objects)
  const values = times.map(t => checkpoints[t.toString()]);

  // Linear interpolation between checkpoints
  for (let t = 0; t <= gameDuration; t += intervalSeconds) {
    // Find surrounding checkpoints
    let lower = 0;
    let upper = times.length - 1;

    for (let i = 0; i < times.length; i++) {
      if (times[i] <= t) lower = i;
      if (times[i] >= t && (upper === times.length - 1 || times[upper] > t)) {
        upper = i;
        break;
      }
    }

    // Interpolate
    let value: number;
    if (lower === upper) {
      value = values[lower];
    } else {
      const ratio = (t - times[lower]) / (times[upper] - times[lower]);
      value = values[lower] + ratio * (values[upper] - values[lower]);
    }

    result.push({ time: t, value: Math.round(value) });
  }

  return result;
}
