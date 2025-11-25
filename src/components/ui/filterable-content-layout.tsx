'use client';

import { ReactNode, cloneElement, isValidElement, useState, useEffect } from 'react';
import { ViewToggle } from './view-toggle';
import { HorizontalScrollContainer } from './horizontal-scroll-container';
import { MobileFilterButton } from '../shared/filter-sidebar';
import { ActiveFilters } from '../shared/active-filters';
import { useViewPreference } from '@/hooks/use-view-preference';
import { posthog } from '@/lib/posthog';
import type { FilterState } from '@/lib/filtering/types';

interface FilterableContentLayoutProps {
  // Header content
  title: string;
  description?: string;

  // Filter sidebar
  filterContent: ReactNode;

  // Main content
  tableContent: ReactNode;
  gridContent: ReactNode;

  // View settings
  pageKey?: string; // Unique key for localStorage (e.g., 'videos', 'replays')
  defaultView?: 'grid' | 'table';
  showViewToggle?: boolean;
  gridLabel?: string;
  tableLabel?: string;
  gridIcon?: 'grid' | 'chart';
  tableIcon?: 'table' | 'list';

  // Additional header actions (e.g., "Show Past Events")
  headerActions?: ReactNode;

  // Active filters display
  filters?: FilterState;
  searchQuery?: string;
  selectedTags?: string[];
  onClearFilters?: () => void;
  onRemoveFilter?: (key: string) => void;
  onRemoveFilterValue?: (key: string, value: string) => void;
  onClearSearch?: () => void;
  onRemoveTag?: (tag: string) => void;
  filterLabels?: Record<string, string>;
  optionLabels?: Record<string, Record<string, string>>;
}

export function FilterableContentLayout({
  title,
  description,
  filterContent,
  tableContent,
  gridContent,
  pageKey,
  defaultView = 'table',
  showViewToggle = true,
  gridLabel,
  tableLabel,
  gridIcon,
  tableIcon,
  headerActions,
  filters,
  searchQuery,
  selectedTags,
  onClearFilters,
  onRemoveFilter,
  onRemoveFilterValue,
  onClearSearch,
  onRemoveTag,
  filterLabels,
  optionLabels,
}: FilterableContentLayoutProps) {
  // Use persisted view preference if pageKey is provided, otherwise use local state
  const [persistedView, setPersistedView] = useViewPreference(pageKey || 'default', defaultView);
  const [localView, setLocalView] = useState<'grid' | 'table'>(defaultView);

  const view = pageKey ? persistedView : localView;
  const setView = pageKey ? setPersistedView : setLocalView;

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Track filter changes in PostHog
  useEffect(() => {
    if (!filters || Object.keys(filters).length === 0) return;

    // Count active filters
    const activeFilterCount = Object.entries(filters).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return value;
      return value !== undefined && value !== '';
    }).length;

    if (activeFilterCount > 0) {
      posthog.capture('filters_applied', {
        page: pageKey || title,
        filter_count: activeFilterCount,
        filters: filters,
        has_search: Boolean(searchQuery && searchQuery.length > 0),
        has_tags: Boolean(selectedTags && selectedTags.length > 0),
      });
    }
  }, [filters, searchQuery, selectedTags, pageKey, title]);

  // Track view toggle changes
  const handleViewChange = (newView: 'grid' | 'table') => {
    posthog.capture('view_toggled', {
      page: pageKey || title,
      view: newView,
    });
    setView(newView);
  };

  // Clone filterContent and inject mobile props if it's a valid React element
  const enhancedFilterContent = isValidElement(filterContent)
    ? cloneElement(filterContent as React.ReactElement<{ isMobileOpen?: boolean; onMobileOpenChange?: (isOpen: boolean) => void }>, {
        isMobileOpen: isMobileFilterOpen,
        onMobileOpenChange: setIsMobileFilterOpen,
      })
    : filterContent;

  return (
    <div className="flex flex-1">
      {/* Filter Sidebar - uses the passed filterContent which should be a FilterSidebar component */}
      {enhancedFilterContent}

      <main className="flex-1 px-4 lg:px-8 py-12 overflow-y-auto pattern-circuit-content">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h2 className="text-3xl font-bold">{title}</h2>
                {description && (
                  <p className="text-muted-foreground">{description}</p>
                )}
              </div>

              {/* Header Actions and View Toggle */}
              <div className="flex items-center justify-between lg:justify-end gap-3">
                {headerActions}
                {showViewToggle && (
                  <ViewToggle
                    view={view}
                    onViewChange={handleViewChange}
                    gridLabel={gridLabel}
                    tableLabel={tableLabel}
                    gridIcon={gridIcon}
                    tableIcon={tableIcon}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden">
            <MobileFilterButton
              onClick={() => setIsMobileFilterOpen(true)}
              label="Filters & Search"
            />
          </div>

          {/* Active Filters */}
          <ActiveFilters
            filters={filters || {}}
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            onClearFilters={onClearFilters}
            onRemoveFilter={onRemoveFilter}
            onRemoveFilterValue={onRemoveFilterValue}
            onClearSearch={onClearSearch}
            onRemoveTag={onRemoveTag}
            filterLabels={filterLabels}
            optionLabels={optionLabels}
          />

          {/* Content Area */}
          {view === 'table' ? (
            <HorizontalScrollContainer showFadeIndicator>
              {tableContent}
            </HorizontalScrollContainer>
          ) : (
            gridContent
          )}
        </div>
      </main>
      <div className="mb-12" />
    </div>
  );
}
