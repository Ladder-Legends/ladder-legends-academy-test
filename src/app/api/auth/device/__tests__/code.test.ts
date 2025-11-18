import { POST } from '../code/route';
import { deviceCodeStore } from '@/lib/device-code-store';
import { NextRequest } from 'next/server';

// Mock the device code store
jest.mock('@/lib/device-code-store', () => ({
  deviceCodeStore: {
    set: jest.fn(),
  },
}));

describe('POST /api/auth/device/code', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a device code successfully', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'test-client' }),
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
    expect(data.user_code).toMatch(/^[A-Z]{4}-[A-Z]{4}$/); // Format: ABCD-EFGH
    expect(data.verification_uri).toContain('/activate');
    expect(data.expires_in).toBe(900); // 15 minutes
    expect(data.interval).toBe(5); // 5 seconds

    // Verify store was called
    expect(deviceCodeStore.set).toHaveBeenCalledTimes(1);
  });

  it('should generate unique device codes', async () => {
    const mockRequest1 = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'test-client' }),
    });

    const mockRequest2 = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'test-client' }),
    });

    const response1 = await POST(mockRequest1);
    const response2 = await POST(mockRequest2);
    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.device_code).not.toBe(data2.device_code);
    expect(data1.user_code).not.toBe(data2.user_code);
  });

  it('should store device code with correct expiration', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/code', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'test-client' }),
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
    const [[, storedCode]] = (deviceCodeStore.set as jest.Mock).mock.calls;
    const expiresInMs = storedCode.expires_at.getTime() - storedCode.created_at.getTime();
    expect(expiresInMs).toBeCloseTo(15 * 60 * 1000, -2); // 15 minutes ±100ms
  });
});
