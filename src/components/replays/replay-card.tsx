'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Replay } from "@/types/replay";
import { CalendarDays, Download, Video, Pencil, Trash2, Lock } from "lucide-react";
import { PaywallLink } from "@/components/auth/paywall-link";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useSession } from "next-auth/react";

interface ReplayCardProps {
  replay: Replay;
  onEdit?: (replay: Replay) => void;
  onDelete?: (replay: Replay) => void;
}

export function ReplayCard({ replay, onEdit, onDelete }: ReplayCardProps) {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRaceColor = (race: string) => {
    switch (race.toLowerCase()) {
      case 'terran': return 'text-orange-500';
      case 'zerg': return 'text-purple-500';
      case 'protoss': return 'text-cyan-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="relative group">
      <PaywallLink
        href={`/replays/${replay.id}`}
        className="block"
        isFree={replay.isFree}
      >
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 h-full flex flex-col">
          <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 overflow-hidden flex items-center justify-center">
            {/* Matchup Display */}
            <div className="text-6xl font-bold text-muted-foreground/20">
              {replay.matchup}
            </div>

            {/* Subscriber Only Badge */}
            {!replay.isFree && !hasSubscriberRole && (
              <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-primary-foreground flex items-center gap-1 font-medium z-20">
                <Lock className="w-3 h-3" />
                Subscriber Only
              </div>
            )}

            {/* Hover overlay with action icons */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
              {replay.downloadUrl && (
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                  <Download className="w-6 h-6 text-white" />
                </div>
              )}
              {replay.coachingVideoId && (
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                  <Video className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          </div>

          <CardHeader className="flex-1">
            <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
              {replay.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className={getRaceColor(replay.player1.race)}>
                {replay.player1.name}
              </span>
              <span className="text-muted-foreground">vs</span>
              <span className={getRaceColor(replay.player2.race)}>
                {replay.player2.name}
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>{formatDate(replay.gameDate)}</span>
              </div>
              <div className="text-muted-foreground">
                <span>{replay.duration}</span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {replay.map}
            </div>

            {replay.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {replay.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-muted hover:bg-muted/80 text-foreground border-0"
                  >
                    {tag}
                  </Badge>
                ))}
                {replay.tags.length > 3 && (
                  <Badge
                    variant="secondary"
                    className="bg-muted hover:bg-muted/80 text-foreground border-0"
                  >
                    +{replay.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PaywallLink>

      {/* Admin Edit/Delete Buttons */}
      <PermissionGate require="coaches">
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          {onEdit && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(replay);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0 bg-destructive/90 backdrop-blur-sm hover:bg-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(replay);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
