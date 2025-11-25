'use client';

import { Replay } from '@/types/replay';
import Link from 'next/link';
import { Download, Video } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { Button } from '@/components/ui/button';
import { getContentVideoUrl } from '@/lib/video-helpers';
import { SortableTable, ColumnConfig } from '@/components/ui/sortable-table';
import { PremiumBadge } from '@/components/shared/premium-badge';
import { AdminActions } from '@/components/shared/admin-actions';
import { videos as videosData } from '@/lib/data';
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
        <div>
          <Link
            href={`/replays/${replay.id}`}
            className="text-base font-medium hover:text-primary transition-colors block"
          >
            {replay.title}
          </Link>
          <PremiumBadge isFree={replay.isFree ?? false} hasSubscriberRole={hasSubscriberRole} />
        </div>
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
          <AdminActions item={replay} onEdit={onEdit} onDelete={onDelete} />
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
