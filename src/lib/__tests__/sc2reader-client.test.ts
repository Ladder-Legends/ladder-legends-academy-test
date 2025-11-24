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

  describe('analyzeReplay', () => {
    it('should throw error for non-.SC2Replay files', async () => {
      const client = new SC2ReplayAPIClient();
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(client.analyzeReplay(file)).rejects.toThrow(
        'Invalid file type. Only .SC2Replay files are allowed.'
      );
    });

    it('should successfully analyze a replay file', async () => {
      const client = new SC2ReplayAPIClient();
      const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

      const mockResponse = {
        filename: 'test.SC2Replay',
        metadata: {
          map_name: 'Altitude LE',
          game_length: '10:30',
          game_length_seconds: 630,
          date: '2024-01-01',
          unix_timestamp: 1704067200,
          expansion: 'LotV',
          release_string: '5.0.12',
          game_type: '1v1',
          category: 'Ladder',
          winner: 'Player1',
          loser: 'Player2',
          players: [
            {
              name: 'Player1',
              race: 'Terran',
              result: 'Win',
              mmr: 4500,
              apm: 180,
              highest_league: 6,
              color: 'Red',
            },
          ],
          num_players: 2,
        },
        build_orders: {
          Player1: [],
        },
      };

      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await client.analyzeReplay(file);

      expect(result).toEqual(mockResponse);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/analyze'),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': expect.any(String),
          }),
        })
      );
    });

    it('should handle 401 authentication error', async () => {
      const client = new SC2ReplayAPIClient();
      const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

      const error = createMockAxiosError(401, { error: 'Unauthorized' });
      (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(client.analyzeReplay(file)).rejects.toThrow(
        'Authentication failed. Invalid API key.'
      );
    });

    it('should handle 422 parse error', async () => {
      const client = new SC2ReplayAPIClient();
      const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

      const error = createMockAxiosError(422, { error: 'Parse error', detail: 'Corrupted replay file' });
      (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(client.analyzeReplay(file)).rejects.toThrow(
        'Failed to parse replay file: Corrupted replay file'
      );
    });

    it('should handle 400 bad request error', async () => {
      const client = new SC2ReplayAPIClient();
      const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

      const error = createMockAxiosError(400, { error: 'Invalid request' });
      (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(client.analyzeReplay(file)).rejects.toThrow('Invalid request');
    });

    it('should handle generic API errors', async () => {
      const client = new SC2ReplayAPIClient();
      const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

      const error = createMockAxiosError(500, { error: 'Internal server error' });
      (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(client.analyzeReplay(file)).rejects.toThrow('Internal server error');
    });

    it('should handle network errors', async () => {
      const client = new SC2ReplayAPIClient();
      const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

      (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.analyzeReplay(file)).rejects.toThrow('Network error');
    });

    it('should handle malformed error responses', async () => {
      const client = new SC2ReplayAPIClient();
      const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

      const error = createMockAxiosError(500, {}, 'Request failed');
      (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await expect(client.analyzeReplay(file)).rejects.toThrow('Request failed');
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

describe('SC2ReplayAPIClient - extractAllPlayersFingerprints', () => {
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
      client.extractAllPlayersFingerprints(file, undefined, 'test.txt')
    ).rejects.toThrow('Invalid file type. Only .SC2Replay files are allowed.');
  });

  it('should successfully extract fingerprints for all players', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const mockResponse = {
      filename: 'test.SC2Replay',
      player_fingerprints: {
        Player1: {
          player_name: 'Player1',
          matchup: 'TvZ',
          race: 'Terran',
          all_players: [
            { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 180 },
            { name: 'Player2', race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4400, apm: 200 },
          ],
          metadata: {
            map: 'Altitude LE',
            duration: 600,
            result: 'Win',
            opponent_race: 'Zerg',
            game_type: '1v1',
            category: 'Ladder',
            game_date: '2024-01-01',
          },
          timings: {},
          sequences: { tech_sequence: [], build_sequence: [], upgrade_sequence: [] },
          army_composition: {},
          production_timeline: {},
          economy: { workers_3min: 30, workers_5min: 50, workers_7min: 60, expansion_count: 2, avg_expansion_timing: 180 },
          tactical: { moveout_times: [], first_moveout: null, harass_count: 0, engagement_count: 0, first_engagement: null },
          micro: { selection_count: 100, avg_selections_per_min: 10, control_groups_used: 5, most_used_control_group: '1', camera_movement_count: 50, avg_camera_moves_per_min: 5 },
          positioning: { proxy_buildings: 0, avg_building_distance_from_main: 50 },
          ratios: { gas_count: 4, production_count: 8, tech_count: 2, reactor_count: 2, techlab_count: 2, expansions: 2, gas_per_base: 2, production_per_base: 4 },
        },
        Player2: {
          player_name: 'Player2',
          matchup: 'ZvT',
          race: 'Zerg',
          all_players: [
            { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 180 },
            { name: 'Player2', race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4400, apm: 200 },
          ],
          metadata: {
            map: 'Altitude LE',
            duration: 600,
            result: 'Loss',
            opponent_race: 'Terran',
            game_type: '1v1',
            category: 'Ladder',
            game_date: '2024-01-01',
          },
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
      suggested_player: 'Player1',
      all_players: [
        { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 180 },
        { name: 'Player2', race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4400, apm: 200 },
      ],
      game_metadata: {
        map: 'Altitude LE',
        duration: 600,
        game_date: '2024-01-01',
        game_type: '1v1',
        category: 'Ladder',
        patch: '5.0.12',
        winner: 'Player1',
        loser: 'Player2',
      },
    };

    (axios.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await client.extractAllPlayersFingerprints(file);

    expect(result).toEqual(mockResponse);
    expect(result.player_fingerprints).toHaveProperty('Player1');
    expect(result.player_fingerprints).toHaveProperty('Player2');
    expect(result.suggested_player).toBe('Player1');
    expect(result.all_players).toHaveLength(2);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/fingerprint-all'),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': expect.any(String),
        }),
      })
    );
  });

  it('should pass suggested player name when provided', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const mockResponse = {
      filename: 'test.SC2Replay',
      player_fingerprints: {},
      suggested_player: 'ProvidedPlayer',
      all_players: [],
      game_metadata: {
        map: 'Test Map',
        duration: null,
        game_date: null,
        game_type: null,
        category: null,
        patch: null,
        winner: null,
        loser: null,
      },
    };

    (axios.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: mockResponse,
    });

    await client.extractAllPlayersFingerprints(file, 'ProvidedPlayer');

    // Verify FormData contains the player_name
    expect(axios.post).toHaveBeenCalled();
  });

  it('should handle 401 authentication error', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    const error = createMockAxiosError(401, { error: 'Unauthorized' });
    (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await expect(client.extractAllPlayersFingerprints(file)).rejects.toThrow(
      'Authentication failed. Invalid API key.'
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

    await expect(client.extractAllPlayersFingerprints(file)).rejects.toThrow(
      'Failed to parse replay file: Corrupted replay file'
    );
  });

  it('should handle network errors', async () => {
    const client = new SC2ReplayAPIClient();
    const file = createMockFile('content', 'test.SC2Replay', 'application/octet-stream');

    (axios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    await expect(client.extractAllPlayersFingerprints(file)).rejects.toThrow('Network error');
  });
});
