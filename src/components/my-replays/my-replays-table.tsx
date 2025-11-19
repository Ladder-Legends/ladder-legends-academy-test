'use client';

import { UserReplayData } from '@/lib/replay-types';
import { Trash2, Trophy, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortableTable, ColumnConfig } from '@/components/ui/sortable-table';
import { Badge } from '@/components/ui/badge';

interface MyReplaysTableProps {
  replays: UserReplayData[];
  onDelete?: (replay: UserReplayData) => void;
}

export function MyReplaysTable({ replays, onDelete }: MyReplaysTableProps) {
  // Helper to format duration from seconds to MM:SS
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to get race color
  const getRaceColor = (race: string) => {
    return 'text-foreground';
  };

  // Helper to get result badge
  const getResultBadge = (result: string) => {
    if (result === 'Win') {
      return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Win</Badge>;
    }
    return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Loss</Badge>;
  };

  // Helper to get execution tier badge
  const getTierBadge = (tier: string | undefined) => {
    if (!tier) return null;

    const colors: Record<string, string> = {
      'S': 'bg-yellow-500/10 text-yellow-500',
      'A': 'bg-green-500/10 text-green-500',
      'B': 'bg-blue-500/10 text-blue-500',
      'C': 'bg-orange-500/10 text-orange-500',
      'D': 'bg-red-500/10 text-red-500',
    };

    return <Badge className={colors[tier] || 'bg-muted'}>{tier}</Badge>;
  };

  const columns: ColumnConfig<UserReplayData>[] = [
    {
      id: 'gameDate',
      label: 'Date Played',
      sortable: true,
      getValue: (replay) => new Date(replay.fingerprint.metadata.result === 'Win' ? replay.uploaded_at : replay.uploaded_at).getTime(),
      render: (replay) => {
        const date = new Date(replay.uploaded_at);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-xs text-muted-foreground">
              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
    {
      id: 'gameType',
      label: 'Type',
      sortable: true,
      getValue: (replay) => replay.fingerprint.metadata.game_type?.toLowerCase() || 'zzz',
      render: (replay) => {
        const gameType = replay.fingerprint.metadata.game_type;
        const category = replay.fingerprint.metadata.category;

        if (!gameType) return <span className="text-sm text-muted-foreground">—</span>;

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{gameType}</span>
            {category && (
              <span className="text-xs text-muted-foreground">{category}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'map',
      label: 'Map',
      sortable: true,
      getValue: (replay) => replay.fingerprint.metadata.map.toLowerCase(),
      render: (replay) => (
        <span className="text-sm text-muted-foreground">{replay.fingerprint.metadata.map}</span>
      ),
    },
    {
      id: 'matchup',
      label: 'Matchup',
      sortable: true,
      getValue: (replay) => replay.fingerprint?.matchup?.toLowerCase() || '',
      render: (replay) => {
        if (!replay.fingerprint?.matchup) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        const [race1, race2] = replay.fingerprint.matchup.split('v');
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
      id: 'result',
      label: 'Result',
      sortable: true,
      getValue: (replay) => replay.fingerprint.metadata.result,
      render: (replay) => getResultBadge(replay.fingerprint.metadata.result),
    },
    {
      id: 'duration',
      label: 'Duration',
      sortable: true,
      getValue: (replay) => replay.fingerprint.metadata.duration || 0,
      render: (replay) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDuration(replay.fingerprint.metadata.duration)}
        </span>
      ),
    },
    {
      id: 'build',
      label: 'Detected Build',
      sortable: true,
      getValue: (replay) => replay.detection?.build_name?.toLowerCase() || 'zzz',
      render: (replay) => {
        if (!replay.detection) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        const confidence = Math.round(replay.detection.confidence * 100);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{replay.detection.build_name}</span>
            <span className="text-xs text-muted-foreground">{confidence}% confidence</span>
          </div>
        );
      },
    },
    {
      id: 'execution',
      label: 'Execution',
      sortable: true,
      getValue: (replay) => replay.comparison?.execution_score || 0,
      render: (replay) => {
        if (!replay.comparison) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        const score = Math.round(replay.comparison.execution_score);
        const tier = replay.comparison.tier;

        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium tabular-nums">{score}%</span>
            {getTierBadge(tier)}
          </div>
        );
      },
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      getValue: () => '',
      render: (replay) => (
        <div className="flex items-center justify-end gap-2">
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(replay);
              }}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return <SortableTable columns={columns} items={replays} defaultSortField="gameDate" />;
}
