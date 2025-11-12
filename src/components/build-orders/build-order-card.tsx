'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildOrder, getBuildOrderThumbnailUrl } from "@/types/build-order";
import { Video as VideoIcon, Lock, Edit, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Video } from "@/types/video";
import videosData from "@/data/videos.json";
import Image from "next/image";

const videos = videosData as Video[];

interface BuildOrderCardProps {
  buildOrder: BuildOrder;
  onEdit?: (buildOrder: BuildOrder) => void;
  onDelete?: (buildOrder: BuildOrder) => void;
}

export function BuildOrderCard({ buildOrder, onEdit, onDelete }: BuildOrderCardProps) {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
  const thumbnailUrl = getBuildOrderThumbnailUrl(buildOrder, videos);

  const getDifficultyColor = (difficulty: string) => {
    // Using theme colors instead of difficulty-specific colors
    return 'bg-muted text-foreground border-border';
  };

  const getTypeColor = (type: string) => {
    // Using theme colors instead of type-specific colors
    return 'bg-muted text-foreground border-border';
  };

  const handleDocumentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/build-orders/${buildOrder.id}`;
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/build-orders/${buildOrder.id}?scrollTo=videos`;
  };

  return (
    <div className="relative group h-full">
      <Link
        href={`/build-orders/${buildOrder.id}`}
        className="block h-full"
      >
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 h-full flex flex-col p-0 pb-4">
          <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 overflow-hidden flex items-center justify-center">
            {/* Thumbnail or Matchup Display */}
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={buildOrder.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="text-6xl font-bold text-muted-foreground/20">
                {buildOrder.race.charAt(0).toUpperCase()}v{buildOrder.vsRace.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Premium Badge */}
            {!buildOrder.isFree && !hasSubscriberRole && (
              <div className="absolute bottom-2 right-2 bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium z-20">
                <Lock className="w-2.5 h-2.5" />
                Premium
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 z-10">
              <button
                onClick={handleDocumentClick}
                className="bg-black/40 backdrop-blur-sm p-3 rounded-full hover:scale-110 hover:bg-black/40 transition-all duration-200 group/icon"
                aria-label="View build order"
              >
                <FileText className="w-6 h-6 text-white group-hover/icon:text-primary transition-colors" />
              </button>
              {buildOrder.videoIds && buildOrder.videoIds.length > 0 && (
                <button
                  onClick={handleVideoClick}
                  className="bg-black/40 backdrop-blur-sm p-3 rounded-full hover:scale-110 hover:bg-black/40 transition-all duration-200 group/icon"
                  aria-label="Watch videos"
                >
                  <VideoIcon className="w-6 h-6 text-white group-hover/icon:text-primary transition-colors" />
                </button>
              )}
            </div>
          </div>

          <CardHeader className="flex-1">
            <div className="flex items-start gap-2 mb-2 flex-wrap">
              {buildOrder.type && (
                <Badge variant="outline" className={getTypeColor(buildOrder.type)}>
                  {buildOrder.type}
                </Badge>
              )}
              <Badge variant="outline" className={getDifficultyColor(buildOrder.difficulty)}>
                {buildOrder.difficulty}
              </Badge>
            </div>
            <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
              {buildOrder.name}
            </CardTitle>
            <CardDescription className="line-clamp-3">
              {buildOrder.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium uppercase">
                {buildOrder.race.charAt(0)}v{buildOrder.vsRace.charAt(0)}
              </span>
              {buildOrder.coach && (
                <>
                  <span>•</span>
                  <span>Coach: {buildOrder.coach}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Admin Edit/Delete Buttons */}
      <PermissionGate require="coaches">
        <div className="absolute top-2 right-2 flex gap-2">
          {onEdit && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm hover:bg-background"
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
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0 bg-destructive/90 backdrop-blur-sm hover:bg-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(buildOrder);
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
