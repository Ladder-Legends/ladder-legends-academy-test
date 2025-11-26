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
 * Calculate production score as inverse percentage of game time spent idle
 * Score = 100 - (idle_time / game_duration * 100)
 * Note: idle_time is summed across all production buildings
 */
function calculateProductionScore(replay: UserReplayData): number | null {
  const duration = replay.fingerprint?.metadata?.duration;
  if (!duration || duration === 0) return null;

  // Calculate total idle time from production_by_building
  const productionByBuilding = replay.fingerprint?.economy?.production_by_building;
  if (!productionByBuilding) return null;

  let totalIdleTime = 0;
  for (const building of Object.values(productionByBuilding)) {
    totalIdleTime += (building as { idle_seconds?: number }).idle_seconds || 0;
  }

  // Score = 100 - idle percentage
  const idlePercent = (totalIdleTime / duration) * 100;
  return Math.max(0, Math.min(100, 100 - idlePercent));
}

/**
 * Calculate supply score as inverse percentage of game time spent blocked
 * Score = 100 - (block_time / game_duration * 100)
 */
function calculateSupplyScore(replay: UserReplayData): number | null {
  const duration = replay.fingerprint?.metadata?.duration;
  if (!duration || duration === 0) return null;

  const totalBlockTime = replay.fingerprint?.economy?.total_supply_block_time;
  if (totalBlockTime == null) return null;

  // Score = 100 - block percentage
  const blockPercent = (totalBlockTime / duration) * 100;
  return Math.max(0, Math.min(100, 100 - blockPercent));
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
 * Calculate total game time across all replays
 * Returns total seconds of gameplay
 */
function calculateTotalGameTime(replays: UserReplayData[]): number {
  return replays.reduce((sum, r) => {
    const duration = r.fingerprint?.metadata?.duration || 0;
    return sum + duration;
  }, 0);
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
  totalGameTime,
  gameCount,
}: {
  avgScore: number | null;
  totalIdleTime: number | null;
  totalGameTime: number;
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
      {totalGameTime > 0 && (
        <p className="text-sm text-muted-foreground">
          {formatTimeValue(totalGameTime)} total playtime
        </p>
      )}
      <div className="border-t pt-2 mt-2">
        <p className="text-xs font-medium mb-1">Note:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>Idle time is summed across ALL production buildings</li>
          <li>5 idle Barracks for 1 min = 5 min idle</li>
          <li>Lower idle % = higher score</li>
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
  const totalGameTime = useMemo(() => calculateTotalGameTime(activeReplays), [activeReplays]);

  // Production subtitle - show total time with game time context if available
  const productionSubtitle = totalIdleTime !== null
    ? totalGameTime > 0
      ? `${formatTime(totalIdleTime)} idle / ${formatTime(totalGameTime)} played`
      : `${formatTime(totalIdleTime)} total idle`
    : productionScore !== null
      ? 'Based on execution'
      : 'No data yet';

  // Supply subtitle - show total time with game time context when available
  const supplySubtitle = totalBlockTime !== null
    ? totalGameTime > 0
      ? `${formatTime(totalBlockTime)} blocked / ${formatTime(totalGameTime)} played`
      : `${formatTime(totalBlockTime)} total blocked`
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
              totalGameTime={totalGameTime}
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
  );
}
