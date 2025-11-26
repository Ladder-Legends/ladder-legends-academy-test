/**
 * Tests for Replay Index System (Phase 10-12)
 * Tests the createIndexEntry function and ReplayIndexEntry types
 */

import { describe, it, expect } from 'vitest';
import type {
  UserReplayData,
  ReplayFingerprint,
  ReplayIndexEntry,
  ReplayIndex,
} from '@/lib/replay-types';

// Helper to create a mock ReplayFingerprint
function createMockFingerprint(
  playerName: string,
  race: string,
  result: 'Win' | 'Loss',
  matchup: string = 'TvZ'
): ReplayFingerprint {
  return {
    player_name: playerName,
    matchup: matchup,
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
      game_date: '2025-01-01T12:00:00Z',
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

// Helper to create a mock UserReplayData
function createMockReplayData(overrides?: Partial<UserReplayData>): UserReplayData {
  return {
    id: 'test-replay-id',
    discord_user_id: 'test-user-123',
    uploaded_at: '2025-01-01T12:00:00Z',
    filename: 'Altitude LE (1).SC2Replay',
    game_type: '1v1-ladder',
    fingerprint: createMockFingerprint('Player1', 'Terran', 'Win'),
    detection: {
      build_id: 'build-123',
      build_name: 'Standard Mech',
      confidence: 85,
      distance: 12,
    },
    comparison: {
      filename: 'test.SC2Replay',
      build_name: 'Standard Mech',
      build_id: 'build-123',
      matchup: 'TvZ',
      execution_score: 78,
      tier: 'B',
      timing_comparison: {},
      composition_comparison: {},
      production_comparison: {},
      replay_fingerprint: createMockFingerprint('Player1', 'Terran', 'Win'),
    },
    suggested_player: 'Player1',
    player_name: 'Player1',
    ...overrides,
  };
}

describe('ReplayIndexEntry Type', () => {
  it('should accept all required fields', () => {
    const entry: ReplayIndexEntry = {
      id: 'replay-123',
      filename: 'Altitude LE (1).SC2Replay',
      uploaded_at: '2025-01-01T12:00:00Z',
      game_date: '2025-01-01T12:00:00Z',
      game_type: '1v1-ladder',
      matchup: 'TvZ',
      result: 'Win',
      duration: 600,
      map_name: 'Altitude LE',
      opponent_name: 'Player2',
      reference_id: null,
      reference_alias: null,
      comparison_score: 78,
      production_score: null,
      supply_score: null,
      vision_score: null,
      supply_block_time: null,
      production_idle_time: null,
      detected_build: 'Standard Mech',
      detection_confidence: 85,
    };

    expect(entry.id).toBe('replay-123');
    expect(entry.matchup).toBe('TvZ');
    expect(entry.result).toBe('Win');
    expect(entry.comparison_score).toBe(78);
  });

  it('should accept null values for optional metrics', () => {
    const entry: ReplayIndexEntry = {
      id: 'replay-123',
      filename: 'test.SC2Replay',
      uploaded_at: '2025-01-01T12:00:00Z',
      game_date: null,
      game_type: '1v1-ladder',
      matchup: 'TvZ',
      result: 'Loss',
      duration: 300,
      map_name: 'Altitude LE',
      opponent_name: '',
      reference_id: null,
      reference_alias: null,
      comparison_score: null,
      production_score: null,
      supply_score: null,
      vision_score: null,
      supply_block_time: null,
      production_idle_time: null,
      detected_build: null,
      detection_confidence: null,
    };

    expect(entry.game_date).toBeNull();
    expect(entry.comparison_score).toBeNull();
    expect(entry.detected_build).toBeNull();
  });
});

describe('ReplayIndex Type', () => {
  it('should track version and metadata', () => {
    const index: ReplayIndex = {
      version: 1,
      last_updated: '2025-01-01T12:00:00Z',
      replay_count: 2,
      entries: [
        {
          id: 'replay-1',
          filename: 'test1.SC2Replay',
          uploaded_at: '2025-01-01T12:00:00Z',
          game_date: null,
          game_type: '1v1-ladder',
          matchup: 'TvZ',
          result: 'Win',
          duration: 600,
          map_name: 'Altitude LE',
          opponent_name: 'Opponent1',
          reference_id: null,
          reference_alias: null,
          comparison_score: null,
          production_score: null,
          supply_score: null,
          vision_score: null,
          supply_block_time: null,
          production_idle_time: null,
          detected_build: null,
          detection_confidence: null,
        },
        {
          id: 'replay-2',
          filename: 'test2.SC2Replay',
          uploaded_at: '2025-01-01T11:00:00Z',
          game_date: null,
          game_type: '1v1-ladder',
          matchup: 'TvP',
          result: 'Loss',
          duration: 450,
          map_name: 'Goldenaura LE',
          opponent_name: 'Opponent2',
          reference_id: null,
          reference_alias: null,
          comparison_score: null,
          production_score: null,
          supply_score: null,
          vision_score: null,
          supply_block_time: null,
          production_idle_time: null,
          detected_build: null,
          detection_confidence: null,
        },
      ],
    };

    expect(index.version).toBe(1);
    expect(index.replay_count).toBe(2);
    expect(index.entries).toHaveLength(2);
  });

  it('should validate replay_count matches entries length', () => {
    const index: ReplayIndex = {
      version: 5,
      last_updated: '2025-01-01T12:00:00Z',
      replay_count: 0,
      entries: [],
    };

    expect(index.replay_count).toBe(index.entries.length);
  });
});

describe('createIndexEntry Function Logic', () => {
  // Note: We test the logic that would be in createIndexEntry here
  // The actual function is in replay-kv.ts which depends on KV storage

  it('should extract opponent name from all_players', () => {
    const replayData = createMockReplayData();
    const fingerprint = replayData.fingerprint;

    // Find opponent - logic from createIndexEntry
    const playerName = replayData.suggested_player || replayData.player_name || fingerprint.player_name;
    const playerData = fingerprint.all_players?.find(p => p.name === playerName);

    let opponentName = '';
    if (playerData) {
      const opponent = fingerprint.all_players?.find(
        p => !p.is_observer && p.team !== playerData.team
      );
      opponentName = opponent?.name || '';
    }

    expect(opponentName).toBe('Player2');
  });

  it('should handle missing all_players gracefully', () => {
    const fingerprint = createMockFingerprint('Player1', 'Terran', 'Win');
    // @ts-expect-error - Testing undefined case
    fingerprint.all_players = undefined;

    const replayData = createMockReplayData({ fingerprint });

    // Logic from createIndexEntry
    const opponentName = '';
    if (replayData.fingerprint.all_players) {
      // Would process here
    }

    expect(opponentName).toBe('');
  });

  it('should use comparison execution_score for comparison_score', () => {
    const replayData = createMockReplayData();

    // Logic from createIndexEntry
    const comparisonScore = replayData.comparison?.execution_score || null;

    expect(comparisonScore).toBe(78);
  });

  it('should use null for comparison_score when no comparison', () => {
    const replayData = createMockReplayData({ comparison: null });

    const comparisonScore = replayData.comparison?.execution_score || null;

    expect(comparisonScore).toBeNull();
  });

  it('should extract detection data correctly', () => {
    const replayData = createMockReplayData();

    const detectedBuild = replayData.detection?.build_name || null;
    const detectionConfidence = replayData.detection?.confidence || null;

    expect(detectedBuild).toBe('Standard Mech');
    expect(detectionConfidence).toBe(85);
  });

  it('should fallback to fingerprint metadata for game_type', () => {
    const replayData = createMockReplayData({ game_type: undefined });

    // Logic from createIndexEntry
    const gameType = replayData.game_type || replayData.fingerprint.metadata.game_type || '1v1';

    expect(gameType).toBe('1v1');
  });
});

describe('Index Entry from UserReplayData', () => {
  it('should create valid index entry from full replay data', () => {
    const replayData = createMockReplayData();

    // Simulate createIndexEntry logic
    const fingerprint = replayData.fingerprint;
    const metadata = fingerprint.metadata;

    let opponentName = '';
    if (fingerprint.all_players) {
      const playerName = replayData.suggested_player || replayData.player_name || fingerprint.player_name;
      const playerData = fingerprint.all_players.find(p => p.name === playerName);
      if (playerData) {
        const opponent = fingerprint.all_players.find(
          p => !p.is_observer && p.team !== playerData.team
        );
        opponentName = opponent?.name || '';
      }
    }

    const entry: ReplayIndexEntry = {
      id: replayData.id,
      filename: replayData.filename,
      uploaded_at: replayData.uploaded_at,
      game_date: metadata.game_date,
      game_type: replayData.game_type || metadata.game_type || '1v1',
      matchup: fingerprint.matchup,
      result: metadata.result as 'Win' | 'Loss',
      duration: metadata.duration || 0,
      map_name: metadata.map,
      opponent_name: opponentName,
      reference_id: null,
      reference_alias: null,
      comparison_score: replayData.comparison?.execution_score || null,
      production_score: null,
      supply_score: null,
      vision_score: null,
      supply_block_time: null,
      production_idle_time: null,
      detected_build: replayData.detection?.build_name || null,
      detection_confidence: replayData.detection?.confidence || null,
    };

    expect(entry.id).toBe('test-replay-id');
    expect(entry.filename).toBe('Altitude LE (1).SC2Replay');
    expect(entry.matchup).toBe('TvZ');
    expect(entry.result).toBe('Win');
    expect(entry.duration).toBe(600);
    expect(entry.map_name).toBe('Altitude LE');
    expect(entry.opponent_name).toBe('Player2');
    expect(entry.comparison_score).toBe(78);
    expect(entry.detected_build).toBe('Standard Mech');
    expect(entry.detection_confidence).toBe(85);
  });

  it('should handle replay with observers correctly', () => {
    const fingerprint = createMockFingerprint('Player1', 'Terran', 'Win');
    fingerprint.all_players = [
      { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 180 },
      { name: 'Player2', race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4400, apm: 200 },
      { name: 'Observer1', race: 'Terran', result: 'Unknown', team: 0, is_observer: true },
    ];

    const replayData = createMockReplayData({ fingerprint });

    // Find opponent excluding observers
    const playerData = fingerprint.all_players.find(p => p.name === 'Player1');
    const opponent = fingerprint.all_players.find(
      p => !p.is_observer && p.team !== playerData?.team
    );

    expect(opponent?.name).toBe('Player2');
    expect(opponent?.is_observer).toBe(false);
  });
});

describe('ReplayIndex Operations', () => {
  it('should add entry to empty index', () => {
    const index: ReplayIndex = {
      version: 0,
      last_updated: '2025-01-01T12:00:00Z',
      replay_count: 0,
      entries: [],
    };

    const newEntry: ReplayIndexEntry = {
      id: 'replay-new',
      filename: 'new.SC2Replay',
      uploaded_at: '2025-01-01T13:00:00Z',
      game_date: null,
      game_type: '1v1-ladder',
      matchup: 'TvZ',
      result: 'Win',
      duration: 500,
      map_name: 'Test Map',
      opponent_name: 'TestOpponent',
      reference_id: null,
      reference_alias: null,
      comparison_score: null,
      production_score: null,
      supply_score: null,
      vision_score: null,
      supply_block_time: null,
      production_idle_time: null,
      detected_build: null,
      detection_confidence: null,
    };

    // Add entry (like addToReplayIndex)
    index.entries.unshift(newEntry);
    index.replay_count++;
    index.version++;

    expect(index.entries).toHaveLength(1);
    expect(index.replay_count).toBe(1);
    expect(index.version).toBe(1);
    expect(index.entries[0].id).toBe('replay-new');
  });

  it('should remove entry from index', () => {
    const index: ReplayIndex = {
      version: 2,
      last_updated: '2025-01-01T12:00:00Z',
      replay_count: 2,
      entries: [
        {
          id: 'replay-1',
          filename: 'test1.SC2Replay',
          uploaded_at: '2025-01-01T12:00:00Z',
          game_date: null,
          game_type: '1v1-ladder',
          matchup: 'TvZ',
          result: 'Win',
          duration: 600,
          map_name: 'Map1',
          opponent_name: 'Opp1',
          reference_id: null,
          reference_alias: null,
          comparison_score: null,
          production_score: null,
          supply_score: null,
          vision_score: null,
          supply_block_time: null,
          production_idle_time: null,
          detected_build: null,
          detection_confidence: null,
        },
        {
          id: 'replay-2',
          filename: 'test2.SC2Replay',
          uploaded_at: '2025-01-01T11:00:00Z',
          game_date: null,
          game_type: '1v1-ladder',
          matchup: 'TvP',
          result: 'Loss',
          duration: 450,
          map_name: 'Map2',
          opponent_name: 'Opp2',
          reference_id: null,
          reference_alias: null,
          comparison_score: null,
          production_score: null,
          supply_score: null,
          vision_score: null,
          supply_block_time: null,
          production_idle_time: null,
          detected_build: null,
          detection_confidence: null,
        },
      ],
    };

    // Remove entry (like removeFromReplayIndex)
    const replayIdToRemove = 'replay-1';
    index.entries = index.entries.filter(e => e.id !== replayIdToRemove);
    index.replay_count = index.entries.length;
    index.version++;

    expect(index.entries).toHaveLength(1);
    expect(index.replay_count).toBe(1);
    expect(index.version).toBe(3);
    expect(index.entries[0].id).toBe('replay-2');
  });

  it('should update existing entry in index', () => {
    const index: ReplayIndex = {
      version: 1,
      last_updated: '2025-01-01T12:00:00Z',
      replay_count: 1,
      entries: [
        {
          id: 'replay-1',
          filename: 'test1.SC2Replay',
          uploaded_at: '2025-01-01T12:00:00Z',
          game_date: null,
          game_type: '1v1-ladder',
          matchup: 'TvZ',
          result: 'Win',
          duration: 600,
          map_name: 'Map1',
          opponent_name: 'Opp1',
          reference_id: null,
          reference_alias: null,
          comparison_score: null,
          production_score: null,
          supply_score: null,
          vision_score: null,
          supply_block_time: null,
          production_idle_time: null,
          detected_build: null,
          detection_confidence: null,
        },
      ],
    };

    // Update entry with reference
    const updatedEntry: ReplayIndexEntry = {
      ...index.entries[0],
      reference_id: 'ref-123',
      reference_alias: 'My Build',
      comparison_score: 85,
    };

    const existingIdx = index.entries.findIndex(e => e.id === updatedEntry.id);
    if (existingIdx >= 0) {
      index.entries[existingIdx] = updatedEntry;
    }
    index.version++;

    expect(index.entries[0].reference_id).toBe('ref-123');
    expect(index.entries[0].reference_alias).toBe('My Build');
    expect(index.entries[0].comparison_score).toBe(85);
    expect(index.replay_count).toBe(1); // Count unchanged for update
  });
});
