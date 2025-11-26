/**
 * Tests for phase comparison utilities.
 *
 * TDD: These tests were written FIRST, then the implementation.
 */

import {
  comparePhaseToBenchmark,
  calculateExecutionScore,
  getGradeDescription,
  getAllPhaseDiffs,
} from "../phase-comparison";
import type {
  PhaseSnapshot,
  PhaseBenchmark,
  PhaseName,
  ReferenceBuild,
} from "../replay-metrics";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a player phase snapshot for testing.
 */
function createSnapshot(overrides: Partial<PhaseSnapshot> = {}): PhaseSnapshot {
  return {
    phase: "opening",
    end_time: 168,
    worker_count: 19,
    base_count: 1,
    gas_buildings: 1,
    total_army_supply_produced: 0,
    units_produced: {},
    production_buildings: { Barracks: 1 },
    tech_buildings: [],
    upgrades_completed: [],
    upgrades_in_progress: [],
    supply_blocks_in_phase: 0,
    supply_block_time_in_phase: 0,
    ...overrides,
  };
}

/**
 * Create a benchmark for testing.
 */
function createBenchmark(
  overrides: Partial<PhaseBenchmark> = {}
): PhaseBenchmark {
  return {
    worker_count: 19,
    base_count: 1,
    gas_buildings: 1,
    army_supply: 0,
    key_units: {},
    key_buildings: ["Barracks"],
    key_upgrades: [],
    ...overrides,
  };
}

/**
 * Create a full reference build for testing.
 */
function createReferenceBuild(
  overrides: Partial<ReferenceBuild> = {}
): ReferenceBuild {
  return {
    id: "test-build",
    name: "Test Build",
    matchup: "TvZ",
    race: "Terran",
    fingerprint: "T:ssdsgbmm",
    phase_benchmarks: {
      opening: createBenchmark(),
      early: createBenchmark({
        worker_count: 35,
        base_count: 2,
        gas_buildings: 2,
        army_supply: 20,
        key_units: { Marine: 16, Medivac: 2 },
        key_buildings: ["Barracks", "Factory", "Starport"],
        key_upgrades: ["Stimpack"],
      }),
      mid: createBenchmark({
        worker_count: 50,
        base_count: 3,
        gas_buildings: 4,
        army_supply: 60,
        key_units: { Marine: 30, Medivac: 4 },
        key_buildings: [],
        key_upgrades: ["CombatShield"],
      }),
      late: createBenchmark({
        worker_count: 60,
        base_count: 3,
        gas_buildings: 6,
        army_supply: 100,
        key_units: { Marine: 50, Medivac: 6 },
        key_buildings: [],
        key_upgrades: [],
      }),
    },
    ...overrides,
  };
}

// =============================================================================
// Phase Comparison Tests
// =============================================================================

describe("comparePhaseToBenchmark", () => {
  it("returns zero diffs for perfect execution", () => {
    const snapshot = createSnapshot({
      worker_count: 19,
      base_count: 1,
      gas_buildings: 1,
      production_buildings: { Barracks: 1 },
    });
    const benchmark = createBenchmark();

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.phase).toBe("opening");
    expect(diff.worker_diff).toBe(0);
    expect(diff.base_diff).toBe(0);
    expect(diff.gas_diff).toBe(0);
    expect(diff.missing_buildings).toEqual([]);
    expect(diff.extra_buildings).toEqual([]);
  });

  it("calculates negative worker diff when behind", () => {
    const snapshot = createSnapshot({ worker_count: 15 }); // 4 behind
    const benchmark = createBenchmark({ worker_count: 19 });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.worker_diff).toBe(-4);
  });

  it("calculates positive worker diff when ahead", () => {
    const snapshot = createSnapshot({ worker_count: 22 }); // 3 ahead
    const benchmark = createBenchmark({ worker_count: 19 });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.worker_diff).toBe(3);
  });

  it("detects missing buildings", () => {
    const snapshot = createSnapshot({ production_buildings: {} }); // No barracks
    const benchmark = createBenchmark({
      key_buildings: ["Barracks", "Factory"],
    });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.missing_buildings).toContain("Barracks");
    expect(diff.missing_buildings).toContain("Factory");
  });

  it("detects extra buildings", () => {
    const snapshot = createSnapshot({
      production_buildings: { Barracks: 2, Factory: 1 },
      tech_buildings: ["EngineeringBay"],
    });
    const benchmark = createBenchmark({ key_buildings: ["Barracks"] });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.extra_buildings).toContain("Factory");
    expect(diff.extra_buildings).toContain("EngineeringBay");
  });

  it("detects missing units", () => {
    const snapshot = createSnapshot({
      units_produced: { Marine: 8 }, // Only marines
    });
    const benchmark = createBenchmark({
      key_units: { Marine: 16, Medivac: 2 },
    });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.missing_units).toContain("Medivac");
    // Marine count is low but unit is present, so not "missing"
    expect(diff.missing_units).not.toContain("Marine");
  });

  it("detects extra units", () => {
    const snapshot = createSnapshot({
      units_produced: { Marine: 16, Medivac: 2, Hellion: 4 },
    });
    const benchmark = createBenchmark({
      key_units: { Marine: 16, Medivac: 2 },
    });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.extra_units).toContain("Hellion");
  });

  it("detects missing upgrades", () => {
    const snapshot = createSnapshot({
      upgrades_completed: [],
    });
    const benchmark = createBenchmark({
      key_upgrades: ["Stimpack", "CombatShield"],
    });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.missing_upgrades).toContain("Stimpack");
    expect(diff.missing_upgrades).toContain("CombatShield");
  });

  it("handles in-progress upgrades as not missing", () => {
    const snapshot = createSnapshot({
      upgrades_completed: [],
      upgrades_in_progress: ["Stimpack"],
    });
    const benchmark = createBenchmark({
      key_upgrades: ["Stimpack"],
    });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    // In-progress should count as "on track", not missing
    expect(diff.missing_upgrades).not.toContain("Stimpack");
  });

  it("calculates supply block penalty", () => {
    const snapshot = createSnapshot({
      supply_blocks_in_phase: 3,
      supply_block_time_in_phase: 45, // 45 seconds of supply block
    });
    const benchmark = createBenchmark();

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    // Some penalty for being supply blocked
    expect(diff.supply_blocks_penalty).toBeGreaterThan(0);
    expect(diff.supply_blocks_penalty).toBeLessThanOrEqual(100);
  });

  it("returns zero supply penalty for no blocks", () => {
    const snapshot = createSnapshot({
      supply_blocks_in_phase: 0,
      supply_block_time_in_phase: 0,
    });
    const benchmark = createBenchmark();

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.supply_blocks_penalty).toBe(0);
  });

  it("calculates army supply diff", () => {
    const snapshot = createSnapshot({
      total_army_supply_produced: 15, // Behind
    });
    const benchmark = createBenchmark({ army_supply: 20 });

    const diff = comparePhaseToBenchmark(snapshot, benchmark);

    expect(diff.army_supply_diff).toBe(-5);
  });
});

// =============================================================================
// Execution Score Tests
// =============================================================================

describe("calculateExecutionScore", () => {
  const referenceBuild = createReferenceBuild();

  it("returns perfect score for exact match", () => {
    const phases: Record<PhaseName, PhaseSnapshot> = {
      opening: createSnapshot({
        phase: "opening",
        worker_count: 19,
        base_count: 1,
        production_buildings: { Barracks: 1 },
      }),
      early: createSnapshot({
        phase: "early",
        end_time: 420,
        worker_count: 35,
        base_count: 2,
        gas_buildings: 2,
        total_army_supply_produced: 20,
        units_produced: { Marine: 16, Medivac: 2 },
        production_buildings: { Barracks: 3, Factory: 1, Starport: 1 },
        upgrades_completed: ["Stimpack"],
      }),
      mid: createSnapshot({
        phase: "mid",
        end_time: 588,
        worker_count: 50,
        base_count: 3,
        gas_buildings: 4,
        total_army_supply_produced: 60,
        units_produced: { Marine: 30, Medivac: 4 },
        upgrades_completed: ["Stimpack", "CombatShield"],
      }),
      late: createSnapshot({
        phase: "late",
        end_time: 840,
        worker_count: 60,
        base_count: 3,
        gas_buildings: 6,
        total_army_supply_produced: 100,
        units_produced: { Marine: 50, Medivac: 6 },
      }),
    };

    const score = calculateExecutionScore(phases, referenceBuild);

    expect(score.total).toBeGreaterThanOrEqual(90);
    expect(score.grade).toBe("S");
  });

  it("returns lower score for poor execution", () => {
    const phases: Record<PhaseName, PhaseSnapshot> = {
      opening: createSnapshot({
        phase: "opening",
        worker_count: 12, // Way behind
        base_count: 1,
        supply_blocks_in_phase: 3,
        supply_block_time_in_phase: 60,
      }),
      early: createSnapshot({
        phase: "early",
        end_time: 420,
        worker_count: 20, // Way behind
        base_count: 1, // Behind
        total_army_supply_produced: 5, // Way behind
        supply_blocks_in_phase: 4,
        supply_block_time_in_phase: 80,
      }),
      mid: createSnapshot({
        phase: "mid",
        end_time: 588,
        worker_count: 30, // Behind
        base_count: 2, // Behind
        total_army_supply_produced: 20, // Way behind
      }),
      late: createSnapshot({
        phase: "late",
        end_time: 840,
        worker_count: 40, // Behind
        base_count: 2, // Behind
        total_army_supply_produced: 40, // Way behind
      }),
    };

    const score = calculateExecutionScore(phases, referenceBuild);

    expect(score.total).toBeLessThanOrEqual(70);
    expect(["C", "D", "F"]).toContain(score.grade);
  });

  it("breaks down score into components", () => {
    const phases: Record<PhaseName, PhaseSnapshot> = {
      opening: createSnapshot(),
      early: createSnapshot({ phase: "early", end_time: 420 }),
      mid: createSnapshot({ phase: "mid", end_time: 588 }),
      late: createSnapshot({ phase: "late", end_time: 840 }),
    };

    const score = calculateExecutionScore(phases, referenceBuild);

    expect(score).toHaveProperty("economy_score");
    expect(score).toHaveProperty("army_score");
    expect(score).toHaveProperty("tech_score");
    expect(score).toHaveProperty("efficiency_score");
    expect(score.economy_score).toBeGreaterThanOrEqual(0);
    expect(score.economy_score).toBeLessThanOrEqual(100);
  });

  it("assigns correct grades based on total score", () => {
    // Create minimal phases for testing grades
    const createPhases = (): Record<PhaseName, PhaseSnapshot> => ({
      opening: createSnapshot(),
      early: createSnapshot({ phase: "early", end_time: 420 }),
      mid: createSnapshot({ phase: "mid", end_time: 588 }),
      late: createSnapshot({ phase: "late", end_time: 840 }),
    });

    const phases = createPhases();
    const score = calculateExecutionScore(phases, referenceBuild);

    // Grade should be one of the valid grades
    expect(["S", "A", "B", "C", "D", "F"]).toContain(score.grade);
  });
});

// =============================================================================
// Grade Description Tests
// =============================================================================

describe("getGradeDescription", () => {
  it("returns appropriate description for S grade", () => {
    const desc = getGradeDescription("S");
    expect(desc.toLowerCase()).toContain("excellent");
  });

  it("returns appropriate description for A grade", () => {
    const desc = getGradeDescription("A");
    expect(desc.toLowerCase()).toMatch(/great|good|strong/);
  });

  it("returns appropriate description for B grade", () => {
    const desc = getGradeDescription("B");
    expect(desc.toLowerCase()).toMatch(/solid|good|decent/);
  });

  it("returns appropriate description for C grade", () => {
    const desc = getGradeDescription("C");
    expect(desc.toLowerCase()).toMatch(/average|room|improvement/);
  });

  it("returns appropriate description for D grade", () => {
    const desc = getGradeDescription("D");
    expect(desc.toLowerCase()).toMatch(/below|work|improve/);
  });

  it("returns appropriate description for F grade", () => {
    const desc = getGradeDescription("F");
    expect(desc.toLowerCase()).toMatch(/needs|significant|practice/);
  });
});

// =============================================================================
// Get All Phase Diffs Tests
// =============================================================================

describe("getAllPhaseDiffs", () => {
  const referenceBuild = createReferenceBuild();

  it("returns diffs for all four phases", () => {
    const phases: Record<PhaseName, PhaseSnapshot> = {
      opening: createSnapshot({ phase: "opening" }),
      early: createSnapshot({ phase: "early", end_time: 420 }),
      mid: createSnapshot({ phase: "mid", end_time: 588 }),
      late: createSnapshot({ phase: "late", end_time: 840 }),
    };

    const diffs = getAllPhaseDiffs(phases, referenceBuild);

    expect(diffs).toHaveLength(4);
    expect(diffs[0].phase).toBe("opening");
    expect(diffs[1].phase).toBe("early");
    expect(diffs[2].phase).toBe("mid");
    expect(diffs[3].phase).toBe("late");
  });

  it("returns diffs in phase order", () => {
    const phases: Record<PhaseName, PhaseSnapshot> = {
      late: createSnapshot({ phase: "late", end_time: 840 }),
      opening: createSnapshot({ phase: "opening" }),
      mid: createSnapshot({ phase: "mid", end_time: 588 }),
      early: createSnapshot({ phase: "early", end_time: 420 }),
    };

    const diffs = getAllPhaseDiffs(phases, referenceBuild);

    // Should be sorted by phase order, not object key order
    expect(diffs[0].phase).toBe("opening");
    expect(diffs[1].phase).toBe("early");
    expect(diffs[2].phase).toBe("mid");
    expect(diffs[3].phase).toBe("late");
  });

  it("calculates accurate diffs for each phase", () => {
    const phases: Record<PhaseName, PhaseSnapshot> = {
      opening: createSnapshot({
        phase: "opening",
        worker_count: 15, // 4 behind
      }),
      early: createSnapshot({
        phase: "early",
        end_time: 420,
        worker_count: 30, // 5 behind
      }),
      mid: createSnapshot({
        phase: "mid",
        end_time: 588,
        worker_count: 45, // 5 behind
      }),
      late: createSnapshot({
        phase: "late",
        end_time: 840,
        worker_count: 55, // 5 behind
      }),
    };

    const diffs = getAllPhaseDiffs(phases, referenceBuild);

    expect(diffs[0].worker_diff).toBe(-4);
    expect(diffs[1].worker_diff).toBe(-5);
    expect(diffs[2].worker_diff).toBe(-5);
    expect(diffs[3].worker_diff).toBe(-5);
  });
});
