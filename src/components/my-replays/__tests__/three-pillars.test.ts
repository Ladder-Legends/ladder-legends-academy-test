/**
 * Tests for Three Pillars component calculations
 */
import { describe, it, expect } from 'vitest';
import type { UserReplayData } from '@/lib/replay-types';

// Extract the calculation functions for testing
// These mirror the logic in three-pillars.tsx

function calculateProductionScore(replay: UserReplayData): number | null {
  // Use comparison execution score if available
  if (replay.comparison?.execution_score != null) {
    return replay.comparison.execution_score;
  }

  // Check for production idle percent (future feature)
  const productionIdlePercent = (replay as { fingerprint?: { production?: { idle_percent?: number } } })
    ?.fingerprint?.production?.idle_percent;

  if (typeof productionIdlePercent === 'number') {
    return Math.max(0, 100 - productionIdlePercent * 5);
  }

  return null;
}

function calculateSupplyScore(replay: UserReplayData): number | null {
  const economy = replay.fingerprint?.economy;
  if (!economy) return null;

  const blockCount = economy.supply_block_count;
  const totalBlockTime = economy.total_supply_block_time;

  if (blockCount == null && totalBlockTime == null) return null;

  let score = 100;
  let penalty = 0;

  if (blockCount != null) penalty += blockCount * 10;
  if (totalBlockTime != null) penalty += totalBlockTime * 2;

  // Early block penalty
  if (economy.supply_block_periods?.length) {
    for (const block of economy.supply_block_periods) {
      if (block.start < 300) {
        penalty += (block.duration || 0) * 1;
      }
    }
  }

  score = Math.max(0, score - penalty);
  return Math.min(100, score);
}

function aggregateScores(scores: (number | null)[]): number | null {
  const validScores = scores.filter((s): s is number => s !== null);
  if (validScores.length === 0) return null;
  return validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
}

// Helper to create a complete fingerprint with all required fields
function createFingerprint(overrides: Partial<UserReplayData['fingerprint']> = {}): UserReplayData['fingerprint'] {
  return {
    matchup: 'TvP',
    race: 'Terran',
    player_name: 'TestPlayer',
    all_players: [
      { name: 'TestPlayer', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: null, apm: 100 },
      { name: 'Opponent', race: 'Protoss', result: 'Loss', team: 2, is_observer: false, mmr: null, apm: 100 },
    ],
    metadata: {
      map: 'Test Map',
      duration: 600,
      result: 'Win',
      opponent_race: 'Protoss',
      game_type: '1v1',
      category: 'Ladder',
      game_date: '2025-01-26T00:00:00Z',
    },
    economy: {
      workers_3min: 12,
      workers_5min: 29,
      workers_7min: 48,
      expansion_count: 2,
      avg_expansion_timing: 180,
      supply_block_count: 0,
      total_supply_block_time: 0,
    },
    timings: {},
    sequences: { tech_sequence: [], build_sequence: [], upgrade_sequence: [] },
    army_composition: {},
    production_timeline: {},
    tactical: {
      moveout_times: [],
      first_moveout: null,
      harass_count: 0,
      engagement_count: 0,
      first_engagement: null,
    },
    micro: {
      selection_count: 0,
      avg_selections_per_min: 0,
      control_groups_used: 0,
      most_used_control_group: null,
      camera_movement_count: 0,
      avg_camera_moves_per_min: 0,
    },
    positioning: {
      proxy_buildings: 0,
      avg_building_distance_from_main: null,
    },
    ratios: {
      gas_count: 2,
      production_count: 4,
      tech_count: 1,
      reactor_count: 1,
      techlab_count: 1,
      expansions: 2,
      gas_per_base: 1,
      production_per_base: 2,
    },
    ...overrides,
  };
}

// Helper to create minimal replay data
function createReplay(overrides: Partial<UserReplayData> = {}): UserReplayData {
  return {
    id: 'test-replay',
    discord_user_id: 'user123',
    uploaded_at: '2025-01-26T00:00:00Z',
    filename: 'test.SC2Replay',
    detection: null,
    comparison: null,
    fingerprint: createFingerprint(),
    ...overrides,
  };
}

// Helper to create a ComparisonResult with the required structure
function createComparison(executionScore: number): UserReplayData['comparison'] {
  return {
    filename: 'test.SC2Replay',
    build_name: 'Test Build',
    build_id: 'test',
    matchup: 'TvP',
    execution_score: executionScore,
    tier: 'B' as const,
    timing_comparison: {},
    composition_comparison: {},
    production_comparison: {},
    replay_fingerprint: createFingerprint(),
  };
}

describe('Production Score Calculation', () => {
  it('returns null when no production data available', () => {
    const replay = createReplay();
    expect(calculateProductionScore(replay)).toBeNull();
  });

  it('uses comparison execution score when available', () => {
    const replay = createReplay({
      comparison: createComparison(85),
    });
    expect(calculateProductionScore(replay)).toBe(85);
  });

  it('handles execution score of 0', () => {
    const replay = createReplay({
      comparison: createComparison(0),
    });
    expect(calculateProductionScore(replay)).toBe(0);
  });

  it('handles execution score of 100', () => {
    const replay = createReplay({
      comparison: createComparison(100),
    });
    expect(calculateProductionScore(replay)).toBe(100);
  });
});

// Base economy fields to merge with test-specific overrides
const baseEconomy = {
  workers_3min: 12,
  workers_5min: 29,
  workers_7min: 48,
  expansion_count: 2,
  avg_expansion_timing: 180,
};

describe('Supply Score Calculation', () => {
  it('returns null when no economy data', () => {
    const replay = createReplay();
    replay.fingerprint.economy = undefined as never;
    expect(calculateSupplyScore(replay)).toBeNull();
  });

  it('returns null when no supply block metrics', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
    };
    expect(calculateSupplyScore(replay)).toBeNull();
  });

  it('returns 100 for no supply blocks', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
      supply_block_count: 0,
      total_supply_block_time: 0,
    };
    expect(calculateSupplyScore(replay)).toBe(100);
  });

  it('penalizes supply block count (-10 per block)', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
      supply_block_count: 3,
      total_supply_block_time: 0,
    };
    expect(calculateSupplyScore(replay)).toBe(70);
  });

  it('penalizes supply block duration (-2 per second)', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
      supply_block_count: 0,
      total_supply_block_time: 20,
    };
    expect(calculateSupplyScore(replay)).toBe(60);
  });

  it('combines block count and duration penalties', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
      supply_block_count: 2, // -20
      total_supply_block_time: 15, // -30
    };
    expect(calculateSupplyScore(replay)).toBe(50);
  });

  it('applies early block penalty (before 5 minutes)', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
      supply_block_count: 1,
      total_supply_block_time: 10,
      supply_block_periods: [
        { start: 180, end: 190, duration: 10 }, // Before 5 min (300s)
      ],
    };
    // Base: 100 - 10 (1 block) - 20 (10s * 2) - 10 (early penalty) = 60
    expect(calculateSupplyScore(replay)).toBe(60);
  });

  it('does not apply early penalty for late blocks', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
      supply_block_count: 1,
      total_supply_block_time: 10,
      supply_block_periods: [
        { start: 400, end: 410, duration: 10 }, // After 5 min
      ],
    };
    // Base: 100 - 10 (1 block) - 20 (10s * 2) = 70
    expect(calculateSupplyScore(replay)).toBe(70);
  });

  it('clamps score to minimum of 0', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
      supply_block_count: 10, // -100
      total_supply_block_time: 60, // -120
    };
    expect(calculateSupplyScore(replay)).toBe(0);
  });

  it('clamps score to maximum of 100', () => {
    const replay = createReplay();
    replay.fingerprint.economy = {
      ...baseEconomy,
      supply_block_count: -5, // Would add +50 if not handled
      total_supply_block_time: 0,
    };
    // Negative block count still results in 100 max
    expect(calculateSupplyScore(replay)).toBeLessThanOrEqual(100);
  });
});

describe('Score Aggregation', () => {
  it('returns null for empty array', () => {
    expect(aggregateScores([])).toBeNull();
  });

  it('returns null for all null values', () => {
    expect(aggregateScores([null, null, null])).toBeNull();
  });

  it('calculates average of valid scores', () => {
    expect(aggregateScores([80, 90, 100])).toBe(90);
  });

  it('ignores null values in average', () => {
    expect(aggregateScores([80, null, 100, null])).toBe(90);
  });

  it('handles single value', () => {
    expect(aggregateScores([75])).toBe(75);
  });

  it('handles mixed null and scores', () => {
    expect(aggregateScores([null, 50, null, 100, null])).toBe(75);
  });
});

describe('Score Colors', () => {
  function getScoreColor(score: number | null): string {
    if (score === null) return 'text-muted-foreground';
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  }

  it('returns muted color for null', () => {
    expect(getScoreColor(null)).toBe('text-muted-foreground');
  });

  it('returns green for scores >= 85', () => {
    expect(getScoreColor(85)).toBe('text-green-500');
    expect(getScoreColor(100)).toBe('text-green-500');
  });

  it('returns yellow for scores 70-84', () => {
    expect(getScoreColor(70)).toBe('text-yellow-500');
    expect(getScoreColor(84)).toBe('text-yellow-500');
  });

  it('returns orange for scores 50-69', () => {
    expect(getScoreColor(50)).toBe('text-orange-500');
    expect(getScoreColor(69)).toBe('text-orange-500');
  });

  it('returns red for scores < 50', () => {
    expect(getScoreColor(0)).toBe('text-red-500');
    expect(getScoreColor(49)).toBe('text-red-500');
  });
});

describe('Score Formatting', () => {
  function formatScore(score: number | null): string {
    if (score === null) return '--';
    return `${Math.round(score)}%`;
  }

  it('returns -- for null', () => {
    expect(formatScore(null)).toBe('--');
  });

  it('rounds and adds percent', () => {
    expect(formatScore(85.4)).toBe('85%');
    expect(formatScore(85.6)).toBe('86%');
    expect(formatScore(100)).toBe('100%');
    expect(formatScore(0)).toBe('0%');
  });
});
