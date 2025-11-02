/**
 * Core types for the filtering system.
 * This module defines the generic types used across all content filtering.
 */

/**
 * Represents a filter value that can be a string, array, or boolean
 */
export type FilterValue = string | string[] | boolean | undefined;

/**
 * Map of filter keys to their values
 */
export type FilterState = Record<string, FilterValue>;

/**
 * A filter predicate function that tests if an item matches criteria
 */
export type FilterPredicate<T> = (item: T, filters: FilterState) => boolean;

/**
 * Configuration for a single filter field with type-safe URL parameter
 * Use createFilterField() helper to get proper type checking
 */
export interface FilterFieldConfig<T> {
  /** Unique identifier for this filter field */
  id: string;

  /**
   * URL parameter name (defaults to id if not specified)
   * MUST match 'id' or be omitted!
   * Use createFilterField() for type-safe config.
   */
  urlParam?: string;

  /** Predicate function to test if an item matches this filter */
  predicate: FilterPredicate<T>;

  /** Whether this filter requires special permissions to use */
  requiresPermission?: (session: any) => boolean;

  /** Function to sanitize filter values based on permissions */
  sanitizeValue?: (value: FilterValue, session: any) => FilterValue;
}

/**
 * Helper to create type-safe filter field config
 * Enforces that urlParam (if provided) matches id
 */
export function createFilterField<T, TId extends string>(
  config: {
    id: TId;
    urlParam?: TId;
    predicate: FilterPredicate<T>;
    requiresPermission?: (session: any) => boolean;
    sanitizeValue?: (value: FilterValue, session: any) => FilterValue;
  }
): FilterFieldConfig<T> {
  return config;
}

/**
 * Configuration for a filter section in the sidebar
 */
export interface FilterSectionConfig<T> {
  /** Unique identifier for this section */
  id: string;

  /** Display title */
  title: string;

  /** Type of UI control */
  type: 'search' | 'checkbox' | 'radio';

  /** Function to generate filter options */
  getOptions?: (items: T[], currentFilters: FilterState) => FilterOption[];

  /** For checkbox/radio sections, static options */
  options?: FilterOption[];
}

/**
 * A filter option that can be selected
 */
export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

/**
 * Complete filter configuration for a content type
 */
export interface FilterConfig<T> {
  /** All filter fields */
  fields: FilterFieldConfig<T>[];

  /** Sidebar section configuration */
  sections: FilterSectionConfig<T>[];

  /** Search fields to check when searching */
  searchFields?: (keyof T)[];

  /** Permission-based item filter (e.g., hide inactive coaches) */
  permissionFilter?: (item: T, session: any) => boolean;
}

/**
 * Result from the filtering hook
 */
export interface UseFilteringResult<T> {
  /** Filtered items */
  filtered: T[];

  /** Current filter state */
  filters: FilterState;

  /** Update a filter value */
  setFilter: (key: string, value: FilterValue) => void;

  /** Clear all filters */
  clearFilters: () => void;

  /** Search query */
  searchQuery: string;

  /** Update search query */
  setSearchQuery: (query: string) => void;

  /** Selected tags */
  selectedTags: string[];

  /** Toggle a tag */
  toggleTag: (tag: string) => void;

  /** Clear all tags */
  clearTags: () => void;

  /** Filter sections for sidebar */
  sections: FilterSectionConfig<T>[];

  /** Get count for a specific filter option */
  getCount: (optionId: string, sectionId: string) => number;
}
