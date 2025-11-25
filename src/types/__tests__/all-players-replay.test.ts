/**
 * Tests for new UserReplayData fields and AllPlayersFingerprint type
 * Verifies that multi-player fingerprints and new metadata fields work correctly
 */

import { describe, it, expect } from 'vitest';
import type {
  UserReplayData,
  AllPlayersFingerprint,
  ReplayFingerprint,
} from '@/lib/replay-types';

// Helper to create a mock ReplayFingerprint
function createMockFingerprint(playerName: string, race: string, result: 'Win' | 'Loss'): ReplayFingerprint {
  return {
    player_name: playerName,
    matchup: race === 'Terran' ? 'TvZ' : 'ZvT',
    race: race,
    all_players: [
      { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 180 },
      { name: 'Player2', race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4400, apm: 200 },
    ],
    metadata: {
      map: 'Altitude LE',
      duration: 600,
      result: result,
      opponent_race: race === 'Terran' ? 'Zerg' : 'Terran',
      game_type: '1v1',
      category: 'Ladder',
      game_date: '2025-01-01',
    },
    timings: {},
    sequences: {
      tech_sequence: [],
      build_sequence: [],
      upgrade_sequence: [],
    },
    army_composition: {},
    production_timeline: {},
    economy: {
      workers_3min: 30,
      workers_5min: 50,
      workers_7min: 60,
      expansion_count: 2,
      avg_expansion_timing: 180,
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
      camera_movement_count: 50,
      avg_camera_moves_per_min: 5,
    },
    positioning: {
      proxy_buildings: 0,
      avg_building_distance_from_main: 50,
    },
    ratios: {
      gas_count: 4,
      production_count: 8,
      tech_count: 2,
      reactor_count: 2,
      techlab_count: 2,
      expansions: 2,
      gas_per_base: 2,
      production_per_base: 4,
    },
  };
}

describe('AllPlayersFingerprint type', () => {
  it('should hold fingerprints for multiple players', () => {
    const allPlayersData: AllPlayersFingerprint = {
      filename: 'test.SC2Replay',
      player_fingerprints: {
        Player1: createMockFingerprint('Player1', 'Terran', 'Win'),
        Player2: createMockFingerprint('Player2', 'Zerg', 'Loss'),
      },
      suggested_player: 'Player1',
      all_players: [
        { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 180 },
        { name: 'Player2', race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4400, apm: 200 },
      ],
      game_metadata: {
        map: 'Altitude LE',
        duration: 600,
        game_date: '2025-01-01',
        game_type: '1v1',
        category: 'Ladder',
        patch: '5.0.12',
        winner: 'Player1',
        loser: 'Player2',
      },
    };

    expect(Object.keys(allPlayersData.player_fingerprints)).toHaveLength(2);
    expect(allPlayersData.player_fingerprints['Player1'].race).toBe('Terran');
    expect(allPlayersData.player_fingerprints['Player2'].race).toBe('Zerg');
    expect(allPlayersData.suggested_player).toBe('Player1');
  });

  it('should handle null suggested_player', () => {
    const allPlayersData: AllPlayersFingerprint = {
      filename: 'test.SC2Replay',
      player_fingerprints: {
        Player1: createMockFingerprint('Player1', 'Terran', 'Win'),
      },
      suggested_player: null,
      all_players: [
        { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false },
      ],
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

    expect(allPlayersData.suggested_player).toBeNull();
  });
});

describe('UserReplayData - new fields', () => {
  const createMockReplayData = (overrides?: Partial<UserReplayData>): UserReplayData => ({
    id: 'test-id',
    discord_user_id: 'test-user',
    uploaded_at: new Date().toISOString(),
    filename: 'test.SC2Replay',
    game_type: '1v1-ladder',
    fingerprint: createMockFingerprint('Player1', 'Terran', 'Win'),
    detection: null,
    comparison: null,
    ...overrides,
  });

  describe('blob_url field', () => {
    it('should accept blob_url for replay file storage', () => {
      const replayData = createMockReplayData({
        blob_url: 'https://blob.vercel-storage.com/user-replays/123/abc/test.SC2Replay',
      });

      expect(replayData.blob_url).toBe('https://blob.vercel-storage.com/user-replays/123/abc/test.SC2Replay');
    });

    it('should handle undefined blob_url (legacy replays)', () => {
      const replayData = createMockReplayData({
        blob_url: undefined,
      });

      expect(replayData.blob_url).toBeUndefined();
    });
  });

  describe('region field', () => {
    it('should accept NA region', () => {
      const replayData = createMockReplayData({ region: 'NA' });
      expect(replayData.region).toBe('NA');
    });

    it('should accept EU region', () => {
      const replayData = createMockReplayData({ region: 'EU' });
      expect(replayData.region).toBe('EU');
    });

    it('should accept KR region', () => {
      const replayData = createMockReplayData({ region: 'KR' });
      expect(replayData.region).toBe('KR');
    });

    it('should accept CN region', () => {
      const replayData = createMockReplayData({ region: 'CN' });
      expect(replayData.region).toBe('CN');
    });

    it('should handle undefined region', () => {
      const replayData = createMockReplayData({ region: undefined });
      expect(replayData.region).toBeUndefined();
    });
  });

  describe('player_fingerprints field', () => {
    it('should store fingerprints for multiple players', () => {
      const replayData = createMockReplayData({
        player_fingerprints: {
          Player1: createMockFingerprint('Player1', 'Terran', 'Win'),
          Player2: createMockFingerprint('Player2', 'Zerg', 'Loss'),
        },
      });

      expect(replayData.player_fingerprints).toBeDefined();
      expect(Object.keys(replayData.player_fingerprints!)).toHaveLength(2);
      expect(replayData.player_fingerprints!['Player1'].race).toBe('Terran');
      expect(replayData.player_fingerprints!['Player2'].race).toBe('Zerg');
    });

    it('should handle undefined player_fingerprints (legacy replays)', () => {
      const replayData = createMockReplayData({
        player_fingerprints: undefined,
      });

      expect(replayData.player_fingerprints).toBeUndefined();
      // Legacy replays still have the single fingerprint field
      expect(replayData.fingerprint).toBeDefined();
    });
  });

  describe('suggested_player field', () => {
    it('should store the suggested uploader player name', () => {
      const replayData = createMockReplayData({
        suggested_player: 'Lotus',
      });

      expect(replayData.suggested_player).toBe('Lotus');
    });

    it('should handle null suggested_player', () => {
      const replayData = createMockReplayData({
        suggested_player: null,
      });

      expect(replayData.suggested_player).toBeNull();
    });

    it('should handle undefined suggested_player', () => {
      const replayData = createMockReplayData({
        suggested_player: undefined,
      });

      expect(replayData.suggested_player).toBeUndefined();
    });
  });

  describe('game_metadata field', () => {
    it('should store shared game metadata', () => {
      const replayData = createMockReplayData({
        game_metadata: {
          map: 'Altitude LE',
          duration: 600,
          game_date: '2025-01-01',
          game_type: '1v1',
          category: 'Ladder',
          patch: '5.0.12',
          winner: 'Player1',
          loser: 'Player2',
        },
      });

      expect(replayData.game_metadata).toBeDefined();
      expect(replayData.game_metadata!.map).toBe('Altitude LE');
      expect(replayData.game_metadata!.duration).toBe(600);
      expect(replayData.game_metadata!.winner).toBe('Player1');
      expect(replayData.game_metadata!.loser).toBe('Player2');
    });

    it('should handle null values in game_metadata', () => {
      const replayData = createMockReplayData({
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
      });

      expect(replayData.game_metadata!.duration).toBeNull();
      expect(replayData.game_metadata!.winner).toBeNull();
    });
  });

  describe('backwards compatibility', () => {
    it('should maintain legacy fingerprint field alongside new fields', () => {
      const replayData = createMockReplayData({
        player_fingerprints: {
          Player1: createMockFingerprint('Player1', 'Terran', 'Win'),
          Player2: createMockFingerprint('Player2', 'Zerg', 'Loss'),
        },
        suggested_player: 'Player1',
      });

      // Legacy field should still be present and valid
      expect(replayData.fingerprint).toBeDefined();
      expect(replayData.fingerprint.player_name).toBeDefined();

      // New fields should also be present
      expect(replayData.player_fingerprints).toBeDefined();
      expect(replayData.suggested_player).toBe('Player1');
    });

    it('should work with only legacy fields (old replays)', () => {
      const replayData = createMockReplayData({
        // No new fields - simulating old replay data
        player_fingerprints: undefined,
        suggested_player: undefined,
        game_metadata: undefined,
        blob_url: undefined,
        region: undefined,
      });

      // Should still have valid legacy data
      expect(replayData.fingerprint).toBeDefined();
      expect(replayData.fingerprint.matchup).toBe('TvZ');
      expect(replayData.id).toBe('test-id');
    });
  });

  describe('full replay data structure', () => {
    it('should accept complete replay data with all fields', () => {
      const replayData: UserReplayData = {
        id: 'replay-123',
        discord_user_id: '161384451518103552',
        uploaded_at: '2025-01-01T12:00:00Z',
        filename: 'Tokamak LE (32).SC2Replay',
        blob_url: 'https://blob.vercel-storage.com/user-replays/161384451518103552/replay-123/Tokamak_LE__32_.SC2Replay',
        game_type: '1v1-ladder',
        region: 'NA',
        player_name: 'Lotus',
        target_build_id: undefined,
        detection: null,
        comparison: null,
        player_fingerprints: {
          Lotus: createMockFingerprint('Lotus', 'Terran', 'Win'),
          Opponent: createMockFingerprint('Opponent', 'Zerg', 'Loss'),
        },
        suggested_player: 'Lotus',
        fingerprint: createMockFingerprint('Lotus', 'Terran', 'Win'),
        game_metadata: {
          map: 'Tokamak LE',
          duration: 723,
          game_date: '2025-01-01',
          game_type: '1v1',
          category: 'Ladder',
          patch: '5.0.12',
          winner: 'Lotus',
          loser: 'Opponent',
        },
        notes: 'Good macro game',
        tags: ['macro', 'mech'],
      };

      expect(replayData.id).toBe('replay-123');
      expect(replayData.blob_url).toContain('Tokamak_LE__32_.SC2Replay');
      expect(replayData.region).toBe('NA');
      expect(replayData.player_fingerprints!['Lotus']).toBeDefined();
      expect(replayData.suggested_player).toBe('Lotus');
      expect(replayData.game_metadata!.winner).toBe('Lotus');
    });
  });
});
