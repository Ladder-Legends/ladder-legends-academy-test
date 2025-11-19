/**
 * Tests for matchup column normalization in MyReplaysTable component
 * Verifies that matchups always show player's race first
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

describe('MyReplaysTable - Matchup Normalization', () => {
  const createMockReplay = (
    playerRace: string,
    opponentRace: string,
    overrides?: Partial<UserReplayData>
  ): UserReplayData => ({
    id: 'test-replay-1',
    discord_user_id: 'test-user',
    uploaded_at: '2025-01-15T10:00:00Z',
    filename: 'test.SC2Replay',
    game_type: '1v1-ladder',
    player_name: 'Lotus',
    fingerprint: {
      player_name: 'Lotus',
      matchup: `${playerRace[0]}v${opponentRace[0]}`, // Raw matchup (might be wrong order)
      race: playerRace,
      all_players: [],
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
  });

  it('should display TvZ with player as Terran', () => {
    const replays = [createMockReplay('Terran', 'Zerg')];

    render(<MyReplaysTable replays={replays} />);

    // Find the matchup container and verify structure
    const matchupContainer = screen.getByText((content, element) => {
      return element?.textContent === 'TvZ';
    });
    expect(matchupContainer).toBeInTheDocument();
  });

  it('should display TvP with player as Terran', () => {
    const replays = [createMockReplay('Terran', 'Protoss')];

    render(<MyReplaysTable replays={replays} />);

    const matchupContainer = screen.getByText((content, element) => {
      return element?.textContent === 'TvP';
    });
    expect(matchupContainer).toBeInTheDocument();
  });

  it('should display TvT with player as Terran', () => {
    const replays = [createMockReplay('Terran', 'Terran')];

    render(<MyReplaysTable replays={replays} />);

    const matchupContainer = screen.getByText((content, element) => {
      return element?.textContent === 'TvT';
    });
    expect(matchupContainer).toBeInTheDocument();
  });

  it('should display ZvT with player as Zerg', () => {
    const replays = [createMockReplay('Zerg', 'Terran')];

    render(<MyReplaysTable replays={replays} />);

    const matchupContainer = screen.getByText((content, element) => {
      return element?.textContent === 'ZvT';
    });
    expect(matchupContainer).toBeInTheDocument();
  });

  it('should display PvT with player as Protoss', () => {
    const replays = [createMockReplay('Protoss', 'Terran')];

    render(<MyReplaysTable replays={replays} />);

    const matchupContainer = screen.getByText((content, element) => {
      return element?.textContent === 'PvT';
    });
    expect(matchupContainer).toBeInTheDocument();
  });

  it('should display dash when race data is missing', () => {
    const replays = [createMockReplay('Terran', 'Zerg', {
      fingerprint: {
        ...createMockReplay('Terran', 'Zerg').fingerprint,
        race: undefined as any,
      },
    })];

    render(<MyReplaysTable replays={replays} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should display dash when opponent race data is missing', () => {
    const replays = [createMockReplay('Terran', 'Zerg', {
      fingerprint: {
        ...createMockReplay('Terran', 'Zerg').fingerprint,
        metadata: {
          ...createMockReplay('Terran', 'Zerg').fingerprint.metadata,
          opponent_race: undefined as any,
        },
      },
    })];

    render(<MyReplaysTable replays={replays} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should normalize matchups consistently across multiple replays', () => {
    const replays = [
      createMockReplay('Terran', 'Zerg', { id: 'replay-1' }),
      createMockReplay('Terran', 'Protoss', { id: 'replay-2' }),
      createMockReplay('Terran', 'Terran', { id: 'replay-3' }),
    ];

    render(<MyReplaysTable replays={replays} />);

    // All should show player's race (T) first
    const tElements = screen.getAllByText('T');
    expect(tElements.length).toBeGreaterThan(3); // At least 3 for player race + others
  });
});
