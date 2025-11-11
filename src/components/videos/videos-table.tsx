'use client';

import { Video, isPlaylist, isMuxVideo } from '@/types/video';
import Link from 'next/link';
import { Lock, Edit, Trash2, Play, List } from 'lucide-react';
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

    const colors: Record<string, string> = {
      terran: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      zerg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      protoss: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };

    return (
      <Badge variant="outline" className={colors[race.toLowerCase()] || 'bg-muted'}>
        {race.charAt(0).toUpperCase() + race.slice(1)}
      </Badge>
    );
  };

  const getDifficultyBadge = (difficulty?: string) => {
    if (!difficulty) return null;

    const colors: Record<string, string> = {
      basic: 'bg-green-500/10 text-green-500 border-green-500/20',
      intermediate: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      expert: 'bg-red-500/10 text-red-500 border-red-500/20',
    };

    return (
      <Badge variant="outline" className={colors[difficulty.toLowerCase()] || 'bg-muted'}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </Badge>
    );
  };

  const getSourceBadge = (video: Video) => {
    if (isPlaylist(video)) {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
          <List className="w-3 h-3 mr-1" />
          Playlist
        </Badge>
      );
    }

    const source = isMuxVideo(video) ? 'Mux' : 'YouTube';
    return (
      <Badge variant="outline" className="bg-muted">
        {source}
      </Badge>
    );
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
      id: 'difficulty',
      label: 'Difficulty',
      sortable: true,
      sortFn: (a, b, direction) => {
        const difficultyOrder: Record<string, number> = { basic: 1, intermediate: 2, expert: 3 };
        const aValue = a.difficulty ? difficultyOrder[a.difficulty.toLowerCase()] || 0 : 0;
        const bValue = b.difficulty ? difficultyOrder[b.difficulty.toLowerCase()] || 0 : 0;
        const comparison = aValue - bValue;
        return direction === 'asc' ? comparison : -comparison;
      },
      render: (video) => getDifficultyBadge(video.difficulty),
    },
    {
      id: 'source',
      label: 'Source',
      sortable: true,
      getValue: (video) => {
        if (isPlaylist(video)) return 'playlist';
        return isMuxVideo(video) ? 'mux' : 'youtube';
      },
      render: (video) => getSourceBadge(video),
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
