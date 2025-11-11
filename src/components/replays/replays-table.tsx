'use client';

import { useState, useMemo } from 'react';
import { Replay } from '@/types/replay';
import Link from 'next/link';
import { Download, Video, Edit, Trash2, Lock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { getContentVideoUrl } from '@/lib/video-helpers';
import videosData from '@/data/videos.json';
import { Video as VideoType } from '@/types/video';

type SortField = 'title' | 'matchup' | 'map' | 'duration' | 'gameDate' | 'uploadDate';
type SortDirection = 'asc' | 'desc';

interface ReplaysTableProps {
  replays: Replay[];
  hasSubscriberRole: boolean;
  onEdit?: (replay: Replay) => void;
  onDelete?: (replay: Replay) => void;
}

export function ReplaysTable({ replays, hasSubscriberRole, onEdit, onDelete }: ReplaysTableProps) {
  const allVideos = videosData as VideoType[];
  const [sortField, setSortField] = useState<SortField>('uploadDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  // Sort the replays based on current sort field and direction
  const sortedReplays = useMemo(() => {
    return [...replays].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'matchup':
          aValue = a.matchup.toLowerCase();
          bValue = b.matchup.toLowerCase();
          break;
        case 'map':
          aValue = a.map.toLowerCase();
          bValue = b.map.toLowerCase();
          break;
        case 'duration':
          aValue = parseDuration(a.duration);
          bValue = parseDuration(b.duration);
          break;
        case 'gameDate':
          aValue = new Date(a.gameDate).getTime();
          bValue = new Date(b.gameDate).getTime();
          break;
        case 'uploadDate':
          aValue = new Date(a.uploadDate).getTime();
          bValue = new Date(b.uploadDate).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [replays, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending when clicking a new field
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Helper to get race color
  const getRaceColor = (race: string) => {
    switch (race) {
      case 'Terran':
        return 'text-blue-400';
      case 'Zerg':
        return 'text-purple-400';
      case 'Protoss':
        return 'text-yellow-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden inline-block min-w-full">
      <table className="w-full min-w-[800px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('title')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Title
                <SortIcon field="title" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Players</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('matchup')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Matchup
                <SortIcon field="matchup" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('map')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Map
                <SortIcon field="map" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('duration')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Duration
                <SortIcon field="duration" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('gameDate')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Game Date
                <SortIcon field="gameDate" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('uploadDate')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Added
                <SortIcon field="uploadDate" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedReplays.map((replay, index) => (
            <tr
              key={replay.id}
              className={`border-t border-border hover:bg-muted/30 transition-colors ${
                index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
              }`}
            >
              <td className="px-6 py-4">
                <Link
                  href={`/replays/${replay.id}`}
                  className="text-base font-medium hover:text-primary transition-colors block"
                >
                  {replay.title}
                </Link>
                {replay.coach && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-sm text-muted-foreground">
                      Coach: {replay.coach}
                    </p>
                    {!replay.isFree && !hasSubscriberRole && (
                      <span className="bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium whitespace-nowrap flex-shrink-0">
                        <Lock className="w-2.5 h-2.5" />
                        Premium
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <p className={`text-sm ${getRaceColor(replay.player1.race)}`}>
                    {replay.player1.race.charAt(0)} {replay.player1.name}
                  </p>
                  <p className={`text-sm ${getRaceColor(replay.player2.race)}`}>
                    {replay.player2.race.charAt(0)} {replay.player2.name}
                  </p>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-medium">{replay.matchup}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-muted-foreground">{replay.map}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-muted-foreground">{replay.duration}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  {new Date(replay.gameDate).toLocaleDateString()}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  {new Date(replay.uploadDate).toLocaleDateString()}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {replay.downloadUrl && (
                    <PaywallLink
                      href={replay.downloadUrl}
                      isFree={replay.isFree}
                      external
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </PaywallLink>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
