// Device code storage with Vercel KV

import { kv } from '@vercel/kv';

export interface DeviceCode {
  device_code: string;
  user_code: string;
  user_id?: string;
  status: 'pending' | 'authorized' | 'denied' | 'expired';
  created_at: Date;
  expires_at: Date;
  authorized_at?: Date;
  user_data?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

// Check if KV is configured (supports both local dev and Vercel naming conventions)
const isKVConfigured = !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_KV_REST_API_URL);

if (!isKVConfigured) {
  console.warn('[DEVICE STORE] WARNING: KV not configured! Device auth will not work.');
  console.warn('[DEVICE STORE] Set KV_REST_API_URL or UPSTASH_REDIS_KV_REST_API_URL in your environment variables.');
}

// Device code store using Vercel KV (Redis)
class DeviceCodeStore {
  async get(key: string): Promise<DeviceCode | undefined> {
    if (!isKVConfigured) {
      console.error('[DEVICE STORE] KV not configured - cannot get code:', key);
      return undefined;
    }

    try {
      console.log('[DEVICE STORE] Looking up key:', key);

      // Try both device: and user: prefixes
      const deviceKey = `device:${key}`;
      const userKey = `user:${key}`;

      console.log('[DEVICE STORE] Trying device key:', deviceKey);
      const deviceCode = await kv.get<DeviceCode>(deviceKey);
      if (deviceCode) {
        console.log('[DEVICE STORE] Found by device key!');
        return this.parseDates(deviceCode);
      }

      console.log('[DEVICE STORE] Trying user key:', userKey);
      const userCode = await kv.get<DeviceCode>(userKey);
      if (userCode) {
        console.log('[DEVICE STORE] Found by user key!');
        return this.parseDates(userCode);
      }

      console.log('[DEVICE STORE] Code not found for key:', key);
      return undefined;
    } catch (error) {
      console.error('[DEVICE STORE] Error getting code:', error);
      console.error('[DEVICE STORE] Error details:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return undefined;
    }
  }

  // Helper to convert date strings back to Date objects
  private parseDates(code: DeviceCode): DeviceCode {
    return {
      ...code,
      created_at: new Date(code.created_at),
      expires_at: new Date(code.expires_at),
      authorized_at: code.authorized_at ? new Date(code.authorized_at) : undefined,
    };
  }

  async set(key: string, value: DeviceCode): Promise<void> {
    if (!isKVConfigured) {
      console.error('[DEVICE STORE] KV not configured - cannot save code!');
      throw new Error('KV storage not configured. Set KV_REST_API_URL or UPSTASH_REDIS_KV_REST_API_URL environment variable.');
    }

    try {
      const ttlSeconds = Math.floor((value.expires_at.getTime() - Date.now()) / 1000);

      if (ttlSeconds <= 0) {
        console.error('[DEVICE STORE] Cannot save expired code');
        throw new Error('Cannot save expired code');
      }

      // Store by both device_code and user_code
      const isDeviceCode = key === value.device_code;
      const isUserCode = key === value.user_code;

      const deviceKey = `device:${value.device_code}`;
      const userKey = `user:${value.user_code}`;

      console.log('[DEVICE STORE] Saving code:', {
        userCode: value.user_code,
        deviceCode: value.device_code.substring(0, 8) + '...',
        ttlSeconds,
        willSaveDeviceKey: isDeviceCode || !key.startsWith('device:') && !key.startsWith('user:'),
        willSaveUserKey: isUserCode || !key.startsWith('device:') && !key.startsWith('user:'),
      });

      if (isDeviceCode || !key.startsWith('device:') && !key.startsWith('user:')) {
        await kv.set(deviceKey, value, { ex: ttlSeconds });
        console.log('[DEVICE STORE] Saved to device key:', deviceKey);
      }

      if (isUserCode || !key.startsWith('device:') && !key.startsWith('user:')) {
        await kv.set(userKey, value, { ex: ttlSeconds });
        console.log('[DEVICE STORE] Saved to user key:', userKey);
      }

      console.log('[DEVICE STORE] Successfully saved code:', value.user_code);
    } catch (error) {
      console.error('[DEVICE STORE] Error setting code:', error);
      console.error('[DEVICE STORE] Error details:', {
        userCode: value.user_code,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error; // Re-throw so caller knows it failed
    }
  }

  async delete(deviceCode: string, userCode?: string): Promise<void> {
    try {
      const keys = [`device:${deviceCode}`];
      if (userCode) {
        keys.push(`user:${userCode}`);
      }
      await kv.del(...keys);

      console.log('[DEVICE STORE] Deleted code');
    } catch (error) {
      console.error('[DEVICE STORE] Error deleting code:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    const code = await this.get(key);
    return !!code;
  }
}

// Singleton instance
export const deviceCodeStore = new DeviceCodeStore();
