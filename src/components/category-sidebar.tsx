'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface Category {
  id: string;
  label: string;
  count?: number;
  children?: Category[];
}

interface CategorySidebarProps {
  title: string;
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategorySidebar({
  title,
  categories,
  selectedCategory,
  onSelectCategory
}: CategorySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  );

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const renderCategory = (category: Category, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategory === category.id;

    return (
      <div key={category.id}>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
          }`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          <button
            onClick={() => onSelectCategory(category.id)}
            className="flex-1 text-left text-sm font-medium"
          >
            {category.label}
            {category.count !== undefined && (
              <span className="ml-2 text-xs opacity-70">({category.count})</span>
            )}
          </button>
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(category.id);
              }}
              className="p-1 hover:bg-accent/50 rounded"
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children!.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 border-r border-border pr-6">
      <div className="sticky top-20">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <button
            onClick={() => onSelectCategory(null)}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              selectedCategory === null
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            All {title}
          </button>
        </div>

        <div className="space-y-1">
          {categories.map(category => renderCategory(category))}
        </div>
      </div>
    </div>
  );
}
