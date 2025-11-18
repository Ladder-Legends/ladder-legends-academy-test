/**
 * Tests for My Replays Page Access Control
 * Critical: Ensures only Coach and Owner roles can access
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { MockedFunction } from 'vitest';

// Mock next-auth
vi.mock('next-auth/react');
const mockUseSession = useSession as MockedFunction<typeof useSession>;

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;

// Mock fetch for API calls
global.fetch = vi.fn();

describe('My Replays Page - Access Control', () => {
  let mockPush: ReturnType<typeof vi.fn>;
  let MyReplaysPage: any;

  beforeEach(async () => {
    mockPush = vi.fn();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);

    // Dynamically import the page component
    const module = await import('../page');
    MyReplaysPage = module.default;

    // Mock fetch to return empty replays
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ replays: [] }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated Users', () => {
    it('should redirect to login when not authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?callbackUrl=/my-replays');
      });
    });

    it('should not redirect while status is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      } as any);

      render(<MyReplaysPage />);

      // Should not redirect while loading
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not fetch replays when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      expect(global.fetch).not.toHaveBeenCalledWith('/api/my-replays');
    });
  });

  describe('Authenticated Users - Non-Coach/Owner Roles', () => {
    it('should redirect Subscriber role to subscription page', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Subscriber User',
            email: 'subscriber@test.com',
            role: 'Subscriber',
            hasSubscriberRole: true,
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=my-replays');
      });
    });

    it('should redirect Moderator role to subscription page', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Moderator User',
            email: 'mod@test.com',
            role: 'Moderator',
            hasSubscriberRole: true,
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=my-replays');
      });
    });

    it('should redirect users without role to subscription page', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Regular User',
            email: 'user@test.com',
            role: undefined,
            hasSubscriberRole: false,
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=my-replays');
      });
    });
  });

  describe('Authenticated Users - Coach Role', () => {
    it('should allow Coach role to access the page', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Coach User',
            email: 'coach@test.com',
            role: 'Coach',
            hasSubscriberRole: true,
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      // Should not redirect
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      }, { timeout: 1000 });

      // Should attempt to fetch replays
      expect(global.fetch).toHaveBeenCalledWith('/api/my-replays');
    });

    it('should display page content for Coach role', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Coach User',
            email: 'coach@test.com',
            role: 'Coach',
            hasSubscriberRole: true,
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(screen.getByText(/My Replays/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated Users - Owner Role', () => {
    it('should allow Owner role to access the page', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Owner User',
            email: 'owner@test.com',
            role: 'Owner',
            hasSubscriberRole: true,
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      // Should not redirect
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      }, { timeout: 1000 });

      // Should attempt to fetch replays
      expect(global.fetch).toHaveBeenCalledWith('/api/my-replays');
    });

    it('should display page content for Owner role', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Owner User',
            email: 'owner@test.com',
            role: 'Owner',
            hasSubscriberRole: true,
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(screen.getByText(/My Replays/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null session user gracefully', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: null as any,
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?callbackUrl=/my-replays');
      });
    });

    it('should treat missing role property as unauthorized', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'User',
            email: 'user@test.com',
            // role property missing
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=my-replays');
      });
    });

    it('should be case-sensitive for role names', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'User',
            email: 'user@test.com',
            role: 'coach', // lowercase should fail
          },
        },
        status: 'authenticated',
      } as any);

      render(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=my-replays');
      });
    });
  });

  describe('Session State Transitions', () => {
    it('should handle loading → unauthenticated transition', async () => {
      // Start with loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      } as any);

      const { rerender } = render(<MyReplaysPage />);

      // Should not redirect while loading
      expect(mockPush).not.toHaveBeenCalled();

      // Transition to unauthenticated
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any);
      rerender(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?callbackUrl=/my-replays');
      });
    });

    it('should handle loading → authenticated (authorized) transition', async () => {
      // Start with loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      } as any);

      const { rerender } = render(<MyReplaysPage />);

      // Should not redirect while loading
      expect(mockPush).not.toHaveBeenCalled();

      // Transition to authenticated as Coach
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Coach',
            email: 'coach@test.com',
            role: 'Coach',
          },
        },
        status: 'authenticated',
      } as any);
      rerender(<MyReplaysPage />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      }, { timeout: 1000 });

      expect(global.fetch).toHaveBeenCalledWith('/api/my-replays');
    });
  });
});
