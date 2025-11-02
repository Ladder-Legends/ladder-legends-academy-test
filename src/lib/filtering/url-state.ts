/**
 * Enhanced URL state management for filters.
 * Handles synchronization between filter state and URL parameters.
 */

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FilterState, FilterValue, FilterFieldConfig } from './types';

/**
 * Parse URL parameters into filter state
 */
export function parseUrlParams<T>(
  searchParams: URLSearchParams,
  fieldConfigs: FilterFieldConfig<T>[],
  session?: any
): FilterState {
  const filters: FilterState = {};

  for (const config of fieldConfigs) {
    const paramName = config.urlParam || config.id;
    const value = searchParams.get(paramName);

    if (!value) continue;

    // Parse the value as an array (comma-separated)
    const parsedValue = value.split(',').filter(Boolean);

    // Sanitize if needed (e.g., remove inactive coaches for non-owners)
    let sanitized: FilterValue = parsedValue;
    if (config.sanitizeValue && session) {
      sanitized = config.sanitizeValue(parsedValue, session);
    }

    filters[config.id] = sanitized;
  }

  return filters;
}

/**
 * Convert filter state to URL search params
 */
export function filtersToUrlParams(
  filters: FilterState,
  searchQuery?: string,
  tags?: string[]
): URLSearchParams {
  const params = new URLSearchParams();

  // Add search query
  if (searchQuery && searchQuery.trim()) {
    params.set('q', searchQuery);
  }

  // Add tags
  if (tags && tags.length > 0) {
    params.set('tags', tags.join(','));
  }

  // Add filter values
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === false) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }
    } else if (typeof value === 'boolean') {
      if (value) {
        params.set(key, 'true');
      }
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}

/**
 * Hook to sync filter state with URL
 * Simple one-way sync: state → URL
 */
export function useSyncFiltersToUrl(
  filters: FilterState,
  searchQuery?: string,
  tags?: string[]
) {
  const router = useRouter();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render to avoid overwriting URL on initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Build the new URL from current state
    const params = filtersToUrlParams(filters, searchQuery, tags);
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;

    // Update the URL
    router.replace(newUrl, { scroll: false });
  }, [filters, searchQuery, tags, router]);
}

/**
 * Get initial filter state from URL
 */
export function useInitialFiltersFromUrl<T>(
  fieldConfigs: FilterFieldConfig<T>[],
  session?: any
): {
  initialFilters: FilterState;
  initialSearch: string;
  initialTags: string[];
} {
  const searchParams = useSearchParams();

  const initialFilters = parseUrlParams(searchParams, fieldConfigs, session);
  const initialSearch = searchParams.get('q') || '';
  const initialTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

  return {
    initialFilters,
    initialSearch,
    initialTags,
  };
}
