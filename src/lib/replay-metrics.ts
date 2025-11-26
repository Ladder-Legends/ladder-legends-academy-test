/**
 * TypeScript types for SC2 Replay Metrics
 *
 * These types match the output from the sc2reader /metrics endpoint.
 * Used for the Production/Supply/Vision coaching system.
 */

// =============================================================================
// Build Order Types
// =============================================================================

/**
 * A single entry in a player's build order.
 */
export interface BuildOrderEntry {
  time: number; // Normal speed seconds
  supply: number;
  item: string; // Unit, building, or upgrade name
  type: "unit" | "building" | "upgrade";
}

// =============================================================================
// Phase Types
// =============================================================================

/**
 * Game phase names.
 * - opening: 0-2:00 Faster (0-168s Normal)
 * - early: 2:00-5:00 Faster (168-420s Normal)
 * - mid: 5:00-7:00 Faster (420-588s Normal)
 * - late: 7:00-10:00 Faster (588-840s Normal)
 */
export type PhaseName = "opening" | "early" | "mid" | "late";

/**
 * Snapshot of game state at the end of a phase.
 * All counts are cumulative (total produced up to this point).
 */
export interface PhaseSnapshot {
  phase: PhaseName;
  end_time: number; // Normal speed seconds

  // Economy
  worker_count: number;
  base_count: number;
  gas_buildings: number;

  // Army
  total_army_supply_produced: number;
  units_produced: Record<string, number>;

  // Buildings
  production_buildings: Record<string, number>;
  tech_buildings: string[];

  // Upgrades
  upgrades_completed: string[];
  upgrades_in_progress: string[];

  // Efficiency (within this phase only)
  supply_blocks_in_phase: number;
  supply_block_time_in_phase: number;
}

// =============================================================================
// Player Analysis Types
// =============================================================================

/**
 * Complete analysis for a single player.
 * This is the structure returned by the /metrics endpoint.
 */
export interface PlayerAnalysis {
  pid: number;
  name: string;
  race: "Terran" | "Protoss" | "Zerg";
  result: "Win" | "Loss" | "Unknown";

  // Fingerprint for build matching
  build_fingerprint: string; // e.g., "T:ssdsgbsm..."

  // Production metrics
  production_score: number | null; // 0-100
  production_idle_total: number | null; // seconds
  production_idle_percent: number | null; // 0-100+

  // Supply metrics
  supply_score: number | null; // 0-100
  supply_block_total: number | null; // seconds
  supply_block_count: number | null;
  supply_block_percent: number | null; // 0-100

  // Resource metrics
  avg_mineral_float: number | null;
  avg_gas_float: number | null;

  // Build order
  build_order: BuildOrderEntry[];

  // Phase snapshots
  phases: Record<PhaseName, PhaseSnapshot>;
}

/**
 * Full metrics response from /metrics endpoint.
 */
export interface MetricsResponse {
  map_name: string;
  duration: number; // Normal speed seconds
  players: Record<string, PlayerAnalysis>;
}

// =============================================================================
// Reference Build Types (for benchmarks)
// =============================================================================

/**
 * A reference build order for comparison.
 */
export interface ReferenceBuild {
  id: string;
  name: string;
  matchup: string; // "TvZ", "PvT", etc.
  race: "Terran" | "Protoss" | "Zerg";
  fingerprint: string;
  description?: string;

  // Phase benchmarks (what you should have at each phase)
  phase_benchmarks: Record<PhaseName, PhaseBenchmark>;
}

/**
 * Benchmark values for a specific phase.
 */
export interface PhaseBenchmark {
  worker_count: number;
  base_count: number;
  gas_buildings: number;
  army_supply: number;
  key_units: Record<string, number>;
  key_buildings: string[];
  key_upgrades: string[];
}

// =============================================================================
// Comparison Result Types
// =============================================================================

/**
 * Result of comparing a player's execution to a reference build.
 */
export interface BuildMatchResult {
  build: ReferenceBuild;
  similarity: number; // 0-1 (Levenshtein-based)
  match_type: "auto" | "suggested" | "no_match";
}

/**
 * Detailed comparison between player and benchmark at a phase.
 */
export interface PhaseDiff {
  phase: PhaseName;

  // Economy diffs
  worker_diff: number; // negative = behind benchmark
  base_diff: number;
  gas_diff: number;

  // Army diffs
  army_supply_diff: number;
  missing_units: string[]; // Units in benchmark but not produced
  extra_units: string[]; // Units produced but not in benchmark

  // Tech diffs
  missing_buildings: string[];
  extra_buildings: string[];
  missing_upgrades: string[];
  extra_upgrades: string[];

  // Efficiency
  supply_blocks_penalty: number; // 0-100 penalty based on blocks
}

/**
 * Overall execution score breakdown.
 */
export interface ExecutionScore {
  total: number; // 0-100

  // Component scores
  economy_score: number; // Worker/base timing
  army_score: number; // Unit composition
  tech_score: number; // Building/upgrade timing
  efficiency_score: number; // Supply blocks, idle time

  // Grade
  grade: "S" | "A" | "B" | "C" | "D" | "F";
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Phase boundaries in Normal speed seconds.
 */
export const PHASE_BOUNDARIES: Record<PhaseName, [number, number]> = {
  opening: [0, 168],
  early: [168, 420],
  mid: [420, 588],
  late: [588, 840],
};

/**
 * Phase order for iteration.
 */
export const PHASE_ORDER: PhaseName[] = ["opening", "early", "mid", "late"];

/**
 * Convert Normal speed seconds to Faster display time.
 */
export function normalToFaster(normalSeconds: number): number {
  return normalSeconds / 1.4;
}

/**
 * Convert Faster display time to Normal speed seconds.
 */
export function fasterToNormal(fasterSeconds: number): number {
  return fasterSeconds * 1.4;
}

/**
 * Format time as MM:SS.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get the phase for a given time (Normal speed seconds).
 */
export function getPhaseForTime(time: number): PhaseName {
  for (const phase of PHASE_ORDER) {
    const [start, end] = PHASE_BOUNDARIES[phase];
    if (time >= start && time < end) {
      return phase;
    }
  }
  return "late"; // Beyond 10 min is still "late"
}

/**
 * Get the grade for a score.
 */
export function getGrade(score: number): "S" | "A" | "B" | "C" | "D" | "F" {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}
