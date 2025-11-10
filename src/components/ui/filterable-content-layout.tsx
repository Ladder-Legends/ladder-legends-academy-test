'use client';

import { ReactNode, useState, cloneElement, isValidElement } from 'react';
import { ViewToggle } from './view-toggle';
import { HorizontalScrollContainer } from './horizontal-scroll-container';
import { MobileFilterButton } from '../shared/filter-sidebar';
import { ActiveFilters } from '../shared/active-filters';
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
  defaultView?: 'grid' | 'table';
  showViewToggle?: boolean;

  // Additional header actions (e.g., "Show Past Events")
  headerActions?: ReactNode;

  // Active filters display
  filters?: FilterState;
  searchQuery?: string;
  selectedTags?: string[];
  onClearFilters?: () => void;
  onRemoveFilter?: (key: string) => void;
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
  defaultView = 'table',
  showViewToggle = true,
  headerActions,
  filters,
  searchQuery,
  selectedTags,
  onClearFilters,
  onRemoveFilter,
  onClearSearch,
  onRemoveTag,
  filterLabels,
  optionLabels,
}: FilterableContentLayoutProps) {
  const [view, setView] = useState<'grid' | 'table'>(defaultView);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

      <main className="flex-1 px-4 lg:px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          {/* Mobile Filter Button */}
          <MobileFilterButton
            onClick={() => setIsMobileFilterOpen(true)}
            label="Filters & Search"
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">{title}</h2>
              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}
            </div>
            {headerActions}
          </div>

          {/* View Toggle */}
          {showViewToggle && (
            <div className="flex items-center justify-end">
              <ViewToggle view={view} onViewChange={setView} />
            </div>
          )}

          {/* Active Filters */}
          <ActiveFilters
            filters={filters || {}}
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            onClearFilters={onClearFilters}
            onRemoveFilter={onRemoveFilter}
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
