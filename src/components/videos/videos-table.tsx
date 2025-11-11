'use client';

import { Video } from '@/types/video';
import Link from 'next/link';
import { Lock, Edit, Trash2, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { SortableTable, ColumnConfig } from '@/components/ui/sortable-table';
import coachesData from '@/data/coaches.json';

interface VideosTableProps {
  videos: Video[];
  hasSubscriberRole: boolean;
  onEdit?: (video: Video) => void;
  onDelete?: (video: Video) => void;
}

export function VideosTable({ videos, hasSubscriberRole, onEdit, onDelete }: VideosTableProps) {
  const getCoachName = (coachId?: string) => {
    if (!coachId) return '—';
    const coach = coachesData.find(c => c.id === coachId);
    return coach?.displayName || coachId;
  };

  const getRaceBadge = (race?: string) => {
    if (!race || race === 'all') return null;

    // Using theme colors instead of race-specific colors
    return (
      <Badge variant="outline" className="bg-muted text-foreground border-border">
        {race.charAt(0).toUpperCase() + race.slice(1)}
      </Badge>
    );
  };

  const getAccessBadge = (video: Video) => {
    if (video.isFree) {
      return (
        <Badge variant="outline" className="bg-muted text-foreground border-border">
          Free
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
        <Lock className="w-3 h-3 mr-1" />
        Premium
      </Badge>
    );
  };

  const getPrimaryCategory = (video: Video): string => {
    if (!video.categories || video.categories.length === 0) {
      return '—';
    }
    // Get the first category and extract the primary part (before the dot)
    const firstCategory = video.categories[0];
    const primary = firstCategory.includes('.')
      ? firstCategory.split('.')[0]
      : firstCategory;
    // Capitalize first letter
    return primary.charAt(0).toUpperCase() + primary.slice(1);
  };

  const columns: ColumnConfig<Video>[] = [
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      getValue: (video) => video.title.toLowerCase(),
      render: (video) => (
        <>
          <Link
            href={`/library/${video.id}`}
            className="text-base font-medium hover:text-primary transition-colors block"
          >
            {video.title}
          </Link>
          {!video.isFree && !hasSubscriberRole && (
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
      id: 'coach',
      label: 'Coach',
      sortable: true,
      getValue: (video) => (video.coachId ? getCoachName(video.coachId).toLowerCase() : ''),
      render: (video) => (
        <span className="text-sm text-muted-foreground">
          {video.coachId ? getCoachName(video.coachId) : '—'}
        </span>
      ),
    },
    {
      id: 'race',
      label: 'Race',
      sortable: true,
      getValue: (video) => video.race || 'zzz', // Put 'all' at the end
      render: (video) => getRaceBadge(video.race),
    },
    {
      id: 'category',
      label: 'Category',
      sortable: true,
      getValue: (video) => getPrimaryCategory(video).toLowerCase(),
      render: (video) => (
        <span className="text-sm text-muted-foreground">
          {getPrimaryCategory(video)}
        </span>
      ),
    },
    {
      id: 'accessLevel',
      label: 'Access',
      sortable: true,
      getValue: (video) => video.isFree ? 'free' : 'premium',
      render: (video) => getAccessBadge(video),
    },
    {
      id: 'date',
      label: 'Added',
      sortable: true,
      getValue: (video) => new Date(video.date),
      render: (video) => (
        <span className="text-sm text-muted-foreground">
          {new Date(video.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      render: (video) => (
        <div className="flex items-center gap-2">
          <Link href={`/library/${video.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Play className="h-4 w-4" />
            </Button>
          </Link>
          <PermissionGate require="coaches">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(video);
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
                  onDelete(video);
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
      items={videos}
      columns={columns}
      getRowKey={(video) => video.id}
      minWidth="900px"
    />
  );
}
