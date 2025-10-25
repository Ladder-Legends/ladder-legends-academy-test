'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, X, SlidersHorizontal } from 'lucide-react';

export interface FilterSection {
  id: string;
  label: string;
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

  // Sections
  sections: FilterSection[];

  // Selection state
  selectedItems: Record<string, string[]>;  // sectionId -> selected item IDs
  onItemToggle: (sectionId: string, itemId: string) => void;

  // Mobile button customization
  mobileButtonLabel?: string;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (isOpen: boolean) => void;
}

export function FilterSidebar({
  searchEnabled = false,
  searchPlaceholder = 'Search...',
  searchQuery = '',
  onSearchChange,
  sections,
  selectedItems,
  onItemToggle,
  mobileButtonLabel: _mobileButtonLabel = 'Filters',
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

  // All sections expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  );

  // All items with children expanded by default
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    sections.forEach(section => {
      section.items.forEach(item => {
        if (item.children && item.children.length > 0) {
          initialExpanded.add(item.id);
        }
      });
    });
    return initialExpanded;
  });

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
        <button
          onClick={() => onItemToggle(sectionId, item.id)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
            isSelected
              ? 'bg-primary text-primary-foreground font-medium'
              : 'hover:bg-muted text-muted-foreground'
          }`}
          style={{ paddingLeft: depth > 0 ? `${depth * 12 + 12}px` : undefined }}
        >
          <span className="flex items-center justify-between">
            <span className="flex items-center gap-2 capitalize">
              {item.label}
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItemExpansion(item.id);
                  }}
                  className="p-0.5 hover:bg-accent/50 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
            </span>
            {item.count !== undefined && (
              <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {item.count}
              </span>
            )}
          </span>
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderItem(sectionId, child, depth + 1))}
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
        {/* Mobile Close Button */}
        <button
          onClick={() => handleMobileOpenChange(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-muted rounded-md transition-colors"
          aria-label="Close filters"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Search Input */}
      {searchEnabled && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Sections */}
      {sections.map(section => {
        const isSectionExpanded = expandedSections.has(section.id);

        return (
          <div key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="flex items-center justify-between w-full mb-3 font-semibold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {section.icon && <span>{section.icon}</span>}
                {section.label}
              </span>
              {isSectionExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isSectionExpanded && (
              <div className="space-y-1">
                {section.items.map(item => renderItem(section.id, item))}
              </div>
            )}
          </div>
        );
      })}
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
      className="lg:hidden w-full px-4 py-2.5 bg-card border border-border rounded-md hover:bg-muted transition-colors flex items-center justify-center gap-2 font-medium text-sm shadow-sm"
      aria-label="Open filters"
    >
      <SlidersHorizontal className="w-4 h-4" />
      {label}
    </button>
  );
}
