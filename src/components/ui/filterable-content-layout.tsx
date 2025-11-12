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
                  <ViewToggle view={view} onViewChange={setView} />
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
