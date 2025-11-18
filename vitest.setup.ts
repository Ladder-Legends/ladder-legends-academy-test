import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, vi } from 'vitest';

// Mock @vercel/kv globally
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock environment variables
beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret';
  process.env.AUTH_DISCORD_ID = 'test-discord-id';
  process.env.AUTH_DISCORD_SECRET = 'test-discord-secret';
  process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
  process.env.DISCORD_SERVER_ID = 'test-server-id';
  process.env.KV_REST_API_URL = 'http://test-kv-url';
});

// Cleanup after each test
afterEach(() => {
  // Clear any mocks
  vi.clearAllMocks();
});
