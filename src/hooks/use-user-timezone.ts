'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { UserPreferences } from '@/types/user-preferences';
import { getBrowserTimezone, isValidTimezone } from '@/lib/timezone-utils';

const STORAGE_KEY = 'user-preferences';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedPreferences {
  preferences: UserPreferences;
  cachedAt: number;
}

/**
 * Hook for managing user timezone preferences with localStorage cache
 *
 * Features:
 * - Auto-detects browser timezone
 * - Caches preferences in localStorage
 * - Syncs with Vercel blob storage via API
 * - Falls back gracefully for unauthenticated users
 */
export function useUserTimezone() {
  const { data: session, status } = useSession();
  const [timezone, setTimezone] = useState<string>(() => getBrowserTimezone());
  const [timezoneSource, setTimezoneSource] = useState<'auto' | 'manual'>('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load preferences from localStorage cache
   */
  const loadFromCache = useCallback((): UserPreferences | null => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (!cached) return null;

      const parsed: CachedPreferences = JSON.parse(cached);
      const age = Date.now() - parsed.cachedAt;

      // Check if cache is still valid
      if (age < CACHE_DURATION) {
        return parsed.preferences;
      }

      // Cache expired, remove it
      localStorage.removeItem(STORAGE_KEY);
      return null;
    } catch (error) {
      console.error('Failed to load from cache:', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  /**
   * Save preferences to localStorage cache
   */
  const saveToCache = useCallback((preferences: UserPreferences) => {
    try {
      const cached: CachedPreferences = {
        preferences,
        cachedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }, []);

  /**
   * Load preferences from API
   */
  const loadFromAPI = useCallback(async (): Promise<UserPreferences | null> => {
    try {
      const response = await fetch('/api/user-preferences');

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, use browser timezone
          return null;
        }
        throw new Error('Failed to fetch preferences');
      }

      const preferences: UserPreferences = await response.json();
      saveToCache(preferences);
      return preferences;
    } catch (error) {
      console.error('Failed to load from API:', error);
      setError('Failed to load timezone preferences');
      return null;
    }
  }, [saveToCache]);

  /**
   * Save preferences to API
   */
  const saveToAPI = useCallback(async (
    newTimezone: string,
    source: 'auto' | 'manual'
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone: newTimezone,
          timezoneSource: source,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      const result = await response.json();
      saveToCache(result.preferences);
      return true;
    } catch (error) {
      console.error('Failed to save to API:', error);
      setError('Failed to save timezone preference');
      return false;
    }
  }, [saveToCache]);

  /**
   * Initialize timezone from cache or API
   */
  useEffect(() => {
    const initializeTimezone = async () => {
      setIsLoading(true);
      setError(null);

      // Try loading from cache first
      const cached = loadFromCache();
      if (cached) {
        setTimezone(cached.timezone);
        setTimezoneSource(cached.timezoneSource);
        setIsLoading(false);
        return;
      }

      // If authenticated, try loading from API
      if (status === 'authenticated' && session?.user?.id) {
        const preferences = await loadFromAPI();
        if (preferences) {
          setTimezone(preferences.timezone);
          setTimezoneSource(preferences.timezoneSource);
        } else {
          // No preferences found, use browser timezone
          const browserTz = getBrowserTimezone();
          setTimezone(browserTz);
          setTimezoneSource('auto');
        }
      } else if (status === 'unauthenticated') {
        // Not authenticated, use browser timezone
        const browserTz = getBrowserTimezone();
        setTimezone(browserTz);
        setTimezoneSource('auto');
      }

      setIsLoading(false);
    };

    initializeTimezone();
  }, [status, session, loadFromCache, loadFromAPI]);

  /**
   * Update timezone preference
   */
  const updateTimezone = useCallback(async (
    newTimezone: string,
    source: 'auto' | 'manual' = 'manual'
  ): Promise<boolean> => {
    if (!isValidTimezone(newTimezone)) {
      setError('Invalid timezone');
      return false;
    }

    setTimezone(newTimezone);
    setTimezoneSource(source);

    // If authenticated, save to API
    if (status === 'authenticated' && session?.user?.id) {
      return await saveToAPI(newTimezone, source);
    }

    // If not authenticated, just update local state
    return true;
  }, [status, session, saveToAPI]);

  /**
   * Reset to auto-detected timezone
   */
  const resetToAuto = useCallback(async (): Promise<boolean> => {
    const browserTz = getBrowserTimezone();
    return await updateTimezone(browserTz, 'auto');
  }, [updateTimezone]);

  return {
    timezone,
    timezoneSource,
    isLoading,
    error,
    updateTimezone,
    resetToAuto,
  };
}
