import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';

// Mock environment variables
beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret';
  process.env.AUTH_DISCORD_ID = 'test-discord-id';
  process.env.AUTH_DISCORD_SECRET = 'test-discord-secret';
  process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
  process.env.DISCORD_SERVER_ID = 'test-server-id';
});

// Cleanup after each test
afterEach(() => {
  // Clear any mocks
  vi.clearAllMocks();
});
