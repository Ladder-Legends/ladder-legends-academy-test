/**
 * Tests for content sorting behavior across the app.
 *
 * Sorting rules:
 * - Free users: Free content first, then newest
 * - Premium users: Just newest (no free-first preference)
 * - Events: Always by upcoming/date regardless of subscription
 */

import type { Video } from '@/types/video';
import type { Replay } from '@/types/replay';
import type { BuildOrder } from '@/types/build-order';
import type { Masterclass } from '@/types/masterclass';

describe('Content Sorting Logic', () => {
  describe('Video Sorting', () => {
    const createVideo = (id: string, date: string, isFree: boolean): Partial<Video> => ({
      id,
      date,
      isFree,
      title: `Video ${id}`,
      description: '',
      tags: [],
      thumbnail: '',
    });

    it('should sort free content first for non-subscribers', () => {
      const videos = [
        createVideo('1', '2024-01-01', false), // Premium, older
        createVideo('2', '2024-01-03', true),  // Free, newer
        createVideo('3', '2024-01-02', false), // Premium, middle
        createVideo('4', '2024-01-04', true),  // Free, newest
      ] as Video[];

      const hasSubscriberRole = false;

      const sorted = [...videos].sort((a, b) => {
        // For non-subscribers, prioritize free content first
        if (!hasSubscriberRole) {
          const aIsFree = a.isFree ?? false;
          const bIsFree = b.isFree ?? false;
          if (aIsFree !== bIsFree) {
            return bIsFree ? 1 : -1; // Free items come first
          }
        }

        // Then sort by date (newest first)
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      // Free content should come first, sorted by date
      expect(sorted[0].id).toBe('4'); // Free, newest
      expect(sorted[1].id).toBe('2'); // Free, older
      // Then premium content, sorted by date
      expect(sorted[2].id).toBe('3'); // Premium, newer
      expect(sorted[3].id).toBe('1'); // Premium, oldest
    });

    it('should sort by date only for premium subscribers', () => {
      const videos = [
        createVideo('1', '2024-01-01', false), // Premium, oldest
        createVideo('2', '2024-01-03', true),  // Free, newer
        createVideo('3', '2024-01-02', false), // Premium, middle
        createVideo('4', '2024-01-04', true),  // Free, newest
      ] as Video[];

      const hasSubscriberRole = true;

      const sorted = [...videos].sort((a, b) => {
        // For non-subscribers, prioritize free content first
        if (!hasSubscriberRole) {
          const aIsFree = a.isFree ?? false;
          const bIsFree = b.isFree ?? false;
          if (aIsFree !== bIsFree) {
            return bIsFree ? 1 : -1;
          }
        }

        // Then sort by date (newest first)
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });

      // Should be sorted by date only, ignoring free status
      expect(sorted[0].id).toBe('4'); // Newest
      expect(sorted[1].id).toBe('2'); // Second newest
      expect(sorted[2].id).toBe('3'); // Third newest
      expect(sorted[3].id).toBe('1'); // Oldest
    });

    it('should handle videos without isFree field (default to premium)', () => {
      const videos = [
        { ...createVideo('1', '2024-01-02', true), isFree: undefined },
        createVideo('2', '2024-01-03', true),
        createVideo('3', '2024-01-01', false),
      ] as Video[];

      const hasSubscriberRole = false;

      const sorted = [...videos].sort((a, b) => {
        if (!hasSubscriberRole) {
          const aIsFree = a.isFree ?? false;
          const bIsFree = b.isFree ?? false;
          if (aIsFree !== bIsFree) {
            return bIsFree ? 1 : -1;
          }
        }

        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });

      // Video 2 is free and should come first
      expect(sorted[0].id).toBe('2');
      // Videos 1 and 3 are premium (1 has undefined isFree)
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('3');
    });
  });

  describe('Replay Sorting', () => {
    const createReplay = (id: string, uploadDate: string, isFree: boolean): Partial<Replay> => ({
      id,
      uploadDate,
      gameDate: uploadDate,
      isFree,
      title: `Replay ${id}`,
      map: 'Test Map',
      matchup: 'TvZ',
      player1: { name: 'P1', race: 'terran', result: 'win' },
      player2: { name: 'P2', race: 'zerg', result: 'loss' },
      duration: '10:00',
      tags: [],
      videoIds: [],
    });

    it('should prioritize free replays for non-subscribers', () => {
      const replays = [
        createReplay('1', '2024-01-01', false),
        createReplay('2', '2024-01-03', true),
        createReplay('3', '2024-01-02', false),
      ] as Replay[];

      const hasSubscriberRole = false;

      const sorted = [...replays].sort((a, b) => {
        if (!hasSubscriberRole) {
          const aIsFree = a.isFree ?? false;
          const bIsFree = b.isFree ?? false;
          if (aIsFree !== bIsFree) {
            return bIsFree ? 1 : -1;
          }
        }

        const dateA = new Date(a.uploadDate || a.gameDate).getTime();
        const dateB = new Date(b.uploadDate || b.gameDate).getTime();
        return dateB - dateA;
      });

      expect(sorted[0].id).toBe('2'); // Free
      expect(sorted[1].id).toBe('3'); // Premium, newer
      expect(sorted[2].id).toBe('1'); // Premium, older
    });
  });

  describe('Build Order Sorting', () => {
    const createBuildOrder = (id: string, updatedAt: string, isFree: boolean): Partial<BuildOrder> => ({
      id,
      updatedAt,
      isFree,
      name: `Build ${id}`,
      description: '',
      race: 'terran',
      vsRace: 'zerg',
      difficulty: 'basic',
      tags: [],
      steps: [],
      videoIds: [],
    });

    it('should prioritize free build orders for non-subscribers', () => {
      const buildOrders = [
        createBuildOrder('1', '2024-01-01', false),
        createBuildOrder('2', '2024-01-03', true),
        createBuildOrder('3', '2024-01-02', false),
      ] as BuildOrder[];

      const hasSubscriberRole = false;

      const sorted = [...buildOrders].sort((a, b) => {
        if (!hasSubscriberRole) {
          const aIsFree = a.isFree ?? false;
          const bIsFree = b.isFree ?? false;
          if (aIsFree !== bIsFree) {
            return bIsFree ? 1 : -1;
          }
        }

        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateB - dateA;
      });

      expect(sorted[0].id).toBe('2'); // Free
      expect(sorted[1].id).toBe('3'); // Premium, newer
      expect(sorted[2].id).toBe('1'); // Premium, older
    });
  });

  describe('Masterclass Sorting', () => {
    const createMasterclass = (id: string, createdAt: string, isFree: boolean): Partial<Masterclass> => ({
      id,
      createdAt,
      isFree,
      title: `Masterclass ${id}`,
      description: '',
      coach: 'Coach',
      tags: [],
      videoIds: [],
    });

    it('should prioritize free masterclasses for non-subscribers', () => {
      const masterclasses = [
        createMasterclass('1', '2024-01-01', false),
        createMasterclass('2', '2024-01-03', true),
        createMasterclass('3', '2024-01-02', false),
      ] as Masterclass[];

      const hasSubscriberRole = false;

      const sorted = [...masterclasses].sort((a, b) => {
        if (!hasSubscriberRole) {
          const aIsFree = a.isFree ?? false;
          const bIsFree = b.isFree ?? false;
          if (aIsFree !== bIsFree) {
            return bIsFree ? 1 : -1;
          }
        }

        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      expect(sorted[0].id).toBe('2'); // Free
      expect(sorted[1].id).toBe('3'); // Premium, newer
      expect(sorted[2].id).toBe('1'); // Premium, older
    });

    it('should sort by date only for premium subscribers', () => {
      const masterclasses = [
        createMasterclass('1', '2024-01-01', false),
        createMasterclass('2', '2024-01-03', true),
        createMasterclass('3', '2024-01-02', false),
      ] as Masterclass[];

      const hasSubscriberRole = true;

      const sorted = [...masterclasses].sort((a, b) => {
        if (!hasSubscriberRole) {
          const aIsFree = a.isFree ?? false;
          const bIsFree = b.isFree ?? false;
          if (aIsFree !== bIsFree) {
            return bIsFree ? 1 : -1;
          }
        }

        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      // Should be sorted by date only
      expect(sorted[0].id).toBe('2'); // Newest
      expect(sorted[1].id).toBe('3'); // Middle
      expect(sorted[2].id).toBe('1'); // Oldest
    });
  });
});
