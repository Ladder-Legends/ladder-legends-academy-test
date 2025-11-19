'use client';

import { UserReplayData } from '@/lib/replay-types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Trophy, Calendar, MapPin, Clock, Target } from 'lucide-react';

interface MyReplayCardProps {
  replay: UserReplayData;
  onDelete?: (replay: UserReplayData) => void;
}

export function MyReplayCard({ replay, onDelete }: MyReplayCardProps) {
  // Helper to format duration from seconds to MM:SS
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to get result badge color
  const getResultBadgeClass = (result: string) => {
    if (result === 'Win') {
      return 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20';
    }
    return 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20';
  };

  // Helper to get execution tier badge
  const getTierBadgeClass = (tier: string) => {
    const colors: Record<string, string> = {
      'S': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'A': 'bg-green-500/10 text-green-500 border-green-500/20',
      'B': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'C': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'D': 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[tier] || 'bg-muted';
  };

  const gameDate = new Date(replay.uploaded_at);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-muted hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getResultBadgeClass(replay.fingerprint.metadata.result)}>
                {replay.fingerprint.metadata.result}
              </Badge>
              <span className="text-sm font-bold text-foreground">
                {replay.fingerprint.matchup}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(replay);
              }}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Map and Duration */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground truncate">{replay.fingerprint.metadata.map}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground tabular-nums">
              {formatDuration(replay.fingerprint.metadata.duration)}
            </span>
          </div>
        </div>

        {/* Detected Build */}
        {replay.detection && (
          <div className="pt-2 border-t border-muted">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{replay.detection.build_name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(replay.detection.confidence * 100)}% confidence
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Execution Score */}
        {replay.comparison && (
          <div className="pt-2 border-t border-muted">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Execution</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tabular-nums">
                  {Math.round(replay.comparison.execution_score)}%
                </span>
                <Badge className={getTierBadgeClass(replay.comparison.tier)}>
                  {replay.comparison.tier}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
