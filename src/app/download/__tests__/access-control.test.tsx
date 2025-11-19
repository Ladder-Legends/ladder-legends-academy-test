/**
 * Tests for Download Page Access Control
 * Critical: Ensures only Coach and Owner roles can download the uploader
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

describe('Download Page - Access Control', () => {
  let mockPush: ReturnType<typeof vi.fn>;
  let DownloadPage: any;

  beforeEach(async () => {
    mockPush = vi.fn();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);

    // Dynamically import the page component
    const pageModule = await import('../page');
    DownloadPage = pageModule.default;
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

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?callbackUrl=/download');
      });
    });

    it('should show loading state while checking authentication', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      } as any);

      render(<DownloadPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not show download buttons when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any);

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      expect(screen.queryByText(/Download for macOS/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Download for Windows/i)).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Users - Non-Coach/Owner Roles', () => {
    it('should redirect Subscriber role to subscription page with uploader feature', async () => {
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

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=uploader');
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

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=uploader');
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

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=uploader');
      });
    });

    it('should not show download content to unauthorized users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Subscriber',
            email: 'sub@test.com',
            role: 'Subscriber',
          },
        },
        status: 'authenticated',
      } as any);

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      expect(screen.queryByText(/Download Ladder Legends Uploader/i)).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Users - Coach Role', () => {
    it('should allow Coach role to access the download page', async () => {
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

      render(<DownloadPage />);

      // Should not redirect
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should display download buttons for Coach role', async () => {
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

      render(<DownloadPage />);

      await waitFor(() => {
        expect(screen.getByText(/Download for macOS/i)).toBeInTheDocument();
        expect(screen.getByText(/Download for Windows/i)).toBeInTheDocument();
      });
    });

    it('should show security warning information for Coach', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Coach User',
            email: 'coach@test.com',
            role: 'Coach',
          },
        },
        status: 'authenticated',
      } as any);

      render(<DownloadPage />);

      await waitFor(() => {
        expect(screen.getByText(/About Security Warnings/i)).toBeInTheDocument();
        expect(screen.getByText(/code signing certificates/i)).toBeInTheDocument();
      });
    });

    it('should show GitHub release links for Coach', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Coach User',
            email: 'coach@test.com',
            role: 'Coach',
          },
        },
        status: 'authenticated',
      } as any);

      render(<DownloadPage />);

      await waitFor(() => {
        const links = screen.getAllByRole('link', { name: /Download for/i });
        expect(links.length).toBeGreaterThan(0);
        links.forEach(link => {
          expect(link).toHaveAttribute('href', expect.stringContaining('github.com'));
        });
      });
    });
  });

  describe('Authenticated Users - Owner Role', () => {
    it('should allow Owner role to access the download page', async () => {
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

      render(<DownloadPage />);

      // Should not redirect
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should display download buttons for Owner role', async () => {
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

      render(<DownloadPage />);

      await waitFor(() => {
        expect(screen.getByText(/Download for macOS/i)).toBeInTheDocument();
        expect(screen.getByText(/Download for Windows/i)).toBeInTheDocument();
      });
    });

    it('should display complete page content for Owner', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Owner User',
            email: 'owner@test.com',
            role: 'Owner',
          },
        },
        status: 'authenticated',
      } as any);

      render(<DownloadPage />);

      await waitFor(() => {
        expect(screen.getByText(/Download Ladder Legends Uploader/i)).toBeInTheDocument();
        expect(screen.getByText(/What the Uploader Does/i)).toBeInTheDocument();
        expect(screen.getByText(/After Installing/i)).toBeInTheDocument();
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

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?callbackUrl=/download');
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

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=uploader');
      });
    });

    it('should be case-sensitive for role names', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'User',
            email: 'user@test.com',
            role: 'owner', // lowercase should fail
          },
        },
        status: 'authenticated',
      } as any);

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=uploader');
      });
    });

    it('should handle empty string role', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'User',
            email: 'user@test.com',
            role: '',
          },
        },
        status: 'authenticated',
      } as any);

      render(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=uploader');
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

      const { rerender } = render(<DownloadPage />);

      // Should not redirect while loading
      expect(mockPush).not.toHaveBeenCalled();

      // Transition to unauthenticated
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any);
      rerender(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?callbackUrl=/download');
      });
    });

    it('should handle loading → authenticated (authorized) transition', async () => {
      // Start with loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      } as any);

      const { rerender } = render(<DownloadPage />);

      // Should not redirect while loading
      expect(mockPush).not.toHaveBeenCalled();

      // Transition to authenticated as Owner
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Owner',
            email: 'owner@test.com',
            role: 'Owner',
          },
        },
        status: 'authenticated',
      } as any);
      rerender(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      }, { timeout: 1000 });

      expect(screen.getByText(/Download Ladder Legends Uploader/i)).toBeInTheDocument();
    });

    it('should handle loading → authenticated (unauthorized) transition', async () => {
      // Start with loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      } as any);

      const { rerender } = render(<DownloadPage />);

      // Should not redirect while loading
      expect(mockPush).not.toHaveBeenCalled();

      // Transition to authenticated as Subscriber (unauthorized)
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Subscriber',
            email: 'sub@test.com',
            role: 'Subscriber',
          },
        },
        status: 'authenticated',
      } as any);
      rerender(<DownloadPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subscribe?feature=uploader');
      });
    });
  });

  describe('Download Links', () => {
    it('should link to GitHub releases for both platforms', async () => {
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

      render(<DownloadPage />);

      await waitFor(() => {
        const macOSLink = screen.getByRole('link', { name: /Download for macOS/i });
        const windowsLink = screen.getByRole('link', { name: /Download for Windows/i });

        expect(macOSLink).toHaveAttribute('href', expect.stringContaining('github.com'));
        expect(macOSLink).toHaveAttribute('href', expect.stringContaining('releases/latest'));
        expect(windowsLink).toHaveAttribute('href', expect.stringContaining('github.com'));
        expect(windowsLink).toHaveAttribute('href', expect.stringContaining('releases/latest'));
      });
    });

    it('should open GitHub links in new tab', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Owner',
            email: 'owner@test.com',
            role: 'Owner',
          },
        },
        status: 'authenticated',
      } as any);

      render(<DownloadPage />);

      await waitFor(() => {
        const downloadLinks = screen.getAllByRole('link', { name: /Download for/i });
        downloadLinks.forEach(link => {
          expect(link).toHaveAttribute('target', '_blank');
          expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });
      });
    });
  });
});
