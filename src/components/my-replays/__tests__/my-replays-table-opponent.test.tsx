/**
 * Tests for opponent column in MyReplaysTable component
 * Verifies that opponent names are displayed correctly for 1v1 and team games
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyReplaysTable } from '../my-replays-table';
import type { UserReplayData } from '@/lib/replay-types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('MyReplaysTable - Opponent Column', () => {
  const createMockReplay = (overrides?: Partial<UserReplayData>): UserReplayData => ({
    id: 'test-replay-1',
    discord_user_id: 'test-user',
    uploaded_at: '2025-01-15T10:00:00Z',
    filename: 'test.SC2Replay',
    game_type: '1v1-ladder',
    player_name: 'Lotus',
    fingerprint: {
      player_name: 'Lotus',
      matchup: 'TvZ',
      race: 'Terran',
      all_players: [
        {
          name: 'Lotus',
          race: 'Terran',
          team: 1,
          result: 'Win',
          is_observer: false,
        },
        {
          name: 'Serral',
          race: 'Zerg',
          team: 2,
          result: 'Loss',
          is_observer: false,
        },
      ],
      metadata: {
        map: 'Test Map',
        duration: 600,
        result: 'Win',
        opponent_race: 'Zerg',
        game_type: '1v1',
        category: 'Ladder',
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
  });

  it('should display single opponent name in 1v1 game', () => {
    const replays = [createMockReplay()];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Serral')).toBeInTheDocument();
  });

  it('should display multiple opponent names comma-separated in 2v2 game', () => {
    const replays = [createMockReplay({
      player_name: 'Lotus',
      fingerprint: {
        ...createMockReplay().fingerprint,
        all_players: [
          {
            name: 'Lotus',
            race: 'Terran',
            team: 1,
            result: 'Win',
            is_observer: false,
          },
          {
            name: 'Teammate',
            race: 'Protoss',
            team: 1,
            result: 'Win',
            is_observer: false,
          },
          {
            name: 'Serral',
            race: 'Zerg',
            team: 2,
            result: 'Loss',
            is_observer: false,
          },
          {
            name: 'Maru',
            race: 'Terran',
            team: 2,
            result: 'Loss',
            is_observer: false,
          },
        ],
      },
    })];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Serral, Maru')).toBeInTheDocument();
  });

  it('should exclude observers from opponent list', () => {
    const replays = [createMockReplay({
      player_name: 'Lotus',
      fingerprint: {
        ...createMockReplay().fingerprint,
        all_players: [
          {
            name: 'Lotus',
            race: 'Terran',
            team: 1,
            result: 'Win',
            is_observer: false,
          },
          {
            name: 'Serral',
            race: 'Zerg',
            team: 2,
            result: 'Loss',
            is_observer: false,
          },
          {
            name: 'Observer1',
            race: 'Terran',
            team: 0,
            result: 'Loss',
            is_observer: true,
          },
        ],
      },
    })];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Serral')).toBeInTheDocument();
    expect(screen.queryByText(/Observer1/)).not.toBeInTheDocument();
  });

  it('should display dash when no opponent data available', () => {
    const replays = [createMockReplay({
      player_name: 'Lotus',
      fingerprint: {
        ...createMockReplay().fingerprint,
        all_players: [],
      },
    })];

    render(<MyReplaysTable replays={replays} />);

    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should display dash when player_name is not set', () => {
    const replays = [createMockReplay({
      player_name: undefined,
    })];

    render(<MyReplaysTable replays={replays} />);

    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should have Opponent column header', () => {
    const replays = [createMockReplay()];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Opponent')).toBeInTheDocument();
  });

  it('should display different opponents for different games', () => {
    const replays = [
      createMockReplay({
        id: 'replay-1',
        player_name: 'Lotus',
        fingerprint: {
          ...createMockReplay().fingerprint,
          all_players: [
            {
              name: 'Lotus',
              race: 'Terran',
              team: 1,
              result: 'Win',
              is_observer: false,
            },
            {
              name: 'Serral',
              race: 'Zerg',
              team: 2,
              result: 'Loss',
              is_observer: false,
            },
          ],
        },
      }),
      createMockReplay({
        id: 'replay-2',
        player_name: 'Lotus',
        fingerprint: {
          ...createMockReplay().fingerprint,
          all_players: [
            {
              name: 'Lotus',
              race: 'Terran',
              team: 1,
              result: 'Win',
              is_observer: false,
            },
            {
              name: 'Maru',
              race: 'Terran',
              team: 2,
              result: 'Loss',
              is_observer: false,
            },
          ],
        },
      }),
    ];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Serral')).toBeInTheDocument();
    expect(screen.getByText('Maru')).toBeInTheDocument();
  });
});
