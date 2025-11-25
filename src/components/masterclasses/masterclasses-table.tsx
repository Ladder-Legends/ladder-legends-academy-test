'use client';

import { Masterclass } from '@/types/masterclass';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SortableTable, ColumnConfig } from '@/components/ui/sortable-table';
import { PremiumBadge } from '@/components/shared/premium-badge';
import { AdminActions } from '@/components/shared/admin-actions';

interface MasterclassesTableProps {
  masterclasses: Masterclass[];
  hasSubscriberRole: boolean;
  onEdit?: (masterclass: Masterclass) => void;
  onDelete?: (masterclass: Masterclass) => void;
}

export function MasterclassesTable({ masterclasses, hasSubscriberRole, onEdit, onDelete }: MasterclassesTableProps) {
  const columns: ColumnConfig<Masterclass>[] = [
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      getValue: (item) => item.title.toLowerCase(),
      render: (item) => (
        <div>
          <Link
            href={`/masterclasses/${item.id}`}
            className="text-base font-medium hover:text-primary transition-colors block"
          >
            {item.title}
          </Link>
          <PremiumBadge isFree={item.isFree ?? false} hasSubscriberRole={hasSubscriberRole} />
        </div>
      ),
    },
    {
      id: 'coach',
      label: 'Coach',
      sortable: true,
      getValue: (item) => item.coach?.toLowerCase() || '',
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.coach}</span>
      ),
    },
    {
      id: 'race',
      label: 'Race',
      sortable: true,
      getValue: (item) => item.race?.toLowerCase() || '',
      render: (item) => (
        item.race && (
          <span className="text-sm font-medium text-foreground">
            {item.race}
          </span>
        )
      ),
    },
    {
      id: 'difficulty',
      label: 'Difficulty',
      sortable: true,
      sortFn: (a, b, direction) => {
        const difficultyOrder: Record<string, number> = { basic: 1, intermediate: 2, expert: 3 };
        const aValue = difficultyOrder[a.difficulty?.toLowerCase() || ''] || 0;
        const bValue = difficultyOrder[b.difficulty?.toLowerCase() || ''] || 0;
        const comparison = aValue - bValue;
        return direction === 'asc' ? comparison : -comparison;
      },
      render: (item) => (
        item.difficulty && (
          <Badge variant="outline" className="bg-muted text-foreground border-border">
            {item.difficulty}
          </Badge>
        )
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Link href={`/masterclasses/${item.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Play className="h-4 w-4" />
            </Button>
          </Link>
          <AdminActions item={item} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ),
    },
  ];

  return (
    <SortableTable
      items={masterclasses}
      columns={columns}
      getRowKey={(item) => item.id}
    />
  );
}
