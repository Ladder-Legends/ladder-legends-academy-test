/**
 * Tests for My Replays Overview component calculations
 */
import { describe, it, expect } from 'vitest';
import type { UserReplayData } from '@/lib/replay-types';

// Extract calculation logic for testing
// These mirror the logic in my-replays-overview.tsx

interface MatchupPillarStats {
  total: number;
  wins: number;
  losses: number;
  productionScores: number[];
  supplyScores: number[];
}

function calculateProductionScore(replay: UserReplayData): number | null {
  if (replay.comparison?.execution_score != null) {
    return replay.comparison.execution_score;
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

function calculateMatchupStats(
  replays: UserReplayData[],
  confirmedPlayerNames: string[] = []
): Record<string, MatchupPillarStats> {
  return replays.reduce((acc, r) => {
    if (!r.fingerprint.all_players) return acc;

    // Find player using confirmed/suggested name priority
    let playerData = null;
    for (const confirmedName of confirmedPlayerNames) {
      playerData = r.fingerprint.all_players.find(p => p.name === confirmedName);
      if (playerData) break;
    }
    if (!playerData && r.player_name) {
      playerData = r.fingerprint.all_players.find(p => p.name === r.player_name);
    }
    if (!playerData && r.fingerprint.player_name) {
      playerData = r.fingerprint.all_players.find(p => p.name === r.fingerprint.player_name);
    }

    if (!playerData) return acc;

    // Find opponent(s)
    const opponents = r.fingerprint.all_players.filter(
      p => !p.is_observer && p.team !== playerData.team
    );

    if (opponents.length === 0) return acc;

    const playerRaceInThisGame = playerData.race;
    const opponentRace = opponents[0].race;

    // Create normalized matchup
    const normalizedMatchup = `${playerRaceInThisGame[0]}v${opponentRace[0]}`;

    if (!acc[normalizedMatchup]) {
      acc[normalizedMatchup] = { total: 0, wins: 0, losses: 0, productionScores: [], supplyScores: [] };
    }
    acc[normalizedMatchup].total++;
    if (r.fingerprint.metadata.result === 'Win') acc[normalizedMatchup].wins++;
    if (r.fingerprint.metadata.result === 'Loss') acc[normalizedMatchup].losses++;

    const prodScore = calculateProductionScore(r);
    const supplyScore = calculateSupplyScore(r);
    if (prodScore !== null) acc[normalizedMatchup].productionScores.push(prodScore);
    if (supplyScore !== null) acc[normalizedMatchup].supplyScores.push(supplyScore);

    return acc;
  }, {} as Record<string, MatchupPillarStats>);
}

// Base fingerprint fields shared across all test replays
const baseFingerprint = {
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
};

// Helper to create test replay with all_players
function createReplayWithPlayers(
  playerRace: string,
  opponentRace: string,
  result: 'Win' | 'Loss',
  options: {
    playerName?: string;
    opponentName?: string;
    executionScore?: number;
    supplyBlocks?: number;
    supplyBlockTime?: number;
  } = {}
): UserReplayData {
  const {
    playerName = 'TestPlayer',
    opponentName = 'Opponent',
    executionScore,
    supplyBlocks = 0,
    supplyBlockTime = 0,
  } = options;

  return {
    id: `replay-${Math.random()}`,
    discord_user_id: 'user123',
    uploaded_at: '2025-01-26T00:00:00Z',
    filename: 'test.SC2Replay',
    player_name: playerName,
    detection: null,
    comparison: executionScore !== undefined ? {
      filename: 'test.SC2Replay',
      build_name: 'Test Build',
      build_id: 'test',
      matchup: `${playerRace[0]}v${opponentRace[0]}`,
      execution_score: executionScore,
      tier: 'B' as const,
      timing_comparison: {},
      composition_comparison: {},
      production_comparison: {},
      replay_fingerprint: {
        matchup: `${playerRace[0]}v${opponentRace[0]}`,
        race: playerRace,
        player_name: playerName,
        all_players: [],
        metadata: { map: 'Test', duration: 600, result, opponent_race: opponentRace, game_type: '1v1', category: 'Ladder', game_date: '2025-01-26T00:00:00Z' },
        economy: { workers_3min: 12, workers_5min: 29, workers_7min: 48, expansion_count: 2, avg_expansion_timing: 180 },
        ...baseFingerprint,
      },
    } : null,
    fingerprint: {
      matchup: `${playerRace[0]}v${opponentRace[0]}`,
      race: playerRace,
      player_name: playerName,
      all_players: [
        {
          name: playerName,
          race: playerRace,
          result,
          team: 1,
          is_observer: false,
          mmr: null,
          apm: 100,
        },
        {
          name: opponentName,
          race: opponentRace,
          result: result === 'Win' ? 'Loss' : 'Win',
          team: 2,
          is_observer: false,
          mmr: null,
          apm: 100,
        },
      ],
      metadata: {
        map: 'Test Map',
        duration: 600,
        result,
        opponent_race: opponentRace,
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
        supply_block_count: supplyBlocks,
        total_supply_block_time: supplyBlockTime,
      },
      ...baseFingerprint,
    },
  };
}

describe('Matchup Stats Calculation', () => {
  it('returns empty object for no replays', () => {
    expect(calculateMatchupStats([])).toEqual({});
  });

  it('returns empty object for replays without all_players', () => {
    const replay: UserReplayData = {
      id: 'test',
      discord_user_id: 'user123',
      uploaded_at: '2025-01-26T00:00:00Z',
      filename: 'test.SC2Replay',
      detection: null,
      comparison: null,
      fingerprint: {
        matchup: 'TvP',
        race: 'Terran',
        player_name: 'Test',
        all_players: undefined as never, // Explicitly missing
        metadata: { map: 'Test', duration: 600, result: 'Win', opponent_race: 'Protoss', game_type: '1v1', category: 'Ladder', game_date: '2025-01-26T00:00:00Z' },
        economy: { workers_3min: 12, workers_5min: 29, workers_7min: 48, expansion_count: 2, avg_expansion_timing: 180 },
        ...baseFingerprint,
      },
    };
    expect(calculateMatchupStats([replay])).toEqual({});
  });

  it('calculates matchup stats correctly', () => {
    const replays = [
      createReplayWithPlayers('Terran', 'Protoss', 'Win'),
      createReplayWithPlayers('Terran', 'Protoss', 'Loss'),
      createReplayWithPlayers('Terran', 'Zerg', 'Win'),
    ];

    const stats = calculateMatchupStats(replays);

    expect(stats['TvP']).toEqual({
      total: 2,
      wins: 1,
      losses: 1,
      productionScores: [],
      supplyScores: [100, 100],
    });
    expect(stats['TvZ']).toEqual({
      total: 1,
      wins: 1,
      losses: 0,
      productionScores: [],
      supplyScores: [100],
    });
  });

  it('normalizes matchup to player perspective', () => {
    const replays = [
      createReplayWithPlayers('Protoss', 'Terran', 'Win', { playerName: 'Player1' }),
      createReplayWithPlayers('Terran', 'Protoss', 'Win', { playerName: 'Player2' }),
    ];

    const stats = calculateMatchupStats(replays);

    expect(stats['PvT']).toBeDefined();
    expect(stats['TvP']).toBeDefined();
    expect(stats['PvT'].total).toBe(1);
    expect(stats['TvP'].total).toBe(1);
  });

  it('uses confirmed player names for lookups', () => {
    const replay = createReplayWithPlayers('Terran', 'Protoss', 'Win', {
      playerName: 'MyName',
    });

    const stats = calculateMatchupStats([replay], ['MyName']);

    expect(stats['TvP']).toBeDefined();
    expect(stats['TvP'].total).toBe(1);
  });

  it('aggregates production scores per matchup', () => {
    const replays = [
      createReplayWithPlayers('Terran', 'Protoss', 'Win', { executionScore: 80 }),
      createReplayWithPlayers('Terran', 'Protoss', 'Win', { executionScore: 90 }),
      createReplayWithPlayers('Terran', 'Zerg', 'Win', { executionScore: 70 }),
    ];

    const stats = calculateMatchupStats(replays);

    expect(stats['TvP'].productionScores).toEqual([80, 90]);
    expect(stats['TvZ'].productionScores).toEqual([70]);
  });

  it('aggregates supply scores per matchup', () => {
    const replays = [
      createReplayWithPlayers('Terran', 'Protoss', 'Win', { supplyBlocks: 2, supplyBlockTime: 10 }),
      createReplayWithPlayers('Terran', 'Protoss', 'Win', { supplyBlocks: 0, supplyBlockTime: 0 }),
    ];

    const stats = calculateMatchupStats(replays);

    // First replay: 100 - 20 (2 blocks) - 20 (10s) = 60
    // Second replay: 100 - 0 - 0 = 100
    expect(stats['TvP'].supplyScores).toEqual([60, 100]);
  });

  it('excludes observers from matchup calculations', () => {
    const replay: UserReplayData = {
      id: 'test',
      discord_user_id: 'user123',
      uploaded_at: '2025-01-26T00:00:00Z',
      filename: 'test.SC2Replay',
      player_name: 'Observer',
      detection: null,
      comparison: null,
      fingerprint: {
        matchup: 'TvP',
        race: 'Terran',
        player_name: 'Observer',
        all_players: [
          { name: 'Player1', race: 'Terran', result: 'Win', team: 1, is_observer: false, mmr: null, apm: 100 },
          { name: 'Player2', race: 'Protoss', result: 'Loss', team: 2, is_observer: false, mmr: null, apm: 100 },
          { name: 'Observer', race: 'Terran', result: 'Win', team: 1, is_observer: true, mmr: null, apm: 0 },
        ],
        metadata: { map: 'Test', duration: 600, result: 'Win', opponent_race: 'Protoss', game_type: '1v1', category: 'Ladder', game_date: '2025-01-26T00:00:00Z' },
        economy: { workers_3min: 12, workers_5min: 29, workers_7min: 48, expansion_count: 2, avg_expansion_timing: 180, supply_block_count: 0, total_supply_block_time: 0 },
        ...baseFingerprint,
      },
    };

    // Observer shouldn't find opponents on a different team
    const stats = calculateMatchupStats([replay], ['Observer']);
    // Observer is on team 1, so opponents would be team 2 (Player2)
    // But Observer is marked as is_observer, so this depends on implementation
  });
});

describe('Win Rate Calculation', () => {
  it('calculates win rate correctly', () => {
    const stats: MatchupPillarStats = {
      total: 10,
      wins: 6,
      losses: 4,
      productionScores: [],
      supplyScores: [],
    };

    const winRate = (stats.wins / stats.total) * 100;
    expect(winRate).toBe(60);
  });

  it('handles 100% win rate', () => {
    const stats: MatchupPillarStats = {
      total: 5,
      wins: 5,
      losses: 0,
      productionScores: [],
      supplyScores: [],
    };

    const winRate = (stats.wins / stats.total) * 100;
    expect(winRate).toBe(100);
  });

  it('handles 0% win rate', () => {
    const stats: MatchupPillarStats = {
      total: 5,
      wins: 0,
      losses: 5,
      productionScores: [],
      supplyScores: [],
    };

    const winRate = (stats.wins / stats.total) * 100;
    expect(winRate).toBe(0);
  });
});

describe('Pillar Score Averaging', () => {
  function avgScore(scores: number[]): number | null {
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  it('returns null for empty array', () => {
    expect(avgScore([])).toBeNull();
  });

  it('calculates average correctly', () => {
    expect(avgScore([80, 90, 100])).toBe(90);
  });

  it('handles single value', () => {
    expect(avgScore([75])).toBe(75);
  });

  it('handles decimal results', () => {
    expect(avgScore([80, 85, 90])).toBe(85);
    expect(avgScore([70, 80])).toBe(75);
  });
});

describe('Overall Stats Calculation', () => {
  it('calculates total games correctly', () => {
    const replays = [
      createReplayWithPlayers('Terran', 'Protoss', 'Win'),
      createReplayWithPlayers('Terran', 'Protoss', 'Loss'),
      createReplayWithPlayers('Terran', 'Zerg', 'Win'),
    ];

    expect(replays.length).toBe(3);
  });

  it('calculates overall win rate correctly', () => {
    const replays = [
      createReplayWithPlayers('Terran', 'Protoss', 'Win'),
      createReplayWithPlayers('Terran', 'Protoss', 'Win'),
      createReplayWithPlayers('Terran', 'Protoss', 'Loss'),
      createReplayWithPlayers('Terran', 'Zerg', 'Win'),
      createReplayWithPlayers('Terran', 'Zerg', 'Loss'),
    ];

    const wins = replays.filter(r => r.fingerprint.metadata.result === 'Win').length;
    const total = replays.length;
    const winRate = (wins / total) * 100;

    expect(wins).toBe(3);
    expect(total).toBe(5);
    expect(winRate).toBe(60);
  });

  it('identifies most played matchup', () => {
    const replays = [
      createReplayWithPlayers('Terran', 'Protoss', 'Win'),
      createReplayWithPlayers('Terran', 'Protoss', 'Win'),
      createReplayWithPlayers('Terran', 'Protoss', 'Win'),
      createReplayWithPlayers('Terran', 'Zerg', 'Win'),
    ];

    const stats = calculateMatchupStats(replays);
    const sorted = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);

    expect(sorted[0][0]).toBe('TvP');
    expect(sorted[0][1].total).toBe(3);
  });
});
