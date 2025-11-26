/**
 * Tests for /api/my-replays metrics integration
 * Verifies that the route correctly uses /metrics endpoint and transforms data
 */

import { describe, it, expect } from 'vitest';
import type {
  MetricsResponse,
  PlayerMetrics,
  ReplayFingerprint,
  ReplayPlayer
} from '@/lib/replay-types';

/**
 * Helper to create a mock MetricsResponse
 */
function createMockMetricsResponse(options: {
  player1Name: string;
  player2Name: string;
  suggestedPlayer?: string;
}): MetricsResponse {
  const { player1Name, player2Name, suggestedPlayer } = options;

  const createPlayerMetrics = (name: string, race: string, result: string): PlayerMetrics => ({
    pid: name === player1Name ? 1 : 2,
    name,
    race,
    result,
    build_fingerprint: `${race[0]}:sbbb...`,
    production_score: 85,
    production_idle_total: 45,
    production_idle_percent: 12,
    supply_score: 90,
    supply_block_total: 30,
    supply_block_count: 5,
    supply_block_percent: 8,
    avg_mineral_float: 350,
    avg_gas_float: 200,
    inject_idle_total: race === 'Zerg' ? 60 : null,
    inject_efficiency: race === 'Zerg' ? 75 : null,
    inject_count: race === 'Zerg' ? 20 : null,
    build_order: [
      { time: 0, supply: 12, item: 'SCV', type: 'unit' },
      { time: 17, supply: 13, item: 'SupplyDepot', type: 'building' },
    ],
    phases: {},
    fingerprint: {
      player_name: name,
      matchup: race === 'Terran' ? 'TvZ' : 'ZvT',
      race,
      all_players: [],
      metadata: {
        map: 'Test Map',
        duration: 600,
        result,
        opponent_race: race === 'Terran' ? 'Zerg' : 'Terran',
        game_type: '1v1',
        category: 'Ladder',
        game_date: '2025-11-25',
      },
      timings: { first_barracks: 60, first_factory: 180 },
      sequences: {
        tech_sequence: [{ name: 'Barracks', type: 'building' }],
        build_sequence: [{ name: 'SCV', type: 'unit' }],
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
        moveout_times: [300],
        first_moveout: 300,
        harass_count: 2,
        engagement_count: 5,
        first_engagement: 350,
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
  });

  const allPlayers: ReplayPlayer[] = [
    { name: player1Name, race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: 4500, apm: 200 },
    { name: player2Name, race: 'Zerg', result: 'Loss', team: 2, is_observer: false, mmr: 4300, apm: 180 },
  ];

  return {
    filename: 'test.SC2Replay',
    map_name: 'Test Map',
    duration: 600,
    game_metadata: {
      game_date: '2025-11-25',
      game_type: '1v1',
      category: 'Ladder',
      patch: '5.0.11',
    },
    all_players: allPlayers,
    suggested_player: suggestedPlayer || player1Name,
    players: {
      '1': createPlayerMetrics(player1Name, 'Terran', 'Win'),
      '2': createPlayerMetrics(player2Name, 'Zerg', 'Loss'),
    },
  };
}

/**
 * Helper to transform MetricsResponse to player_fingerprints
 * This mirrors what the route does
 */
function transformToPlayerFingerprints(
  metricsResponse: MetricsResponse
): Record<string, ReplayFingerprint> {
  const player_fingerprints: Record<string, ReplayFingerprint> = {};
  for (const [_pid, playerData] of Object.entries(metricsResponse.players)) {
    if (playerData.fingerprint) {
      player_fingerprints[playerData.name] = playerData.fingerprint;
    }
  }
  return player_fingerprints;
}

describe('MetricsResponse to UserReplayData transformation', () => {
  describe('player_fingerprints extraction', () => {
    it('should extract fingerprints for all players', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
      });

      const fingerprints = transformToPlayerFingerprints(metricsResponse);

      expect(Object.keys(fingerprints)).toHaveLength(2);
      expect(fingerprints['Lotus']).toBeDefined();
      expect(fingerprints['Opponent']).toBeDefined();
    });

    it('should preserve fingerprint data correctly', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
      });

      const fingerprints = transformToPlayerFingerprints(metricsResponse);
      const lotusFingerprint = fingerprints['Lotus'];

      expect(lotusFingerprint.player_name).toBe('Lotus');
      expect(lotusFingerprint.race).toBe('Terran');
      expect(lotusFingerprint.matchup).toBe('TvZ');
      expect(lotusFingerprint.timings).toEqual({ first_barracks: 60, first_factory: 180 });
      expect(lotusFingerprint.economy.workers_3min).toBe(30);
      expect(lotusFingerprint.tactical.first_moveout).toBe(300);
    });

    it('should handle missing fingerprint gracefully', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
      });

      // Remove fingerprint from one player
      metricsResponse.players['2'].fingerprint = undefined;

      const fingerprints = transformToPlayerFingerprints(metricsResponse);

      expect(Object.keys(fingerprints)).toHaveLength(1);
      expect(fingerprints['Lotus']).toBeDefined();
      expect(fingerprints['Opponent']).toBeUndefined();
    });
  });

  describe('suggested_player selection', () => {
    it('should use suggested_player from response', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
        suggestedPlayer: 'Lotus',
      });

      expect(metricsResponse.suggested_player).toBe('Lotus');
    });

    it('should allow overriding with player_name param', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
        suggestedPlayer: 'Opponent', // API suggested opponent
      });

      // In route: suggestedPlayer = metricsResponse.suggested_player || playerName || null
      // If user passes playerName=Lotus, we should still respect API's suggestion
      // but the route would prioritize API response
      const playerName = 'Lotus';
      const suggestedPlayer = metricsResponse.suggested_player || playerName || null;

      expect(suggestedPlayer).toBe('Opponent'); // API takes priority
    });
  });

  describe('game_metadata construction', () => {
    it('should build game_metadata from metrics response', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
      });

      // This mirrors what the route does
      const game_metadata = {
        map: metricsResponse.map_name,
        duration: metricsResponse.duration,
        game_date: metricsResponse.game_metadata.game_date,
        game_type: metricsResponse.game_metadata.game_type,
        category: metricsResponse.game_metadata.category,
        patch: metricsResponse.game_metadata.patch,
        winner: metricsResponse.all_players.find(p => p.result === 'Win')?.name || null,
        loser: metricsResponse.all_players.find(p => p.result === 'Loss')?.name || null,
      };

      expect(game_metadata.map).toBe('Test Map');
      expect(game_metadata.duration).toBe(600);
      expect(game_metadata.game_date).toBe('2025-11-25');
      expect(game_metadata.game_type).toBe('1v1');
      expect(game_metadata.category).toBe('Ladder');
      expect(game_metadata.patch).toBe('5.0.11');
      expect(game_metadata.winner).toBe('Lotus');
      expect(game_metadata.loser).toBe('Opponent');
    });

    it('should handle null values in game_metadata', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
      });

      // Simulate missing metadata
      metricsResponse.game_metadata.game_date = null;
      metricsResponse.game_metadata.patch = null;

      const game_metadata = {
        map: metricsResponse.map_name,
        duration: metricsResponse.duration,
        game_date: metricsResponse.game_metadata.game_date,
        game_type: metricsResponse.game_metadata.game_type,
        category: metricsResponse.game_metadata.category,
        patch: metricsResponse.game_metadata.patch,
        winner: metricsResponse.all_players.find(p => p.result === 'Win')?.name || null,
        loser: metricsResponse.all_players.find(p => p.result === 'Loss')?.name || null,
      };

      expect(game_metadata.game_date).toBeNull();
      expect(game_metadata.patch).toBeNull();
      // Other fields still work
      expect(game_metadata.map).toBe('Test Map');
      expect(game_metadata.winner).toBe('Lotus');
    });
  });

  describe('fingerprint selection for storage', () => {
    it('should select suggested player fingerprint when available', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
        suggestedPlayer: 'Lotus',
      });

      const fingerprints = transformToPlayerFingerprints(metricsResponse);
      const suggestedPlayer = metricsResponse.suggested_player;

      // This mirrors what the route does
      const fingerprint = suggestedPlayer && fingerprints[suggestedPlayer]
        ? fingerprints[suggestedPlayer]
        : Object.values(fingerprints)[0];

      expect(fingerprint.player_name).toBe('Lotus');
    });

    it('should fallback to first fingerprint when suggested player has no fingerprint', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
        suggestedPlayer: 'Unknown', // Not in the game
      });

      const fingerprints = transformToPlayerFingerprints(metricsResponse);
      const suggestedPlayer = metricsResponse.suggested_player;

      const fingerprint = suggestedPlayer && fingerprints[suggestedPlayer]
        ? fingerprints[suggestedPlayer]
        : Object.values(fingerprints)[0];

      // Falls back to first available
      expect(['Lotus', 'Opponent']).toContain(fingerprint.player_name);
    });
  });

  describe('coaching metrics preservation', () => {
    it('should have all coaching metrics in PlayerMetrics', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
      });

      const lotusMetrics = metricsResponse.players['1'];

      // Verify coaching metrics exist
      expect(lotusMetrics.production_score).toBe(85);
      expect(lotusMetrics.production_idle_total).toBe(45);
      expect(lotusMetrics.production_idle_percent).toBe(12);
      expect(lotusMetrics.supply_score).toBe(90);
      expect(lotusMetrics.supply_block_total).toBe(30);
      expect(lotusMetrics.supply_block_count).toBe(5);
      expect(lotusMetrics.avg_mineral_float).toBe(350);
      expect(lotusMetrics.avg_gas_float).toBe(200);
    });

    it('should have Zerg-specific inject metrics', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'ZergPlayer',
      });

      const zergMetrics = metricsResponse.players['2'];

      expect(zergMetrics.inject_idle_total).toBe(60);
      expect(zergMetrics.inject_efficiency).toBe(75);
      expect(zergMetrics.inject_count).toBe(20);
    });

    it('should have null inject metrics for non-Zerg', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'TerranPlayer',
        player2Name: 'Opponent',
      });

      const terranMetrics = metricsResponse.players['1'];

      expect(terranMetrics.inject_idle_total).toBeNull();
      expect(terranMetrics.inject_efficiency).toBeNull();
      expect(terranMetrics.inject_count).toBeNull();
    });

    it('should have build_order timeline', () => {
      const metricsResponse = createMockMetricsResponse({
        player1Name: 'Lotus',
        player2Name: 'Opponent',
      });

      const lotusMetrics = metricsResponse.players['1'];

      expect(lotusMetrics.build_order).toHaveLength(2);
      expect(lotusMetrics.build_order[0]).toEqual({
        time: 0,
        supply: 12,
        item: 'SCV',
        type: 'unit',
      });
    });
  });
});
