/**
 * Phase comparison utilities for SC2 build order execution analysis.
 *
 * Compares player phase snapshots to reference build benchmarks and
 * calculates execution scores.
 */

import type {
  PhaseSnapshot,
  PhaseBenchmark,
  PhaseName,
  PhaseDiff,
  ExecutionScore,
  ReferenceBuild,
} from "./replay-metrics";
import { PHASE_ORDER, getGrade } from "./replay-metrics";

// =============================================================================
// Phase Comparison
// =============================================================================

/**
 * Compare a player's phase snapshot to a benchmark.
 *
 * @param snapshot The player's state at the end of a phase
 * @param benchmark The reference build's expected state
 * @returns Detailed diff between player and benchmark
 */
export function comparePhaseToBenchmark(
  snapshot: PhaseSnapshot,
  benchmark: PhaseBenchmark
): PhaseDiff {
  // Economy diffs (negative = behind benchmark)
  const worker_diff = snapshot.worker_count - benchmark.worker_count;
  const base_diff = snapshot.base_count - benchmark.base_count;
  const gas_diff = snapshot.gas_buildings - benchmark.gas_buildings;

  // Army supply diff
  const army_supply_diff =
    snapshot.total_army_supply_produced - benchmark.army_supply;

  // Get all buildings the player has (production + tech)
  const playerBuildings = new Set([
    ...Object.keys(snapshot.production_buildings),
    ...snapshot.tech_buildings,
  ]);

  const benchmarkBuildings = new Set(benchmark.key_buildings);

  // Missing buildings: in benchmark but not in player's buildings
  const missing_buildings = benchmark.key_buildings.filter(
    (b) => !playerBuildings.has(b)
  );

  // Extra buildings: in player's buildings but not in benchmark
  const extra_buildings = Array.from(playerBuildings).filter(
    (b) => !benchmarkBuildings.has(b)
  );

  // Units
  const playerUnits = new Set(Object.keys(snapshot.units_produced));
  const benchmarkUnits = Object.keys(benchmark.key_units);

  // Missing units: in benchmark but not produced by player
  const missing_units = benchmarkUnits.filter((u) => !playerUnits.has(u));

  // Extra units: produced by player but not in benchmark
  const extra_units = Array.from(playerUnits).filter(
    (u) => !(u in benchmark.key_units)
  );

  // Upgrades
  const playerUpgrades = new Set([
    ...snapshot.upgrades_completed,
    ...snapshot.upgrades_in_progress, // In-progress counts as "on track"
  ]);

  // Missing upgrades: in benchmark but not completed or in progress
  const missing_upgrades = benchmark.key_upgrades.filter(
    (u) => !playerUpgrades.has(u)
  );

  // Extra upgrades: completed by player but not in benchmark
  const extra_upgrades = snapshot.upgrades_completed.filter(
    (u) => !benchmark.key_upgrades.includes(u)
  );

  // Supply block penalty: 0-100 based on block time
  // Rough formula: 1 point per 2 seconds of supply block, capped at 100
  const supply_blocks_penalty = Math.min(
    100,
    Math.floor(snapshot.supply_block_time_in_phase / 2)
  );

  return {
    phase: snapshot.phase,
    worker_diff,
    base_diff,
    gas_diff,
    army_supply_diff,
    missing_units,
    extra_units,
    missing_buildings,
    extra_buildings,
    missing_upgrades,
    extra_upgrades,
    supply_blocks_penalty,
  };
}

// =============================================================================
// Execution Score Calculation
// =============================================================================

/**
 * Weight configuration for score components.
 */
const SCORE_WEIGHTS = {
  economy: 0.3, // 30% weight
  army: 0.25, // 25% weight
  tech: 0.2, // 20% weight
  efficiency: 0.25, // 25% weight
};

/**
 * Calculate a component score from a diff value.
 * Perfect execution = 100, penalties for being behind.
 */
function calculateDiffScore(
  actual: number,
  expected: number,
  tolerancePercent: number = 10
): number {
  if (expected === 0) {
    // If benchmark expects 0, any value is fine
    return 100;
  }

  const diff = actual - expected;
  const tolerance = expected * (tolerancePercent / 100);

  if (diff >= 0) {
    // At or ahead of benchmark
    return 100;
  }

  // Behind benchmark - calculate penalty
  const behindPercent = (Math.abs(diff) / expected) * 100;

  // Each 10% behind costs 15 points
  const penalty = Math.floor(behindPercent / 10) * 15;

  return Math.max(0, 100 - penalty);
}

/**
 * Calculate economy score from worker, base, and gas diffs.
 */
function calculateEconomyScore(diffs: PhaseDiff[]): number {
  let totalScore = 0;
  let count = 0;

  for (const diff of diffs) {
    // Worker score (most important)
    // Estimate expected values from the diff
    // worker_diff = actual - expected, so expected = actual - diff
    // We can use absolute values and penalize negative diffs
    const workerPenalty = diff.worker_diff < 0 ? Math.abs(diff.worker_diff) : 0;
    const workerScore = Math.max(0, 100 - workerPenalty * 5);
    totalScore += workerScore * 2; // Double weight for workers
    count += 2;

    // Base score
    const basePenalty = diff.base_diff < 0 ? Math.abs(diff.base_diff) : 0;
    const baseScore = Math.max(0, 100 - basePenalty * 20);
    totalScore += baseScore;
    count += 1;

    // Gas score
    const gasPenalty = diff.gas_diff < 0 ? Math.abs(diff.gas_diff) : 0;
    const gasScore = Math.max(0, 100 - gasPenalty * 10);
    totalScore += gasScore;
    count += 1;
  }

  return count > 0 ? totalScore / count : 100;
}

/**
 * Calculate army score from army supply and unit composition.
 */
function calculateArmyScore(diffs: PhaseDiff[]): number {
  let totalScore = 0;
  let count = 0;

  for (const diff of diffs) {
    // Army supply score
    const supplyPenalty =
      diff.army_supply_diff < 0 ? Math.abs(diff.army_supply_diff) : 0;
    const supplyScore = Math.max(0, 100 - supplyPenalty * 2);
    totalScore += supplyScore;
    count += 1;

    // Missing units penalty
    const missingPenalty = diff.missing_units.length * 15;
    const unitScore = Math.max(0, 100 - missingPenalty);
    totalScore += unitScore;
    count += 1;
  }

  return count > 0 ? totalScore / count : 100;
}

/**
 * Calculate tech score from buildings and upgrades.
 */
function calculateTechScore(diffs: PhaseDiff[]): number {
  let totalScore = 0;
  let count = 0;

  for (const diff of diffs) {
    // Missing buildings penalty
    const buildingPenalty = diff.missing_buildings.length * 20;
    const buildingScore = Math.max(0, 100 - buildingPenalty);
    totalScore += buildingScore;
    count += 1;

    // Missing upgrades penalty
    const upgradePenalty = diff.missing_upgrades.length * 25;
    const upgradeScore = Math.max(0, 100 - upgradePenalty);
    totalScore += upgradeScore;
    count += 1;
  }

  return count > 0 ? totalScore / count : 100;
}

/**
 * Calculate efficiency score from supply blocks.
 */
function calculateEfficiencyScore(diffs: PhaseDiff[]): number {
  let totalPenalty = 0;

  for (const diff of diffs) {
    totalPenalty += diff.supply_blocks_penalty;
  }

  // Average penalty across phases, then subtract from 100
  const avgPenalty = totalPenalty / diffs.length;
  return Math.max(0, 100 - avgPenalty);
}

/**
 * Calculate the overall execution score for a player's phases.
 *
 * @param phases Player's phase snapshots
 * @param referenceBuild The reference build to compare against
 * @returns Execution score breakdown
 */
export function calculateExecutionScore(
  phases: Record<PhaseName, PhaseSnapshot>,
  referenceBuild: ReferenceBuild
): ExecutionScore {
  // Get diffs for all phases
  const diffs = getAllPhaseDiffs(phases, referenceBuild);

  // Calculate component scores
  const economy_score = calculateEconomyScore(diffs);
  const army_score = calculateArmyScore(diffs);
  const tech_score = calculateTechScore(diffs);
  const efficiency_score = calculateEfficiencyScore(diffs);

  // Calculate weighted total
  const total = Math.round(
    economy_score * SCORE_WEIGHTS.economy +
      army_score * SCORE_WEIGHTS.army +
      tech_score * SCORE_WEIGHTS.tech +
      efficiency_score * SCORE_WEIGHTS.efficiency
  );

  return {
    total,
    economy_score: Math.round(economy_score),
    army_score: Math.round(army_score),
    tech_score: Math.round(tech_score),
    efficiency_score: Math.round(efficiency_score),
    grade: getGrade(total),
  };
}

// =============================================================================
// Grade Descriptions
// =============================================================================

/**
 * Get a human-readable description for a grade.
 *
 * @param grade The letter grade
 * @returns Description of what the grade means
 */
export function getGradeDescription(
  grade: "S" | "A" | "B" | "C" | "D" | "F"
): string {
  switch (grade) {
    case "S":
      return "Excellent execution! Near-perfect build order adherence.";
    case "A":
      return "Great execution with minor timing issues.";
    case "B":
      return "Solid execution with some room for improvement.";
    case "C":
      return "Average execution with clear areas for improvement.";
    case "D":
      return "Below average - needs work on fundamentals.";
    case "F":
      return "Needs significant practice on build order execution.";
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get diffs for all phases in order.
 *
 * @param phases Player's phase snapshots
 * @param referenceBuild Reference build to compare against
 * @returns Array of phase diffs in phase order
 */
export function getAllPhaseDiffs(
  phases: Record<PhaseName, PhaseSnapshot>,
  referenceBuild: ReferenceBuild
): PhaseDiff[] {
  return PHASE_ORDER.map((phaseName) => {
    const snapshot = phases[phaseName];
    const benchmark = referenceBuild.phase_benchmarks[phaseName];
    return comparePhaseToBenchmark(snapshot, benchmark);
  });
}
