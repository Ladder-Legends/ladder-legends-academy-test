'use client';

import { Replay } from '@/types/replay';
import Link from 'next/link';
import { Download, Video, Edit, Trash2, Lock } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { getContentVideoUrl } from '@/lib/video-helpers';
import { SortableTable, ColumnConfig } from '@/components/ui/sortable-table';
import videosData from '@/data/videos.json';
import { Video as VideoType } from '@/types/video';

interface ReplaysTableProps {
  replays: Replay[];
  hasSubscriberRole: boolean;
  onEdit?: (replay: Replay) => void;
  onDelete?: (replay: Replay) => void;
}

export function ReplaysTable({ replays, hasSubscriberRole, onEdit, onDelete }: ReplaysTableProps) {
  const allVideos = videosData as VideoType[];

  // Helper function to parse duration string (e.g., "12.34" or "12:34") into minutes
  const parseDuration = (duration: string): number => {
    const separator = duration.includes('.') ? '.' : ':';
    const parts = duration.split(separator).map(p => parseInt(p, 10));
    if (parts.length === 2) {
      return parts[0];
    } else if (parts.length === 3) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  // Helper to get race color
  const getRaceColor = (_race: string) => {
    // Using theme foreground color instead of race-specific colors
    return 'text-foreground';
  };

  const columns: ColumnConfig<Replay>[] = [
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      getValue: (replay) => replay.title.toLowerCase(),
      render: (replay) => (
        <>
          <Link
            href={`/replays/${replay.id}`}
            className="text-base font-medium hover:text-primary transition-colors block"
          >
            {replay.title}
          </Link>
          {!replay.isFree && !hasSubscriberRole && (
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
      getValue: (replay) => replay.matchup.toLowerCase(),
      render: (replay) => {
        const [race1, race2] = replay.matchup.split('v');
        return (
          <div className="flex items-center gap-1">
            <span className={`font-bold ${getRaceColor(race1)}`}>{race1}</span>
            <span className="text-muted-foreground">v</span>
            <span className={`font-bold ${getRaceColor(race2)}`}>{race2}</span>
          </div>
        );
      },
    },
    {
      id: 'map',
      label: 'Map',
      sortable: true,
      getValue: (replay) => replay.map.toLowerCase(),
      render: (replay) => (
        <span className="text-sm text-muted-foreground">{replay.map}</span>
      ),
    },
    {
      id: 'duration',
      label: 'Duration',
      sortable: true,
      getValue: (replay) => parseDuration(replay.duration),
      render: (replay) => (
        <span className="text-sm text-muted-foreground">{replay.duration}</span>
      ),
    },
    {
      id: 'gameDate',
      label: 'Game Date',
      sortable: true,
      getValue: (replay) => new Date(replay.gameDate),
      render: (replay) => (
        <span className="text-sm text-muted-foreground">
          {new Date(replay.gameDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'uploadDate',
      label: 'Added',
      sortable: true,
      getValue: (replay) => new Date(replay.uploadDate),
      render: (replay) => (
        <span className="text-sm text-muted-foreground">
          {new Date(replay.uploadDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      render: (replay) => (
        <div className="flex items-center gap-2">
          {replay.downloadUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // For premium content, check if user has access
                if (!replay.isFree && !hasSubscriberRole) {
                  window.location.href = '/subscribe';
                  return;
                }

                window.location.href = `/api/replay-download?replayId=${replay.id}`;
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {getContentVideoUrl(replay, allVideos) && (
            <PaywallLink
              href={getContentVideoUrl(replay, allVideos)!}
              isFree={replay.isFree}
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
                  onEdit(replay);
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
                  onDelete(replay);
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
      items={replays}
      columns={columns}
      getRowKey={(replay) => replay.id}
      minWidth="900px"
    />
  );
}
