'use client';

import { Replay } from '@/types/replay';
import Link from 'next/link';
import { Download, Video, Edit, Trash2, Lock } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';

interface ReplaysTableProps {
  replays: Replay[];
  hasSubscriberRole: boolean;
  onEdit?: (replay: Replay) => void;
  onDelete?: (replay: Replay) => void;
}

export function ReplaysTable({ replays, hasSubscriberRole, onEdit, onDelete }: ReplaysTableProps) {
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
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full min-w-[800px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-6 py-4 text-sm font-semibold">Title</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Players</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Matchup</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Map</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Duration</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Date</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {replays.map((replay, index) => (
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
                  {replay.videoId && (
                    <PaywallLink
                      href={`/library/${replay.videoId}`}
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
