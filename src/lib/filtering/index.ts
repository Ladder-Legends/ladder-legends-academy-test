/**
 * Central export for the filtering system.
 * Import from this file to access all filtering utilities.
 */

// Core types
export type {
  FilterValue,
  FilterState,
  FilterPredicate,
  FilterFieldConfig,
  FilterSectionConfig,
  FilterOption,
  FilterConfig,
  UseFilteringResult,
} from './types';

// Filter engine functions
export {
  applyFilters,
  countWithFilter,
  createTagPredicate,
  createFieldMatchPredicate,
  createBooleanPredicate,
  sanitizeFilters,
  validateFilterConfig,
} from './filter-engine';

// URL state management
export {
  parseUrlParams,
  filtersToUrlParams,
  useSyncFiltersToUrl,
  useInitialFiltersFromUrl,
} from './url-state';

// Main hook
export { useContentFiltering } from './hooks/use-content-filtering';

// Filter configurations
export { videoFilterConfig } from './configs/video-filters';
export { buildOrderFilterConfig } from './configs/build-order-filters';
export { replayFilterConfig } from './configs/replay-filters';
export { masterclassFilterConfig } from './configs/masterclass-filters';
