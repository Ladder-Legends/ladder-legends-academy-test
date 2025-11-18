// Device code storage with Vercel KV (production) and file-based fallback (local dev)

import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

// File-based fallback for local development (when KV env vars not set)
class FileBasedStore {
  private storePath: string;

  constructor() {
    const tmpDir = os.tmpdir();
    this.storePath = path.join(tmpDir, 'ladder-legends-device-codes.json');
  }

  private loadAll(): Record<string, DeviceCode> {
    try {
      if (fs.existsSync(this.storePath)) {
        const data = fs.readFileSync(this.storePath, 'utf-8');
        const parsed = JSON.parse(data);

        // Convert date strings back to Date objects
        for (const [, value] of Object.entries(parsed)) {
          const code = value as DeviceCode;
          code.created_at = new Date(code.created_at);
          code.expires_at = new Date(code.expires_at);
          if (code.authorized_at) {
            code.authorized_at = new Date(code.authorized_at);
          }
        }

        return parsed;
      }
      return {};
    } catch (error) {
      console.error('[FILE STORE] Error loading:', error);
      return {};
    }
  }

  private saveAll(data: Record<string, DeviceCode>) {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[FILE STORE] Error saving:', error);
    }
  }

  async get(key: string): Promise<DeviceCode | null> {
    const all = this.loadAll();
    const code = all[key];

    // Check if expired
    if (code && new Date(code.expires_at) < new Date()) {
      await this.delete(key);
      return null;
    }

    return code || null;
  }

  async set(key: string, value: DeviceCode, ttlSeconds?: number): Promise<void> {
    const all = this.loadAll();
    all[key] = value;
    this.saveAll(all);
  }

  async delete(...keys: string[]): Promise<void> {
    const all = this.loadAll();
    for (const key of keys) {
      delete all[key];
    }
    this.saveAll(all);
  }
}

// KV wrapper with file fallback
class DeviceCodeStore {
  private fileStore: FileBasedStore;
  private useKV: boolean;

  constructor() {
    this.fileStore = new FileBasedStore();
    // Check if KV is available
    this.useKV = !!process.env.KV_REST_API_URL;

    console.log(`[DEVICE STORE] Using ${this.useKV ? 'Vercel KV (Redis)' : 'file-based'} storage`);
  }

  async get(key: string): Promise<DeviceCode | undefined> {
    try {
      if (this.useKV) {
        // Try both device: and user: prefixes
        const deviceCode = await kv.get<DeviceCode>(`device:${key}`);
        if (deviceCode) return this.parseDates(deviceCode);

        const userCode = await kv.get<DeviceCode>(`user:${key}`);
        if (userCode) return this.parseDates(userCode);

        return undefined;
      } else {
        const code = await this.fileStore.get(key);
        return code || undefined;
      }
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

      if (this.useKV) {
        // Store by both device_code and user_code
        const isDeviceCode = key === value.device_code;
        const isUserCode = key === value.user_code;

        if (isDeviceCode || !key.startsWith('device:') && !key.startsWith('user:')) {
          await kv.set(`device:${value.device_code}`, value, { ex: ttlSeconds });
        }

        if (isUserCode || !key.startsWith('device:') && !key.startsWith('user:')) {
          await kv.set(`user:${value.user_code}`, value, { ex: ttlSeconds });
        }
      } else {
        // File store - save both keys
        await this.fileStore.set(`device:${value.device_code}`, value, ttlSeconds);
        await this.fileStore.set(`user:${value.user_code}`, value, ttlSeconds);
      }

      console.log('[DEVICE STORE] Saved code:', value.user_code);
    } catch (error) {
      console.error('[DEVICE STORE] Error setting code:', error);
    }
  }

  async delete(deviceCode: string, userCode?: string): Promise<void> {
    try {
      if (this.useKV) {
        const keys = [`device:${deviceCode}`];
        if (userCode) {
          keys.push(`user:${userCode}`);
        }
        await kv.del(...keys);
      } else {
        const keys = [`device:${deviceCode}`];
        if (userCode) {
          keys.push(`user:${userCode}`);
        }
        await this.fileStore.delete(...keys);
      }

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
