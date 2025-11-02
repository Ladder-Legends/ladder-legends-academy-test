/**
 * Generic filtering engine that applies filters to any content type.
 * This is the core of the filtering system - completely reusable and testable.
 */

import type { Session } from 'next-auth';
import type { FilterState, FilterPredicate, FilterFieldConfig } from './types';

/**
 * Validate filter configuration for common mistakes
 * Throws in development to catch issues early
 */
export function validateFilterConfig<T>(fields: FilterFieldConfig<T>[]): void {
  if (process.env.NODE_ENV === 'development') {
    const urlParams = new Set<string>();

    fields.forEach(field => {
      const urlParam = field.urlParam || field.id;

      // Warn if urlParam doesn't match id (common source of bugs)
      if (field.urlParam && field.urlParam !== field.id) {
        console.warn(
          `[Filter Config] Field '${field.id}' has urlParam '${field.urlParam}' which differs from id. ` +
          `This can cause URL sync issues. Consider using urlParam='${field.id}' or omitting urlParam entirely.`
        );
      }

      // Check for duplicate URL params
      if (urlParams.has(urlParam)) {
        console.error(
          `[Filter Config] Duplicate URL parameter '${urlParam}' detected! ` +
          `This will cause filters to conflict.`
        );
      }
      urlParams.add(urlParam);
    });
  }
}

/**
 * Apply all filters to a list of items
 */
export function applyFilters<T>(
  items: T[],
  filters: FilterState,
  fieldConfigs: FilterFieldConfig<T>[],
  searchQuery?: string,
  searchFields?: (keyof T)[],
  selectedTags?: string[]
): T[] {
  return items.filter(item => {
    // Apply search filter
    if (searchQuery && searchQuery.trim() && searchFields) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (Array.isArray(value)) {
          return value.some(v =>
            typeof v === 'string' && v.toLowerCase().includes(query)
          );
        }
        return false;
      });
      if (!matchesSearch) return false;
    }

    // Apply tag filter (AND logic - must have ALL selected tags)
    if (selectedTags && selectedTags.length > 0) {
      const itemTags = (item as Record<string, unknown>).tags;
      if (!itemTags || !Array.isArray(itemTags)) return false;
      if (!selectedTags.every(tag => itemTags.includes(tag))) return false;
    }

    // Apply each field filter
    for (const fieldConfig of fieldConfigs) {
      const filterValue = filters[fieldConfig.id];

      // Skip if no value selected for this filter
      if (filterValue === undefined || filterValue === '' || filterValue === false) {
        continue;
      }

      // Skip empty arrays
      if (Array.isArray(filterValue) && filterValue.length === 0) {
        continue;
      }

      // Apply the predicate
      if (!fieldConfig.predicate(item, filters)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Count items that match a specific filter option
 * Excludes the current section from filtering to show available counts
 */
export function countWithFilter<T>(
  items: T[],
  testPredicate: FilterPredicate<T>,
  currentFilters: FilterState,
  excludeSectionId: string,
  fieldConfigs: FilterFieldConfig<T>[],
  searchQuery?: string,
  searchFields?: (keyof T)[],
  selectedTags?: string[]
): number {
  return items.filter(item => {
    // Must match the test predicate
    if (!testPredicate(item, currentFilters)) return false;

    // Apply search filter
    if (searchQuery && searchQuery.trim() && searchFields) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (Array.isArray(value)) {
          return value.some(v =>
            typeof v === 'string' && v.toLowerCase().includes(query)
          );
        }
        return false;
      });
      if (!matchesSearch) return false;
    }

    // Apply tag filter
    if (selectedTags && selectedTags.length > 0) {
      const itemTags = (item as Record<string, unknown>).tags;
      if (!itemTags || !Array.isArray(itemTags)) return false;
      if (!selectedTags.every(tag => itemTags.includes(tag))) return false;
    }

    // Apply other field filters (excluding the section being counted)
    for (const fieldConfig of fieldConfigs) {
      // Skip the field we're counting
      if (fieldConfig.id === excludeSectionId) continue;

      const filterValue = currentFilters[fieldConfig.id];

      // Skip if no value
      if (filterValue === undefined || filterValue === '' || filterValue === false) {
        continue;
      }

      if (Array.isArray(filterValue) && filterValue.length === 0) {
        continue;
      }

      // Apply predicate
      if (!fieldConfig.predicate(item, currentFilters)) {
        return false;
      }
    }

    return true;
  }).length;
}

/**
 * Create a predicate that tests if an item has any of the specified tag values
 * (OR logic)
 */
export function createTagPredicate<T>(
  tagField: keyof T,
  filterKey: string
): FilterPredicate<T> {
  return (item, filters) => {
    const filterValue = filters[filterKey];
    if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
      return true;
    }

    const itemTags = item[tagField];
    if (!Array.isArray(itemTags)) return false;

    const selectedTags = Array.isArray(filterValue) ? filterValue : [filterValue];
    return selectedTags.some(tag =>
      itemTags.some((itemTag: unknown) =>
        String(itemTag).toLowerCase() === String(tag).toLowerCase()
      )
    );
  };
}

/**
 * Create a predicate that tests if an item's field matches any of the specified values
 * (OR logic)
 */
export function createFieldMatchPredicate<T>(
  field: keyof T,
  filterKey: string
): FilterPredicate<T> {
  return (item, filters) => {
    const filterValue = filters[filterKey];
    if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
      return true;
    }

    const itemValue = item[field];
    const selectedValues = Array.isArray(filterValue) ? filterValue : [filterValue];

    return selectedValues.some(value =>
      String(itemValue).toLowerCase() === String(value).toLowerCase()
    );
  };
}

/**
 * Create a predicate for boolean filters (e.g., free vs premium)
 */
export function createBooleanPredicate<T>(
  field: keyof T,
  filterKey: string,
  trueValue: string,
  falseValue: string
): FilterPredicate<T> {
  return (item, filters) => {
    const filterValue = filters[filterKey];
    if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
      return true;
    }

    const selectedValues = Array.isArray(filterValue) ? filterValue : [filterValue];
    const itemValue = Boolean(item[field]);

    return selectedValues.some(value => {
      if (value === trueValue) return itemValue === true;
      if (value === falseValue) return itemValue === false;
      return false;
    });
  };
}

/**
 * Sanitize filter values based on permissions
 * Removes values that the user doesn't have permission to see
 */
export function sanitizeFilters<T>(
  filters: FilterState,
  fieldConfigs: FilterFieldConfig<T>[],
  session: Session | null
): FilterState {
  const sanitized: FilterState = {};

  for (const [key, value] of Object.entries(filters)) {
    const config = fieldConfigs.find(f => f.id === key);

    if (config?.sanitizeValue) {
      sanitized[key] = config.sanitizeValue(value, session);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
