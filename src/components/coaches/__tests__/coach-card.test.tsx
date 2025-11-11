/**
 * Tests for CoachCard component
 * Verifies that coach booking links are properly paywalled
 */

import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { CoachCard } from '../coach-card'
import type { Coach } from '@/types/coach'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

describe('CoachCard - Booking Paywall', () => {
  const mockCoach: Coach = {
    id: 'nico',
    displayName: 'Nico',
    bio: 'Grandmaster Terran coach',
    race: 'terran',
    pricePerHour: '$50/hr',
    bookingUrl: 'https://calendly.com/nico-coaching',
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Non-Subscriber Access', () => {
    it('should redirect non-subscribers to /subscribe for booking links', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      const bookingLink = screen.getByText('Book Session')
      expect(bookingLink).toHaveAttribute('href', '/subscribe')
      expect(bookingLink).not.toHaveAttribute('target')
      expect(bookingLink).not.toHaveAttribute('rel')
    })

    it('should redirect unauthenticated users to /subscribe', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      const bookingLink = screen.getByText('Book Session')
      expect(bookingLink).toHaveAttribute('href', '/subscribe')
    })

    it('should allow non-subscribers to view videos (not paywalled)', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: false } },
        status: 'authenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      const viewVideosLink = screen.getByText('View Videos')
      expect(viewVideosLink).toHaveAttribute('href', '/library?coaches=nico')
    })
  })

  describe('Subscriber Access', () => {
    it('should allow subscribers to access booking links', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      const bookingLink = screen.getByText('Book Session')
      expect(bookingLink).toHaveAttribute('href', 'https://calendly.com/nico-coaching')
      expect(bookingLink).toHaveAttribute('target', '_blank')
      expect(bookingLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should allow subscribers to view videos', () => {
      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      const viewVideosLink = screen.getByText('View Videos')
      expect(viewVideosLink).toHaveAttribute('href', '/library?coaches=nico')
    })
  })

  describe('Coach without Booking URL', () => {
    it('should not render booking button if bookingUrl is missing', () => {
      const coachWithoutBooking: Coach = {
        ...mockCoach,
        bookingUrl: undefined,
      }

      mockUseSession.mockReturnValue({
        data: { user: { hasSubscriberRole: true } },
        status: 'authenticated',
      } as any)

      render(<CoachCard coach={coachWithoutBooking} videoCount={10} />)

      expect(screen.queryByText('Book Session')).not.toBeInTheDocument()
    })
  })

  describe('Display Information', () => {
    it('should display coach name and race', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      expect(screen.getByText('Nico')).toBeInTheDocument()
      expect(screen.getByText('terran')).toBeInTheDocument()
    })

    it('should display video count', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={15} />)

      expect(screen.getByText('15 videos')).toBeInTheDocument()
    })

    it('should display price per hour when available', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      expect(screen.getByText('$50/hr')).toBeInTheDocument()
    })

    it('should handle singular video count correctly', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={1} />)

      expect(screen.getByText('1 video')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined hasSubscriberRole as false', () => {
      mockUseSession.mockReturnValue({
        data: { user: {} },
        status: 'authenticated',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      const bookingLink = screen.getByText('Book Session')
      expect(bookingLink).toHaveAttribute('href', '/subscribe')
    })

    it('should handle missing session gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      } as any)

      render(<CoachCard coach={mockCoach} videoCount={10} />)

      const bookingLink = screen.getByText('Book Session')
      expect(bookingLink).toHaveAttribute('href', '/subscribe')
    })
  })
})
