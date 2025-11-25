import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../poll/route';
import { deviceCodeStore } from '@/lib/device-code-store';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/device-code-store', () => ({
  deviceCodeStore: {
    get: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn((payload, _secret, _options) => `mock-jwt-token-${payload.type}`),
}));

describe('GET /api/auth/device/poll', () => {
  const mockDeviceCode = {
    device_code: 'test-device-code-123',
    user_code: 'ABCD-1234',
    status: 'pending' as const,
    created_at: new Date(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if device_code is missing', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/poll');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('missing_device_code');
  });

  it('should return 404 if device code is not found', async () => {
    vi.mocked(deviceCodeStore.get).mockResolvedValue(undefined);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/poll?device_code=invalid');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('invalid_device_code');
  });

  it('should return 410 if code is expired', async () => {
    const expiredCode = {
      ...mockDeviceCode,
      expires_at: new Date(Date.now() - 1000),
    };
    vi.mocked(deviceCodeStore.get).mockResolvedValue(expiredCode as any);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/poll?device_code=test-device-code-123');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toBe('expired_token');
  });

  it('should return 428 if authorization is pending', async () => {
    vi.mocked(deviceCodeStore.get).mockResolvedValue(mockDeviceCode as any);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/poll?device_code=test-device-code-123');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(428);
    expect(data.error).toBe('authorization_pending');
  });

  it('should return 403 if authorization was denied', async () => {
    const deniedCode = {
      ...mockDeviceCode,
      status: 'denied' as const,
    };
    vi.mocked(deviceCodeStore.get).mockResolvedValue(deniedCode as any);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/poll?device_code=test-device-code-123');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('access_denied');
  });

  it('should return tokens when authorization is complete', async () => {
    const authorizedCode = {
      ...mockDeviceCode,
      status: 'authorized' as const,
      user_id: '123456789',
      user_data: {
        id: '123456789',
        username: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      },
    };
    vi.mocked(deviceCodeStore.get).mockResolvedValue(authorizedCode as any);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/poll?device_code=test-device-code-123');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('refresh_token');
    expect(data).toHaveProperty('token_type', 'Bearer');
    expect(data).toHaveProperty('expires_in', 3600);
    expect(data).toHaveProperty('user');
    expect(data.user).toEqual(authorizedCode.user_data);

    // Verify device code was deleted after successful poll
    expect(deviceCodeStore.delete).toHaveBeenCalledWith(
      authorizedCode.device_code,
      authorizedCode.user_code
    );
  });

  it('should return 500 if user_id is missing despite authorized status', async () => {
    const invalidAuthorizedCode = {
      ...mockDeviceCode,
      status: 'authorized' as const,
      user_data: {
        id: '123456789',
        username: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      },
      // Missing user_id
    };
    vi.mocked(deviceCodeStore.get).mockResolvedValue(invalidAuthorizedCode as any);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/poll?device_code=test-device-code-123');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('unknown_error');
  });

  it('should return 500 if user_data is missing despite authorized status', async () => {
    const invalidAuthorizedCode = {
      ...mockDeviceCode,
      status: 'authorized' as const,
      user_id: '123456789',
      // Missing user_data
    };
    vi.mocked(deviceCodeStore.get).mockResolvedValue(invalidAuthorizedCode as any);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/poll?device_code=test-device-code-123');

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('unknown_error');
  });
});
