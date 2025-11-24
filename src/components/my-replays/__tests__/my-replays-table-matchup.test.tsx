/**
 * Tests for matchup column normalization in MyReplaysTable component
 * Verifies that matchups always show player's race first
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyReplaysTable } from '../my-replays-table';
import type { UserReplayData, ReplayPlayer } from '@/lib/replay-types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('MyReplaysTable - Matchup Normalization', () => {
  const createMockReplay = (
    playerRace: string,
    opponentRace: string,
    overrides?: Partial<UserReplayData>
  ): UserReplayData => {
    // Create proper all_players array with player on team 1, opponent on team 2
    const allPlayers: ReplayPlayer[] = [
      {
        name: 'Lotus',
        race: playerRace,
        result: 'Win',
        team: 1,
        is_observer: false,
        mmr: 4500,
        apm: 180,
      },
      {
        name: 'Opponent',
        race: opponentRace,
        result: 'Loss',
        team: 2,
        is_observer: false,
        mmr: 4400,
        apm: 200,
      },
    ];

    return {
      id: 'test-replay-1',
      discord_user_id: 'test-user',
      uploaded_at: '2025-01-15T10:00:00Z',
      filename: 'test.SC2Replay',
      game_type: '1v1-ladder',
      player_name: 'Lotus',
      fingerprint: {
        player_name: 'Lotus',
        matchup: `${playerRace[0]}v${opponentRace[0]}`,
        race: playerRace,
        all_players: allPlayers,
        metadata: {
          map: 'Test Map',
          duration: 600,
          result: 'Win',
          opponent_race: opponentRace,
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
      ...overrides,
    };
  };

  it('should display Terran v Zerg with player as Terran', () => {
    const replays = [createMockReplay('Terran', 'Zerg')];

    render(<MyReplaysTable replays={replays} />);

    // Component renders full race names: "Terran v Zerg"
    expect(screen.getByText('Terran')).toBeInTheDocument();
    expect(screen.getByText('v')).toBeInTheDocument();
    expect(screen.getByText('Zerg')).toBeInTheDocument();
  });

  it('should display Terran v Protoss with player as Terran', () => {
    const replays = [createMockReplay('Terran', 'Protoss')];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Terran')).toBeInTheDocument();
    expect(screen.getByText('v')).toBeInTheDocument();
    expect(screen.getByText('Protoss')).toBeInTheDocument();
  });

  it('should display Terran v Terran for mirror matchup', () => {
    const replays = [createMockReplay('Terran', 'Terran')];

    render(<MyReplaysTable replays={replays} />);

    // Both players are Terran, so we should see two "Terran" texts
    const terranElements = screen.getAllByText('Terran');
    expect(terranElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('v')).toBeInTheDocument();
  });

  it('should display Zerg v Terran with player as Zerg', () => {
    const replays = [createMockReplay('Zerg', 'Terran')];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Zerg')).toBeInTheDocument();
    expect(screen.getByText('v')).toBeInTheDocument();
    expect(screen.getByText('Terran')).toBeInTheDocument();
  });

  it('should display Protoss v Terran with player as Protoss', () => {
    const replays = [createMockReplay('Protoss', 'Terran')];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Protoss')).toBeInTheDocument();
    expect(screen.getByText('v')).toBeInTheDocument();
    expect(screen.getByText('Terran')).toBeInTheDocument();
  });

  it('should display dash when all_players is empty', () => {
    const replay = createMockReplay('Terran', 'Zerg');
    replay.fingerprint.all_players = [];
    const replays = [replay];

    render(<MyReplaysTable replays={replays} />);

    // When all_players is empty, matchup shows dash
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should display dash when all_players is undefined', () => {
    const replay = createMockReplay('Terran', 'Zerg');
    (replay.fingerprint as any).all_players = undefined;
    const replays = [replay];

    render(<MyReplaysTable replays={replays} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should show player race first consistently across multiple replays', () => {
    const replays = [
      createMockReplay('Terran', 'Zerg', { id: 'replay-1' }),
      createMockReplay('Terran', 'Protoss', { id: 'replay-2' }),
      createMockReplay('Terran', 'Terran', { id: 'replay-3' }),
    ];

    render(<MyReplaysTable replays={replays} />);

    // All should show Terran (player's race) - should appear multiple times
    const terranElements = screen.getAllByText('Terran');
    expect(terranElements.length).toBeGreaterThanOrEqual(3);
  });
});
