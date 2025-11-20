import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deviceCodeStore, DeviceCode } from '../device-code-store';
import { kv } from '@vercel/kv';

// Mock is already set up in vitest.setup.ts

describe('DeviceCodeStore', () => {
  const mockCode: DeviceCode = {
    device_code: 'test-device-code-123',
    user_code: 'TEST-CODE',
    status: 'pending',
    created_at: new Date(Date.now()),
    expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
  };

  const authorizedCode: DeviceCode = {
    ...mockCode,
    status: 'authorized',
    user_id: 'user-123',
    authorized_at: new Date('2025-01-01T00:05:00Z'),
    user_data: {
      id: 'user-123',
      username: 'TestUser',
      avatar_url: 'https://example.com/avatar.png',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set KV env var so device-code-store thinks KV is configured
    process.env.KV_REST_API_URL = 'http://localhost:8079';
  });

  describe('get()', () => {
    it('should retrieve code by device_code', async () => {
      vi.mocked(kv.get).mockResolvedValueOnce(mockCode);

      const result = await deviceCodeStore.get(mockCode.device_code);

      expect(kv.get).toHaveBeenCalledWith(`device:${mockCode.device_code}`);
      expect(result).toBeDefined();
      expect(result?.device_code).toBe(mockCode.device_code);
      expect(result?.user_code).toBe(mockCode.user_code);
      expect(result?.status).toBe('pending');
    });

    it('should retrieve code by user_code', async () => {
      vi.mocked(kv.get).mockResolvedValueOnce(null).mockResolvedValueOnce(mockCode);

      const result = await deviceCodeStore.get(mockCode.user_code);

      expect(kv.get).toHaveBeenCalledWith(`device:${mockCode.user_code}`);
      expect(kv.get).toHaveBeenCalledWith(`user:${mockCode.user_code}`);
      expect(result).toBeDefined();
      expect(result?.device_code).toBe(mockCode.device_code);
    });

    it('should return undefined for non-existent code', async () => {
      vi.mocked(kv.get).mockResolvedValue(null);

      const result = await deviceCodeStore.get('non-existent');

      expect(result).toBeUndefined();
    });

    it('should parse date strings back to Date objects', async () => {
      const codeWithStringDates = {
        ...mockCode,
        created_at: '2025-01-01T00:00:00Z' as unknown as Date,
        expires_at: '2025-01-01T00:15:00Z' as unknown as Date,
      };

      vi.mocked(kv.get).mockResolvedValueOnce(codeWithStringDates);

      const result = await deviceCodeStore.get(mockCode.device_code);

      expect(result?.created_at).toBeInstanceOf(Date);
      expect(result?.expires_at).toBeInstanceOf(Date);
      expect(result?.created_at.toISOString()).toBe('2025-01-01T00:00:00.000Z');
      expect(result?.expires_at.toISOString()).toBe('2025-01-01T00:15:00.000Z');
    });

    it('should handle authorized_at date correctly', async () => {
      const codeWithStringDate = {
        ...authorizedCode,
        created_at: '2025-01-01T00:00:00Z' as unknown as Date,
        expires_at: '2025-01-01T00:15:00Z' as unknown as Date,
        authorized_at: '2025-01-01T00:05:00Z' as unknown as Date,
      };

      vi.mocked(kv.get).mockResolvedValueOnce(codeWithStringDate);

      const result = await deviceCodeStore.get(authorizedCode.device_code);

      expect(result?.authorized_at).toBeInstanceOf(Date);
      expect(result?.authorized_at?.toISOString()).toBe('2025-01-01T00:05:00.000Z');
    });

    it('should handle KV errors gracefully', async () => {
      vi.mocked(kv.get).mockRejectedValue(new Error('KV connection failed'));

      const result = await deviceCodeStore.get('any-code');

      expect(result).toBeUndefined();
    });
  });

  describe('set()', () => {
    it('should save code by both device_code and user_code keys', async () => {
      vi.mocked(kv.set).mockResolvedValue('OK');

      await deviceCodeStore.set(mockCode.device_code, mockCode);

      expect(kv.set).toHaveBeenCalledTimes(2);
      expect(kv.set).toHaveBeenCalledWith(
        `device:${mockCode.device_code}`,
        mockCode,
        expect.objectContaining({ ex: expect.any(Number) })
      );
      expect(kv.set).toHaveBeenCalledWith(
        `user:${mockCode.user_code}`,
        mockCode,
        expect.objectContaining({ ex: expect.any(Number) })
      );
    });

    it('should calculate correct TTL', async () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const code = {
        ...mockCode,
        expires_at: futureDate,
      };

      vi.mocked(kv.set).mockResolvedValue('OK');

      await deviceCodeStore.set(code.device_code, code);

      const setCall = vi.mocked(kv.set).mock.calls[0];
      const ttl = (setCall[2] as { ex: number }).ex;

      // TTL should be approximately 900 seconds (15 minutes)
      expect(ttl).toBeGreaterThan(890);
      expect(ttl).toBeLessThanOrEqual(900);
    });

    it('should update code status', async () => {
      vi.mocked(kv.set).mockResolvedValue('OK');

      await deviceCodeStore.set(authorizedCode.device_code, authorizedCode);

      expect(kv.set).toHaveBeenCalledWith(
        `device:${authorizedCode.device_code}`,
        authorizedCode,
        expect.any(Object)
      );
      expect(kv.set).toHaveBeenCalledWith(
        `user:${authorizedCode.user_code}`,
        authorizedCode,
        expect.any(Object)
      );
    });

    it('should handle KV errors gracefully', async () => {
      vi.mocked(kv.set).mockRejectedValue(new Error('KV connection failed'));

      // Should throw the KV error (errors are logged and re-thrown)
      await expect(deviceCodeStore.set(mockCode.device_code, mockCode)).rejects.toThrow('KV connection failed');
    });
  });

  describe('delete()', () => {
    it('should delete code by device_code only', async () => {
      vi.mocked(kv.del).mockResolvedValue(1);

      await deviceCodeStore.delete(mockCode.device_code);

      expect(kv.del).toHaveBeenCalledWith(`device:${mockCode.device_code}`);
      expect(kv.del).toHaveBeenCalledTimes(1);
    });

    it('should delete code by both device_code and user_code', async () => {
      vi.mocked(kv.del).mockResolvedValue(2);

      await deviceCodeStore.delete(mockCode.device_code, mockCode.user_code);

      expect(kv.del).toHaveBeenCalledWith(`device:${mockCode.device_code}`, `user:${mockCode.user_code}`);
    });

    it('should handle KV errors gracefully', async () => {
      vi.mocked(kv.del).mockRejectedValue(new Error('KV connection failed'));

      // Should not throw
      await expect(deviceCodeStore.delete(mockCode.device_code)).resolves.not.toThrow();
    });
  });

  describe('has()', () => {
    it('should return true when code exists', async () => {
      vi.mocked(kv.get).mockResolvedValueOnce(mockCode);

      const exists = await deviceCodeStore.has(mockCode.device_code);

      expect(exists).toBe(true);
    });

    it('should return false when code does not exist', async () => {
      vi.mocked(kv.get).mockResolvedValue(null);

      const exists = await deviceCodeStore.has('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('Status values', () => {
    it('should handle all status values', async () => {
      const statuses: Array<DeviceCode['status']> = ['pending', 'authorized', 'denied', 'expired'];

      for (const status of statuses) {
        const code = { ...mockCode, status };
        vi.mocked(kv.get).mockResolvedValueOnce(code);

        const retrieved = await deviceCodeStore.get(`code-${status}`);
        expect(retrieved?.status).toBe(status);
      }
    });
  });
});
