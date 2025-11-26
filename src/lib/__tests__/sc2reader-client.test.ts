/**
 * Tests for SC2 Replay Analyzer API Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosError } from 'axios';
import {
  SC2ReplayAPIClient,
  formatReplayTime,
  normalizeRace,
  determineMatchup,
  filterBuildOrderEvents,
  convertToBuildOrderSteps,
  type SC2BuildOrderEvent,
} from '../sc2reader-client';

// Mock fetch globally
global.fetch = vi.fn();

// Helper to create a mock File with arrayBuffer support
function createMockFile(content: string, name: string, type: string) {
  const buffer = Buffer.from(content);
  const file = new File([content], name, { type });
  // Add arrayBuffer method to the mock File
  (file as any).arrayBuffer = vi.fn().mockResolvedValue(buffer.buffer);
  return file;
}

// Helper to create a mock AxiosError
function createMockAxiosError(status: number, data: any, message?: string) {
  const error = new AxiosError(
    message || `Request failed with status code ${status}`,
    status.toString(),
    undefined,
    undefined,
    {
      status,
      statusText: '',
      data,
      headers: {},
      config: {} as any,
    }
  );
  return error;
}

describe('SC2ReplayAPIClient', () => {
  beforeEach(() => {
    (fetch as ReturnType<typeof vi.fn>).mockClear();
    vi.spyOn(axios, 'post');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      const client = new SC2ReplayAPIClient();
      expect(client).toBeInstanceOf(SC2ReplayAPIClient);
    });

    it('should accept custom configuration', () => {
      const client = new SC2ReplayAPIClient({
        apiUrl: 'https://custom.api.com',
        apiKey: 'custom-key',
      });
      expect(client).toBeInstanceOf(SC2ReplayAPIClient);
    });

    it('should merge partial configuration with defaults', () => {
      const client = new SC2ReplayAPIClient({
        apiUrl: 'https://custom.api.com',
      });
      expect(client).toBeInstanceOf(SC2ReplayAPIClient);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      const client = new SC2ReplayAPIClient();

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      const client = new SC2ReplayAPIClient();

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'unhealthy' }),
      });

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false when API returns non-OK status', async () => {
      const client = new SC2ReplayAPIClient();

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      });

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      const client = new SC2ReplayAPIClient();

      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });
});

describe('formatReplayTime', () => {
  it('should format seconds as MM:SS', () => {
    expect(formatReplayTime(0)).toBe('0:00');
    expect(formatReplayTime(30)).toBe('0:30');
    expect(formatReplayTime(60)).toBe('1:00');
    expect(formatReplayTime(90)).toBe('1:30');
    expect(formatReplayTime(630)).toBe('10:30');
  });

  it('should handle string inputs', () => {
    expect(formatReplayTime('0')).toBe('0:00');
    expect(formatReplayTime('30')).toBe('0:30');
    expect(formatReplayTime('60')).toBe('1:00');
    expect(formatReplayTime('630.5')).toBe('10:30');
  });

  it('should pad seconds with leading zero', () => {
    expect(formatReplayTime(5)).toBe('0:05');
    expect(formatReplayTime(65)).toBe('1:05');
  });

  it('should handle large values', () => {
    expect(formatReplayTime(3600)).toBe('60:00');
    expect(formatReplayTime(3661)).toBe('61:01');
  });

  it('should floor fractional seconds', () => {
    expect(formatReplayTime(90.9)).toBe('1:30');
    expect(formatReplayTime(90.1)).toBe('1:30');
  });
});

describe('normalizeRace', () => {
  it('should normalize Terran', () => {
    expect(normalizeRace('Terran')).toBe('terran');
    expect(normalizeRace('TERRAN')).toBe('terran');
    expect(normalizeRace('terran')).toBe('terran');
  });

  it('should normalize Zerg', () => {
    expect(normalizeRace('Zerg')).toBe('zerg');
    expect(normalizeRace('ZERG')).toBe('zerg');
    expect(normalizeRace('zerg')).toBe('zerg');
  });

  it('should normalize Protoss', () => {
    expect(normalizeRace('Protoss')).toBe('protoss');
    expect(normalizeRace('PROTOSS')).toBe('protoss');
    expect(normalizeRace('protoss')).toBe('protoss');
  });
});

describe('determineMatchup', () => {
  it('should determine TvZ matchup', () => {
    expect(determineMatchup('Terran', 'Zerg')).toBe('TvZ');
    expect(determineMatchup('terran', 'zerg')).toBe('TvZ');
  });

  it('should determine ZvP matchup', () => {
    expect(determineMatchup('Zerg', 'Protoss')).toBe('ZvP');
    expect(determineMatchup('zerg', 'protoss')).toBe('ZvP');
  });

  it('should determine PvT matchup', () => {
    expect(determineMatchup('Protoss', 'Terran')).toBe('PvT');
    expect(determineMatchup('protoss', 'terran')).toBe('PvT');
  });

  it('should handle mirror matchups', () => {
    expect(determineMatchup('Terran', 'Terran')).toBe('TvT');
    expect(determineMatchup('Zerg', 'Zerg')).toBe('ZvZ');
    expect(determineMatchup('Protoss', 'Protoss')).toBe('PvP');
  });

  it('should handle mixed case', () => {
    expect(determineMatchup('TeRrAn', 'ZeRg')).toBe('TvZ');
  });
});

describe('filterBuildOrderEvents', () => {
  it('should filter out Unknown events', () => {
    const events: SC2BuildOrderEvent[] = [
      { time: '0', supply: 12, event: 'unit_born', unit: 'SCV' },
      { time: '10', supply: 13, event: 'unit_born', unit: 'Unknown' },
      { time: '20', supply: 14, event: 'unit_born', unit: 'Marine' },
    ];

    const filtered = filterBuildOrderEvents(events);
    expect(filtered).toHaveLength(2);
    expect(filtered.find(e => e.unit === 'Unknown')).toBeUndefined();
  });

  it('should filter out Spray events', () => {
    const events: SC2BuildOrderEvent[] = [
      { time: '0', supply: 12, event: 'unit_born', unit: 'SCV' },
      { time: '10', supply: 13, event: 'unit_born', unit: 'Spray' },
      { time: '15', supply: 13, event: 'unit_born', unit: 'Terran Spray' },
      { time: '20', supply: 14, event: 'unit_born', unit: 'Marine' },
    ];

    const filtered = filterBuildOrderEvents(events);
    expect(filtered).toHaveLength(2);
    expect(filtered.find(e => e.unit?.includes('Spray'))).toBeUndefined();
  });

  it('should keep valid unit events', () => {
    const events: SC2BuildOrderEvent[] = [
      { time: '0', supply: 12, event: 'unit_born', unit: 'SCV' },
      { time: '10', supply: 13, event: 'building_started', unit: 'Barracks' },
      { time: '20', supply: 14, event: 'morph_complete', unit: 'OrbitalCommand' },
    ];

    const filtered = filterBuildOrderEvents(events);
    expect(filtered).toHaveLength(3);
  });

  it('should keep valid upgrade events', () => {
    const events: SC2BuildOrderEvent[] = [
      { time: '0', supply: 12, event: 'unit_born', unit: 'SCV' },
      { time: '100', supply: 50, event: 'upgrade', upgrade: 'Stim Pack' },
      { time: '200', supply: 80, event: 'upgrade', upgrade: 'Combat Shields' },
    ];

    const filtered = filterBuildOrderEvents(events);
    expect(filtered).toHaveLength(3);
  });

  it('should handle empty array', () => {
    const events: SC2BuildOrderEvent[] = [];
    const filtered = filterBuildOrderEvents(events);
    expect(filtered).toHaveLength(0);
  });
});

describe('convertToBuildOrderSteps', () => {
  it('should convert events to build order steps', () => {
    const events: SC2BuildOrderEvent[] = [
      { time: '0', supply: 12, event: 'unit_born', unit: 'SCV' },
      { time: '60', supply: 15, event: 'building_started', unit: 'Barracks' },
      { time: '120', supply: 20, event: 'upgrade', upgrade: 'Stim Pack' },
    ];

    const steps = convertToBuildOrderSteps(events);

    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({
      supply: 12,
      time: '0:00',
      action: 'SCV',
      notes: undefined,
    });
    expect(steps[1]).toEqual({
      supply: 15,
      time: '1:00',
      action: 'Barracks',
      notes: undefined,
    });
    expect(steps[2]).toEqual({
      supply: 20,
      time: '2:00',
      action: 'Upgrade: Stim Pack',
      notes: undefined,
    });
  });

  it('should filter out Unknown and Spray events', () => {
    const events: SC2BuildOrderEvent[] = [
      { time: '0', supply: 12, event: 'unit_born', unit: 'SCV' },
      { time: '10', supply: 13, event: 'unit_born', unit: 'Unknown' },
      { time: '20', supply: 14, event: 'unit_born', unit: 'Spray' },
      { time: '60', supply: 15, event: 'building_started', unit: 'Barracks' },
    ];

    const steps = convertToBuildOrderSteps(events);

    expect(steps).toHaveLength(2);
    expect(steps[0].action).toBe('SCV');
    expect(steps[1].action).toBe('Barracks');
  });

  it('should format time correctly', () => {
    const events: SC2BuildOrderEvent[] = [
      { time: '30', supply: 12, event: 'unit_born', unit: 'SCV' },
      { time: '90.5', supply: 15, event: 'unit_born', unit: 'Marine' },
      { time: '630', supply: 50, event: 'unit_born', unit: 'Medivac' },
    ];

    const steps = convertToBuildOrderSteps(events);

    expect(steps[0].time).toBe('0:30');
    expect(steps[1].time).toBe('1:30');
    expect(steps[2].time).toBe('10:30');
  });

  it('should handle empty array', () => {
    const events: SC2BuildOrderEvent[] = [];
    const steps = convertToBuildOrderSteps(events);
    expect(steps).toHaveLength(0);
  });

  it('should handle upgrade events correctly', () => {
    const events: SC2BuildOrderEvent[] = [
      { time: '100', supply: 50, event: 'upgrade', upgrade: 'Stim Pack' },
      { time: '120', supply: 55, event: 'upgrade' }, // No upgrade specified
    ];

    const steps = convertToBuildOrderSteps(events);

    expect(steps[0].action).toBe('Upgrade: Stim Pack');
    expect(steps[1].action).toBe('Upgrade: Unknown');
  });
});

describe('SC2ReplayAPIClient - extractMetrics', () => {
  beforeEach(() => {
    (fetch as ReturnType<typeof vi.fn>).mockClear();
    vi.spyOn(axios, 'post');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error for non-.SC2Replay files', async () => {
    const client = new SC2ReplayAPIClient();
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });

    await expect(
      client.extractMetrics(file, undefined, 'test.txt')
    ).rejects.toThrow('Invalid file type. Only .SC2Replay files are allowed.');
  });

  it('should successfully extract metrics for all players', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const mockResponse = {
      filename: 'test.SC2Replay',
      map_name: 'Altitude LE',
      duration: 600,
      game_metadata: {
        game_date: '2024-01-01T12:00:00',
        game_type: '1v1',
        category: 'Ladder',
        patch: '5.0.12',
      },
      all_players: [
        { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 180 },
        { name: 'Player2', race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4400, apm: 200 },
      ],
      suggested_player: 'Player1',
      players: {
        '1': {
          pid: 1,
          name: 'Player1',
          race: 'Terran',
          result: 'Win',
          build_fingerprint: 'T:sbbb...',
          production_score: 85,
          production_idle_total: 30,
          production_idle_percent: 5,
          supply_score: 90,
          supply_block_total: 12,
          supply_block_count: 2,
          supply_block_percent: 2,
          avg_mineral_float: 400,
          avg_gas_float: 200,
          inject_idle_total: null,
          inject_efficiency: null,
          inject_count: null,
          build_order: [
            { time: 12, supply: 14, item: 'SCV', type: 'unit' },
            { time: 35, supply: 15, item: 'SupplyDepot', type: 'building' },
          ],
          phases: {},
          fingerprint: {
            matchup: 'TvZ',
            timings: { first_barracks: 60 },
            sequences: { tech_sequence: [], build_sequence: [], upgrade_sequence: [] },
            army_composition: {},
            production_timeline: {},
            economy: { workers_3min: 30, workers_5min: 50, workers_7min: 60, expansion_count: 2, avg_expansion_timing: 180 },
            tactical: { moveout_times: [], first_moveout: null, harass_count: 0, engagement_count: 0, first_engagement: null },
            micro: { selection_count: 100, avg_selections_per_min: 10, control_groups_used: 5, most_used_control_group: '1', camera_movement_count: 50, avg_camera_moves_per_min: 5 },
            positioning: { proxy_buildings: 0, avg_building_distance_from_main: 50 },
            ratios: { gas_count: 4, production_count: 8, tech_count: 2, reactor_count: 2, techlab_count: 2, expansions: 2, gas_per_base: 2, production_per_base: 4 },
          },
        },
        '2': {
          pid: 2,
          name: 'Player2',
          race: 'Zerg',
          result: 'Loss',
          build_fingerprint: 'Z:hoe...',
          production_score: 80,
          production_idle_total: 45,
          production_idle_percent: 7.5,
          supply_score: 85,
          supply_block_total: 18,
          supply_block_count: 3,
          supply_block_percent: 3,
          avg_mineral_float: 500,
          avg_gas_float: 250,
          inject_idle_total: 60,
          inject_efficiency: 75,
          inject_count: 20,
          build_order: [],
          phases: {},
          fingerprint: {
            matchup: 'ZvT',
            timings: {},
            sequences: { tech_sequence: [], build_sequence: [], upgrade_sequence: [] },
            army_composition: {},
            production_timeline: {},
            economy: { workers_3min: 32, workers_5min: 55, workers_7min: 65, expansion_count: 3, avg_expansion_timing: 150 },
            tactical: { moveout_times: [], first_moveout: null, harass_count: 0, engagement_count: 0, first_engagement: null },
            micro: { selection_count: 120, avg_selections_per_min: 12, control_groups_used: 6, most_used_control_group: '1', camera_movement_count: 60, avg_camera_moves_per_min: 6 },
            positioning: { proxy_buildings: 0, avg_building_distance_from_main: 40 },
            ratios: { gas_count: 6, production_count: 0, tech_count: 3, reactor_count: 0, techlab_count: 0, expansions: 3, gas_per_base: 2, production_per_base: 0 },
          },
        },
      },
    };

    (axios.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await client.extractMetrics(file);

    expect(result).toEqual(mockResponse);
    expect(result.map_name).toBe('Altitude LE');
    expect(result.duration).toBe(600);
    expect(result.game_metadata.game_type).toBe('1v1');
    expect(result.all_players).toHaveLength(2);
    expect((result as any).players['1'].production_score).toBe(85);
    expect((result as any).players['2'].inject_efficiency).toBe(75);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/metrics'),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': expect.any(String),
        }),
      })
    );
  });

  it('should return single player metrics when player_name is provided', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const mockResponse = {
      filename: 'test.SC2Replay',
      map_name: 'Altitude LE',
      duration: 600,
      game_metadata: {
        game_date: '2024-01-01T12:00:00',
        game_type: '1v1',
        category: 'Ladder',
        patch: '5.0.12',
      },
      all_players: [
        { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 180 },
        { name: 'Player2', race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4400, apm: 200 },
      ],
      player: {
        pid: 1,
        name: 'Player1',
        race: 'Terran',
        result: 'Win',
        build_fingerprint: 'T:sbbb...',
        production_score: 85,
        production_idle_total: 30,
        production_idle_percent: 5,
        supply_score: 90,
        supply_block_total: 12,
        supply_block_count: 2,
        supply_block_percent: 2,
        avg_mineral_float: 400,
        avg_gas_float: 200,
        inject_idle_total: null,
        inject_efficiency: null,
        inject_count: null,
        build_order: [],
        phases: {},
      },
    };

    (axios.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await client.extractMetrics(file, 'Player1');

    expect((result as any).player).toBeDefined();
    expect((result as any).player.name).toBe('Player1');
    expect((result as any).players).toBeUndefined();
  });

  it('should handle 401 authentication error', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const error = createMockAxiosError(401, { error: 'Unauthorized' });
    (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await expect(client.extractMetrics(file)).rejects.toThrow(
      'Authentication failed. Invalid API key.'
    );
  });

  it('should handle 404 player not found error', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const error = createMockAxiosError(404, {
      detail: "Player 'Unknown' not found. Available: ['Player1', 'Player2']",
    });
    (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await expect(client.extractMetrics(file, 'Unknown')).rejects.toThrow(
      "Player 'Unknown' not found"
    );
  });

  it('should handle 422 parse error', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const error = createMockAxiosError(422, {
      error: 'Parse error',
      detail: 'Corrupted replay file',
    });
    (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await expect(client.extractMetrics(file)).rejects.toThrow(
      'Failed to parse replay file: Corrupted replay file'
    );
  });

  it('should handle 503 metrics unavailable error', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const error = createMockAxiosError(503, {
      detail: 'Metrics processing unavailable: Import error',
    });
    (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await expect(client.extractMetrics(file)).rejects.toThrow();
  });

  it('should handle network errors', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    await expect(client.extractMetrics(file)).rejects.toThrow('Network error');
  });

  it('should include Zerg inject metrics for Zerg players', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const mockZergResponse = {
      filename: 'test.SC2Replay',
      map_name: 'Altitude LE',
      duration: 600,
      game_metadata: {
        game_date: '2024-01-01T12:00:00',
        game_type: '1v1',
        category: 'Ladder',
        patch: '5.0.12',
      },
      all_players: [
        { name: 'ZergPlayer', race: 'Zerg', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 200 },
      ],
      player: {
        pid: 1,
        name: 'ZergPlayer',
        race: 'Zerg',
        result: 'Win',
        build_fingerprint: 'Z:hoe...',
        production_score: 80,
        production_idle_total: 45,
        production_idle_percent: 7.5,
        supply_score: 85,
        supply_block_total: 18,
        supply_block_count: 3,
        supply_block_percent: 3,
        avg_mineral_float: 500,
        avg_gas_float: 250,
        inject_idle_total: 60.5,
        inject_efficiency: 75.2,
        inject_count: 20,
        build_order: [],
        phases: {},
      },
    };

    (axios.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: mockZergResponse,
    });

    const result = await client.extractMetrics(file, 'ZergPlayer');
    const player = (result as any).player;

    expect(player.race).toBe('Zerg');
    expect(player.inject_idle_total).toBe(60.5);
    expect(player.inject_efficiency).toBe(75.2);
    expect(player.inject_count).toBe(20);
  });
});
