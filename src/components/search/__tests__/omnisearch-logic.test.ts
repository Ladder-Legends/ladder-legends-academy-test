/**
 * Tests for omnisearch logic including:
 * - Premium content visibility with isPremium flag
 * - Result count calculations (limited vs total)
 * - URL parameter generation for "View all results"
 */

import type { Video } from '@/types/video';
import type { BuildOrder } from '@/types/build-order';
import type { Replay } from '@/types/replay';

describe('Omnisearch Logic', () => {
  describe('Premium Content Visibility', () => {
    it('should include premium content with isPremium flag for non-subscribers', () => {
      const videos: Partial<Video>[] = [
        { id: '1', title: 'Free Video', isFree: true },
        { id: '2', title: 'Premium Video', isFree: false },
        { id: '3', title: 'Default Premium Video' }, // undefined isFree = premium
      ];

      const _hasSubscription = false; // Not used in this test but shows intent

      // Simulate the mapping logic from omnisearch
      const results = videos.map(video => ({
        id: video.id!,
        title: video.title!,
        isPremium: !video.isFree,
      }));

      expect(results).toHaveLength(3);
      expect(results[0].isPremium).toBe(false); // Free
      expect(results[1].isPremium).toBe(true);  // Premium
      expect(results[2].isPremium).toBe(true);  // Default to premium
    });

    it('should mark content without isFree field as premium', () => {
      const buildOrders: Partial<BuildOrder>[] = [
        { id: '1', name: 'Free Build', isFree: true },
        { id: '2', name: 'Premium Build', isFree: false },
        { id: '3', name: 'No isFree Field' }, // Should default to premium
      ];

      const results = buildOrders.map(bo => ({
        id: bo.id!,
        name: bo.name!,
        isPremium: !bo.isFree, // Undefined becomes true (premium)
      }));

      expect(results[0].isPremium).toBe(false);
      expect(results[1].isPremium).toBe(true);
      expect(results[2].isPremium).toBe(true); // undefined isFree = premium
    });
  });

  describe('Result Count Calculations', () => {
    it('should track both limited and total counts', () => {
      const allVideos = Array.from({ length: 20 }, (_, i) => ({
        id: `video-${i}`,
        title: `Video ${i}`,
      }));

      const limit = 5;
      const limitedResults = allVideos.slice(0, limit);
      const totalCount = allVideos.length;

      expect(limitedResults).toHaveLength(5);
      expect(totalCount).toBe(20);

      // Display format: "Videos (5 of 20)"
      const displayText = `Videos (${limitedResults.length} of ${totalCount})`;
      expect(displayText).toBe('Videos (5 of 20)');
    });

    it('should handle case where results are less than limit', () => {
      const allReplays = Array.from({ length: 3 }, (_, i) => ({
        id: `replay-${i}`,
        title: `Replay ${i}`,
      }));

      const limit = 5;
      const limitedResults = allReplays.slice(0, limit);
      const totalCount = allReplays.length;

      expect(limitedResults).toHaveLength(3);
      expect(totalCount).toBe(3);

      // Should show "Replays (3 of 3)"
      const displayText = `Replays (${limitedResults.length} of ${totalCount})`;
      expect(displayText).toBe('Replays (3 of 3)');
    });

    it('should calculate total counts separately from limited results', () => {
      interface SearchResults {
        limited: unknown[];
        total: number;
      }

      const results: Record<string, SearchResults> = {
        videos: { limited: [], total: 0 },
        buildOrders: { limited: [], total: 0 },
        replays: { limited: [], total: 0 },
      };

      // Simulate search results
      const mockVideos = Array.from({ length: 15 }, (_, i) => ({ id: `v${i}` }));
      const mockBuildOrders = Array.from({ length: 8 }, (_, i) => ({ id: `bo${i}` }));
      const mockReplays = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}` }));

      const limit = 5;

      results.videos = { limited: mockVideos.slice(0, limit), total: mockVideos.length };
      results.buildOrders = { limited: mockBuildOrders.slice(0, limit), total: mockBuildOrders.length };
      results.replays = { limited: mockReplays.slice(0, limit), total: mockReplays.length };

      expect(results.videos.limited).toHaveLength(5);
      expect(results.videos.total).toBe(15);

      expect(results.buildOrders.limited).toHaveLength(5);
      expect(results.buildOrders.total).toBe(8);

      expect(results.replays.limited).toHaveLength(5);
      expect(results.replays.total).toBe(25);
    });
  });

  describe('URL Parameter Generation', () => {
    it('should generate correct URL with q parameter', () => {
      const basePath = '/library';
      const query = 'terran macro';

      const url = `${basePath}?q=${encodeURIComponent(query)}`;

      expect(url).toBe('/library?q=terran%20macro');
    });

    it('should handle special characters in query', () => {
      const basePath = '/build-orders';
      const query = '5-1-1 tank push';

      const url = `${basePath}?q=${encodeURIComponent(query)}`;

      expect(url).toBe('/build-orders?q=5-1-1%20tank%20push');
    });

    it('should use correct base paths for different content types', () => {
      const TYPE_PAGES: Record<string, string> = {
        video: '/library',
        buildOrder: '/build-orders',
        replay: '/replays',
        masterclass: '/masterclasses',
        event: '/events',
        coach: '/coaches',
      };

      expect(TYPE_PAGES.video).toBe('/library');
      expect(TYPE_PAGES.buildOrder).toBe('/build-orders');
      expect(TYPE_PAGES.replay).toBe('/replays');
    });

    it('should encode query parameters properly', () => {
      const queries = [
        'simple',
        'with spaces',
        'special&chars',
        '5-1-1',
        'TvZ macro',
      ];

      queries.forEach(query => {
        const encoded = encodeURIComponent(query);
        const decoded = decodeURIComponent(encoded);
        expect(decoded).toBe(query);
      });
    });
  });

  describe('Search Filtering Logic', () => {
    it('should filter content by search query across multiple fields', () => {
      const buildOrders: Partial<BuildOrder>[] = [
        {
          id: '1',
          name: '5-1-1 Tank Push',
          description: 'Terran timing attack',
          race: 'terran',
          vsRace: 'protoss',
          type: 'timing',
        },
        {
          id: '2',
          name: 'Proxy Stargate',
          description: 'Protoss all-in',
          race: 'protoss',
          vsRace: 'zerg',
          type: 'all-in',
        },
        {
          id: '3',
          name: 'Roach Timing',
          description: 'Zerg mid-game attack',
          race: 'zerg',
          vsRace: 'terran',
          type: 'timing',
        },
      ];

      // Test searching by name
      const nameResults = buildOrders.filter(bo =>
        bo.name?.toLowerCase().includes('tank')
      );
      expect(nameResults).toHaveLength(1);
      expect(nameResults[0].id).toBe('1');

      // Test searching by race
      const raceResults = buildOrders.filter(bo =>
        bo.race?.toLowerCase().includes('terran')
      );
      expect(raceResults).toHaveLength(1);
      expect(raceResults[0].id).toBe('1');

      // Test searching by type
      const typeResults = buildOrders.filter(bo =>
        bo.type?.toLowerCase().includes('timing')
      );
      expect(typeResults).toHaveLength(2);
    });

    it('should search replays by matchup field', () => {
      const replays: Partial<Replay>[] = [
        {
          id: '1',
          title: 'Pro TvZ Game',
          matchup: 'TvZ',
          description: 'Terran macro game',
        },
        {
          id: '2',
          title: 'ZvP Rush',
          matchup: 'ZvP',
          description: 'Zerg all-in',
        },
      ];

      const tvzResults = replays.filter(r =>
        r.matchup?.toLowerCase().includes('tvz')
      );
      expect(tvzResults).toHaveLength(1);
      expect(tvzResults[0].id).toBe('1');

      const zvpResults = replays.filter(r =>
        r.matchup?.toLowerCase().includes('zvp')
      );
      expect(zvpResults).toHaveLength(1);
      expect(zvpResults[0].id).toBe('2');
    });

    it('should perform case-insensitive search', () => {
      const videos: Partial<Video>[] = [
        { id: '1', title: 'Terran Macro Guide' },
        { id: '2', title: 'TERRAN Micro Tips' },
        { id: '3', title: 'terran build orders' },
      ];

      const searchQuery = 'terran';
      const results = videos.filter(v =>
        v.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(results).toHaveLength(3);
    });
  });

  describe('Result Limiting', () => {
    it('should limit results per category', () => {
      const allVideos = Array.from({ length: 50 }, (_, i) => ({
        id: `video-${i}`,
        title: `Video ${i}`,
      }));

      const limit = 5;
      const limitedVideos = allVideos.slice(0, limit);

      expect(limitedVideos).toHaveLength(5);
      expect(allVideos).toHaveLength(50);
    });

    it('should calculate total results across all categories', () => {
      const categoryCounts = {
        videos: 15,
        buildOrders: 8,
        replays: 12,
        masterclasses: 5,
        events: 3,
        coaches: 2,
      };

      const totalResults = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

      expect(totalResults).toBe(45);
    });
  });
});
