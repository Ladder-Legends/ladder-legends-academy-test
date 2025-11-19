/**
 * Tests for player_name column in MyReplaysTable component
 * Verifies that player names are displayed correctly
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

describe('MyReplaysTable - Player Name Column', () => {
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
    detection: {
      build_id: 'test-build',
      build_name: 'Test Build',
      confidence: 0.95,
      distance: 10,
    },
    comparison: null,
    ...overrides,
  });

  it('should display player name when present', () => {
    const replays = [createMockReplay({ player_name: 'Lotus' })];

    render(<MyReplaysTable replays={replays} />);

    // Should show the player name
    expect(screen.getByText('Lotus')).toBeInTheDocument();
  });

  it('should display dash when player name is missing', () => {
    const replays = [createMockReplay({ player_name: undefined })];

    render(<MyReplaysTable replays={replays} />);

    // Should show a dash for missing player name
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should display multiple different player names', () => {
    const replays = [
      createMockReplay({ id: 'replay-1', player_name: 'Lotus' }),
      createMockReplay({ id: 'replay-2', player_name: 'LotusAlt' }),
      createMockReplay({ id: 'replay-3', player_name: 'LotusMain' }),
    ];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Lotus')).toBeInTheDocument();
    expect(screen.getByText('LotusAlt')).toBeInTheDocument();
    expect(screen.getByText('LotusMain')).toBeInTheDocument();
  });

  it('should handle player names with special characters', () => {
    const replays = [
      createMockReplay({ player_name: 'Player<Name>' }),
      createMockReplay({ id: 'replay-2', player_name: '[TAG]Player' }),
      createMockReplay({ id: 'replay-3', player_name: 'Player&Name' }),
    ];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Player<Name>')).toBeInTheDocument();
    expect(screen.getByText('[TAG]Player')).toBeInTheDocument();
    expect(screen.getByText('Player&Name')).toBeInTheDocument();
  });

  it('should have Player column header', () => {
    const replays = [createMockReplay()];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Player')).toBeInTheDocument();
  });

  it('should display player name alongside other replay metadata', () => {
    const replays = [
      createMockReplay({
        player_name: 'Lotus',
        game_type: '1v1-ladder',
      }),
    ];

    render(<MyReplaysTable replays={replays} />);

    // Player name
    expect(screen.getByText('Lotus')).toBeInTheDocument();

    // Other metadata
    expect(screen.getByText('Test Map')).toBeInTheDocument();
    expect(screen.getByText('1v1')).toBeInTheDocument();
    expect(screen.getByText('Win')).toBeInTheDocument();
  });

  it('should handle empty player name string as missing', () => {
    const replays = [createMockReplay({ player_name: '' as any })];

    render(<MyReplaysTable replays={replays} />);

    // Empty string should be treated as missing (because of the !replay.player_name check)
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should display player name for replays with no detected build', () => {
    const replays = [
      createMockReplay({
        player_name: 'Lotus',
        detection: null,
      }),
    ];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Lotus')).toBeInTheDocument();
  });

  it('should display player name for replays with no comparison', () => {
    const replays = [
      createMockReplay({
        player_name: 'Lotus',
        comparison: null,
      }),
    ];

    render(<MyReplaysTable replays={replays} />);

    expect(screen.getByText('Lotus')).toBeInTheDocument();
  });
});
