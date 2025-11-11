import { getServerSession } from 'next-auth';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth lib
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock NextResponse
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (data: unknown, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      }),
    },
  };
});

// Mock content enrichment
jest.mock('@/lib/content-enrichment', () => ({
  enrichBuildOrder: jest.fn((bo) => ({
    ...bo,
    _enriched: {
      videoTitles: [],
      videoDescriptions: [],
      videoCoaches: [],
      videoCategories: [],
      replayPlayers: [],
      masterclassTitles: [],
      eventTitles: [],
    },
  })),
  enrichReplay: jest.fn((replay) => ({
    ...replay,
    _enriched: {
      videoTitles: [],
      videoDescriptions: [],
      videoCoaches: [],
      buildOrderNames: [],
      buildOrderCategories: [],
      masterclassTitles: [],
      eventTitles: [],
    },
  })),
  enrichVideo: jest.fn((video) => ({
    ...video,
    _enriched: {
      buildOrderNames: [],
      buildOrderRaces: [],
      replayTitles: [],
      replayMaps: [],
      replayPlayers: [],
      masterclassTitles: [],
      eventTitles: [],
    },
  })),
  enrichMasterclass: jest.fn((mc) => ({
    ...mc,
    _enriched: {
      videoTitles: [],
      videoDescriptions: [],
      buildOrderNames: [],
      buildOrderRaces: [],
      replayTitles: [],
      replayMaps: [],
      eventTitles: [],
    },
  })),
  enrichEvent: jest.fn((event) => ({
    ...event,
    _enriched: {
      videoTitles: [],
      videoDescriptions: [],
      buildOrderNames: [],
      replayTitles: [],
      masterclassTitles: [],
    },
  })),
  createSearchableText: jest.fn(() => ''),
}));

// Import after mocks
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock data files
jest.mock('@/data/build-orders.json', () => [
  {
    id: 'bo-1',
    name: 'Terran TvZ Macro Build',
    description: 'A solid macro-focused build for Terran vs Zerg',
    race: 'terran',
    vsRace: 'zerg',
    type: 'macro',
    difficulty: 'intermediate',
    coach: 'groovy',
    tags: ['terran', 'tvz', 'macro'],
    categories: ['matchups.tvz', 'builds.macro'],
    videoIds: ['video-1'],
    isFree: false,
  },
  {
    id: 'bo-2',
    name: 'Free Protoss Build',
    description: 'Free build order for everyone',
    race: 'protoss',
    vsRace: 'terran',
    type: 'timing',
    difficulty: 'basic',
    coach: 'nico',
    tags: ['protoss', 'pvt'],
    categories: ['matchups.pvt'],
    videoIds: [],
    isFree: true,
  },
]);

jest.mock('@/data/replays.json', () => [
  {
    id: 'replay-1',
    title: 'Epic TvZ on Altitude',
    description: 'Amazing comeback game',
    map: 'Altitude',
    matchup: 'TvZ',
    player1: { name: 'PlayerOne', race: 'terran', mmr: 5000, result: 'win' },
    player2: { name: 'PlayerTwo', race: 'zerg', mmr: 4800, result: 'loss' },
    duration: '12:34',
    gameDate: '2025-01-01',
    uploadDate: '2025-01-02',
    coach: 'groovy',
    tags: ['terran', 'tvz'],
    categories: ['matchups.tvz'],
    videoIds: ['video-1'],
    isFree: false,
  },
]);

jest.mock('@/data/videos.json', () => [
  {
    id: 'video-1',
    title: 'TvZ Build Order Guide',
    description: 'Learn the perfect TvZ build',
    coach: 'groovy',
    date: '2025-01-01',
    tags: ['terran', 'tvz', 'tutorial'],
    categories: ['matchups.tvz'],
    youtubeId: 'abc123',
    isFree: false,
  },
  {
    id: 'video-2',
    title: 'Free Beginner Guide',
    description: 'Free content for all',
    coach: 'nico',
    date: '2025-01-01',
    tags: ['beginner'],
    categories: ['strategy'],
    youtubeId: 'xyz789',
    isFree: true,
  },
]);

jest.mock('@/data/masterclasses.json', () => [
  {
    id: 'mc-1',
    title: 'Advanced Terran Macro',
    description: 'Master Terran macro mechanics',
    coach: 'groovy',
    race: 'terran',
    difficulty: 'advanced',
    tags: ['terran', 'macro'],
    categories: ['mechanics.macro'],
    videoIds: ['video-1'],
    buildOrderIds: ['bo-1'],
    replayIds: ['replay-1'],
    isFree: false,
  },
]);

jest.mock('@/data/events.json', () => [
  {
    id: 'event-1',
    title: 'Weekly Coaching Session',
    description: 'Group coaching every week',
    type: 'coaching',
    date: '2025-02-01',
    time: '18:00',
    timezone: 'UTC',
    duration: 120,
    coach: 'groovy',
    tags: ['coaching'],
    categories: ['misc'],
    videoIds: [],
    isFree: false,
  },
]);

jest.mock('@/data/coaches.json', () => [
  {
    id: 'groovy',
    name: 'Groovy',
    displayName: 'Groovy',
    bio: 'Expert Terran coach with 10+ years experience',
    race: 'terran',
    isActive: true,
  },
  {
    id: 'nico',
    name: 'Nico',
    displayName: 'Nico',
    bio: 'Professional Protoss player and coach',
    race: 'protoss',
    isActive: true,
  },
]);

describe('Omnisearch API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/omnisearch', () => {
    it('should return 400 if query parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/omnisearch');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Query parameter');
    });

    it('should return 400 if query parameter is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Query parameter');
    });

    it('should search across all content types for unauthenticated users (free content only)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=free');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe('free');
      expect(data.totalResults).toBeGreaterThan(0);

      // Should only find free content
      expect(data.results.buildOrders).toHaveLength(1);
      expect(data.results.buildOrders[0].id).toBe('bo-2');
      expect(data.results.videos).toHaveLength(1);
      expect(data.results.videos[0].id).toBe('video-2');
    });

    it('should search across all content types for subscribers (including premium)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          hasSubscriberRole: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=terran');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe('terran');
      expect(data.totalResults).toBeGreaterThan(0);

      // Should find premium content
      expect(data.results.buildOrders.length).toBeGreaterThan(0);
      expect(data.results.videos.length).toBeGreaterThan(0);
      expect(data.results.replays.length).toBeGreaterThan(0);
      expect(data.results.masterclasses.length).toBeGreaterThan(0);
      expect(data.results.coaches.length).toBeGreaterThan(0);
    });

    it('should rank title matches higher than description matches', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          hasSubscriberRole: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=TvZ');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Check that results with 'TvZ' in title come first
      if (data.results.buildOrders.length > 0) {
        expect(data.results.buildOrders[0].title.toLowerCase()).toContain('tvz');
      }
      if (data.results.replays.length > 0) {
        expect(data.results.replays[0].title.toLowerCase()).toContain('tvz');
      }
    });

    it('should respect limit parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          hasSubscriberRole: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=terran&limit=2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Each category should have at most 2 results
      Object.values(data.results).forEach((results: unknown) => {
        expect((results as unknown[]).length).toBeLessThanOrEqual(2);
      });
    });

    it('should search coach names and bios', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=groovy');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.coaches).toHaveLength(1);
      expect(data.results.coaches[0].title).toBe('Groovy');
    });

    it('should search enriched content (related content metadata)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          hasSubscriberRole: true,
        },
      });

      // Search for a player name that appears in a replay
      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=PlayerOne');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.replays.length).toBeGreaterThan(0);
    });

    it('should return empty results for no matches', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=nonexistentquery12345');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalResults).toBe(0);
      expect(data.results.coaches).toHaveLength(0);
      expect(data.results.masterclasses).toHaveLength(0);
      expect(data.results.events).toHaveLength(0);
      expect(data.results.buildOrders).toHaveLength(0);
      expect(data.results.replays).toHaveLength(0);
      expect(data.results.videos).toHaveLength(0);
    });

    it('should search case-insensitively', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          hasSubscriberRole: true,
        },
      });

      const request1 = new NextRequest('http://localhost:3000/api/omnisearch?q=TERRAN');
      const request2 = new NextRequest('http://localhost:3000/api/omnisearch?q=terran');
      const request3 = new NextRequest('http://localhost:3000/api/omnisearch?q=TeRrAn');

      const response1 = await GET(request1);
      const response2 = await GET(request2);
      const response3 = await GET(request3);

      const data1 = await response1.json();
      const data2 = await response2.json();
      const data3 = await response3.json();

      // All should return the same results
      expect(data1.totalResults).toBe(data2.totalResults);
      expect(data2.totalResults).toBe(data3.totalResults);
    });

    it('should include result metadata', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          hasSubscriberRole: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=terran');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Check that results include proper metadata
      if (data.results.buildOrders.length > 0) {
        const bo = data.results.buildOrders[0];
        expect(bo).toHaveProperty('id');
        expect(bo).toHaveProperty('title');
        expect(bo).toHaveProperty('type');
        expect(bo).toHaveProperty('url');
        expect(bo).toHaveProperty('score');
        expect(bo.metadata).toBeDefined();
      }

      if (data.results.coaches.length > 0) {
        const coach = data.results.coaches[0];
        expect(coach).toHaveProperty('id');
        expect(coach).toHaveProperty('title');
        expect(coach).toHaveProperty('type', 'coach');
        expect(coach).toHaveProperty('url');
        expect(coach.url).toContain('/coaches/');
      }
    });

    it('should generate correct URLs for each content type', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          hasSubscriberRole: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/omnisearch?q=terran');
      const response = await GET(request);
      const data = await response.json();

      // Check URL patterns
      data.results.buildOrders.forEach((item: { url: string }) => {
        expect(item.url).toMatch(/^\/build-orders\/[\w-]+$/);
      });

      data.results.replays.forEach((item: { url: string }) => {
        expect(item.url).toMatch(/^\/replays\/[\w-]+$/);
      });

      data.results.videos.forEach((item: { url: string }) => {
        expect(item.url).toMatch(/^\/videos\/[\w-]+$/);
      });

      data.results.masterclasses.forEach((item: { url: string }) => {
        expect(item.url).toMatch(/^\/masterclasses\/[\w-]+$/);
      });

      data.results.events.forEach((item: { url: string }) => {
        expect(item.url).toMatch(/^\/events\/[\w-]+$/);
      });

      data.results.coaches.forEach((item: { url: string }) => {
        expect(item.url).toMatch(/^\/coaches\/[\w-]+$/);
      });
    });
  });
});
