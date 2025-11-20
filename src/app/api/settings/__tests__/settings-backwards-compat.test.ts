/**
 * Tests for settings API route backwards compatibility
 * Verifies that missing player name fields are handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import type { UserSettings } from '@/lib/replay-types';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      discordId: 'test-user-id',
    },
  }),
}));

// Mock KV module - need to mock both real and mock versions
const mockGetUserSettings = vi.fn();
const mockCreateUserSettings = vi.fn();
const mockUpdateUserSettings = vi.fn();

vi.mock('@/lib/replay-kv', () => ({
  getUserSettings: (...args: any[]) => mockGetUserSettings(...args),
  createUserSettings: (...args: any[]) => mockCreateUserSettings(...args),
  updateUserSettings: (...args: any[]) => mockUpdateUserSettings(...args),
}));

vi.mock('@/lib/replay-kv-mock', () => ({
  getUserSettings: (...args: any[]) => mockGetUserSettings(...args),
  createUserSettings: (...args: any[]) => mockCreateUserSettings(...args),
  updateUserSettings: (...args: any[]) => mockUpdateUserSettings(...args),
}));

describe('Settings API - Backwards Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle settings without confirmed_player_names field', async () => {
    // Simulate old settings without the new fields
    const oldSettings: Partial<UserSettings> = {
      discord_user_id: 'test-user-id',
      default_race: null,
      favorite_builds: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      // Missing: confirmed_player_names and possible_player_names
    };

    mockGetUserSettings.mockResolvedValue(oldSettings);
    mockUpdateUserSettings.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'confirm_player_name',
        player_name: 'Lotus',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdateUserSettings).toHaveBeenCalled();

    // Verify the settings were initialized with empty arrays/objects
    const updatedSettings = mockUpdateUserSettings.mock.calls[0][0];
    expect(updatedSettings.confirmed_player_names).toEqual(['Lotus']);
    expect(updatedSettings.possible_player_names).toBeDefined();
  });

  it('should handle settings without possible_player_names field', async () => {
    const oldSettings: Partial<UserSettings> = {
      discord_user_id: 'test-user-id',
      default_race: null,
      favorite_builds: [],
      confirmed_player_names: ['ExistingName'],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      // Missing: possible_player_names
    };

    mockGetUserSettings.mockResolvedValue(oldSettings);
    mockUpdateUserSettings.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reject_player_name',
        player_name: 'Unwanted',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdateUserSettings).toHaveBeenCalled();

    // Verify possible_player_names was initialized
    const updatedSettings = mockUpdateUserSettings.mock.calls[0][0];
    expect(updatedSettings.possible_player_names).toBeDefined();
    expect(typeof updatedSettings.possible_player_names).toBe('object');
  });

  it('should confirm player name when fields exist', async () => {
    const settings: UserSettings = {
      discord_user_id: 'test-user-id',
      default_race: null,
      favorite_builds: [],
      confirmed_player_names: [],
      possible_player_names: {
        'Lotus': 5,
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    mockGetUserSettings.mockResolvedValue(settings);
    mockUpdateUserSettings.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'confirm_player_name',
        player_name: 'Lotus',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    const updatedSettings = mockUpdateUserSettings.mock.calls[0][0];
    expect(updatedSettings.confirmed_player_names).toContain('Lotus');
    expect(updatedSettings.possible_player_names.Lotus).toBeUndefined();
  });

  it('should not add duplicate confirmed player names', async () => {
    const settings: UserSettings = {
      discord_user_id: 'test-user-id',
      default_race: null,
      favorite_builds: [],
      confirmed_player_names: ['Lotus'],
      possible_player_names: {},
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    mockGetUserSettings.mockResolvedValue(settings);
    mockUpdateUserSettings.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'confirm_player_name',
        player_name: 'Lotus',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    const updatedSettings = mockUpdateUserSettings.mock.calls[0][0];
    expect(updatedSettings.confirmed_player_names).toEqual(['Lotus']);
    expect(updatedSettings.confirmed_player_names.length).toBe(1);
  });

  it('should create settings if none exist', async () => {
    mockGetUserSettings.mockResolvedValue(null);
    mockCreateUserSettings.mockResolvedValue({
      discord_user_id: 'test-user-id',
      default_race: null,
      favorite_builds: [],
      confirmed_player_names: [],
      possible_player_names: {},
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });
    mockUpdateUserSettings.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'confirm_player_name',
        player_name: 'Lotus',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateUserSettings).toHaveBeenCalled();
    expect(mockUpdateUserSettings).toHaveBeenCalled();
  });
});
