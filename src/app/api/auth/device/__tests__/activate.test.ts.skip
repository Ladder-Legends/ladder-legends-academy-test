import { POST } from '../activate/route';
import { deviceCodeStore } from '@/lib/device-code-store';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/device-code-store');
jest.mock('@/lib/auth');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockDeviceCodeStore = deviceCodeStore as jest.Mocked<typeof deviceCodeStore>;

describe('POST /api/auth/device/activate', () => {
  const mockSession = {
    user: {
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.png',
      discordId: '123456789',
    },
  };

  const mockDeviceCode = {
    device_code: 'test-device-code-123',
    user_code: 'ABCD-1234',
    status: 'pending' as const,
    created_at: new Date(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as any);
  });

  it('should successfully activate a valid device code', async () => {
    mockDeviceCodeStore.get.mockResolvedValue(mockDeviceCode as any);
    mockDeviceCodeStore.set.mockResolvedValue(undefined);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/activate', {
      method: 'POST',
      body: JSON.stringify({ user_code: 'ABCD-1234' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Device activated successfully! You can now return to the app.',
    });

    // Verify the code was updated with user info
    expect(mockDeviceCodeStore.set).toHaveBeenCalledWith(
      mockDeviceCode.device_code,
      expect.objectContaining({
        status: 'authorized',
        user_id: '123456789',
        user_data: expect.objectContaining({
          id: '123456789',
          username: 'Test User',
          avatar_url: 'https://example.com/avatar.png',
        }),
      })
    );
  });

  it('should return 401 if user is not logged in', async () => {
    mockAuth.mockResolvedValue(null);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/activate', {
      method: 'POST',
      body: JSON.stringify({ user_code: 'ABCD-1234' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if user_code is missing', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/activate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid user_code');
  });

  it('should return 400 if code is not found', async () => {
    mockDeviceCodeStore.get.mockResolvedValue(undefined);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/activate', {
      method: 'POST',
      body: JSON.stringify({ user_code: 'INVALID-CODE' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired code');
  });

  it('should return 410 if code is expired', async () => {
    const expiredCode = {
      ...mockDeviceCode,
      expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
    };
    mockDeviceCodeStore.get.mockResolvedValue(expiredCode as any);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/activate', {
      method: 'POST',
      body: JSON.stringify({ user_code: 'ABCD-1234' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toBe('Code has expired. Please generate a new code in the app.');
  });

  it('should return 400 if code is already used', async () => {
    const usedCode = {
      ...mockDeviceCode,
      status: 'authorized' as const,
    };
    mockDeviceCodeStore.get.mockResolvedValue(usedCode as any);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/activate', {
      method: 'POST',
      body: JSON.stringify({ user_code: 'ABCD-1234' }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Code has already been used');
  });

  it('should handle case-insensitive user codes', async () => {
    mockDeviceCodeStore.get.mockResolvedValue(mockDeviceCode as any);
    mockDeviceCodeStore.set.mockResolvedValue(undefined);

    const mockRequest = new NextRequest('http://localhost:3000/api/auth/device/activate', {
      method: 'POST',
      body: JSON.stringify({ user_code: 'abcd-1234' }), // Lowercase
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(200);
    expect(mockDeviceCodeStore.get).toHaveBeenCalledWith('ABCD-1234'); // Should be uppercased
  });
});
