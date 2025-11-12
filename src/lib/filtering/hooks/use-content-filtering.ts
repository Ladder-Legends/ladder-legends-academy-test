/**
 * Main filtering hook that provides complete filtering functionality.
 * This hook is generic and works with any content type.
 */

import { useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { FilterConfig, FilterState, FilterValue, UseFilteringResult, FilterOption } from '../types';
import { applyFilters, countWithFilter } from '../filter-engine';
import { useInitialFiltersFromUrl, useSyncFiltersToUrl } from '../url-state';

export function useContentFiltering<T>(
  items: T[],
  config: FilterConfig<T>
): UseFilteringResult<T> {
  const { data: session } = useSession();

  // Get initial state from URL - only on mount
  const { initialFilters, initialSearch, initialTags } = useInitialFiltersFromUrl(
    config.fields,
    session
  );

  // State - this is the single source of truth
  const [filters, setFiltersState] = useState<FilterState>(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  // Sync to URL whenever state changes - one direction only
  useSyncFiltersToUrl(filters, searchQuery, selectedTags);

  // Filter items based on permissions first
  const permissionFiltered = useMemo(() => {
    if (!config.permissionFilter) return items;
    return items.filter(item => config.permissionFilter!(item, session));
  }, [items, config.permissionFilter, session]);

  // Apply all filters
  const filtered = useMemo(() => {
    return applyFilters(
      permissionFiltered,
      filters,
      config.fields,
      searchQuery,
      config.searchFields,
      selectedTags
    );
  }, [permissionFiltered, filters, config.fields, searchQuery, config.searchFields, selectedTags]);

  // Update a single filter
  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
    setSearchQuery('');
    setSelectedTags([]);
  }, []);

  // Toggle a tag
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  // Clear tags
  const clearTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  // Get count for a specific filter option
  const getCount = useCallback((optionId: string, sectionId: string) => {
    // Find the field config for this section
    const fieldConfig = config.fields.find(f => f.id === sectionId);
    if (!fieldConfig) return 0;

    // Create a test predicate for this specific option
    const testPredicate = (item: T) => {
      const tempFilters = { ...filters, [sectionId]: [optionId] };
      return fieldConfig.predicate(item, tempFilters);
    };

    return countWithFilter(
      permissionFiltered,
      testPredicate,
      filters,
      sectionId,
      config.fields,
      searchQuery,
      config.searchFields,
      selectedTags
    );
  }, [permissionFiltered, filters, config.fields, searchQuery, config.searchFields, selectedTags]);

  // Helper to add counts to options recursively (handles nested children)
  const addCountsToOptions = useCallback((options: FilterOption[], sectionId: string): FilterOption[] => {
    return options.map(opt => {
      let count: number;
      let children: FilterOption[] | undefined;

      // Recursively add counts to children if they exist
      if (opt.children && opt.children.length > 0) {
        children = addCountsToOptions(opt.children, sectionId);
        // For parent items with children, sum up the children's counts
        count = children.reduce((sum, child) => sum + (child.count || 0), 0);
      } else {
        // For leaf items, calculate the count normally
        count = getCount(opt.id, sectionId);
      }

      return {
        ...opt,
        count,
        children,
      };
    });
  }, [getCount]);

  // Build sections with counts - convert to FilterSection format
  const sections = useMemo(() => {
    return config.sections.map(section => {
      if (section.type === 'search') {
        return {
          id: section.id,
          title: section.title,
          type: section.type,
          items: [],
        };
      }

      // Generate options with counts
      let options: FilterOption[] = [];

      if (section.getOptions) {
        // Get options from dynamic function
        const dynamicOptions = section.getOptions(permissionFiltered, filters);
        // Add counts to each option (and their children recursively)
        options = addCountsToOptions(dynamicOptions, section.id);
      } else if (section.options) {
        // Add counts to each option (and their children recursively)
        options = addCountsToOptions(section.options, section.id);
      }

      return {
        id: section.id,
        title: section.title,
        type: section.type,
        items: options,
      };
    });
  }, [config.sections, permissionFiltered, filters, addCountsToOptions]);

  return {
    filtered,
    filters,
    setFilter,
    clearFilters,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    clearTags,
    sections,
    getCount,
  };
}
