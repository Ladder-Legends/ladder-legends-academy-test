'use client';

import { BuildOrder } from '@/types/build-order';
import { Video as VideoType } from '@/types/video';
import Link from 'next/link';
import { FileText, Video, Lock, Edit, Trash2 } from 'lucide-react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PaywallLink } from '@/components/auth/paywall-link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getContentVideoUrl } from '@/lib/video-helpers';
import { SortableTable, ColumnConfig } from '@/components/ui/sortable-table';
import videosData from '@/data/videos.json';

const allVideos = videosData as VideoType[];

interface BuildOrdersTableProps {
  buildOrders: BuildOrder[];
  hasSubscriberRole: boolean;
  onEdit?: (buildOrder: BuildOrder) => void;
  onDelete?: (buildOrder: BuildOrder) => void;
}

export function BuildOrdersTable({ buildOrders, hasSubscriberRole, onEdit, onDelete }: BuildOrdersTableProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted';
    }
  };

  const columns: ColumnConfig<BuildOrder>[] = [
    {
      id: 'name',
      label: 'Build Name',
      sortable: true,
      getValue: (buildOrder) => buildOrder.name.toLowerCase(),
      render: (buildOrder) => (
        <>
          <Link
            href={`/build-orders/${buildOrder.id}`}
            className="text-base font-medium hover:text-primary transition-colors block"
          >
            {buildOrder.name}
          </Link>
          {!buildOrder.isFree && !hasSubscriberRole && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium whitespace-nowrap flex-shrink-0">
                <Lock className="w-2.5 h-2.5" />
                Premium
              </span>
            </div>
          )}
        </>
      ),
    },
    {
      id: 'matchup',
      label: 'Matchup',
      sortable: true,
      getValue: (buildOrder) => `${buildOrder.race}${buildOrder.vsRace}`.toLowerCase(),
      render: (buildOrder) => (
        <span className="text-sm font-medium uppercase">
          {buildOrder.race.charAt(0)}v{buildOrder.vsRace.charAt(0)}
        </span>
      ),
    },
    {
      id: 'difficulty',
      label: 'Difficulty',
      sortable: true,
      sortFn: (a, b, direction) => {
        const difficultyOrder: Record<string, number> = { basic: 1, intermediate: 2, expert: 3 };
        const aValue = difficultyOrder[a.difficulty.toLowerCase()] || 0;
        const bValue = difficultyOrder[b.difficulty.toLowerCase()] || 0;
        const comparison = aValue - bValue;
        return direction === 'asc' ? comparison : -comparison;
      },
      render: (buildOrder) => (
        <Badge variant="outline" className={getDifficultyColor(buildOrder.difficulty)}>
          {buildOrder.difficulty}
        </Badge>
      ),
    },
    {
      id: 'coach',
      label: 'Coach',
      sortable: true,
      getValue: (buildOrder) => (buildOrder.coach || '').toLowerCase(),
      render: (buildOrder) => (
        <span className="text-sm text-muted-foreground">
          {buildOrder.coach || '—'}
        </span>
      ),
    },
    {
      id: 'updatedAt',
      label: 'Updated',
      sortable: true,
      getValue: (buildOrder) => new Date(buildOrder.updatedAt),
      render: (buildOrder) => (
        <span className="text-sm text-muted-foreground">
          {new Date(buildOrder.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      render: (buildOrder) => (
        <div className="flex items-center gap-2">
          <Link href={`/build-orders/${buildOrder.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <FileText className="h-4 w-4" />
            </Button>
          </Link>
          {getContentVideoUrl(buildOrder, allVideos) && (
            <PaywallLink
              href={getContentVideoUrl(buildOrder, allVideos)!}
              isFree={buildOrder.isFree}
            >
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Video className="h-4 w-4" />
              </Button>
            </PaywallLink>
          )}
          <PermissionGate require="coaches">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(buildOrder);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(buildOrder);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <SortableTable
      items={buildOrders}
      columns={columns}
      getRowKey={(buildOrder) => buildOrder.id}
      minWidth="800px"
    />
  );
}
