'use client';

import { ReactNode, useState, cloneElement, isValidElement } from 'react';
import { X } from 'lucide-react';
import { ViewToggle } from './view-toggle';
import { HorizontalScrollContainer } from './horizontal-scroll-container';
import { MobileFilterButton } from '../shared/filter-sidebar';

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

  // Result count
  resultCount?: string;

  // Tag filtering (optional)
  tags?: string[];
  selectedTags?: string[];
  onTagToggle?: (tag: string) => void;
  onClearTags?: () => void;
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
  resultCount,
  tags,
  selectedTags,
  onTagToggle,
  onClearTags,
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

          {/* View Toggle + Result Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {resultCount && (
                <p className="text-sm text-muted-foreground">{resultCount}</p>
              )}
            </div>
            {showViewToggle && (
              <ViewToggle view={view} onViewChange={setView} />
            )}
          </div>

          {/* Tag Filters */}
          {tags && tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filter by Tags</h3>
                {selectedTags && selectedTags.length > 0 && onClearTags && (
                  <button
                    onClick={onClearTags}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear tags
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => onTagToggle?.(tag)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedTags?.includes(tag)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {tag}
                    {selectedTags?.includes(tag) && (
                      <X className="inline-block ml-1 h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

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
    </div>
  );
}
