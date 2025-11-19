'use client';

import { LayoutGrid, Table, List, BarChart3 } from 'lucide-react';
import { Button } from './button';

interface ViewToggleProps {
  view: 'grid' | 'table';
  onViewChange: (view: 'grid' | 'table') => void;
  gridLabel?: string;
  tableLabel?: string;
  gridIcon?: 'grid' | 'chart';
  tableIcon?: 'table' | 'list';
}

export function ViewToggle({
  view,
  onViewChange,
  gridLabel = 'Grid',
  tableLabel = 'Table',
  gridIcon = 'grid',
  tableIcon = 'table'
}: ViewToggleProps) {
  const GridIconComponent = gridIcon === 'chart' ? BarChart3 : LayoutGrid;
  const TableIconComponent = tableIcon === 'list' ? List : Table;

  return (
    <div className="flex items-center gap-2 border border-border rounded-lg p-1">
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        className="h-8 gap-2 px-3"
        aria-label={`${gridLabel} view`}
      >
        <GridIconComponent className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">{gridLabel}</span>
      </Button>
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="h-8 gap-2 px-3"
        aria-label={`${tableLabel} view`}
      >
        <TableIconComponent className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">{tableLabel}</span>
      </Button>
    </div>
  );
}
