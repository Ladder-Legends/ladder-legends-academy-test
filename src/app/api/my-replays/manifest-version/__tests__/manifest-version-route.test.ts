/**
 * Tests for /api/my-replays/manifest-version route
 * Tests the lightweight manifest version check endpoint for uploader sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create hoisted mock functions
const { mockGetManifestVersion, mockAuthenticateRequest, mockCheckPermission } = vi.hoisted(() => ({
  mockGetManifestVersion: vi.fn(),
  mockAuthenticateRequest: vi.fn(),
  mockCheckPermission: vi.fn(),
}));

// Mock hash manifest manager
vi.mock('@/lib/replay-hash-manifest', () => ({
  hashManifestManager: {
    getManifestVersion: mockGetManifestVersion,
  },
}));

// Mock api-auth
vi.mock('@/lib/api-auth', () => ({
  authenticateRequest: mockAuthenticateRequest,
  isAuthError: (result: unknown): result is { error: string; status: number } => {
    return result !== null && typeof result === 'object' && 'error' in result;
  },
  checkPermission: mockCheckPermission,
}));

// Import after mocks
import { GET } from '../route';

describe('/api/my-replays/manifest-version GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      error: 'Unauthorized',
      status: 401,
    });

    const request = new NextRequest('http://localhost/api/my-replays/manifest-version', {
      method: 'GET',
      headers: {
        authorization: '',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');

    // Should have no-store cache header for auth failures
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('should return 403 when user lacks subscriber role', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      discordId: 'user123',
      roles: ['member'],
      authMethod: 'bearer',
    });
    mockCheckPermission.mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/my-replays/manifest-version', {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('Subscription required');

    // Should have short cache for permission failures
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=60');
  });

  it('should return manifest version for authenticated subscriber', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      discordId: 'user123',
      roles: ['subscriber'],
      authMethod: 'bearer',
    });
    mockCheckPermission.mockResolvedValue(true);
    mockGetManifestVersion.mockResolvedValue(5);

    const request = new NextRequest('http://localhost/api/my-replays/manifest-version', {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.manifest_version).toBe(5);
    expect(data.checked_at).toBeDefined();
    expect(typeof data.checked_at).toBe('string');

    // Should have edge cache headers (24 hour cache, 7 day stale-while-revalidate)
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=86400, stale-while-revalidate=604800');
    expect(response.headers.get('Vary')).toBe('Authorization');
  });

  it('should return version 0 for new users with no manifest', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      discordId: 'newuser',
      roles: ['subscriber'],
      authMethod: 'bearer',
    });
    mockCheckPermission.mockResolvedValue(true);
    mockGetManifestVersion.mockResolvedValue(0);

    const request = new NextRequest('http://localhost/api/my-replays/manifest-version', {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.manifest_version).toBe(0);
  });

  it('should return 500 when hash manifest throws error', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      discordId: 'user123',
      roles: ['subscriber'],
      authMethod: 'bearer',
    });
    mockCheckPermission.mockResolvedValue(true);
    mockGetManifestVersion.mockRejectedValue(new Error('Blob storage unavailable'));

    const request = new NextRequest('http://localhost/api/my-replays/manifest-version', {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe('Failed to get manifest version');

    // Should not cache errors
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('should call getManifestVersion with correct user ID', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      discordId: 'user456',
      roles: ['subscriber'],
      authMethod: 'bearer',
    });
    mockCheckPermission.mockResolvedValue(true);
    mockGetManifestVersion.mockResolvedValue(3);

    const request = new NextRequest('http://localhost/api/my-replays/manifest-version', {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await GET(request);

    expect(mockGetManifestVersion).toHaveBeenCalledTimes(1);
    expect(mockGetManifestVersion).toHaveBeenCalledWith('user456');
  });
});
