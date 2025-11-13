'use client';

import { X } from 'lucide-react';
import type { FilterState } from '@/lib/filtering/types';

interface ActiveFiltersProps {
  filters: FilterState;
  searchQuery?: string;
  selectedTags?: string[];
  onClearFilters?: () => void;
  onRemoveFilter?: (key: string) => void;
  onRemoveFilterValue?: (key: string, value: string) => void; // New: Remove individual value from multi-select
  onClearSearch?: () => void;
  onRemoveTag?: (tag: string) => void;
  filterLabels?: Record<string, string>; // Map filter IDs to human-readable labels
  optionLabels?: Record<string, Record<string, string>>; // Map filter options to labels
}

export function ActiveFilters({
  filters,
  searchQuery,
  selectedTags,
  onClearFilters,
  onRemoveFilter,
  onRemoveFilterValue,
  onClearSearch,
  onRemoveTag,
  filterLabels = {},
  optionLabels = {},
}: ActiveFiltersProps) {
  // Check if there are any active filters
  const hasFilters = Object.keys(filters).some(key => {
    const value = filters[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return value !== undefined && value !== '';
  });

  const hasSearch = searchQuery && searchQuery.trim().length > 0;
  const hasTags = selectedTags && selectedTags.length > 0;

  if (!hasFilters && !hasSearch && !hasTags) {
    return null;
  }

  // Build active filter display
  const filterGroups: { label: string; items: string[]; key: string }[] = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return;

    const label = filterLabels[key] || key;
    let items: string[] = [];

    if (Array.isArray(value)) {
      if (value.length === 0) return;
      items = value.map(v => optionLabels[key]?.[v] || v);
    } else if (typeof value === 'boolean') {
      if (!value) return;
      items = ['Yes'];
    } else {
      items = [String(value)];
    }

    if (items.length > 0) {
      filterGroups.push({ label, items, key });
    }
  });

  return (
    <div className="border-b border-border pb-4 mb-6">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold">Active Filters:</h3>
          {/* Clear all button with muted colors and X on right */}
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded-md text-xs font-medium transition-colors"
              aria-label="Clear all filters"
            >
              Clear All
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search query */}
          {hasSearch && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md text-sm">
              <span className="font-medium">Search:</span>
              <span className="text-muted-foreground">&ldquo;{searchQuery}&rdquo;</span>
              {onClearSearch && (
                <button
                  onClick={onClearSearch}
                  className="ml-1 hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Filter groups - show individual pills for OR values */}
          {filterGroups.map((group, groupIdx) => {
            const filterValue = filters[group.key];
            const rawValues = Array.isArray(filterValue) ? filterValue : [String(filterValue)];

            return (
              <div key={group.key} className="inline-flex items-center gap-2 flex-wrap">
                {groupIdx > 0 && hasSearch && <span className="text-muted-foreground text-sm">AND</span>}

                {/* Label for the filter type */}
                <span className="text-sm font-medium text-foreground">{group.label}:</span>

                {/* Individual pills for each value (OR) */}
                {group.items.map((item, itemIdx) => {
                  const rawValue = rawValues[itemIdx];
                  return (
                    <div key={`${group.key}-${rawValue}`} className="inline-flex items-center gap-2">
                      {itemIdx > 0 && <span className="text-muted-foreground text-xs">OR</span>}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm">
                        <span>{item}</span>
                        {onRemoveFilterValue && rawValues.length > 1 ? (
                          <button
                            onClick={() => onRemoveFilterValue(group.key, rawValue)}
                            className="hover:text-destructive/80 transition-colors"
                            aria-label={`Remove ${item}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        ) : onRemoveFilter ? (
                          <button
                            onClick={() => onRemoveFilter(group.key)}
                            className="hover:text-destructive/80 transition-colors"
                            aria-label={`Remove ${group.label} filter`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Tags */}
          {hasTags && selectedTags!.map((tag, idx) => (
            <div key={tag} className="inline-flex items-center gap-2">
              {(idx > 0 || hasSearch || filterGroups.length > 0) && (
                <span className="text-muted-foreground text-sm">AND</span>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-md text-sm">
                <span className="font-medium">Tag:</span>
                <span className="text-muted-foreground">{tag}</span>
                {onRemoveTag && (
                  <button
                    onClick={() => onRemoveTag(tag)}
                    className="ml-1 hover:text-foreground transition-colors"
                    aria-label={`Remove ${tag} tag`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
