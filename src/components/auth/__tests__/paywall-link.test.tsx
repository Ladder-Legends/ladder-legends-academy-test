/**
 * Tests for PaywallLink component
 * Critical for revenue protection - ensures non-subscribers can't access premium content
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PaywallLink } from '../paywall-link'
import type { MockedFunction } from 'vitest';

// Mock next-auth
vi.mock('next-auth/react')
const mockUseSession = useSession as MockedFunction<typeof useSession>

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>

describe('PaywallLink Component', () => {
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockPush = vi.fn()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Free Content', () => {
    it('should allow access to free content without subscription', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any)

      render(
        <PaywallLink href="/some-page" isFree={true}>
          Free Content
        </PaywallLink>
      )

      const link = screen.getByText('Free Content')
      expect(link).toHaveAttribute('href', '/free/some-page')
    })

    it('should prepend /free to internal free content routes', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/videos/123" isFree={true}>
          Free Video
        </PaywallLink>
      )

      const link = screen.getByText('Free Video')
      expect(link).toHaveAttribute('href', '/free/videos/123')
    })

    it('should NOT prepend /free to external free links', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any)

      render(
        <PaywallLink href="https://youtube.com/watch?v=123" external isFree={true}>
          Free External Video
        </PaywallLink>
      )

      const link = screen.getByText('Free External Video')
      expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=123')
    })
  })

  describe('Internal Links - Non-Subscribers', () => {
    it('should redirect non-subscribers to /subscribe for internal links', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/build-orders/bo-1">
          Premium Build Order
        </PaywallLink>
      )

      const link = screen.getByText('Premium Build Order')
      expect(link).toHaveAttribute('href', '/subscribe')
    })

    it('should redirect unauthenticated users to /subscribe', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any)

      render(
        <PaywallLink href="/library/video-123">
          Premium Video
        </PaywallLink>
      )

      const link = screen.getByText('Premium Video')
      expect(link).toHaveAttribute('href', '/subscribe')
    })

    it('should call router.push(/subscribe) when non-subscriber clicks link', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/build-orders/bo-1">
          Premium Build Order
        </PaywallLink>
      )

      const link = screen.getByText('Premium Build Order')
      fireEvent.click(link)

      expect(mockPush).toHaveBeenCalledWith('/subscribe')
    })
  })

  describe('Internal Links - Subscribers', () => {
    it('should allow subscribers to access internal premium links', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/build-orders/bo-1">
          Premium Build Order
        </PaywallLink>
      )

      const link = screen.getByText('Premium Build Order')
      expect(link).toHaveAttribute('href', '/build-orders/bo-1')
    })

    it('should NOT call router.push when subscriber clicks link', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/build-orders/bo-1">
          Premium Build Order
        </PaywallLink>
      )

      const link = screen.getByText('Premium Build Order')
      fireEvent.click(link)

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('External Links - Non-Subscribers', () => {
    it('should redirect non-subscribers to /subscribe for external links', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="https://youtube.com/watch?v=123" external>
          YouTube Video
        </PaywallLink>
      )

      const link = screen.getByText('YouTube Video')
      expect(link).toHaveAttribute('href', '/subscribe')
      expect(link).not.toHaveAttribute('target')
      expect(link).not.toHaveAttribute('rel')
    })

    it('should call router.push(/subscribe) when non-subscriber clicks external link', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="https://youtube.com/watch?v=123" external>
          YouTube Video
        </PaywallLink>
      )

      const link = screen.getByText('YouTube Video')
      fireEvent.click(link)

      expect(mockPush).toHaveBeenCalledWith('/subscribe')
    })
  })

  describe('External Links - Subscribers', () => {
    it('should allow subscribers to access external links', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="https://youtube.com/watch?v=123" external>
          YouTube Video
        </PaywallLink>
      )

      const link = screen.getByText('YouTube Video')
      expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=123')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should NOT call router.push when subscriber clicks external link', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="https://youtube.com/watch?v=123" external>
          YouTube Video
        </PaywallLink>
      )

      const link = screen.getByText('YouTube Video')
      fireEvent.click(link)

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Download Links - Non-Subscribers', () => {
    it('should redirect non-subscribers to /subscribe for download links', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/replays/replay-1.SC2Replay" download>
          Download Replay
        </PaywallLink>
      )

      const link = screen.getByText('Download Replay')
      expect(link).toHaveAttribute('href', '/subscribe')
      expect(link).toHaveAttribute('download')
    })

    it('should call router.push(/subscribe) when non-subscriber clicks download link', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/replays/replay-1.SC2Replay" download>
          Download Replay
        </PaywallLink>
      )

      const link = screen.getByText('Download Replay')
      fireEvent.click(link)

      expect(mockPush).toHaveBeenCalledWith('/subscribe')
    })
  })

  describe('Download Links - Subscribers', () => {
    it('should allow subscribers to download files', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/replays/replay-1.SC2Replay" download>
          Download Replay
        </PaywallLink>
      )

      const link = screen.getByText('Download Replay')
      expect(link).toHaveAttribute('href', '/replays/replay-1.SC2Replay')
      expect(link).toHaveAttribute('download')
    })

    it('should NOT call router.push when subscriber clicks download link', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/replays/replay-1.SC2Replay" download>
          Download Replay
        </PaywallLink>
      )

      const link = screen.getByText('Download Replay')
      fireEvent.click(link)

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Coach Booking Links', () => {
    it('should redirect non-subscribers to /subscribe for coach booking', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="https://calendly.com/coach" external>
          Book Session
        </PaywallLink>
      )

      const link = screen.getByText('Book Session')
      expect(link).toHaveAttribute('href', '/subscribe')
    })

    it('should allow subscribers to book coaching sessions', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="https://calendly.com/coach" external>
          Book Session
        </PaywallLink>
      )

      const link = screen.getByText('Book Session')
      expect(link).toHaveAttribute('href', 'https://calendly.com/coach')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing session gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      } as any)

      render(
        <PaywallLink href="/premium-content">
          Premium Content
        </PaywallLink>
      )

      const link = screen.getByText('Premium Content')
      expect(link).toHaveAttribute('href', '/subscribe')
    })

    it('should handle undefined hasSubscriberRole as false', () => {
      mockUseSession.mockReturnValue({
        data: { user: {} },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/premium-content">
          Premium Content
        </PaywallLink>
      )

      const link = screen.getByText('Premium Content')
      expect(link).toHaveAttribute('href', '/subscribe')
    })

    it('should apply custom className', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(
        <PaywallLink href="/content" className="custom-class">
          Content
        </PaywallLink>
      )

      const link = screen.getByText('Content')
      expect(link).toHaveClass('custom-class')
    })
  })
})
