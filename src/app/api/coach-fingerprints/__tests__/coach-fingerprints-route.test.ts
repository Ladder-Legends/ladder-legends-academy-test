/**
 * Tests for /api/coach-fingerprints/[replayId] route
 * Tests the coach fingerprint retrieval endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create hoisted mock functions
const { mockList, mockFetch } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockFetch: vi.fn(),
}));

// Mock @vercel/blob
vi.mock('@vercel/blob', () => ({
  list: mockList,
}));

// Mock global fetch
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = mockFetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

// Import after mocks
import { GET } from '../[replayId]/route';

// Sample fingerprint data
const mockFingerprint = {
  main: {
    player_name: 'CoachPlayer',
    race: 'terran',
    economy: {
      production_by_building: {
        Barracks: { idle_time: 15, production_time: 300 },
        Factory: { idle_time: 25, production_time: 200 },
      },
      supply_block_periods: [
        { start: 120, end: 135, duration: 15 },
      ],
    },
    tactical: {},
    micro: {},
  },
  all: {
    CoachPlayer: {
      player_name: 'CoachPlayer',
      race: 'terran',
      economy: {},
      tactical: {},
      micro: {},
    },
    OpponentPlayer: {
      player_name: 'OpponentPlayer',
      race: 'zerg',
      economy: {},
      tactical: {},
      micro: {},
    },
  },
};

describe('/api/coach-fingerprints/[replayId] GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 400 when replay ID is missing', async () => {
    const request = new NextRequest('http://localhost/api/coach-fingerprints/');
    const params = Promise.resolve({ replayId: '' });

    const response = await GET(request, { params });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Replay ID is required');
  });

  it('should return 404 when fingerprint not found', async () => {
    mockList.mockResolvedValue({ blobs: [] });

    const request = new NextRequest('http://localhost/api/coach-fingerprints/replay-not-found');
    const params = Promise.resolve({ replayId: 'replay-not-found' });

    const response = await GET(request, { params });
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Fingerprint not found');
    expect(data.replay_id).toBe('replay-not-found');

    // Should cache 404s for 5 minutes
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300');
  });

  it('should return fingerprint when found', async () => {
    mockList.mockResolvedValue({
      blobs: [{ url: 'https://blob.vercel.com/coach-fingerprints/replay-123.json' }],
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFingerprint),
    });

    const request = new NextRequest('http://localhost/api/coach-fingerprints/replay-123');
    const params = Promise.resolve({ replayId: 'replay-123' });

    const response = await GET(request, { params });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.main).toBeDefined();
    expect(data.main.player_name).toBe('CoachPlayer');
    expect(data.main.race).toBe('terran');
    expect(data.all).toBeDefined();
    expect(Object.keys(data.all)).toEqual(['CoachPlayer', 'OpponentPlayer']);

    // Should cache for 1 hour with stale-while-revalidate
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
  });

  it('should call list with correct blob path', async () => {
    mockList.mockResolvedValue({ blobs: [] });

    const request = new NextRequest('http://localhost/api/coach-fingerprints/my-replay-id');
    const params = Promise.resolve({ replayId: 'my-replay-id' });

    await GET(request, { params });

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith({
      prefix: 'coach-fingerprints/my-replay-id.json',
      limit: 1,
    });
  });

  it('should return 500 when blob fetch fails', async () => {
    mockList.mockResolvedValue({
      blobs: [{ url: 'https://blob.vercel.com/coach-fingerprints/replay-123.json' }],
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const request = new NextRequest('http://localhost/api/coach-fingerprints/replay-123');
    const params = Promise.resolve({ replayId: 'replay-123' });

    const response = await GET(request, { params });
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe('Failed to fetch fingerprint');

    // Should not cache errors
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('should return 500 when list throws error', async () => {
    mockList.mockRejectedValue(new Error('Blob storage unavailable'));

    const request = new NextRequest('http://localhost/api/coach-fingerprints/replay-123');
    const params = Promise.resolve({ replayId: 'replay-123' });

    const response = await GET(request, { params });
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe('Failed to fetch fingerprint');
  });

  it('should handle replay IDs with special characters', async () => {
    mockList.mockResolvedValue({ blobs: [] });

    const request = new NextRequest('http://localhost/api/coach-fingerprints/replay-nico-ladder-tvp-speed');
    const params = Promise.resolve({ replayId: 'replay-nico-ladder-tvp-speed' });

    await GET(request, { params });

    expect(mockList).toHaveBeenCalledWith({
      prefix: 'coach-fingerprints/replay-nico-ladder-tvp-speed.json',
      limit: 1,
    });
  });
});
