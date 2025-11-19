'use client';

import { useState, useMemo, ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnConfig<T> {
  /** Unique identifier for this column */
  id: string;

  /** Display label for the column header */
  label: string;

  /** Whether this column is sortable */
  sortable?: boolean;

  /** Optional custom sort function - if not provided, uses getValue for comparison */
  sortFn?: (a: T, b: T, direction: 'asc' | 'desc') => number;

  /** Function to extract sortable value from item (used if sortFn not provided) */
  getValue?: (item: T) => string | number | Date;

  /** Render function for the cell content */
  render: (item: T, index: number) => ReactNode;

  /** Optional CSS classes for the header */
  headerClassName?: string;

  /** Optional CSS classes for the cell */
  cellClassName?: string;
}

interface SortableTableProps<T> {
  /** Array of items to display */
  items: T[];

  /** Column configurations */
  columns: ColumnConfig<T>[];

  /** Default sort field (null for no initial sort) */
  defaultSortField?: string | null;

  /** Default sort direction (null for no initial sort) */
  defaultSortDirection?: SortDirection;

  /** Optional function to get a unique key for each row */
  getRowKey?: (item: T) => string;

  /** Optional className for the table container */
  className?: string;

  /** Min width for the table */
  minWidth?: string;

  /** Optional function called when a row is clicked */
  onRowClick?: (item: T) => void;
}

/**
 * Generic sortable table component
 * Handles sorting logic and provides a consistent table UI
 */
export function SortableTable<T>({
  items,
  columns,
  defaultSortField,
  defaultSortDirection = null,
  getRowKey,
  className = '',
  minWidth = '800px',
  onRowClick,
}: SortableTableProps<T>) {
  const [sortField, setSortField] = useState<string | null>(defaultSortField || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Sort the items based on current sort field and direction
  const sortedItems = useMemo(() => {
    // No sort if sortField or sortDirection is null
    if (!sortField || !sortDirection) return items;

    const column = columns.find(col => col.id === sortField);
    if (!column || !column.sortable) return items;

    return [...items].sort((a, b) => {
      // Use custom sort function if provided
      if (column.sortFn) {
        return column.sortFn(a, b, sortDirection);
      }

      // Use getValue to extract comparable values
      if (column.getValue) {
        const aValue = column.getValue(a);
        const bValue = column.getValue(b);

        // Handle different types
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          // Fallback: convert to string and compare
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // No sort function or getValue provided
      return 0;
    });
  }, [items, sortField, sortDirection, columns]);

  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column || !column.sortable) return;

    if (sortField === columnId) {
      // Cycle through: asc → desc → null → asc
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      // New column: start with ascending
      setSortField(columnId);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (sortField !== columnId) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
  };

  return (
    <div className={`border border-border rounded-lg overflow-hidden inline-block min-w-full ${className}`}>
      <table className="w-full" style={{ minWidth }}>
        <thead className="bg-muted/50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={`text-left px-6 py-4 text-sm font-semibold ${column.headerClassName || ''}`}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.id)}
                    className="flex items-center hover:text-primary transition-colors"
                  >
                    {column.label}
                    <SortIcon columnId={column.id} />
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, index) => (
            <tr
              key={getRowKey ? getRowKey(item) : index}
              onClick={() => onRowClick?.(item)}
              className={`border-t border-border hover:bg-muted/30 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              } ${index % 2 === 0 ? 'bg-card' : 'bg-muted/10'}`}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={`px-6 py-4 ${column.cellClassName || ''}`}
                >
                  {column.render(item, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
