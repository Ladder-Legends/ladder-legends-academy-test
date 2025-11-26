'use client';

/**
 * Hook for persisting chart preferences to localStorage
 *
 * Saves and restores user preferences for:
 * - Time period selection (daily/weekly/monthly)
 * - Date range filter (last N days)
 * - Selected matchup filter
 * - Selected build filter
 * - Chart visibility toggles
 */

import { useState, useEffect, useCallback } from 'react';
import type { TimePeriod } from '@/lib/replay-time-series';

// ============================================================================
// Types
// ============================================================================

export type DateRangeOption = 'all' | '7' | '30' | '90';

export interface ChartPreferences {
  // MetricsTrendsChart
  metricsPeriod: TimePeriod;
  metricsMatchup: string | null;
  metricsBuild: string | null;

  // GamesPlayedChart
  gamesPeriod: TimePeriod;

  // MatchupTrendsChart
  matchupPeriod: TimePeriod;

  // Global date range
  dateRange: DateRangeOption;

  // Visibility toggles
  showWinRate: boolean;
  showSupplyBlockTime: boolean;
  showProductionIdleTime: boolean;
}

const DEFAULT_PREFERENCES: ChartPreferences = {
  metricsPeriod: 'weekly',
  metricsMatchup: null,
  metricsBuild: null,
  gamesPeriod: 'weekly',
  matchupPeriod: 'weekly',
  dateRange: 'all',
  showWinRate: true,
  showSupplyBlockTime: true,
  showProductionIdleTime: true,
};

const STORAGE_KEY = 'ladder-legends-chart-preferences';

// ============================================================================
// Hook
// ============================================================================

export function useChartPreferences() {
  const [preferences, setPreferences] = useState<ChartPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (error) {
      console.warn('Failed to load chart preferences:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save chart preferences:', error);
    }
  }, [preferences, isLoaded]);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof ChartPreferences>(
    key: K,
    value: ChartPreferences[K]
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    updatePreference,
    resetPreferences,
    isLoaded,
  };
}

// ============================================================================
// Individual Hooks (for use in specific components)
// ============================================================================

/**
 * Hook for MetricsTrendsChart preferences
 */
export function useMetricsTrendsPreferences() {
  const [period, setPeriodState] = useState<TimePeriod>('weekly');
  const [matchup, setMatchupState] = useState<string | null>(null);
  const [build, setBuildState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = 'ladder-legends-metrics-trends-prefs';

  // Load on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.period) setPeriodState(parsed.period);
        if (parsed.matchup !== undefined) setMatchupState(parsed.matchup);
        if (parsed.build !== undefined) setBuildState(parsed.build);
      }
    } catch (error) {
      console.warn('Failed to load metrics trends preferences:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save when changed
  const save = useCallback((newPeriod: TimePeriod, newMatchup: string | null, newBuild: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        period: newPeriod,
        matchup: newMatchup,
        build: newBuild,
      }));
    } catch (error) {
      console.warn('Failed to save metrics trends preferences:', error);
    }
  }, []);

  const setPeriod = useCallback((value: TimePeriod) => {
    setPeriodState(value);
    save(value, matchup, build);
  }, [matchup, build, save]);

  const setMatchup = useCallback((value: string | null) => {
    setMatchupState(value);
    save(period, value, build);
  }, [period, build, save]);

  const setBuild = useCallback((value: string | null) => {
    setBuildState(value);
    save(period, matchup, value);
  }, [period, matchup, save]);

  return {
    period,
    setPeriod,
    matchup,
    setMatchup,
    build,
    setBuild,
    isLoaded,
  };
}

/**
 * Hook for GamesPlayedChart preferences
 */
export function useGamesPlayedPreferences() {
  const [period, setPeriodState] = useState<TimePeriod>('weekly');
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = 'ladder-legends-games-played-prefs';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.period) setPeriodState(parsed.period);
      }
    } catch (error) {
      console.warn('Failed to load games played preferences:', error);
    }
    setIsLoaded(true);
  }, []);

  const setPeriod = useCallback((value: TimePeriod) => {
    setPeriodState(value);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ period: value }));
    } catch (error) {
      console.warn('Failed to save games played preferences:', error);
    }
  }, []);

  return { period, setPeriod, isLoaded };
}

/**
 * Hook for MatchupTrendsChart preferences
 */
export function useMatchupTrendsPreferences() {
  const [period, setPeriodState] = useState<TimePeriod>('weekly');
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = 'ladder-legends-matchup-trends-prefs';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.period) setPeriodState(parsed.period);
      }
    } catch (error) {
      console.warn('Failed to load matchup trends preferences:', error);
    }
    setIsLoaded(true);
  }, []);

  const setPeriod = useCallback((value: TimePeriod) => {
    setPeriodState(value);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ period: value }));
    } catch (error) {
      console.warn('Failed to save matchup trends preferences:', error);
    }
  }, []);

  return { period, setPeriod, isLoaded };
}

/**
 * Hook for global date range preferences
 */
export function useDateRangePreferences() {
  const [dateRange, setDateRangeState] = useState<DateRangeOption>('all');
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = 'ladder-legends-date-range-prefs';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.dateRange) setDateRangeState(parsed.dateRange);
      }
    } catch (error) {
      console.warn('Failed to load date range preferences:', error);
    }
    setIsLoaded(true);
  }, []);

  const setDateRange = useCallback((value: DateRangeOption) => {
    setDateRangeState(value);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ dateRange: value }));
    } catch (error) {
      console.warn('Failed to save date range preferences:', error);
    }
  }, []);

  return { dateRange, setDateRange, isLoaded };
}

/**
 * Calculate the cutoff date for a given date range option
 */
export function getDateRangeCutoff(dateRange: DateRangeOption): Date | null {
  if (dateRange === 'all') return null;

  const days = parseInt(dateRange, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

/**
 * Filter items by date range (works with any item that has game_date or uploaded_at)
 */
export function filterByDateRange<T extends { game_date?: string | null; uploaded_at?: string }>(
  items: T[],
  dateRange: DateRangeOption
): T[] {
  const cutoff = getDateRangeCutoff(dateRange);
  if (!cutoff) return items;

  return items.filter(item => {
    const dateStr = item.game_date || item.uploaded_at;
    if (!dateStr) return true; // Keep items without dates
    const itemDate = new Date(dateStr);
    return itemDate >= cutoff;
  });
}

export default useChartPreferences;
