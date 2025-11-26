/**
 * Tests for time-series aggregation utilities
 */
import { describe, it, expect } from 'vitest';
import {
  getStartOfDay,
  getStartOfWeek,
  getStartOfMonth,
  getPeriodKeyAndLabel,
  groupReplaysByPeriod,
  aggregateMetrics,
  buildTimeSeriesData,
  buildMatchupTimeSeries,
  extractSupplyTimeline,
  extractResourceTimeline,
  interpolateCheckpoints,
  type TimePeriod,
} from '../replay-time-series';
import type { ReplayIndexEntry, ReplayFingerprint } from '../replay-types';

// ============================================================================
// Test Helpers
// ============================================================================

function createIndexEntry(overrides: Partial<ReplayIndexEntry> = {}): ReplayIndexEntry {
  return {
    id: 'test-id',
    filename: 'test.SC2Replay',
    uploaded_at: '2025-11-25T10:00:00Z',
    game_date: '2025-11-25T09:00:00Z',
    game_type: '1v1-ladder',
    matchup: 'TvZ',
    result: 'Win',
    duration: 600,
    map_name: 'Test Map',
    opponent_name: 'Opponent',
    reference_id: null,
    reference_alias: null,
    comparison_score: null,
    production_score: 80,
    supply_score: 75,
    vision_score: null,
    supply_block_time: 15,        // seconds
    production_idle_time: 30,     // seconds
    detected_build: null,
    detection_confidence: null,
    ...overrides,
  };
}

function createFingerprint(overrides: Partial<ReplayFingerprint> = {}): ReplayFingerprint {
  return {
    matchup: 'TvZ',
    race: 'Terran',
    player_name: 'TestPlayer',
    all_players: [
      { name: 'TestPlayer', race: 'Terran', result: 'Win', team: 1, is_observer: false },
      { name: 'Opponent', race: 'Zerg', result: 'Loss', team: 2, is_observer: false },
    ],
    metadata: {
      map: 'Test Map',
      duration: 600,
      result: 'Win',
      opponent_race: 'Zerg',
      game_type: '1v1',
      category: 'Ladder',
      game_date: '2025-11-25T09:00:00Z',
    },
    timings: {},
    sequences: { tech_sequence: [], build_sequence: [], upgrade_sequence: [] },
    army_composition: {},
    production_timeline: {},
    economy: {
      workers_3min: 20,
      workers_5min: 40,
      workers_7min: 60,
      expansion_count: 3,
      avg_expansion_timing: 120,
    },
    tactical: {
      moveout_times: [],
      first_moveout: null,
      harass_count: 0,
      engagement_count: 0,
      first_engagement: null,
    },
    micro: {
      selection_count: 100,
      avg_selections_per_min: 10,
      control_groups_used: 5,
      most_used_control_group: '1',
      camera_movement_count: 200,
      avg_camera_moves_per_min: 20,
    },
    positioning: {
      proxy_buildings: 0,
      avg_building_distance_from_main: null,
    },
    ratios: {
      gas_count: 4,
      production_count: 8,
      tech_count: 2,
      reactor_count: 2,
      techlab_count: 2,
      expansions: 3,
      gas_per_base: 1.3,
      production_per_base: 2.7,
    },
    ...overrides,
  };
}

// ============================================================================
// Date Utility Tests
// ============================================================================

describe('Date Utilities', () => {
  describe('getStartOfDay', () => {
    it('returns start of day in UTC', () => {
      const date = new Date('2025-11-25T15:30:00Z');
      const result = getStartOfDay(date);
      expect(result.toISOString()).toBe('2025-11-25T00:00:00.000Z');
    });
  });

  describe('getStartOfWeek', () => {
    it('returns Monday for a mid-week date', () => {
      const wednesday = new Date('2025-11-26T12:00:00Z'); // Wednesday
      const result = getStartOfWeek(wednesday);
      expect(result.getUTCDay()).toBe(1); // Monday
      expect(result.toISOString()).toBe('2025-11-24T00:00:00.000Z');
    });

    it('returns Monday for a Sunday', () => {
      const sunday = new Date('2025-11-30T12:00:00Z'); // Sunday
      const result = getStartOfWeek(sunday);
      expect(result.getUTCDay()).toBe(1); // Monday
      expect(result.toISOString()).toBe('2025-11-24T00:00:00.000Z');
    });

    it('returns same day for Monday', () => {
      const monday = new Date('2025-11-24T12:00:00Z'); // Monday
      const result = getStartOfWeek(monday);
      expect(result.getUTCDay()).toBe(1);
      expect(result.toISOString()).toBe('2025-11-24T00:00:00.000Z');
    });
  });

  describe('getStartOfMonth', () => {
    it('returns first day of month', () => {
      const date = new Date('2025-11-25T15:30:00Z');
      const result = getStartOfMonth(date);
      expect(result.toISOString()).toBe('2025-11-01T00:00:00.000Z');
    });
  });

  describe('getPeriodKeyAndLabel', () => {
    const testDate = new Date('2025-11-25T15:30:00Z');

    it('generates daily key and label', () => {
      const { key, label } = getPeriodKeyAndLabel(testDate, 'daily');
      expect(key).toBe('2025-11-25');
      // Label format depends on locale, just check it contains month abbreviation
      expect(label).toMatch(/Nov/);
    });

    it('generates weekly key and label', () => {
      const { key, label } = getPeriodKeyAndLabel(testDate, 'weekly');
      expect(key).toMatch(/2025-W\d+/);
      // Label now shows the Monday date (e.g., "Nov 25") instead of "Week X"
      expect(label).toMatch(/[A-Z][a-z]{2} \d+/);
    });

    it('generates monthly key and label', () => {
      const { key, label } = getPeriodKeyAndLabel(testDate, 'monthly');
      expect(key).toBe('2025-11');
      // Label format depends on locale, just check it contains month and year
      expect(label).toMatch(/2025/);
    });

    it('generates all-time key and label', () => {
      const { key, label } = getPeriodKeyAndLabel(testDate, 'all-time');
      expect(key).toBe('all');
      expect(label).toBe('All Time');
    });
  });
});

// ============================================================================
// Grouping Tests
// ============================================================================

describe('groupReplaysByPeriod', () => {
  it('groups replays by day', () => {
    const replays = [
      createIndexEntry({ id: '1', game_date: '2025-11-25T10:00:00Z' }),
      createIndexEntry({ id: '2', game_date: '2025-11-25T14:00:00Z' }),
      createIndexEntry({ id: '3', game_date: '2025-11-26T10:00:00Z' }),
    ];

    const groups = groupReplaysByPeriod(replays, 'daily');
    expect(groups.size).toBe(2);
    expect(groups.get('2025-11-25')?.entries.length).toBe(2);
    expect(groups.get('2025-11-26')?.entries.length).toBe(1);
  });

  it('groups replays by week', () => {
    const replays = [
      createIndexEntry({ id: '1', game_date: '2025-11-24T10:00:00Z' }), // Week 48
      createIndexEntry({ id: '2', game_date: '2025-11-25T10:00:00Z' }), // Week 48
      createIndexEntry({ id: '3', game_date: '2025-12-01T10:00:00Z' }), // Week 49
    ];

    const groups = groupReplaysByPeriod(replays, 'weekly');
    expect(groups.size).toBe(2);
  });

  it('groups replays by month', () => {
    const replays = [
      createIndexEntry({ id: '1', game_date: '2025-11-01T10:00:00Z' }),
      createIndexEntry({ id: '2', game_date: '2025-11-15T10:00:00Z' }),
      createIndexEntry({ id: '3', game_date: '2025-12-01T10:00:00Z' }),
    ];

    const groups = groupReplaysByPeriod(replays, 'monthly');
    expect(groups.size).toBe(2);
    expect(groups.get('2025-11')?.entries.length).toBe(2);
    expect(groups.get('2025-12')?.entries.length).toBe(1);
  });

  it('uses uploaded_at as fallback when game_date is null', () => {
    const replays = [
      createIndexEntry({ id: '1', game_date: null, uploaded_at: '2025-11-25T10:00:00Z' }),
    ];

    const groups = groupReplaysByPeriod(replays, 'daily');
    expect(groups.size).toBe(1);
    expect(groups.get('2025-11-25')?.entries.length).toBe(1);
  });

  it('handles empty replay array', () => {
    const groups = groupReplaysByPeriod([], 'daily');
    expect(groups.size).toBe(0);
  });
});

// ============================================================================
// Aggregation Tests
// ============================================================================

describe('aggregateMetrics', () => {
  it('calculates correct win rate', () => {
    const entries = [
      createIndexEntry({ result: 'Win' }),
      createIndexEntry({ result: 'Win' }),
      createIndexEntry({ result: 'Loss' }),
      createIndexEntry({ result: 'Loss' }),
    ];

    const metrics = aggregateMetrics(entries);
    expect(metrics.winRate).toBe(50);
    expect(metrics.wins).toBe(2);
    expect(metrics.losses).toBe(2);
    expect(metrics.replayCount).toBe(4);
  });

  it('calculates average supply score', () => {
    const entries = [
      createIndexEntry({ supply_score: 80 }),
      createIndexEntry({ supply_score: 60 }),
      createIndexEntry({ supply_score: 100 }),
    ];

    const metrics = aggregateMetrics(entries);
    expect(metrics.avgSupplyScore).toBe(80);
  });

  it('calculates average production score', () => {
    const entries = [
      createIndexEntry({ production_score: 70 }),
      createIndexEntry({ production_score: 90 }),
    ];

    const metrics = aggregateMetrics(entries);
    expect(metrics.avgProductionScore).toBe(80);
  });

  it('handles null scores correctly', () => {
    const entries = [
      createIndexEntry({ supply_score: 80, production_score: null }),
      createIndexEntry({ supply_score: null, production_score: 60 }),
    ];

    const metrics = aggregateMetrics(entries);
    expect(metrics.avgSupplyScore).toBe(80);
    expect(metrics.avgProductionScore).toBe(60);
  });

  it('returns null for average when all scores are null', () => {
    const entries = [
      createIndexEntry({ supply_score: null, production_score: null }),
      createIndexEntry({ supply_score: null, production_score: null }),
    ];

    const metrics = aggregateMetrics(entries);
    expect(metrics.avgSupplyScore).toBeNull();
    expect(metrics.avgProductionScore).toBeNull();
  });

  it('handles empty array', () => {
    const metrics = aggregateMetrics([]);
    expect(metrics.replayCount).toBe(0);
    expect(metrics.winRate).toBe(0);
    expect(metrics.avgSupplyScore).toBeNull();
    expect(metrics.avgProductionScore).toBeNull();
  });
});

// ============================================================================
// Time Series Building Tests
// ============================================================================

describe('buildTimeSeriesData', () => {
  it('builds time series with correct structure', () => {
    const replays = [
      createIndexEntry({ id: '1', game_date: '2025-11-24T10:00:00Z', result: 'Win', supply_score: 80 }),
      createIndexEntry({ id: '2', game_date: '2025-11-25T10:00:00Z', result: 'Loss', supply_score: 60 }),
      createIndexEntry({ id: '3', game_date: '2025-11-25T14:00:00Z', result: 'Win', supply_score: 90 }),
    ];

    const data = buildTimeSeriesData(replays, 'daily');

    expect(data.period).toBe('daily');
    expect(data.dataPoints.length).toBe(2);
    expect(data.totals.replayCount).toBe(3);
    expect(data.totals.wins).toBe(2);
    expect(data.totals.losses).toBe(1);
  });

  it('sorts data points chronologically', () => {
    const replays = [
      createIndexEntry({ id: '2', game_date: '2025-11-26T10:00:00Z' }),
      createIndexEntry({ id: '1', game_date: '2025-11-24T10:00:00Z' }),
      createIndexEntry({ id: '3', game_date: '2025-11-25T10:00:00Z' }),
    ];

    const data = buildTimeSeriesData(replays, 'daily');

    expect(data.dataPoints[0].date).toBe('2025-11-24');
    expect(data.dataPoints[1].date).toBe('2025-11-25');
    expect(data.dataPoints[2].date).toBe('2025-11-26');
  });

  it('includes replay IDs in data points', () => {
    const replays = [
      createIndexEntry({ id: 'replay-1', game_date: '2025-11-25T10:00:00Z' }),
      createIndexEntry({ id: 'replay-2', game_date: '2025-11-25T14:00:00Z' }),
    ];

    const data = buildTimeSeriesData(replays, 'daily');

    expect(data.dataPoints[0].replayIds).toContain('replay-1');
    expect(data.dataPoints[0].replayIds).toContain('replay-2');
  });

  it('handles empty replay array', () => {
    const data = buildTimeSeriesData([], 'daily');

    expect(data.dataPoints.length).toBe(0);
    expect(data.totals.replayCount).toBe(0);
  });
});

describe('buildMatchupTimeSeries', () => {
  it('filters replays by matchup', () => {
    const replays = [
      createIndexEntry({ id: '1', matchup: 'TvZ' }),
      createIndexEntry({ id: '2', matchup: 'TvP' }),
      createIndexEntry({ id: '3', matchup: 'TvZ' }),
    ];

    const data = buildMatchupTimeSeries(replays, 'TvZ', 'daily');

    expect(data.matchup).toBe('TvZ');
    expect(data.data.totals.replayCount).toBe(2);
  });
});

// ============================================================================
// Timeline Extraction Tests
// ============================================================================

describe('extractSupplyTimeline', () => {
  it('extracts supply timeline from fingerprint', () => {
    const fingerprint = createFingerprint({
      supply_timeline: {
        0: { current: 12, max: 15 },
        60: { current: 30, max: 46 },
        120: { current: 50, max: 70 },
      },
    });

    const timeline = extractSupplyTimeline(fingerprint);

    expect(timeline.length).toBe(3);
    expect(timeline[0]).toEqual({ time: 0, current: 12, max: 15, blocked: false });
    expect(timeline[1]).toEqual({ time: 60, current: 30, max: 46, blocked: false });
    expect(timeline[2]).toEqual({ time: 120, current: 50, max: 70, blocked: false });
  });

  it('marks blocked periods correctly', () => {
    const fingerprint = createFingerprint({
      supply_timeline: {
        0: { current: 12, max: 15 },
        60: { current: 30, max: 30 }, // Blocked
        120: { current: 50, max: 70 },
      },
      economy: {
        workers_3min: 20,
        workers_5min: 40,
        workers_7min: 60,
        expansion_count: 3,
        avg_expansion_timing: 120,
        supply_block_periods: [
          { start: 55, end: 65, duration: 10, severity: 'warning' },
        ],
      },
    });

    const timeline = extractSupplyTimeline(fingerprint);

    expect(timeline[0].blocked).toBe(false);
    expect(timeline[1].blocked).toBe(true); // time 60 is in block period 55-65
    expect(timeline[2].blocked).toBe(false);
  });

  it('handles missing supply_timeline', () => {
    const fingerprint = createFingerprint();
    const timeline = extractSupplyTimeline(fingerprint);
    expect(timeline).toEqual([]);
  });
});

describe('extractResourceTimeline', () => {
  it('extracts resource timeline from fingerprint', () => {
    const fingerprint = createFingerprint({
      resource_timeline: {
        0: { minerals: 50, gas: 0 },
        60: { minerals: 200, gas: 100 },
        120: { minerals: 500, gas: 300 },
      },
    });

    const timeline = extractResourceTimeline(fingerprint);

    expect(timeline.length).toBe(3);
    expect(timeline[0]).toEqual({ time: 0, minerals: 50, gas: 0 });
    expect(timeline[1]).toEqual({ time: 60, minerals: 200, gas: 100 });
    expect(timeline[2]).toEqual({ time: 120, minerals: 500, gas: 300 });
  });

  it('handles missing resource_timeline', () => {
    const fingerprint = createFingerprint();
    const timeline = extractResourceTimeline(fingerprint);
    expect(timeline).toEqual([]);
  });
});

// ============================================================================
// Interpolation Tests
// ============================================================================

describe('interpolateCheckpoints', () => {
  it('interpolates between checkpoints', () => {
    const checkpoints = {
      '0': 10,
      '60': 30,
      '120': 50,
    };

    const result = interpolateCheckpoints(checkpoints, 120, 30);

    expect(result.length).toBe(5); // 0, 30, 60, 90, 120
    expect(result[0]).toEqual({ time: 0, value: 10 });
    expect(result[1]).toEqual({ time: 30, value: 20 }); // Interpolated
    expect(result[2]).toEqual({ time: 60, value: 30 });
    expect(result[3]).toEqual({ time: 90, value: 40 }); // Interpolated
    expect(result[4]).toEqual({ time: 120, value: 50 });
  });

  it('handles single checkpoint', () => {
    const checkpoints = { '60': 30 };

    const result = interpolateCheckpoints(checkpoints, 120, 60);

    expect(result.length).toBe(3); // 0, 60, 120
    expect(result[0].value).toBe(30); // Uses only available value
    expect(result[1].value).toBe(30);
    expect(result[2].value).toBe(30);
  });

  it('handles empty checkpoints', () => {
    const result = interpolateCheckpoints({}, 120, 30);
    expect(result).toEqual([]);
  });

  it('rounds interpolated values', () => {
    const checkpoints = {
      '0': 10,
      '100': 15,
    };

    const result = interpolateCheckpoints(checkpoints, 100, 33);

    // Values should be rounded to integers
    result.forEach((point) => {
      expect(Number.isInteger(point.value)).toBe(true);
    });
  });
});
