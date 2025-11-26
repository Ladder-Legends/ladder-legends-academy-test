/**
 * Tests for /api/my-replays/index route
 * Tests the replay index API endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Create hoisted mock functions that can be used in vi.mock factories
const { mockGetReplayIndex, mockRebuildReplayIndex, mockValidateReplayIndex, mockAuth } = vi.hoisted(() => ({
  mockGetReplayIndex: vi.fn(),
  mockRebuildReplayIndex: vi.fn(),
  mockValidateReplayIndex: vi.fn(),
  mockAuth: vi.fn(),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

// Mock both KV implementations with shared mock functions
vi.mock('@/lib/replay-kv', () => ({
  getReplayIndex: mockGetReplayIndex,
  rebuildReplayIndex: mockRebuildReplayIndex,
  validateReplayIndex: mockValidateReplayIndex,
}));

vi.mock('@/lib/replay-kv-mock', () => ({
  getReplayIndex: mockGetReplayIndex,
  rebuildReplayIndex: mockRebuildReplayIndex,
  validateReplayIndex: mockValidateReplayIndex,
}));

// Import after mocks
import { GET, POST } from '../index/route';
import type { ReplayIndex } from '@/lib/replay-types';

// Sample index data for tests
const mockIndex: ReplayIndex = {
  version: 1,
  last_updated: '2025-01-01T12:00:00Z',
  replay_count: 2,
  entries: [
    {
      id: 'replay-1',
      filename: 'test1.SC2Replay',
      uploaded_at: '2025-01-01T12:00:00Z',
      game_date: '2025-01-01T11:30:00Z',
      game_type: '1v1-ladder',
      matchup: 'TvZ',
      result: 'Win',
      duration: 600,
      map_name: 'Altitude LE',
      opponent_name: 'Opponent1',
      reference_id: null,
      reference_alias: null,
      comparison_score: null,
      production_score: null,
      supply_score: null,
      vision_score: null,
      supply_block_time: 12,
      production_idle_time: 25,
      detected_build: 'Standard Mech',
      detection_confidence: 85,
    },
    {
      id: 'replay-2',
      filename: 'test2.SC2Replay',
      uploaded_at: '2025-01-01T11:00:00Z',
      game_date: '2025-01-01T10:30:00Z',
      game_type: '1v1-ladder',
      matchup: 'TvP',
      result: 'Loss',
      duration: 450,
      map_name: 'Goldenaura LE',
      opponent_name: 'Opponent2',
      reference_id: null,
      reference_alias: null,
      comparison_score: 72,
      production_score: null,
      supply_score: null,
      vision_score: null,
      supply_block_time: 20,
      production_idle_time: 45,
      detected_build: 'Bio Timing',
      detection_confidence: 78,
    },
  ],
};

describe('/api/my-replays/index GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/my-replays/index');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when session has no discordId', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = new NextRequest('http://localhost:3000/api/my-replays/index');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return existing index when available', async () => {
    mockAuth.mockResolvedValue({
      user: { discordId: 'user-123' },
      expires: '',
    });
    mockGetReplayIndex.mockResolvedValue(mockIndex);

    const request = new NextRequest('http://localhost:3000/api/my-replays/index');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rebuilt).toBe(false);
    expect(data.index.version).toBe(1);
    expect(data.index.replay_count).toBe(2);
  });

  it('should create initial index when none exists', async () => {
    mockAuth.mockResolvedValue({
      user: { discordId: 'user-123' },
      expires: '',
    });
    mockGetReplayIndex.mockResolvedValue(null);
    mockRebuildReplayIndex.mockResolvedValue({
      version: Date.now(),
      last_updated: new Date().toISOString(),
      replay_count: 0,
      entries: [],
    });

    const request = new NextRequest('http://localhost:3000/api/my-replays/index');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rebuilt).toBe(true);
    expect(data.message).toBe('Initial index created');
  });

  it('should force rebuild when rebuild=true', async () => {
    mockAuth.mockResolvedValue({
      user: { discordId: 'user-123' },
      expires: '',
    });
    mockRebuildReplayIndex.mockResolvedValue({
      version: Date.now(),
      last_updated: new Date().toISOString(),
      replay_count: 5,
      entries: [],
    });

    const request = new NextRequest('http://localhost:3000/api/my-replays/index?rebuild=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rebuilt).toBe(true);
    expect(data.message).toBe('Index rebuilt successfully');
    expect(mockRebuildReplayIndex).toHaveBeenCalledWith('user-123');
  });

  it('should auto-rebuild when validate=true and index is invalid', async () => {
    mockAuth.mockResolvedValue({
      user: { discordId: 'user-123' },
      expires: '',
    });
    mockGetReplayIndex.mockResolvedValue(mockIndex);
    mockValidateReplayIndex.mockResolvedValue(false);
    mockRebuildReplayIndex.mockResolvedValue({
      version: Date.now(),
      last_updated: new Date().toISOString(),
      replay_count: 3,
      entries: [],
    });

    const request = new NextRequest('http://localhost:3000/api/my-replays/index?validate=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rebuilt).toBe(true);
    expect(data.message).toBe('Index was invalid and has been rebuilt');
    expect(mockValidateReplayIndex).toHaveBeenCalledWith('user-123');
  });

  it('should not rebuild when validate=true and index is valid', async () => {
    mockAuth.mockResolvedValue({
      user: { discordId: 'user-123' },
      expires: '',
    });
    mockGetReplayIndex.mockResolvedValue(mockIndex);
    mockValidateReplayIndex.mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/my-replays/index?validate=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rebuilt).toBe(false);
    expect(mockRebuildReplayIndex).not.toHaveBeenCalled();
  });
});

describe('/api/my-replays/index POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/my-replays/index', {
      method: 'POST',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should rebuild index and return success', async () => {
    mockAuth.mockResolvedValue({
      user: { discordId: 'user-123' },
      expires: '',
    });
    mockRebuildReplayIndex.mockResolvedValue({
      version: Date.now(),
      last_updated: new Date().toISOString(),
      replay_count: 10,
      entries: [],
    });

    const request = new NextRequest('http://localhost:3000/api/my-replays/index', {
      method: 'POST',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Index rebuilt successfully');
    expect(data.index.replay_count).toBe(10);
    expect(mockRebuildReplayIndex).toHaveBeenCalledWith('user-123');
  });
});

describe('Index Response Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return properly structured index entries', async () => {
    mockAuth.mockResolvedValue({
      user: { discordId: 'user-123' },
      expires: '',
    });
    mockGetReplayIndex.mockResolvedValue(mockIndex);

    const request = new NextRequest('http://localhost:3000/api/my-replays/index');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    const entry = data.index.entries[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('filename');
    expect(entry).toHaveProperty('uploaded_at');
    expect(entry).toHaveProperty('game_date');
    expect(entry).toHaveProperty('game_type');
    expect(entry).toHaveProperty('matchup');
    expect(entry).toHaveProperty('result');
    expect(entry).toHaveProperty('duration');
    expect(entry).toHaveProperty('map_name');
    expect(entry).toHaveProperty('opponent_name');
    expect(entry).toHaveProperty('reference_id');
    expect(entry).toHaveProperty('reference_alias');
    expect(entry).toHaveProperty('comparison_score');
    expect(entry).toHaveProperty('production_score');
    expect(entry).toHaveProperty('supply_score');
    expect(entry).toHaveProperty('vision_score');
    expect(entry).toHaveProperty('detected_build');
    expect(entry).toHaveProperty('detection_confidence');
  });

  it('should return index metadata', async () => {
    mockAuth.mockResolvedValue({
      user: { discordId: 'user-123' },
      expires: '',
    });
    mockGetReplayIndex.mockResolvedValue(mockIndex);

    const request = new NextRequest('http://localhost:3000/api/my-replays/index');
    const response = await GET(request);
    const data = await response.json();

    expect(data.index).toHaveProperty('version');
    expect(data.index).toHaveProperty('last_updated');
    expect(data.index).toHaveProperty('replay_count');
    expect(data.index).toHaveProperty('entries');
    expect(typeof data.index.version).toBe('number');
    expect(typeof data.index.replay_count).toBe('number');
    expect(Array.isArray(data.index.entries)).toBe(true);
  });
});
