/**
 * Tests for chart preferences hooks and utilities
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  filterByDateRange,
  getDateRangeCutoff,
  useDateRangePreferences,
  useGamesPlayedPreferences,
  useMatchupTrendsPreferences,
  useMetricsTrendsPreferences,
  type DateRangeOption,
} from '../use-chart-preferences';

// ============================================================================
// filterByDateRange Tests
// ============================================================================

describe('filterByDateRange', () => {
  const today = new Date();
  const daysAgo = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  const createItem = (daysOld: number) => ({
    id: `item-${daysOld}`,
    game_date: daysAgo(daysOld),
    uploaded_at: daysAgo(daysOld + 1), // uploaded_at is fallback, 1 day after game
  });

  it('should return all items when dateRange is "all"', () => {
    const items = [createItem(1), createItem(30), createItem(100)];
    const result = filterByDateRange(items, 'all');
    expect(result).toHaveLength(3);
  });

  it('should filter to last 7 days', () => {
    const items = [
      createItem(1),  // within 7 days
      createItem(5),  // within 7 days
      createItem(10), // outside 7 days
      createItem(30), // outside 7 days
    ];
    const result = filterByDateRange(items, '7');
    expect(result).toHaveLength(2);
    expect(result.map(i => i.id)).toEqual(['item-1', 'item-5']);
  });

  it('should filter to last 30 days', () => {
    const items = [
      createItem(1),  // within 30 days
      createItem(15), // within 30 days
      createItem(29), // within 30 days
      createItem(35), // outside 30 days
      createItem(100), // outside 30 days
    ];
    const result = filterByDateRange(items, '30');
    expect(result).toHaveLength(3);
  });

  it('should filter to last 90 days', () => {
    const items = [
      createItem(1),   // within 90 days
      createItem(45),  // within 90 days
      createItem(89),  // within 90 days
      createItem(95),  // outside 90 days
      createItem(180), // outside 90 days
    ];
    const result = filterByDateRange(items, '90');
    expect(result).toHaveLength(3);
  });

  it('should use uploaded_at as fallback when game_date is missing', () => {
    const items = [
      { id: 'item-1', game_date: null, uploaded_at: daysAgo(5) },
      { id: 'item-2', game_date: undefined, uploaded_at: daysAgo(10) },
      { id: 'item-3', game_date: daysAgo(3), uploaded_at: daysAgo(1) }, // game_date takes precedence
    ];
    const result = filterByDateRange(items, '7');
    // item-1: uploaded 5 days ago - included
    // item-2: uploaded 10 days ago - excluded
    // item-3: game_date 3 days ago - included
    expect(result).toHaveLength(2);
    expect(result.map(i => i.id)).toEqual(['item-1', 'item-3']);
  });

  it('should keep items without any date', () => {
    const items = [
      { id: 'item-1', game_date: null, uploaded_at: undefined as unknown as string },
      createItem(5),
    ];
    const result = filterByDateRange(items, '7');
    // Items without dates are kept (can't determine if they're in range)
    expect(result).toHaveLength(2);
  });

  it('should handle empty array', () => {
    const result = filterByDateRange([], '7');
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// getDateRangeCutoff Tests
// ============================================================================

describe('getDateRangeCutoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-26T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null for "all"', () => {
    expect(getDateRangeCutoff('all')).toBeNull();
  });

  it('should return correct cutoff for 7 days', () => {
    const cutoff = getDateRangeCutoff('7');
    expect(cutoff).not.toBeNull();
    // Should be 7 days before Nov 26, so Nov 19
    expect(cutoff!.toISOString().split('T')[0]).toBe('2025-11-19');
  });

  it('should return correct cutoff for 30 days', () => {
    const cutoff = getDateRangeCutoff('30');
    expect(cutoff).not.toBeNull();
    // Should be 30 days before Nov 26, so Oct 27
    expect(cutoff!.toISOString().split('T')[0]).toBe('2025-10-27');
  });

  it('should return correct cutoff for 90 days', () => {
    const cutoff = getDateRangeCutoff('90');
    expect(cutoff).not.toBeNull();
    // Should be 90 days before Nov 26, so Aug 28
    expect(cutoff!.toISOString().split('T')[0]).toBe('2025-08-28');
  });

  it('should set time to start of day', () => {
    const cutoff = getDateRangeCutoff('7');
    expect(cutoff).not.toBeNull();
    expect(cutoff!.getHours()).toBe(0);
    expect(cutoff!.getMinutes()).toBe(0);
    expect(cutoff!.getSeconds()).toBe(0);
    expect(cutoff!.getMilliseconds()).toBe(0);
  });
});

// ============================================================================
// useDateRangePreferences Hook Tests
// ============================================================================

describe('useDateRangePreferences', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should start with default "all" value', () => {
    const { result } = renderHook(() => useDateRangePreferences());
    expect(result.current.dateRange).toBe('all');
  });

  it('should load saved preference from localStorage', () => {
    localStorageMock.setItem(
      'ladder-legends-date-range-prefs',
      JSON.stringify({ dateRange: '30' })
    );

    const { result } = renderHook(() => useDateRangePreferences());

    // Wait for useEffect to run
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.dateRange).toBe('30');
  });

  it('should save preference to localStorage when changed', () => {
    const { result } = renderHook(() => useDateRangePreferences());

    act(() => {
      result.current.setDateRange('7');
    });

    expect(result.current.dateRange).toBe('7');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'ladder-legends-date-range-prefs',
      JSON.stringify({ dateRange: '7' })
    );
  });

  it('should handle all valid date range options', () => {
    const { result } = renderHook(() => useDateRangePreferences());
    const options: DateRangeOption[] = ['all', '7', '30', '90'];

    for (const option of options) {
      act(() => {
        result.current.setDateRange(option);
      });
      expect(result.current.dateRange).toBe(option);
    }
  });
});

// ============================================================================
// useGamesPlayedPreferences Hook Tests
// ============================================================================

describe('useGamesPlayedPreferences', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should start with default "weekly" period', () => {
    const { result } = renderHook(() => useGamesPlayedPreferences());
    expect(result.current.period).toBe('weekly');
  });

  it('should save and load period preference', () => {
    const { result } = renderHook(() => useGamesPlayedPreferences());

    act(() => {
      result.current.setPeriod('daily');
    });

    expect(result.current.period).toBe('daily');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});

// ============================================================================
// useMatchupTrendsPreferences Hook Tests
// ============================================================================

describe('useMatchupTrendsPreferences', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should start with default "weekly" period', () => {
    const { result } = renderHook(() => useMatchupTrendsPreferences());
    expect(result.current.period).toBe('weekly');
  });

  it('should save and load period preference', () => {
    const { result } = renderHook(() => useMatchupTrendsPreferences());

    act(() => {
      result.current.setPeriod('monthly');
    });

    expect(result.current.period).toBe('monthly');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});

// ============================================================================
// useMetricsTrendsPreferences Hook Tests
// ============================================================================

describe('useMetricsTrendsPreferences', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should start with default values', () => {
    const { result } = renderHook(() => useMetricsTrendsPreferences());
    expect(result.current.period).toBe('weekly');
    expect(result.current.matchup).toBeNull();
    expect(result.current.build).toBeNull();
  });

  it('should save and load all preferences', () => {
    localStorageMock.setItem(
      'ladder-legends-metrics-trends-prefs',
      JSON.stringify({ period: 'monthly', matchup: 'TvZ', build: 'Bio' })
    );

    const { result } = renderHook(() => useMetricsTrendsPreferences());

    expect(result.current.period).toBe('monthly');
    expect(result.current.matchup).toBe('TvZ');
    expect(result.current.build).toBe('Bio');
  });

  it('should update matchup filter', () => {
    const { result } = renderHook(() => useMetricsTrendsPreferences());

    act(() => {
      result.current.setMatchup('ZvP');
    });

    expect(result.current.matchup).toBe('ZvP');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update build filter', () => {
    const { result } = renderHook(() => useMetricsTrendsPreferences());

    act(() => {
      result.current.setBuild('Mech');
    });

    expect(result.current.build).toBe('Mech');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should clear matchup filter when set to null', () => {
    const { result } = renderHook(() => useMetricsTrendsPreferences());

    act(() => {
      result.current.setMatchup('TvZ');
    });

    act(() => {
      result.current.setMatchup(null);
    });

    expect(result.current.matchup).toBeNull();
  });
});
