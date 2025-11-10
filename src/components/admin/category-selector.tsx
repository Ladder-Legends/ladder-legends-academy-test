'use client';

import { useEffect } from 'react';
import type { PrimaryCategory, SecondaryCategory } from '@/lib/taxonomy';
import { TAXONOMY, getSecondaryCategories } from '@/lib/taxonomy';

interface CategorySelectorProps {
  primaryCategory?: PrimaryCategory;
  secondaryCategory?: SecondaryCategory;
  onPrimaryCategoryChange: (category: PrimaryCategory | undefined) => void;
  onSecondaryCategoryChange: (category: SecondaryCategory | undefined) => void;
  required?: boolean;
  className?: string;
}

export function CategorySelector({
  primaryCategory,
  secondaryCategory,
  onPrimaryCategoryChange,
  onSecondaryCategoryChange,
  required = false,
  className = '',
}: CategorySelectorProps) {
  // Get available secondary categories based on selected primary
  const secondaryOptions = primaryCategory ? getSecondaryCategories(primaryCategory) : [];

  // Reset secondary category when primary changes if it's no longer valid
  useEffect(() => {
    if (primaryCategory && secondaryCategory) {
      const validSecondaries = getSecondaryCategories(primaryCategory).map(s => s.id);
      if (!validSecondaries.includes(secondaryCategory)) {
        onSecondaryCategoryChange(undefined);
      }
    } else if (!primaryCategory && secondaryCategory) {
      // Clear secondary if no primary is selected
      onSecondaryCategoryChange(undefined);
    }
  }, [primaryCategory, secondaryCategory, onSecondaryCategoryChange]);

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium mb-1">
          Primary Category{required && ' *'}
        </label>
        <select
          value={primaryCategory || ''}
          onChange={(e) => onPrimaryCategoryChange(e.target.value ? e.target.value as PrimaryCategory : undefined)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background"
          required={required}
        >
          <option value="">None</option>
          {TAXONOMY.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Secondary Category
        </label>
        <select
          value={secondaryCategory || ''}
          onChange={(e) => onSecondaryCategoryChange(e.target.value ? e.target.value as SecondaryCategory : undefined)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background"
          disabled={!primaryCategory || secondaryOptions.length === 0}
        >
          <option value="">None</option>
          {secondaryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
        {!primaryCategory && (
          <p className="text-xs text-muted-foreground mt-1">
            Select a primary category first
          </p>
        )}
      </div>
    </div>
  );
}
