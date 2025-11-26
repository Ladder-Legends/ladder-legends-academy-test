'use client';

import { useMemo } from 'react';
import { Cog, BarChart3 } from 'lucide-react';
import { PillarCard } from './pillar-card';
import type { UserReplayData } from '@/lib/replay-types';

interface ThreePillarsProps {
  replays: UserReplayData[];
  confirmedPlayerNames?: string[];
}

// Supply rate constants: supply per minute per building type
// Based on fastest common unit for each building
const SUPPLY_RATE_PER_BUILDING: Record<string, number> = {
  // Terran
  'Barracks': 2.4,      // Marine: 1 supply / 25s = 2.4/min
  'Factory': 4.0,       // Hellion: 2 supply / 30s = 4.0/min
  'Starport': 2.9,      // Viking: 2 supply / 42s = 2.9/min
  // Protoss
  'Gateway': 3.2,       // Zealot: 2 supply / 38s = 3.2/min
  'WarpGate': 4.3,      // Zealot warp: 2 supply / 28s = 4.3/min
  'RoboticsFacility': 4.4, // Immortal: 4 supply / 55s = 4.4/min
  'Stargate': 3.4,      // Phoenix: 2 supply / 35s = 3.4/min
  // Zerg (Hatchery-based, approximate with inject)
  'Hatchery': 6.0,
  'Lair': 6.0,
  'Hive': 6.0,
};

interface ProductionMetrics {
  score: number;
  supplyPerMin: number;
  theoreticalMax: number;
  totalArmySupply: number;
}

/**
 * Calculate production score as percentage of theoretical max supply production
 * Uses phases data for army supply tracking
 */
function calculateProductionScore(replay: UserReplayData): ProductionMetrics | null {
  const duration = replay.fingerprint?.metadata?.duration;
  if (!duration || duration === 0) return null;

  const durationMin = duration / 60;

  // Get phases data from economy
  const phases = replay.fingerprint?.economy?.phases;
  if (phases) {
    // Get the latest phase with data
    const latestPhase = phases.late || phases.mid || phases.early || phases.opening;
    if (latestPhase) {
      const totalArmySupply = latestPhase.total_army_supply_produced || 0;
      const supplyPerMin = totalArmySupply / durationMin;

      // Calculate theoretical max from production buildings
      const prodBuildings = latestPhase.production_buildings || {};
      let theoreticalMax = 0;
      for (const [building, count] of Object.entries(prodBuildings)) {
        const rate = SUPPLY_RATE_PER_BUILDING[building] || 0;
        theoreticalMax += count * rate;
      }

      // If we have both actual and theoretical, calculate efficiency
      if (theoreticalMax > 0) {
        const efficiency = Math.min(100, (supplyPerMin / theoreticalMax) * 100);
        return {
          score: efficiency,
          supplyPerMin,
          theoreticalMax,
          totalArmySupply,
        };
      }

      // If no production buildings tracked, use a benchmark
      // Good production is ~8 supply/min
      const benchmarkScore = Math.min(100, (supplyPerMin / 8) * 100);
      return {
        score: benchmarkScore,
        supplyPerMin,
        theoreticalMax: 8,
        totalArmySupply,
      };
    }
  }

  // Fallback: use old idle time calculation if no phases data
  const productionByBuilding = replay.fingerprint?.economy?.production_by_building;
  if (!productionByBuilding) return null;

  let totalIdleTime = 0;
  for (const building of Object.values(productionByBuilding)) {
    totalIdleTime += (building as { idle_seconds?: number }).idle_seconds || 0;
  }

  // Score = 100 - idle percentage (clamped, as idle can exceed duration with multiple buildings)
  const idlePercent = (totalIdleTime / duration) * 100;
  return {
    score: Math.max(0, Math.min(100, 100 - idlePercent)),
    supplyPerMin: 0,
    theoreticalMax: 0,
    totalArmySupply: 0,
  };
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

interface AggregatedProductionMetrics {
  avgScore: number;
  avgSupplyPerMin: number;
  totalArmySupply: number;
  gameCount: number;
}

/**
 * Aggregate production metrics across multiple replays
 */
function aggregateProductionMetrics(replays: UserReplayData[]): AggregatedProductionMetrics | null {
  const metrics = replays
    .map(r => calculateProductionScore(r))
    .filter((m): m is ProductionMetrics => m !== null);

  if (metrics.length === 0) return null;

  return {
    avgScore: metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length,
    avgSupplyPerMin: metrics.reduce((sum, m) => sum + m.supplyPerMin, 0) / metrics.length,
    totalArmySupply: metrics.reduce((sum, m) => sum + m.totalArmySupply, 0),
    gameCount: metrics.length,
  };
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
  avgSupplyPerMin,
  totalArmySupply,
  totalGameTime,
  gameCount,
}: {
  avgScore: number | null;
  avgSupplyPerMin: number;
  totalArmySupply: number;
  totalGameTime: number;
  gameCount: number;
}) {
  return (
    <div className="space-y-2">
      <p className="font-semibold">Production Efficiency: {avgScore !== null ? `${Math.round(avgScore)}%` : 'N/A'}</p>
      {avgSupplyPerMin > 0 && (
        <p className="text-sm text-muted-foreground">
          {avgSupplyPerMin.toFixed(1)} supply/min average
        </p>
      )}
      {totalArmySupply > 0 && (
        <p className="text-sm text-muted-foreground">
          {totalArmySupply} total army supply across {gameCount} game{gameCount !== 1 ? 's' : ''}
        </p>
      )}
      {totalGameTime > 0 && (
        <p className="text-sm text-muted-foreground">
          {formatTimeValue(totalGameTime)} total playtime
        </p>
      )}
      <div className="border-t pt-2 mt-2">
        <p className="text-xs font-medium mb-1">How it works:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>Measures army supply produced per minute</li>
          <li>Compared to your production capacity</li>
          <li>Higher = better production utilization</li>
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

  // Calculate aggregate metrics
  const productionMetrics = useMemo(() => aggregateProductionMetrics(activeReplays), [activeReplays]);
  const supplyScore = useMemo(() => aggregateSupplyScore(activeReplays), [activeReplays]);

  // Calculate total time metrics (summed across all games)
  const totalBlockTime = useMemo(() => calculateTotalSupplyBlockTime(activeReplays), [activeReplays]);
  const avgSupplyBlocks = useMemo(() => calculateAvgSupplyBlocks(activeReplays), [activeReplays]);
  const totalGameTime = useMemo(() => calculateTotalGameTime(activeReplays), [activeReplays]);

  // Production subtitle - show supply/min if available
  const productionSubtitle = productionMetrics
    ? productionMetrics.avgSupplyPerMin > 0
      ? `${productionMetrics.avgSupplyPerMin.toFixed(1)} supply/min avg`
      : 'Based on execution'
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
          score={productionMetrics?.avgScore ?? null}
          subtitle={productionSubtitle}
          tooltipContent={
            <ProductionTooltipContent
              avgScore={productionMetrics?.avgScore ?? null}
              avgSupplyPerMin={productionMetrics?.avgSupplyPerMin ?? 0}
              totalArmySupply={productionMetrics?.totalArmySupply ?? 0}
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
