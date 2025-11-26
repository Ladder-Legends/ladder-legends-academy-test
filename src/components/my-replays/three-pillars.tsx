'use client';

import { useMemo } from 'react';
import { Cog, BarChart3 } from 'lucide-react';
import { PillarCard } from './pillar-card';
import type { UserReplayData } from '@/lib/replay-types';

interface ThreePillarsProps {
  replays: UserReplayData[];
  confirmedPlayerNames?: string[];
}

/**
 * Calculate production score based on idle time and macro efficiency
 * Formula:
 * - Start at 100
 * - First 10s idle: -1 per second
 * - 10-30s idle: -2 per second
 * - 30s+ idle: -3 per second
 * - Macro ability inefficiency: up to -20 points
 */
function calculateProductionScore(replay: UserReplayData): number | null {
  // Check if we have production metrics
  const productionIdlePercent = (replay as { fingerprint?: { production?: { idle_percent?: number } } })
    ?.fingerprint?.production?.idle_percent;

  // If we have explicit production score from metrics, use that
  const metricsProductionScore = (replay as { production_score?: number }).production_score;
  if (typeof metricsProductionScore === 'number') {
    return metricsProductionScore;
  }

  // If we have comparison execution score, use that as a proxy
  if (replay.comparison?.execution_score != null) {
    return replay.comparison.execution_score;
  }

  // Fallback: calculate from idle percent if available
  if (typeof productionIdlePercent === 'number') {
    // Rough conversion: 0% idle = 100 score, 20% idle = 0 score
    return Math.max(0, 100 - productionIdlePercent * 5);
  }

  return null;
}

/**
 * Calculate supply score based on supply blocks
 * Formula:
 * - Start at 100
 * - Each block: -10 points
 * - Per second blocked: -2 points
 * - Early block (<5min): 1.5x penalty
 */
function calculateSupplyScore(replay: UserReplayData): number | null {
  const economy = replay.fingerprint?.economy;
  if (!economy) return null;

  const blockCount = economy.supply_block_count;
  const totalBlockTime = economy.total_supply_block_time;

  // If neither metric is available, can't calculate
  if (blockCount == null && totalBlockTime == null) return null;

  let score = 100;
  let penalty = 0;

  // Block count penalty
  if (blockCount != null) {
    penalty += blockCount * 10;
  }

  // Block duration penalty
  if (totalBlockTime != null) {
    penalty += totalBlockTime * 2;
  }

  // Early block penalty would require block_events with timestamps
  // For now, use a simple calculation
  if (economy.supply_block_periods?.length) {
    for (const block of economy.supply_block_periods) {
      if (block.start < 300) { // Before 5 minutes
        // Add 50% more penalty for early blocks
        penalty += (block.duration || 0) * 1;
      }
    }
  }

  score = Math.max(0, score - penalty);
  return Math.min(100, score);
}

/**
 * Aggregate production scores across multiple replays
 */
function aggregateProductionScore(replays: UserReplayData[]): number | null {
  const scores = replays
    .map(r => calculateProductionScore(r))
    .filter((s): s is number => s !== null);

  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Aggregate supply scores across multiple replays
 */
function aggregateSupplyScore(replays: UserReplayData[]): number | null {
  const scores = replays
    .map(r => calculateSupplyScore(r))
    .filter((s): s is number => s !== null);

  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Calculate total production idle time from production_by_building
 * Returns total across all games (not average)
 */
function calculateTotalIdleTime(replays: UserReplayData[]): number | null {
  let total = 0;
  let hasData = false;

  for (const replay of replays) {
    const productionByBuilding = replay.fingerprint?.economy?.production_by_building;
    if (productionByBuilding) {
      hasData = true;
      for (const building of Object.values(productionByBuilding)) {
        total += building.idle_seconds || 0;
      }
    }
  }

  return hasData ? total : null;
}

/**
 * Calculate total supply block time
 * Returns total across all games (not average)
 */
function calculateTotalSupplyBlockTime(replays: UserReplayData[]): number | null {
  const times = replays
    .map(r => r.fingerprint?.economy?.total_supply_block_time)
    .filter((t): t is number => t !== null && t !== undefined);

  if (times.length === 0) return null;
  return times.reduce((sum, t) => sum + t, 0);
}

/**
 * Calculate average supply block count
 */
function calculateAvgSupplyBlocks(replays: UserReplayData[]): number | null {
  const counts = replays
    .map(r => r.fingerprint?.economy?.supply_block_count)
    .filter((c): c is number => c !== null && c !== undefined);

  if (counts.length === 0) return null;
  return counts.reduce((sum, c) => sum + c, 0) / counts.length;
}

/**
 * Format time for display (exported for tooltips)
 */
function formatTimeValue(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Production Tooltip Content
 */
function ProductionTooltipContent({
  avgScore,
  totalIdleTime,
  gameCount,
}: {
  avgScore: number | null;
  totalIdleTime: number | null;
  gameCount: number;
}) {
  return (
    <div className="space-y-2">
      <p className="font-semibold">Production Efficiency: {avgScore !== null ? `${Math.round(avgScore)}%` : 'N/A'}</p>
      {totalIdleTime !== null && (
        <p className="text-sm text-muted-foreground">
          {formatTimeValue(totalIdleTime)} total idle across {gameCount} game{gameCount !== 1 ? 's' : ''}
        </p>
      )}
      <div className="border-t pt-2 mt-2">
        <p className="text-xs font-medium mb-1">Score based on:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>% of game spent with idle production</li>
          <li>Lower idle % = higher score</li>
          <li>10% idle ≈ 80% score</li>
          <li>20% idle ≈ 60% score</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Supply Tooltip Content
 */
function SupplyTooltipContent({
  avgScore,
  avgBlocks,
  totalBlockTime,
  gameCount,
}: {
  avgScore: number | null;
  avgBlocks: number | null;
  totalBlockTime: number | null;
  gameCount: number;
}) {
  return (
    <div className="space-y-2">
      <p className="font-semibold">Supply Management: {avgScore !== null ? `${Math.round(avgScore)}%` : 'N/A'}</p>
      {avgBlocks !== null && (
        <p className="text-sm text-muted-foreground">
          {avgBlocks.toFixed(1)} blocks per game avg
        </p>
      )}
      {totalBlockTime !== null && (
        <p className="text-sm text-muted-foreground">
          {formatTimeValue(totalBlockTime)} total blocked across {gameCount} game{gameCount !== 1 ? 's' : ''}
        </p>
      )}
      <div className="border-t pt-2 mt-2">
        <p className="text-xs font-medium mb-1">Score based on:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>% of game spent supply blocked</li>
          <li>Lower block % = higher score</li>
          <li>10% blocked ≈ 75% score</li>
          <li>20% blocked ≈ 50% score</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * ThreePillars - Container component showing Production and Supply pillars
 */
export function ThreePillars({ replays, confirmedPlayerNames: _confirmedPlayerNames }: ThreePillarsProps) {
  // Filter out observer games
  const activeReplays = useMemo(() =>
    replays.filter((r) => {
      if (r.fingerprint.all_players && r.fingerprint.player_name) {
        const playerData = r.fingerprint.all_players.find(p => p.name === r.fingerprint.player_name);
        return playerData && !playerData.is_observer;
      }
      return true;
    }),
    [replays]
  );

  // Calculate aggregate scores
  const productionScore = useMemo(() => aggregateProductionScore(activeReplays), [activeReplays]);
  const supplyScore = useMemo(() => aggregateSupplyScore(activeReplays), [activeReplays]);

  // Calculate total time metrics (summed across all games)
  const totalIdleTime = useMemo(() => calculateTotalIdleTime(activeReplays), [activeReplays]);
  const totalBlockTime = useMemo(() => calculateTotalSupplyBlockTime(activeReplays), [activeReplays]);
  const avgSupplyBlocks = useMemo(() => calculateAvgSupplyBlocks(activeReplays), [activeReplays]);

  // Production subtitle - show total time if available
  const productionSubtitle = totalIdleTime !== null
    ? `${formatTime(totalIdleTime)} total idle`
    : productionScore !== null
      ? 'Based on execution'
      : 'No data yet';

  // Supply subtitle - show total time when available
  const supplySubtitle = totalBlockTime !== null
    ? `${formatTime(totalBlockTime)} total blocked`
    : supplyScore !== null
      ? 'Calculated from replays'
      : 'No data yet';

  // Helper to format time
  function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }

  const gameCount = activeReplays.length;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">The Three Pillars</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Production Pillar */}
        <PillarCard
          title="Production"
          icon={<Cog className="h-6 w-6" />}
          score={productionScore}
          subtitle={productionSubtitle}
          tooltipContent={
            <ProductionTooltipContent
              avgScore={productionScore}
              totalIdleTime={totalIdleTime}
              gameCount={gameCount}
            />
          }
        />

        {/* Supply Pillar */}
        <PillarCard
          title="Supply"
          icon={<BarChart3 className="h-6 w-6" />}
          score={supplyScore}
          subtitle={supplySubtitle}
          tooltipContent={
            <SupplyTooltipContent
              avgScore={supplyScore}
              avgBlocks={avgSupplyBlocks}
              totalBlockTime={totalBlockTime}
              gameCount={gameCount}
            />
          }
        />
      </div>
    </div>
  );
}
