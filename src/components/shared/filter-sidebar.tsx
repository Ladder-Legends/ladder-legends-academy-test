'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, X, SlidersHorizontal } from 'lucide-react';

export interface FilterSection {
  id: string;
  label?: string;  // legacy field
  title?: string;  // new field
  type?: 'search' | 'checkbox' | 'radio';  // new field for filter type
  icon?: string;
  items: FilterItem[];
}

export interface FilterItem {
  id: string;
  label: string;
  count?: number;
  children?: FilterItem[];
}

interface FilterSidebarProps {
  // Search
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;

  // Custom content injection
  customSectionAfterSearch?: React.ReactNode;

  // Sections
  sections: FilterSection[];

  // Selection state
  selectedItems: Record<string, string[]>;  // sectionId -> selected item IDs
  onItemToggle?: (sectionId: string, itemId: string) => void;  // legacy callback
  onSelectionChange?: (selectedItems: Record<string, string[]>) => void;  // new callback
  onClearAll?: () => void;  // new callback for clearing all filters

  // Mobile button customization
  isMobileOpen?: boolean;
  onMobileOpenChange?: (isOpen: boolean) => void;
}

export function FilterSidebar({
  searchEnabled = false,
  searchPlaceholder = 'Search...',
  searchQuery = '',
  onSearchChange,
  customSectionAfterSearch,
  sections,
  selectedItems,
  onItemToggle,
  onSelectionChange,
  isMobileOpen: controlledMobileOpen,
  onMobileOpenChange,
}: FilterSidebarProps) {
  // Mobile sidebar state - use controlled state if provided, otherwise internal state
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;

  const handleMobileOpenChange = (isOpen: boolean) => {
    if (controlledMobileOpen === undefined) {
      setInternalMobileOpen(isOpen);
    }
    onMobileOpenChange?.(isOpen);
  };

  // Handle item toggle - support both legacy and new APIs
  const handleItemToggle = (sectionId: string, itemId: string) => {
    if (onItemToggle) {
      // Legacy API
      onItemToggle(sectionId, itemId);
    } else if (onSelectionChange) {
      // New API - toggle the item in the current selection
      const currentSectionItems = selectedItems[sectionId] || [];
      const newSectionItems = currentSectionItems.includes(itemId)
        ? currentSectionItems.filter(id => id !== itemId)
        : [...currentSectionItems, itemId];

      onSelectionChange({
        ...selectedItems,
        [sectionId]: newSectionItems,
      });
    }
  };

  // All sections expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  );

  // Items with children collapsed by default
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set<string>());

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const renderItem = (sectionId: string, item: FilterItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedItems[sectionId]?.includes(item.id) || false;

    return (
      <div key={item.id}>
        <div className="flex items-center gap-1">
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleItemExpansion(item.id)}
              className="p-1 hover:bg-primary rounded transition-colors flex-shrink-0 group"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Selection Button */}
          <button
            onClick={() => handleItemToggle(sectionId, item.id)}
            className={`flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
              isSelected
                ? 'bg-primary text-primary-foreground font-medium'
                : 'hover:bg-muted text-muted-foreground'
            }`}
            style={{ paddingLeft: depth > 0 ? `${depth * 12}px` : undefined }}
          >
            <span className="flex items-center justify-between">
              <span className="capitalize">{item.label}</span>
              {item.count !== undefined && (
                <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {item.count}
                </span>
              )}
            </span>
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1 ml-1">
            {item.children!.map(child => (
              <div key={`${sectionId}-${child.id}`}>
                {renderItem(sectionId, child, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => handleMobileOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 border-r border-border bg-card p-4 space-y-6 overflow-y-auto shadow-xl
        lg:relative lg:translate-x-0 lg:shadow-none lg:z-0
        fixed top-0 left-0 bottom-0 z-50 transition-transform duration-200
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Content wrapper */}
        <div>
          {/* Header with Close Button - only on mobile */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Filters</h2>
            <button
              onClick={() => handleMobileOpenChange(false)}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
      {searchEnabled && (
        <div className="relative mb-4 pb-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-10 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange?.('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Custom Section After Search */}
      {customSectionAfterSearch && customSectionAfterSearch}

      {/* Sections */}
      {sections.map((section, sectionIndex) => {
        // Skip search section - it's handled separately above
        if (section.type === 'search') return null;

        const isSectionExpanded = expandedSections.has(section.id);
        const sectionLabel = section.title || section.label || section.id;

        return (
          <div key={section.id}>
            {/* Section Container with spacing and separator */}
            <div className={sectionIndex > 0 ? 'pt-6 mt-6 border-t border-border/50' : ''}>
              <div className="flex items-center gap-1 mb-3">
                {/* Section Expand/Collapse Button */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="p-1 hover:bg-primary rounded transition-colors flex-shrink-0 group"
                  aria-label={isSectionExpanded ? 'Collapse section' : 'Expand section'}
                >
                  {isSectionExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                  )}
                </button>

                {/* Section Label */}
                <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-foreground">
                  {section.icon && <span>{section.icon}</span>}
                  {sectionLabel}
                </div>
              </div>
              {isSectionExpanded && (
                <div className="space-y-1">
                  {section.items.map(item => (
                    <div key={`${section.id}-${item.id}`}>
                      {renderItem(section.id, item)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
        </div>
      </aside>
    </>
  );
}

// Separate component for the mobile filter trigger button
interface MobileFilterButtonProps {
  onClick: () => void;
  label?: string;
}

export function MobileFilterButton({ onClick, label = 'Filters' }: MobileFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium text-sm shadow-sm"
      aria-label="Open filters"
    >
      <SlidersHorizontal className="w-4 h-4" />
      {label}
    </button>
  );
}
