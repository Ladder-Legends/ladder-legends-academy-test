/**
 * Tests for player name suggestion feature
 * Verifies player names are suggested after 3+ replays
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyReplaysContent } from '../my-replays-content';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock next-auth
vi.mock('next-auth/react');
const mockUseSession = useSession as any;

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
const mockUseRouter = useRouter as any;

// Mock fetch globally
global.fetch = vi.fn() as any;

// TODO: Implement player name suggestion UI component
describe.skip('Player Name Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          discordId: 'test-user',
          role: 'Coach',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    } as any);

    // Mock router
    mockUseRouter.mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as any);
  });

  it('should show player name suggestion after 3 replays from same player', async () => {
    // Mock API responses
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          replays: [
            { id: '1', filename: 'replay1.SC2Replay', player_name: 'PlayerOne', fingerprint: { race: 'Terran', matchup: 'TvZ', metadata: {} } },
            { id: '2', filename: 'replay2.SC2Replay', player_name: 'PlayerOne', fingerprint: { race: 'Terran', matchup: 'TvZ', metadata: {} } },
            { id: '3', filename: 'replay3.SC2Replay', player_name: 'PlayerOne', fingerprint: { race: 'Terran', matchup: 'TvZ', metadata: {} } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            discord_user_id: 'test-user',
            possible_player_names: {
              'PlayerOne': 3,
            },
            confirmed_player_names: [],
            default_race: null,
            favorite_builds: [],
            created_at: '2025-11-19',
            updated_at: '2025-11-19',
          },
        }),
      });

    render(<MyReplaysContent />);

    // Wait for the suggestion card to appear
    await waitFor(() => {
      expect(screen.getByText(/Is this your player name\?/i)).toBeInTheDocument();
    });

    // Should show the player name
    expect(screen.getByText('PlayerOne')).toBeInTheDocument();

    // Should show the count
    expect(screen.getByText(/seen 3 times/i)).toBeInTheDocument();
  });

  it('should not show suggestion for player names with less than 3 occurrences', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          replays: [
            { id: '1', filename: 'replay1.SC2Replay', player_name: 'PlayerOne', fingerprint: { race: 'Terran', matchup: 'TvZ', metadata: {} } },
            { id: '2', filename: 'replay2.SC2Replay', player_name: 'PlayerOne', fingerprint: { race: 'Terran', matchup: 'TvZ', metadata: {} } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            discord_user_id: 'test-user',
            possible_player_names: {
              'PlayerOne': 2, // Only 2 occurrences
            },
            confirmed_player_names: [],
            default_race: null,
            favorite_builds: [],
            created_at: '2025-11-19',
            updated_at: '2025-11-19',
          },
        }),
      });

    render(<MyReplaysContent />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByText(/Is this your player name\?/i)).not.toBeInTheDocument();
    });
  });

  it('should not show suggestion for already confirmed player names', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          replays: [
            { id: '1', filename: 'replay1.SC2Replay', player_name: 'PlayerOne', fingerprint: { race: 'Terran', matchup: 'TvZ', metadata: {} } },
            { id: '2', filename: 'replay2.SC2Replay', player_name: 'PlayerOne', fingerprint: { race: 'Terran', matchup: 'TvZ', metadata: {} } },
            { id: '3', filename: 'replay3.SC2Replay', player_name: 'PlayerOne', fingerprint: { race: 'Terran', matchup: 'TvZ', metadata: {} } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            discord_user_id: 'test-user',
            possible_player_names: {
              'PlayerOne': 3,
            },
            confirmed_player_names: ['PlayerOne'], // Already confirmed
            default_race: null,
            favorite_builds: [],
            created_at: '2025-11-19',
            updated_at: '2025-11-19',
          },
        }),
      });

    render(<MyReplaysContent />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByText(/Is this your player name\?/i)).not.toBeInTheDocument();
    });
  });

  it('should show suggestion with highest count when multiple candidates exist', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          replays: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            discord_user_id: 'test-user',
            possible_player_names: {
              'PlayerOne': 3,
              'PlayerTwo': 5, // This should be suggested first
              'PlayerThree': 4,
            },
            confirmed_player_names: [],
            default_race: null,
            favorite_builds: [],
            created_at: '2025-11-19',
            updated_at: '2025-11-19',
          },
        }),
      });

    render(<MyReplaysContent />);

    // Should show the player with highest count
    await waitFor(() => {
      expect(screen.getByText('PlayerTwo')).toBeInTheDocument();
    });

    // Should show the count for highest
    expect(screen.getByText(/seen 5 times/i)).toBeInTheDocument();
  });

  it('should allow confirming a player name', async () => {
    const user = userEvent.setup();
    let fetchCallCount = 0;

    (global.fetch as any).mockImplementation(() => {
      fetchCallCount++;

      // First two calls: initial load (replays + settings)
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ replays: [] }),
        });
      }
      if (fetchCallCount === 2) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            settings: {
              discord_user_id: 'test-user',
              possible_player_names: { 'PlayerOne': 3 },
              confirmed_player_names: [],
              default_race: null,
              favorite_builds: [],
              created_at: '2025-11-19',
              updated_at: '2025-11-19',
            },
          }),
        });
      }
      // Third call: PATCH to confirm
      if (fetchCallCount === 3) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      // Fourth call: refresh settings after confirm
      if (fetchCallCount === 4) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            settings: {
              discord_user_id: 'test-user',
              possible_player_names: {},
              confirmed_player_names: ['PlayerOne'], // Now confirmed
              default_race: null,
              favorite_builds: [],
              created_at: '2025-11-19',
              updated_at: '2025-11-19',
            },
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<MyReplaysContent />);

    // Wait for suggestion to appear
    await waitFor(() => {
      expect(screen.getByText(/Is this your player name\?/i)).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByText(/Yes, this is me/i);
    await user.click(confirmButton);

    // Verify API was called to confirm
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('confirm_player_name'),
        })
      );
    });
  });

  it('should allow rejecting a player name', async () => {
    const user = userEvent.setup();
    let fetchCallCount = 0;

    (global.fetch as any).mockImplementation(() => {
      fetchCallCount++;

      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ replays: [] }),
        });
      }
      if (fetchCallCount === 2) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            settings: {
              discord_user_id: 'test-user',
              possible_player_names: { 'OpponentName': 3 },
              confirmed_player_names: [],
              default_race: null,
              favorite_builds: [],
              created_at: '2025-11-19',
              updated_at: '2025-11-19',
            },
          }),
        });
      }
      if (fetchCallCount === 3) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      if (fetchCallCount === 4) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            settings: {
              discord_user_id: 'test-user',
              possible_player_names: {}, // Removed after rejection
              confirmed_player_names: [],
              default_race: null,
              favorite_builds: [],
              created_at: '2025-11-19',
              updated_at: '2025-11-19',
            },
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<MyReplaysContent />);

    // Wait for suggestion to appear
    await waitFor(() => {
      expect(screen.getByText(/Is this your player name\?/i)).toBeInTheDocument();
    });

    // Click reject button
    const rejectButton = screen.getByText(/No, not me/i);
    await user.click(rejectButton);

    // Verify API was called to reject
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('reject_player_name'),
        })
      );
    });
  });
});
