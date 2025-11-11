/**
 * User preferences stored in Vercel blob storage
 */
export interface UserPreferences {
  /** User's Discord ID (used as key) */
  userId: string;

  /** User's preferred timezone (IANA format) */
  timezone: string;

  /** Whether timezone was auto-detected or manually set */
  timezoneSource: 'auto' | 'manual';

  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Default preferences for new users
 */
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'userId'> = {
  timezone: 'America/New_York',
  timezoneSource: 'auto',
  updatedAt: new Date().toISOString(),
};
