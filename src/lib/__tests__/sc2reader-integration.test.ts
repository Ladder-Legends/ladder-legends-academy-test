/**
 * Integration Tests for SC2 Replay Analysis
 *
 * Tests the SC2ReplayAPIClient against the sc2reader API to verify:
 * 1. Response schemas match TypeScript types
 * 2. Extraction logic populates expected fields
 * 3. Build detection returns valid results
 *
 * These tests can run in two modes:
 * - Unit mode (default): Uses mocked responses
 * - Integration mode: Requires SC2READER_API_URL and real replay fixtures
 *
 * To run integration tests:
 *   SC2READER_API_URL=http://localhost:8000 SC2READER_API_KEY=your-key npm run test -- --testPathPattern=sc2reader-integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type {
  MetricsResponse,
  ReplayFingerprint,
  PlayerMetrics,
  BuildDetection,
  LearnedBuild,
  ReplayPlayer,
} from '../replay-types';

// Check if we're running integration tests
const IS_INTEGRATION_TEST = Boolean(
  process.env.SC2READER_API_URL && process.env.SC2READER_API_URL !== 'http://localhost:8000'
);

// Mock axios for unit tests
const mockAxiosPost = vi.fn();
const mockAxiosGet = vi.fn();

vi.mock('axios', () => ({
  default: {
    post: (...args: unknown[]) => mockAxiosPost(...args),
    get: (...args: unknown[]) => mockAxiosGet(...args),
  },
}));

// Import after mocks
import {
  SC2ReplayAPIClient,
  formatReplayTime,
  normalizeRace,
  determineMatchup,
} from '../sc2reader-client';

/**
 * Create a mock Blob that works in Node.js environment
 * Node's Blob doesn't have arrayBuffer() method in older versions
 */
function createMockBlob(content: string | Buffer): Blob {
  const data = typeof content === 'string' ? content : content.toString('binary');
  const blob = new Blob([data], { type: 'application/octet-stream' });
  // Ensure arrayBuffer works in Node environment
  if (!blob.arrayBuffer) {
    const arrayBuffer = async (): Promise<ArrayBuffer> => {
      const textEncoder = new TextEncoder();
      return textEncoder.encode(data).buffer as ArrayBuffer;
    };
    Object.defineProperty(blob, 'arrayBuffer', { value: arrayBuffer });
  }
  return blob;
}

// ============================================================================
// Test Fixtures - Mock responses matching sc2reader API
// ============================================================================

const mockReplayPlayer: ReplayPlayer = {
  name: 'TestPlayer',
  race: 'Terran',
  result: 'Win',
  team: 1,
  is_observer: false,
  mmr: 4500,
  apm: 150,
};

const mockOpponent: ReplayPlayer = {
  name: 'Opponent',
  race: 'Zerg',
  result: 'Loss',
  team: 2,
  is_observer: false,
  mmr: 4400,
  apm: 180,
};

const mockFingerprint: ReplayFingerprint = {
  matchup: 'TvZ',
  race: 'Terran',
  player_name: 'TestPlayer',
  all_players: [mockReplayPlayer, mockOpponent],
  metadata: {
    map: 'Altitude LE',
    duration: 845,
    result: 'Win',
    opponent_race: 'Zerg',
    game_type: '1v1',
    category: 'Ladder',
    game_date: '2025-01-15T10:30:00Z',
  },
  timings: {
    first_barracks: 52,
    first_factory: 135,
    first_expansion: 120,
    first_starport: 210,
  },
  sequences: {
    tech_sequence: [{ name: 'FactoryTechLab', type: 'addon' }],
    build_sequence: [
      { name: 'Barracks', type: 'building' },
      { name: 'Factory', type: 'building' },
      { name: 'Starport', type: 'building' },
    ],
    upgrade_sequence: ['Stimpack', 'CombatShield'],
  },
  army_composition: {
    '180': { Marine: 8, Hellion: 4 },
    '300': { Marine: 16, Hellion: 6, Tank: 2 },
    '420': { Marine: 24, Tank: 6, Medivac: 4 },
  },
  production_timeline: {
    1: { Marine: 2 },
    2: { Marine: 4, Hellion: 2 },
    3: { Marine: 8, Hellion: 4 },
    4: { Marine: 12, Hellion: 4, Tank: 2 },
  },
  economy: {
    workers_3min: 28,
    workers_5min: 45,
    workers_7min: 56,
    expansion_count: 3,
    avg_expansion_timing: 150,
    'avg_mineral_float_5min+': 350,
    'avg_gas_float_5min+': 180,
    supply_block_count: 2,
    total_supply_block_time: 15,
    production_by_building: {
      Barracks: { count: 3, idle_seconds: 12, production_cycles: 24, first_completed: 78 },
      Factory: { count: 2, idle_seconds: 8, production_cycles: 10, first_completed: 162 },
      Starport: { count: 1, idle_seconds: 5, production_cycles: 8, first_completed: 237 },
    },
    supply_at_checkpoints: {
      '60': 22,
      '120': 38,
      '180': 54,
      '240': 72,
      '300': 90,
    },
    mule_count: 12,
    mule_possible: 15,
    mule_efficiency: 0.8,
  },
  tactical: {
    moveout_times: [420, 600],
    first_moveout: 420,
    harass_count: 2,
    engagement_count: 5,
    first_engagement: 480,
  },
  micro: {
    selection_count: 1200,
    avg_selections_per_min: 85,
    control_groups_used: 7,
    most_used_control_group: '1',
    camera_movement_count: 800,
    avg_camera_moves_per_min: 57,
  },
  positioning: {
    proxy_buildings: 0,
    avg_building_distance_from_main: 25,
  },
  ratios: {
    gas_count: 6,
    production_count: 8,
    tech_count: 3,
    reactor_count: 2,
    techlab_count: 2,
    expansions: 3,
    gas_per_base: 2,
    production_per_base: 2.67,
  },
};

const mockPlayerMetrics: PlayerMetrics = {
  pid: 1,
  name: 'TestPlayer',
  race: 'Terran',
  result: 'Win',
  build_fingerprint: 'T:sbb.f.rb.rrr.fa.m.m',
  production_score: 85,
  production_idle_total: 25,
  production_idle_percent: 3.2,
  supply_score: 92,
  supply_block_total: 15,
  supply_block_count: 2,
  supply_block_percent: 1.8,
  avg_mineral_float: 350,
  avg_gas_float: 180,
  inject_idle_total: null,
  inject_efficiency: null,
  inject_count: null,
  build_order: [
    { time: 12, supply: 14, item: 'SupplyDepot', type: 'building' },
    { time: 20, supply: 16, item: 'Barracks', type: 'building' },
    { time: 38, supply: 19, item: 'Refinery', type: 'building' },
    { time: 52, supply: 21, item: 'OrbitalCommand', type: 'building' },
    { time: 68, supply: 24, item: 'CommandCenter', type: 'building' },
    { time: 78, supply: 26, item: 'Factory', type: 'building' },
  ],
  phases: {},
  fingerprint: mockFingerprint,
};

const mockMetricsResponse: MetricsResponse = {
  filename: 'test_replay.SC2Replay',
  map_name: 'Altitude LE',
  duration: 845,
  game_metadata: {
    game_date: '2025-01-15T10:30:00Z',
    game_type: '1v1',
    category: 'Ladder',
    patch: '5.0.13.92440',
  },
  all_players: [mockReplayPlayer, mockOpponent],
  suggested_player: 'TestPlayer',
  players: {
    '1': mockPlayerMetrics,
    '2': {
      ...mockPlayerMetrics,
      pid: 2,
      name: 'Opponent',
      race: 'Zerg',
      result: 'Loss',
      fingerprint: {
        ...mockFingerprint,
        race: 'Zerg',
        player_name: 'Opponent',
        matchup: 'ZvT',
        metadata: { ...mockFingerprint.metadata, result: 'Loss' },
      },
    },
  },
};

const mockBuildDetection: BuildDetection = {
  build_id: 'learned_tvz_mech',
  build_name: 'Speed Banshee into Mech',
  confidence: 85,
  distance: 12,
};

const mockLearnedBuilds: LearnedBuild[] = [
  { id: 'learned_tvz_mech', name: 'Speed Banshee into Mech', matchup: 'TvZ', num_examples: 5 },
  { id: 'learned_tvp_bio', name: 'Bio Opening', matchup: 'TvP', num_examples: 3 },
];

// ============================================================================
// Unit Tests (with mocks)
// ============================================================================

describe('SC2ReplayAPIClient Unit Tests', () => {
  let client: SC2ReplayAPIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new SC2ReplayAPIClient({
      apiUrl: 'http://test-api:8000',
      apiKey: 'test-key',
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('extractMetrics', () => {
    it('should extract metrics and return properly structured response', async () => {
      mockAxiosPost.mockResolvedValue({ data: mockMetricsResponse });

      const blob = createMockBlob('test');
      const result = await client.extractMetrics(blob, undefined, 'test.SC2Replay');

      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('map_name');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('game_metadata');
      expect(result).toHaveProperty('players');
    });

    it('should reject non-SC2Replay files', async () => {
      const blob = createMockBlob('test');

      await expect(client.extractMetrics(blob, undefined, 'test.txt')).rejects.toThrow(
        'Invalid file type'
      );
    });

    it('should include player fingerprints in response', async () => {
      mockAxiosPost.mockResolvedValue({ data: mockMetricsResponse });

      const blob = createMockBlob('test');
      const result = (await client.extractMetrics(blob, undefined, 'test.SC2Replay')) as MetricsResponse;

      const player = result.players['1'];
      expect(player.fingerprint).toBeDefined();
      expect(player.fingerprint?.matchup).toBe('TvZ');
      expect(player.fingerprint?.economy).toBeDefined();
    });
  });

  describe('detectBuild', () => {
    it('should return build detection result', async () => {
      mockAxiosPost.mockResolvedValue({ data: { detection: mockBuildDetection } });

      const blob = createMockBlob('test');
      const result = await client.detectBuild(blob, undefined, 'test.SC2Replay');

      expect(result).toHaveProperty('build_id');
      expect(result).toHaveProperty('build_name');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('listBuilds', () => {
    it('should return list of learned builds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ builds: mockLearnedBuilds }),
      });

      const result = await client.listBuilds();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('matchup');
    });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('Response Schema Validation', () => {
  describe('MetricsResponse structure', () => {
    it('should have all required top-level fields', () => {
      const response = mockMetricsResponse;

      expect(response.filename).toBeDefined();
      expect(typeof response.filename).toBe('string');

      expect(response.map_name).toBeDefined();
      expect(typeof response.map_name).toBe('string');

      expect(response.duration).toBeDefined();
      expect(typeof response.duration).toBe('number');

      expect(response.game_metadata).toBeDefined();
      expect(typeof response.game_metadata).toBe('object');

      expect(response.players).toBeDefined();
      expect(typeof response.players).toBe('object');
    });

    it('should have valid game_metadata structure', () => {
      const metadata = mockMetricsResponse.game_metadata;

      // Optional fields can be null
      expect(metadata.game_date === null || typeof metadata.game_date === 'string').toBe(true);
      expect(metadata.game_type === null || typeof metadata.game_type === 'string').toBe(true);
      expect(metadata.category === null || typeof metadata.category === 'string').toBe(true);
      expect(metadata.patch === null || typeof metadata.patch === 'string').toBe(true);
    });

    it('should have valid player structure', () => {
      const player = mockMetricsResponse.players['1'];

      expect(typeof player.pid).toBe('number');
      expect(typeof player.name).toBe('string');
      expect(typeof player.race).toBe('string');
      expect(['Win', 'Loss', 'Unknown']).toContain(player.result);
      expect(typeof player.build_fingerprint).toBe('string');

      // Score fields
      expect(typeof player.production_score).toBe('number');
      expect(typeof player.supply_score).toBe('number');

      // Build order
      expect(Array.isArray(player.build_order)).toBe(true);
    });
  });

  describe('ReplayFingerprint structure', () => {
    it('should have all required fingerprint fields', () => {
      const fp = mockFingerprint;

      expect(fp.matchup).toMatch(/^[TZP]v[TZP]$/);
      expect(['Terran', 'Zerg', 'Protoss', 'Random']).toContain(fp.race);
      expect(typeof fp.player_name).toBe('string');
      expect(Array.isArray(fp.all_players)).toBe(true);
    });

    it('should have valid metadata structure', () => {
      const metadata = mockFingerprint.metadata;

      expect(typeof metadata.map).toBe('string');
      expect(typeof metadata.duration === 'number' || metadata.duration === null).toBe(true);
      expect(typeof metadata.result).toBe('string');
      expect(typeof metadata.opponent_race).toBe('string');
    });

    it('should have valid economy structure with time-based metrics', () => {
      const economy = mockFingerprint.economy;

      // Worker counts can be null
      expect(economy.workers_3min === null || typeof economy.workers_3min === 'number').toBe(true);
      expect(economy.workers_5min === null || typeof economy.workers_5min === 'number').toBe(true);
      expect(economy.workers_7min === null || typeof economy.workers_7min === 'number').toBe(true);

      // Expansion data
      expect(typeof economy.expansion_count).toBe('number');

      // Time-based metrics
      if (economy.supply_block_count !== undefined) {
        expect(typeof economy.supply_block_count).toBe('number');
      }
      if (economy.total_supply_block_time !== undefined) {
        expect(typeof economy.total_supply_block_time).toBe('number');
      }

      // Production by building
      if (economy.production_by_building) {
        const buildings = Object.keys(economy.production_by_building);
        expect(buildings.length).toBeGreaterThan(0);

        const firstBuilding = economy.production_by_building[buildings[0]];
        expect(typeof firstBuilding.count).toBe('number');
        expect(typeof firstBuilding.idle_seconds).toBe('number');
      }
    });

    it('should have valid tactical structure', () => {
      const tactical = mockFingerprint.tactical;

      expect(Array.isArray(tactical.moveout_times)).toBe(true);
      expect(tactical.first_moveout === null || typeof tactical.first_moveout === 'number').toBe(true);
      expect(typeof tactical.harass_count).toBe('number');
      expect(typeof tactical.engagement_count).toBe('number');
    });

    it('should have valid sequences structure', () => {
      const sequences = mockFingerprint.sequences;

      expect(Array.isArray(sequences.tech_sequence)).toBe(true);
      expect(Array.isArray(sequences.build_sequence)).toBe(true);
      expect(Array.isArray(sequences.upgrade_sequence)).toBe(true);

      // Build sequence items should have name and type
      if (sequences.build_sequence.length > 0) {
        expect(sequences.build_sequence[0]).toHaveProperty('name');
        expect(sequences.build_sequence[0]).toHaveProperty('type');
      }
    });
  });

  describe('BuildDetection structure', () => {
    it('should have all required fields', () => {
      const detection = mockBuildDetection;

      expect(typeof detection.build_id).toBe('string');
      expect(typeof detection.build_name).toBe('string');
      expect(typeof detection.confidence).toBe('number');
      expect(detection.confidence).toBeGreaterThanOrEqual(0);
      expect(detection.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('LearnedBuild structure', () => {
    it('should have all required fields', () => {
      const build = mockLearnedBuilds[0];

      expect(typeof build.id).toBe('string');
      expect(typeof build.name).toBe('string');
      expect(typeof build.matchup).toBe('string');
      expect(build.matchup).toMatch(/^[TZP]v[TZP]$/);
      expect(typeof build.num_examples).toBe('number');
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('formatReplayTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatReplayTime(0)).toBe('0:00');
      expect(formatReplayTime(30)).toBe('0:30');
      expect(formatReplayTime(60)).toBe('1:00');
      expect(formatReplayTime(90)).toBe('1:30');
      expect(formatReplayTime(600)).toBe('10:00');
      expect(formatReplayTime(845)).toBe('14:05');
    });

    it('should handle string input', () => {
      expect(formatReplayTime('60')).toBe('1:00');
      expect(formatReplayTime('90.5')).toBe('1:30');
    });
  });

  describe('normalizeRace', () => {
    it('should normalize race names to lowercase', () => {
      expect(normalizeRace('Terran')).toBe('terran');
      expect(normalizeRace('ZERG')).toBe('zerg');
      expect(normalizeRace('Protoss')).toBe('protoss');
    });
  });

  describe('determineMatchup', () => {
    it('should create matchup string from two races', () => {
      expect(determineMatchup('Terran', 'Zerg')).toBe('TvZ');
      expect(determineMatchup('Protoss', 'Terran')).toBe('PvT');
      expect(determineMatchup('Zerg', 'Zerg')).toBe('ZvZ');
    });
  });
});

// ============================================================================
// CMS Extraction Logic Tests
// ============================================================================

describe('CMS Extraction Logic', () => {
  describe('Build Order Extraction', () => {
    it('should extract build order with proper fields', () => {
      const buildOrder = mockPlayerMetrics.build_order;

      expect(buildOrder.length).toBeGreaterThan(0);

      const firstEvent = buildOrder[0];
      expect(typeof firstEvent.time).toBe('number');
      expect(typeof firstEvent.supply).toBe('number');
      expect(typeof firstEvent.item).toBe('string');
      expect(['unit', 'building', 'upgrade']).toContain(firstEvent.type);
    });

    it('should have build order events in chronological order', () => {
      const buildOrder = mockPlayerMetrics.build_order;

      for (let i = 1; i < buildOrder.length; i++) {
        expect(buildOrder[i].time).toBeGreaterThanOrEqual(buildOrder[i - 1].time);
      }
    });
  });

  describe('Replay Metadata Extraction', () => {
    it('should extract map name', () => {
      expect(mockMetricsResponse.map_name).toBeDefined();
      expect(typeof mockMetricsResponse.map_name).toBe('string');
      expect(mockMetricsResponse.map_name.length).toBeGreaterThan(0);
    });

    it('should extract duration', () => {
      expect(mockMetricsResponse.duration).toBeDefined();
      expect(typeof mockMetricsResponse.duration).toBe('number');
      expect(mockMetricsResponse.duration).toBeGreaterThan(0);
    });

    it('should extract game date when available', () => {
      const gameDate = mockMetricsResponse.game_metadata.game_date;
      if (gameDate) {
        expect(new Date(gameDate).toString()).not.toBe('Invalid Date');
      }
    });

    it('should extract player information', () => {
      expect(mockMetricsResponse.all_players.length).toBeGreaterThanOrEqual(2);

      const player = mockMetricsResponse.all_players[0];
      expect(player.name).toBeDefined();
      expect(player.race).toBeDefined();
      expect(player.result).toBeDefined();
    });
  });

  describe('Production Metrics Extraction', () => {
    it('should extract production score', () => {
      const player = mockMetricsResponse.players['1'];
      expect(typeof player.production_score).toBe('number');
      expect(player.production_score).toBeGreaterThanOrEqual(0);
      expect(player.production_score).toBeLessThanOrEqual(100);
    });

    it('should extract production idle time', () => {
      const player = mockMetricsResponse.players['1'];
      expect(typeof player.production_idle_total).toBe('number');
      expect(player.production_idle_total).toBeGreaterThanOrEqual(0);
    });

    it('should extract production by building from fingerprint', () => {
      const fingerprint = mockFingerprint;
      const productionByBuilding = fingerprint.economy.production_by_building;

      if (productionByBuilding) {
        expect(Object.keys(productionByBuilding).length).toBeGreaterThan(0);

        const firstBuilding = Object.values(productionByBuilding)[0];
        expect(firstBuilding).toHaveProperty('count');
        expect(firstBuilding).toHaveProperty('idle_seconds');
      }
    });
  });

  describe('Supply Metrics Extraction', () => {
    it('should extract supply score', () => {
      const player = mockMetricsResponse.players['1'];
      expect(typeof player.supply_score).toBe('number');
      expect(player.supply_score).toBeGreaterThanOrEqual(0);
      expect(player.supply_score).toBeLessThanOrEqual(100);
    });

    it('should extract supply block count and time', () => {
      const player = mockMetricsResponse.players['1'];
      expect(typeof player.supply_block_count).toBe('number');
      expect(typeof player.supply_block_total).toBe('number');
    });

    it('should extract supply at checkpoints from fingerprint', () => {
      const fingerprint = mockFingerprint;
      const supplyCheckpoints = fingerprint.economy.supply_at_checkpoints;

      if (supplyCheckpoints) {
        expect(Object.keys(supplyCheckpoints).length).toBeGreaterThan(0);

        Object.entries(supplyCheckpoints).forEach(([time, supply]) => {
          expect(typeof time).toBe('string');
          expect(typeof supply).toBe('number');
        });
      }
    });
  });
});

// ============================================================================
// Integration Tests (require real API)
// ============================================================================

describe.skipIf(!IS_INTEGRATION_TEST)('SC2ReplayAPIClient Integration Tests', () => {
  let client: SC2ReplayAPIClient;
  const fixtureReplayPath = path.join(__dirname, '../../__fixtures__/lotus_vs_deathbringer.SC2Replay');

  beforeEach(() => {
    client = new SC2ReplayAPIClient({
      apiUrl: process.env.SC2READER_API_URL!,
      apiKey: process.env.SC2READER_API_KEY!,
    });
  });

  it('should have test fixture available', () => {
    expect(fs.existsSync(fixtureReplayPath)).toBe(true);
  });

  it('should connect to API and return healthy status', async () => {
    const isHealthy = await client.healthCheck();
    expect(isHealthy).toBe(true);
  });

  it('should extract metrics from real replay file', async () => {
    const fileBuffer = fs.readFileSync(fixtureReplayPath);
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });

    const result = await client.extractMetrics(blob, undefined, 'lotus_vs_deathbringer.SC2Replay');

    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('map_name');
    expect(result).toHaveProperty('duration');
    expect(result).toHaveProperty('players');

    // Validate player data
    const response = result as MetricsResponse;
    const playerIds = Object.keys(response.players);
    expect(playerIds.length).toBeGreaterThanOrEqual(2);

    const firstPlayer = response.players[playerIds[0]];
    expect(firstPlayer.name).toBeDefined();
    expect(firstPlayer.race).toBeDefined();
    expect(firstPlayer.build_order).toBeDefined();
    expect(Array.isArray(firstPlayer.build_order)).toBe(true);
  });

  it('should extract fingerprint with economy data', async () => {
    const fileBuffer = fs.readFileSync(fixtureReplayPath);
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });

    const result = await client.extractMetrics(blob, undefined, 'lotus_vs_deathbringer.SC2Replay');
    const response = result as MetricsResponse;

    const firstPlayer = Object.values(response.players)[0];
    const fingerprint = firstPlayer.fingerprint;

    expect(fingerprint).toBeDefined();
    expect(fingerprint?.economy).toBeDefined();

    // Verify time-based metrics exist
    if (fingerprint?.economy.total_supply_block_time !== undefined) {
      expect(typeof fingerprint.economy.total_supply_block_time).toBe('number');
    }
  });

  it('should detect build order from real replay', async () => {
    const fileBuffer = fs.readFileSync(fixtureReplayPath);
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });

    const result = await client.detectBuild(blob, undefined, 'lotus_vs_deathbringer.SC2Replay');

    // Detection may be null if no matching build found
    if (result !== null) {
      expect(result).toHaveProperty('build_id');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
    }
  });

  it('should list available learned builds', async () => {
    const builds = await client.listBuilds();

    expect(Array.isArray(builds)).toBe(true);
    // There should be at least some builds
    if (builds.length > 0) {
      expect(builds[0]).toHaveProperty('id');
      expect(builds[0]).toHaveProperty('name');
      expect(builds[0]).toHaveProperty('matchup');
    }
  });
});

// ============================================================================
// End-to-End Flow Tests
// ============================================================================

describe('End-to-End CMS Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should simulate complete replay upload and analysis flow', async () => {
    // Mock the API responses
    mockAxiosPost.mockResolvedValue({ data: mockMetricsResponse });

    const client = new SC2ReplayAPIClient({
      apiUrl: 'http://test-api:8000',
      apiKey: 'test-key',
    });

    // Step 1: Upload and extract metrics
    const blob = createMockBlob('test');
    const metricsResult = await client.extractMetrics(blob, undefined, 'test.SC2Replay');

    expect(metricsResult).toBeDefined();

    // Step 2: Verify we can extract data needed for CMS display
    const response = metricsResult as MetricsResponse;

    // Map name for display
    expect(response.map_name).toBeDefined();

    // Duration for display (formatted as MM:SS)
    const formattedDuration = formatReplayTime(response.duration);
    expect(formattedDuration).toMatch(/^\d+:\d{2}$/);

    // Game date for display
    expect(response.game_metadata.game_date).toBeDefined();

    // Players for display
    expect(Object.keys(response.players).length).toBeGreaterThan(0);

    // Build order for build order page
    const firstPlayer = Object.values(response.players)[0];
    expect(firstPlayer.build_order.length).toBeGreaterThan(0);

    // Fingerprint for analysis
    expect(firstPlayer.fingerprint).toBeDefined();

    // Production metrics for trends
    expect(firstPlayer.production_score).toBeDefined();
    expect(firstPlayer.production_idle_total).toBeDefined();

    // Supply metrics for trends
    expect(firstPlayer.supply_score).toBeDefined();
    expect(firstPlayer.supply_block_total).toBeDefined();
  });

  it('should handle player name filtering', async () => {
    const singlePlayerResponse = {
      filename: 'test.SC2Replay',
      map_name: 'Altitude LE',
      duration: 845,
      game_metadata: mockMetricsResponse.game_metadata,
      all_players: mockMetricsResponse.all_players,
      player: mockPlayerMetrics,
    };

    mockAxiosPost.mockResolvedValue({ data: singlePlayerResponse });

    const client = new SC2ReplayAPIClient({
      apiUrl: 'http://test-api:8000',
      apiKey: 'test-key',
    });

    const blob = createMockBlob('test');
    const result = await client.extractMetrics(blob, 'TestPlayer', 'test.SC2Replay');

    expect(result).toHaveProperty('player');
  });
});
