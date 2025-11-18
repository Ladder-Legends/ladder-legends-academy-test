/**
 * Tests for SC2 Replay Analyzer API Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('SC2ReplayAPIClient', () => {
  beforeEach(() => {
    (fetch as ReturnType<typeof vi.fn>).mockClear();
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
      const file = new File(['content'], 'test.SC2Replay', { type: 'application/octet-stream' });

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

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.analyzeReplay(file);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/analyze'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': expect.any(String),
          }),
        })
      );
    });

    it('should handle 401 authentication error', async () => {
      const client = new SC2ReplayAPIClient();
      const file = new File(['content'], 'test.SC2Replay', { type: 'application/octet-stream' });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(client.analyzeReplay(file)).rejects.toThrow(
        'Authentication failed. Invalid API key.'
      );
    });

    it('should handle 422 parse error', async () => {
      const client = new SC2ReplayAPIClient();
      const file = new File(['content'], 'test.SC2Replay', { type: 'application/octet-stream' });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'Parse error', detail: 'Corrupted replay file' }),
      });

      await expect(client.analyzeReplay(file)).rejects.toThrow(
        'Failed to parse replay file: Corrupted replay file'
      );
    });

    it('should handle 400 bad request error', async () => {
      const client = new SC2ReplayAPIClient();
      const file = new File(['content'], 'test.SC2Replay', { type: 'application/octet-stream' });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request' }),
      });

      await expect(client.analyzeReplay(file)).rejects.toThrow('Invalid request');
    });

    it('should handle generic API errors', async () => {
      const client = new SC2ReplayAPIClient();
      const file = new File(['content'], 'test.SC2Replay', { type: 'application/octet-stream' });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      await expect(client.analyzeReplay(file)).rejects.toThrow('Internal server error');
    });

    it('should handle network errors', async () => {
      const client = new SC2ReplayAPIClient();
      const file = new File(['content'], 'test.SC2Replay', { type: 'application/octet-stream' });

      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.analyzeReplay(file)).rejects.toThrow('Network error');
    });

    it('should handle malformed error responses', async () => {
      const client = new SC2ReplayAPIClient();
      const file = new File(['content'], 'test.SC2Replay', { type: 'application/octet-stream' });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(client.analyzeReplay(file)).rejects.toThrow('Failed to analyze replay');
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
