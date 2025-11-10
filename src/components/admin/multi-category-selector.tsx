'use client';

import { useState, useEffect } from 'react';
import { TAXONOMY, getSecondaryCategories, parseCategoryString, PrimaryCategory } from '@/lib/taxonomy';
import { X, Plus } from 'lucide-react';

interface MultiCategorySelectorProps {
  categories?: string[];
  onChange: (categories: string[]) => void;
  className?: string;
}

interface CategoryRow {
  id: string; // Unique ID for the row (for React keys)
  primary: string;
  secondary: string;
}

export function MultiCategorySelector({
  categories = [],
  onChange,
  className = '',
}: MultiCategorySelectorProps) {
  // Convert categories array to rows for editing
  const [rows, setRows] = useState<CategoryRow[]>([]);

  // Initialize rows from categories prop
  useEffect(() => {
    if (categories.length === 0) {
      setRows([{ id: crypto.randomUUID(), primary: '', secondary: '' }]);
    } else {
      setRows(
        categories.map((cat) => {
          const parsed = parseCategoryString(cat);
          return {
            id: crypto.randomUUID(),
            primary: parsed?.primary || '',
            secondary: parsed?.secondary || '',
          };
        })
      );
    }
  }, [categories]);

  // Convert rows back to categories array
  const rowsToCategories = (rows: CategoryRow[]): string[] => {
    return rows
      .filter((row) => row.primary) // Only include rows with a primary category
      .map((row) => {
        if (row.secondary) {
          return `${row.primary}.${row.secondary}`;
        }
        return row.primary;
      });
  };

  const handleRowChange = (rowId: string, field: 'primary' | 'secondary', value: string) => {
    const newRows = rows.map((row) => {
      if (row.id === rowId) {
        if (field === 'primary') {
          // If primary changes, reset secondary
          return { ...row, primary: value, secondary: '' };
        } else {
          return { ...row, [field]: value };
        }
      }
      return row;
    });
    setRows(newRows);
    onChange(rowsToCategories(newRows));
  };

  const handleAddRow = () => {
    const newRows = [...rows, { id: crypto.randomUUID(), primary: '', secondary: '' }];
    setRows(newRows);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length === 1) {
      // Keep at least one row, just clear it
      const newRows = [{ id: crypto.randomUUID(), primary: '', secondary: '' }];
      setRows(newRows);
      onChange(rowsToCategories(newRows));
    } else {
      const newRows = rows.filter((row) => row.id !== rowId);
      setRows(newRows);
      onChange(rowsToCategories(newRows));
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2">Categories</label>

      <div className="space-y-3">
        {rows.map((row) => {
          const secondaryOptions = row.primary ? getSecondaryCategories(row.primary as PrimaryCategory) : [];
          const hasSecondaryOptions = secondaryOptions.length > 0;

          return (
            <div key={row.id} className="flex items-start gap-2">
              {/* Primary Category */}
              <div className="flex-1">
                <select
                  value={row.primary}
                  onChange={(e) => handleRowChange(row.id, 'primary', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="">Select primary category...</option>
                  {TAXONOMY.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Secondary Category (only show if primary has subcategories) */}
              {row.primary && hasSecondaryOptions && (
                <div className="flex-1">
                  <select
                    value={row.secondary}
                    onChange={(e) => handleRowChange(row.id, 'secondary', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  >
                    <option value="">No subcategory</option>
                    {secondaryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemoveRow(row.id)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                aria-label="Remove category"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {/* Add Category Button */}
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Add multiple categories to make content appear in different sections. Leave primary category empty to remove a row.
      </p>
    </div>
  );
}
