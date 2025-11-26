/**
 * Tests for /api/my-replays/references API routes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create hoisted mocks
const {
  mockAuth,
  mockAuthenticateRequest,
  mockCheckPermission,
  mockGetUserReferences,
  mockGetReference,
  mockGetReferencesForMatchup,
  mockSaveReference,
  mockDeleteReference,
  mockGetDefaultReferenceForMatchup,
  mockSetDefaultReferenceForMatchup,
  mockGetReplay,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockAuthenticateRequest: vi.fn(),
  mockCheckPermission: vi.fn(),
  mockGetUserReferences: vi.fn(),
  mockGetReference: vi.fn(),
  mockGetReferencesForMatchup: vi.fn(),
  mockSaveReference: vi.fn(),
  mockDeleteReference: vi.fn(),
  mockGetDefaultReferenceForMatchup: vi.fn(),
  mockSetDefaultReferenceForMatchup: vi.fn(),
  mockGetReplay: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@/lib/api-auth', () => ({
  authenticateRequest: mockAuthenticateRequest,
  isAuthError: (result: unknown) => 'error' in (result as Record<string, unknown>),
  checkPermission: mockCheckPermission,
}));

vi.mock('@/lib/replay-kv', () => ({
  getUserReferences: mockGetUserReferences,
  getReference: mockGetReference,
  getReferencesForMatchup: mockGetReferencesForMatchup,
  saveReference: mockSaveReference,
  deleteReference: mockDeleteReference,
  getDefaultReferenceForMatchup: mockGetDefaultReferenceForMatchup,
  setDefaultReferenceForMatchup: mockSetDefaultReferenceForMatchup,
  getReplay: mockGetReplay,
}));

vi.mock('@/lib/replay-kv-mock', () => ({
  getUserReferences: mockGetUserReferences,
  getReference: mockGetReference,
  getReferencesForMatchup: mockGetReferencesForMatchup,
  saveReference: mockSaveReference,
  deleteReference: mockDeleteReference,
  getDefaultReferenceForMatchup: mockGetDefaultReferenceForMatchup,
  setDefaultReferenceForMatchup: mockSetDefaultReferenceForMatchup,
  getReplay: mockGetReplay,
}));

// Import route handlers after mocks
import { GET, POST, PATCH, DELETE } from '../route';
import { NextRequest } from 'next/server';
import type { ReferenceReplay, ReplayFingerprint } from '@/lib/replay-types';

// Mock fingerprint for testing
const mockFingerprint: ReplayFingerprint = {
  matchup: 'TvZ',
  race: 'Terran',
  player_name: 'TestPlayer',
  all_players: [],
  metadata: {
    map: 'TestMap',
    duration: 600,
    result: 'Win',
    opponent_race: 'Zerg',
    game_type: '1v1',
    category: 'Ladder',
    game_date: '2024-01-01T00:00:00Z',
  },
  timings: {},
  sequences: { tech_sequence: [], build_sequence: [], upgrade_sequence: [] },
  army_composition: {},
  production_timeline: {},
  economy: { workers_3min: 30, workers_5min: 50, workers_7min: 70, expansion_count: 2, avg_expansion_timing: 120 },
  tactical: { moveout_times: [], first_moveout: null, harass_count: 0, engagement_count: 0, first_engagement: null },
  micro: { selection_count: 0, avg_selections_per_min: 0, control_groups_used: 0, most_used_control_group: null, camera_movement_count: 0, avg_camera_moves_per_min: 0 },
  positioning: { proxy_buildings: 0, avg_building_distance_from_main: null },
  ratios: { gas_count: 2, production_count: 5, tech_count: 2, reactor_count: 1, techlab_count: 2, expansions: 2, gas_per_base: 1, production_per_base: 2.5 },
};

const mockReference: ReferenceReplay = {
  id: 'ref-123',
  user_id: 'user-123',
  alias: 'My TvZ Build',
  matchup: 'TvZ',
  source_type: 'my_replay',
  source_id: 'replay-456',
  fingerprint: mockFingerprint,
  build_order: [],
  key_timings: { first_expansion: 120 },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('/api/my-replays/references', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockAuthenticateRequest.mockResolvedValue({ error: 'Unauthorized', status: 401 });

      const request = new NextRequest('http://localhost:3000/api/my-replays/references');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all references for authenticated user', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: ['subscriber'],
        authMethod: 'session',
      });
      mockGetUserReferences.mockResolvedValue([mockReference]);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.references).toHaveLength(1);
      expect(data.references[0].id).toBe('ref-123');
    });

    it('should filter references by matchup', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: ['subscriber'],
        authMethod: 'session',
      });
      mockGetReferencesForMatchup.mockResolvedValue([mockReference]);
      mockGetDefaultReferenceForMatchup.mockResolvedValue(mockReference);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references?matchup=TvZ');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.references).toHaveLength(1);
      expect(data.default_reference_id).toBe('ref-123');
      expect(mockGetReferencesForMatchup).toHaveBeenCalledWith('user-123', 'TvZ');
    });

    it('should return specific reference by ID', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: ['subscriber'],
        authMethod: 'session',
      });
      mockGetReference.mockResolvedValue(mockReference);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references?id=ref-123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.reference.id).toBe('ref-123');
    });

    it('should return 404 for non-existent reference', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: ['subscriber'],
        authMethod: 'session',
      });
      mockGetReference.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references?id=non-existent');
      const response = await GET(request);

      expect(response.status).toBe(404);
    });
  });

  describe('POST', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockAuthenticateRequest.mockResolvedValue({ error: 'Unauthorized', status: 401 });

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-subscribers', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: [],
        authMethod: 'session',
      });
      mockCheckPermission.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 for missing required fields', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: ['subscriber'],
        authMethod: 'session',
      });
      mockCheckPermission.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'POST',
        body: JSON.stringify({ alias: 'Test' }), // Missing matchup, source_type, source_id
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required fields');
    });

    it('should create a reference with provided fingerprint', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: ['subscriber'],
        authMethod: 'session',
      });
      mockCheckPermission.mockResolvedValue(true);
      mockSaveReference.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'POST',
        body: JSON.stringify({
          alias: 'My TvZ Build',
          matchup: 'TvZ',
          source_type: 'uploaded_replay',
          source_id: 'blob-url-123',
          fingerprint: mockFingerprint,
          build_order: [],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.reference.alias).toBe('My TvZ Build');
      expect(mockSaveReference).toHaveBeenCalled();
    });

    it('should extract fingerprint from existing replay', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: ['subscriber'],
        authMethod: 'session',
      });
      mockCheckPermission.mockResolvedValue(true);
      mockGetReplay.mockResolvedValue({ fingerprint: mockFingerprint });
      mockSaveReference.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'POST',
        body: JSON.stringify({
          alias: 'My TvZ Build',
          matchup: 'TvZ',
          source_type: 'my_replay',
          source_id: 'replay-456',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockGetReplay).toHaveBeenCalledWith('user-123', 'replay-456');
    });

    it('should set as default when requested', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        discordId: 'user-123',
        roles: ['subscriber'],
        authMethod: 'session',
      });
      mockCheckPermission.mockResolvedValue(true);
      mockSaveReference.mockResolvedValue(undefined);
      mockSetDefaultReferenceForMatchup.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'POST',
        body: JSON.stringify({
          alias: 'My TvZ Build',
          matchup: 'TvZ',
          source_type: 'uploaded_replay',
          source_id: 'blob-url-123',
          fingerprint: mockFingerprint,
          set_as_default: true,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSetDefaultReferenceForMatchup).toHaveBeenCalled();
    });
  });

  describe('PATCH', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'ref-123', alias: 'New Alias' }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when ID is missing', async () => {
      mockAuth.mockResolvedValue({ user: { discordId: 'user-123' } });

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'PATCH',
        body: JSON.stringify({ alias: 'New Alias' }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should update reference alias', async () => {
      mockAuth.mockResolvedValue({ user: { discordId: 'user-123' } });
      mockGetReference.mockResolvedValue({ ...mockReference });
      mockSaveReference.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'ref-123', alias: 'New Alias' }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.reference.alias).toBe('New Alias');
    });
  });

  describe('DELETE', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references?id=ref-123', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when ID is missing', async () => {
      mockAuth.mockResolvedValue({ user: { discordId: 'user-123' } });

      const request = new NextRequest('http://localhost:3000/api/my-replays/references', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent reference', async () => {
      mockAuth.mockResolvedValue({ user: { discordId: 'user-123' } });
      mockGetReference.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references?id=non-existent', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(404);
    });

    it('should delete reference and clear default if applicable', async () => {
      mockAuth.mockResolvedValue({ user: { discordId: 'user-123' } });
      mockGetReference.mockResolvedValue(mockReference);
      mockGetDefaultReferenceForMatchup.mockResolvedValue(mockReference);
      mockSetDefaultReferenceForMatchup.mockResolvedValue(undefined);
      mockDeleteReference.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/my-replays/references?id=ref-123', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(mockSetDefaultReferenceForMatchup).toHaveBeenCalledWith('user-123', 'TvZ', null);
      expect(mockDeleteReference).toHaveBeenCalledWith('user-123', 'ref-123');
    });
  });
});
