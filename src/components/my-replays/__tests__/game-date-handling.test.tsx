import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyReplaysTable } from '../my-replays-table';
import type { UserReplayData } from '@/lib/replay-types';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const createMockReplay = (overrides?: Partial<UserReplayData>): UserReplayData => ({
  id: 'test-1',
  discord_user_id: 'user123',
  uploaded_at: '2025-01-15T10:00:00Z',
  filename: 'test.SC2Replay',
  detection: null,
  comparison: null,
  fingerprint: {
    matchup: 'TvZ',
    race: 'Terran',
    player_name: 'TestPlayer',
    all_players: [
      {
        name: 'TestPlayer',
        race: 'Terran',
        result: 'Win',
        team: 1,
        is_observer: false,
      },
      {
        name: 'Opponent',
        race: 'Zerg',
        result: 'Loss',
        team: 2,
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
      game_date: null,
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
      workers_3min: 16,
      workers_5min: 44,
      workers_7min: 66,
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
      gas_count: 0,
      production_count: 0,
      tech_count: 0,
      reactor_count: 0,
      techlab_count: 0,
      expansions: 0,
      gas_per_base: 0,
      production_per_base: 0,
    },
  },
  ...overrides,
});

describe('Game Date Handling', () => {
  describe('MyReplaysTable - Date Display', () => {
    it('should use game_date when available', () => {
      const replays: UserReplayData[] = [
        createMockReplay({
          fingerprint: {
            ...createMockReplay().fingerprint,
            metadata: {
              ...createMockReplay().fingerprint.metadata,
              game_date: '2025-01-10T14:30:00Z',
            },
          },
        }),
      ];

      render(<MyReplaysTable replays={replays} />);

      // Should show game date (Jan 10)
      expect(screen.getByText('Jan 10')).toBeInTheDocument();
    });

    it('should fall back to uploaded_at when game_date is null', () => {
      const replays: UserReplayData[] = [
        createMockReplay({
          uploaded_at: '2025-01-15T10:00:00Z',
          fingerprint: {
            ...createMockReplay().fingerprint,
            metadata: {
              ...createMockReplay().fingerprint.metadata,
              game_date: null,
            },
          },
        }),
      ];

      render(<MyReplaysTable replays={replays} />);

      // Should show upload date (Jan 15)
      expect(screen.getByText('Jan 15')).toBeInTheDocument();
    });

    it('should display time from game_date', () => {
      const replays: UserReplayData[] = [
        createMockReplay({
          fingerprint: {
            ...createMockReplay().fingerprint,
            metadata: {
              ...createMockReplay().fingerprint.metadata,
              game_date: '2025-01-10T14:30:00Z',
            },
          },
        }),
      ];

      render(<MyReplaysTable replays={replays} />);

      // Time format depends on locale, but should be present
      // Use regex to match time patterns like "2:30 PM" or "14:30"
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('MyReplaysTable - Sorting by Date', () => {
    it('should sort by game_date when available', () => {
      const replays: UserReplayData[] = [
        createMockReplay({
          id: 'replay-1',
          uploaded_at: '2025-01-15T10:00:00Z',
          fingerprint: {
            ...createMockReplay().fingerprint,
            metadata: {
              ...createMockReplay().fingerprint.metadata,
              game_date: '2025-01-10T14:30:00Z', // Older game
            },
          },
        }),
        createMockReplay({
          id: 'replay-2',
          uploaded_at: '2025-01-10T10:00:00Z',
          fingerprint: {
            ...createMockReplay().fingerprint,
            metadata: {
              ...createMockReplay().fingerprint.metadata,
              game_date: '2025-01-12T14:30:00Z', // Newer game
            },
          },
        }),
      ];

      const { container } = render(<MyReplaysTable replays={replays} />);

      // Get all date cells (they contain date + time in separate spans)
      const dateCells = container.querySelectorAll('tbody tr td:first-child');

      // Table sorts by date ascending by default (oldest first)
      // First row should show Jan 10 (older game_date)
      const firstRowDateSpan = dateCells[0].querySelector('.text-sm.font-medium');
      expect(firstRowDateSpan?.textContent).toBe('Jan 10');

      // Second row should show Jan 12 (newer game_date)
      const secondRowDateSpan = dateCells[1].querySelector('.text-sm.font-medium');
      expect(secondRowDateSpan?.textContent).toBe('Jan 12');
    });

    it('should sort mixed game_date and uploaded_at correctly', () => {
      const replays: UserReplayData[] = [
        createMockReplay({
          id: 'replay-1',
          uploaded_at: '2025-01-15T10:00:00Z',
          fingerprint: {
            ...createMockReplay().fingerprint,
            metadata: {
              ...createMockReplay().fingerprint.metadata,
              game_date: '2025-01-10T14:30:00Z',
            },
          },
        }),
        createMockReplay({
          id: 'replay-2',
          uploaded_at: '2025-01-12T10:00:00Z', // Falls back to this
          fingerprint: {
            ...createMockReplay().fingerprint,
            metadata: {
              ...createMockReplay().fingerprint.metadata,
              game_date: null,
            },
          },
        }),
      ];

      const { container } = render(<MyReplaysTable replays={replays} />);

      // Get all date cells (they contain date + time in separate spans)
      const dateCells = container.querySelectorAll('tbody tr td:first-child');

      // Table sorts by date ascending by default (oldest first)
      // First row should show Jan 10 (game_date - older)
      const firstRowDateSpan = dateCells[0].querySelector('.text-sm.font-medium');
      expect(firstRowDateSpan?.textContent).toBe('Jan 10');

      // Second row should show Jan 12 (uploaded_at fallback - newer)
      const secondRowDateSpan = dateCells[1].querySelector('.text-sm.font-medium');
      expect(secondRowDateSpan?.textContent).toBe('Jan 12');
    });
  });

  describe('Date Parsing Edge Cases', () => {
    it('should handle invalid date strings gracefully', () => {
      const replays: UserReplayData[] = [
        createMockReplay({
          uploaded_at: '2025-01-15T10:00:00Z',
          fingerprint: {
            ...createMockReplay().fingerprint,
            metadata: {
              ...createMockReplay().fingerprint.metadata,
              game_date: 'invalid-date',
            },
          },
        }),
      ];

      // Should not throw
      expect(() => {
        render(<MyReplaysTable replays={replays} />);
      }).not.toThrow();
    });

    it('should handle empty replays array', () => {
      const replays: UserReplayData[] = [];

      const { container } = render(<MyReplaysTable replays={replays} />);

      // Should render table with empty tbody
      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
      expect(tbody?.children.length).toBe(0);
    });
  });
});
