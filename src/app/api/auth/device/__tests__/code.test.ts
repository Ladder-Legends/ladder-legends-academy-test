import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../code/route';
import { deviceCodeStore } from '@/lib/device-code-store';
import { NextRequest } from 'next/server';

// Mock uuid to return predictable values
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-device-code-uuid'),
}));

// Mock the device code store
vi.mock('@/lib/device-code-store', () => ({
  deviceCodeStore: {
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('POST /api/auth/device/code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a device code successfully', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'ladder-legends-uploader' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('device_code');
    expect(data).toHaveProperty('user_code');
    expect(data).toHaveProperty('verification_uri');
    expect(data).toHaveProperty('expires_in');
    expect(data).toHaveProperty('interval');

    // Verify data structure
    expect(typeof data.device_code).toBe('string');
    expect(typeof data.user_code).toBe('string');
    expect(data.user_code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/); // Format: ABCD-EFGH
    expect(data.verification_uri).toContain('/activate');
    expect(data.expires_in).toBe(900); // 15 minutes
    expect(data.interval).toBe(5); // 5 seconds

    // Verify store was called
    expect(deviceCodeStore.set).toHaveBeenCalledTimes(1);
  });

  it('should reject invalid client_id', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'invalid-client' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid_client');
  });

  it('should generate unique device codes on multiple calls', async () => {
    // Use real uuid for this test
    const { v4 } = await import('uuid');
    vi.mocked(v4)
      .mockReturnValueOnce('device-code-1')
      .mockReturnValueOnce('device-code-2');

    const mockRequest1 = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'ladder-legends-uploader' }),
    });

    const mockRequest2 = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'ladder-legends-uploader' }),
    });

    const response1 = await POST(mockRequest1);
    const response2 = await POST(mockRequest2);
    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.device_code).not.toBe(data2.device_code);
    // User codes are random, so they should be different too
    expect(data1.user_code).not.toBe(data2.user_code);
  });

  it('should store device code with correct expiration', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'ladder-legends-uploader' }),
    });

    await POST(mockRequest);

    expect(deviceCodeStore.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        device_code: expect.any(String),
        user_code: expect.any(String),
        status: 'pending',
        created_at: expect.any(Date),
        expires_at: expect.any(Date),
      })
    );

    // Check expiration is 15 minutes from now
    const [[, storedCode]] = vi.mocked(deviceCodeStore.set).mock.calls;
    const expiresInMs = storedCode.expires_at.getTime() - storedCode.created_at.getTime();
    expect(expiresInMs).toBeCloseTo(15 * 60 * 1000, -2); // 15 minutes ±100ms
  });
});
