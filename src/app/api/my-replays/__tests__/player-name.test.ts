/**
 * Tests for player_name field in UserReplayData
 * Verifies that player names can be stored and accessed correctly
 */

import { describe, it, expect } from 'vitest';
import type { UserReplayData } from '@/lib/replay-types';

describe('UserReplayData - player_name field', () => {
  const createMockReplayData = (playerName?: string): UserReplayData => ({
    id: 'test-id',
    discord_user_id: 'test-user',
    uploaded_at: new Date().toISOString(),
    filename: 'test.SC2Replay',
    game_type: '1v1-ladder',
    player_name: playerName,
    fingerprint: {
      player_name: 'ExtractedPlayer',
      matchup: 'TvZ',
      race: 'Terran',
      all_players: [],
      metadata: {
        map: 'Test Map',
        duration: 600,
        result: 'Win',
        opponent_race: 'Zerg',
        game_type: '1v1',
        category: 'Ladder',
        game_date: '2025-11-19',
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
    },
    detection: null,
    comparison: null,
  });

  it('should accept player_name field in UserReplayData type', () => {
    const replayData = createMockReplayData('Lotus');

    expect(replayData.player_name).toBe('Lotus');
    expect(replayData.game_type).toBe('1v1-ladder');
  });

  it('should handle undefined player_name', () => {
    const replayData = createMockReplayData(undefined);

    expect(replayData.player_name).toBeUndefined();
  });

  it('should store different player names', () => {
    const replay1 = createMockReplayData('Lotus');
    const replay2 = createMockReplayData('LotusAlt');
    const replay3 = createMockReplayData('LotusMain');

    expect(replay1.player_name).toBe('Lotus');
    expect(replay2.player_name).toBe('LotusAlt');
    expect(replay3.player_name).toBe('LotusMain');
  });

  it('should allow player names with special characters', () => {
    const replay1 = createMockReplayData('Player<Name>');
    const replay2 = createMockReplayData('[TAG]Player');
    const replay3 = createMockReplayData('Player&Name');

    expect(replay1.player_name).toBe('Player<Name>');
    expect(replay2.player_name).toBe('[TAG]Player');
    expect(replay3.player_name).toBe('Player&Name');
  });

  it('should work with empty string player_name', () => {
    const replayData = createMockReplayData('');

    expect(replayData.player_name).toBe('');
  });

  it('should maintain player_name alongside other replay data', () => {
    const replayData = createMockReplayData('Lotus');

    // Verify player_name doesn't interfere with other fields
    expect(replayData.id).toBe('test-id');
    expect(replayData.filename).toBe('test.SC2Replay');
    expect(replayData.game_type).toBe('1v1-ladder');
    expect(replayData.player_name).toBe('Lotus');
    expect(replayData.fingerprint.matchup).toBe('TvZ');
  });
});
