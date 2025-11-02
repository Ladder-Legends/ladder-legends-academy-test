import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Custom hook to sync filter state with URL query parameters.
 * Provides shareable URLs and browser back/forward button support.
 *
 * @param filters - Object mapping filter keys to their values (arrays or strings)
 *
 * @example
 * ```tsx
 * const filters = {
 *   q: searchQuery,
 *   races: selectedItems.races,
 *   coach: selectedItems.coaches,
 *   tags: selectedTags,
 * };
 * useUrlState(filters);
 * ```
 */
export function useUrlState(filters: Record<string, string | string[] | boolean | undefined>) {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === false) {
        // Skip empty/falsy values
        return;
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
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);
}

/**
 * Custom hook to initialize state from URL query parameters.
 *
 * @param paramName - The URL parameter name to read
 * @param type - The type of value to parse ('string', 'array', or 'boolean')
 * @returns The parsed value from the URL or a default
 *
 * @example
 * ```tsx
 * const searchQuery = useUrlParam('q', 'string');
 * const selectedTags = useUrlParam('tags', 'array');
 * const showPast = useUrlParam('past', 'boolean');
 * ```
 */
export function useUrlParam(paramName: string, type: 'string'): string;
export function useUrlParam(paramName: string, type: 'array'): string[];
export function useUrlParam(paramName: string, type: 'boolean'): boolean;
export function useUrlParam(paramName: string, type: 'string' | 'array' | 'boolean'): string | string[] | boolean {
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName);

  if (type === 'array') {
    return value?.split(',').filter(Boolean) || [];
  }

  if (type === 'boolean') {
    return value === 'true';
  }

  return value || '';
}
