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

// Device code store using Vercel KV (Redis)
class DeviceCodeStore {
  async get(key: string): Promise<DeviceCode | undefined> {
    try {
      // Try both device: and user: prefixes
      const deviceCode = await kv.get<DeviceCode>(`device:${key}`);
      if (deviceCode) return this.parseDates(deviceCode);

      const userCode = await kv.get<DeviceCode>(`user:${key}`);
      if (userCode) return this.parseDates(userCode);

      return undefined;
    } catch (error) {
      console.error('[DEVICE STORE] Error getting code:', error);
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
    try {
      const ttlSeconds = Math.floor((value.expires_at.getTime() - Date.now()) / 1000);

      // Store by both device_code and user_code
      const isDeviceCode = key === value.device_code;
      const isUserCode = key === value.user_code;

      if (isDeviceCode || !key.startsWith('device:') && !key.startsWith('user:')) {
        await kv.set(`device:${value.device_code}`, value, { ex: ttlSeconds });
      }

      if (isUserCode || !key.startsWith('device:') && !key.startsWith('user:')) {
        await kv.set(`user:${value.user_code}`, value, { ex: ttlSeconds });
      }

      console.log('[DEVICE STORE] Saved code:', value.user_code);
    } catch (error) {
      console.error('[DEVICE STORE] Error setting code:', error);
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
