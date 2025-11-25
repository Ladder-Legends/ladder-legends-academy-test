'use client';

import { useState, useMemo, useCallback } from 'react';

export interface AutocompleteOption<T = unknown> {
  id: string;
  label: string;
  sublabel?: string;
  data: T;
}

export interface UseAutocompleteSearchOptions<T> {
  /** All available options to search through */
  options: T[];
  /** Extract the searchable text from an option */
  getSearchText: (option: T) => string;
  /** Extract secondary searchable text (optional) */
  getSecondarySearchText?: (option: T) => string;
  /** Convert an option to the AutocompleteOption format */
  toOption: (option: T) => AutocompleteOption<T>;
  /** Maximum number of results to show */
  maxResults?: number;
  /** Initial search text */
  initialSearch?: string;
}

export interface UseAutocompleteSearchReturn<T> {
  /** Current search text */
  search: string;
  /** Set the search text */
  setSearch: (value: string) => void;
  /** Whether dropdown should be shown */
  showDropdown: boolean;
  /** Set dropdown visibility */
  setShowDropdown: (value: boolean) => void;
  /** Filtered options based on search */
  filteredOptions: AutocompleteOption<T>[];
  /** Handle input focus */
  handleFocus: () => void;
  /** Handle input blur (with delay for click handling) */
  handleBlur: () => void;
  /** Handle selection of an option */
  handleSelect: (option: AutocompleteOption<T>, callback?: (option: AutocompleteOption<T>) => void) => void;
  /** Clear the search and selection */
  clear: () => void;
}

/**
 * Generic hook for autocomplete search functionality
 *
 * Used for coach dropdowns, tag autocomplete, replay search, etc.
 *
 * @example
 * ```tsx
 * const coachSearch = useAutocompleteSearch({
 *   options: coaches,
 *   getSearchText: (c) => c.displayName,
 *   getSecondarySearchText: (c) => c.name,
 *   toOption: (c) => ({
 *     id: c.id,
 *     label: c.displayName,
 *     sublabel: `${c.name} • ${c.race}`,
 *     data: c,
 *   }),
 * });
 * ```
 */
export function useAutocompleteSearch<T>({
  options,
  getSearchText,
  getSecondarySearchText,
  toOption,
  maxResults = 10,
  initialSearch = '',
}: UseAutocompleteSearchOptions<T>): UseAutocompleteSearchReturn<T> {
  const [search, setSearch] = useState(initialSearch);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredOptions = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    if (!searchLower) {
      // Show first N options when no search
      return options.slice(0, maxResults).map(toOption);
    }

    return options
      .filter(option => {
        const primary = getSearchText(option).toLowerCase();
        const secondary = getSecondarySearchText?.(option)?.toLowerCase() ?? '';
        return primary.includes(searchLower) || secondary.includes(searchLower);
      })
      .slice(0, maxResults)
      .map(toOption);
  }, [options, search, getSearchText, getSecondarySearchText, toOption, maxResults]);

  const handleFocus = useCallback(() => {
    setShowDropdown(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow click events on dropdown items
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  const handleSelect = useCallback((
    option: AutocompleteOption<T>,
    callback?: (option: AutocompleteOption<T>) => void
  ) => {
    setSearch(option.label);
    setShowDropdown(false);
    callback?.(option);
  }, []);

  const clear = useCallback(() => {
    setSearch('');
    setShowDropdown(false);
  }, []);

  return {
    search,
    setSearch,
    showDropdown,
    setShowDropdown,
    filteredOptions,
    handleFocus,
    handleBlur,
    handleSelect,
    clear,
  };
}
