'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, isPlaylist, getThumbnailYoutubeId, isMuxVideo, getVideoThumbnailUrl } from "@/types/video";
import { CalendarDays, Play, Pencil, Trash2, ListVideo, Lock } from "lucide-react";
import Image from "next/image";
import { PaywallLink } from "@/components/auth/paywall-link";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useSession } from "next-auth/react";
import { getVideoUrl } from "@/lib/video-helpers";

interface VideoCardProps {
  video: Video;
  onEdit?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  allVideos?: Video[]; // Optional: used to resolve playlist thumbnails
}

export function VideoCard({ video, onEdit, onDelete, allVideos }: VideoCardProps) {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Monochrome tags - no color coding
  const getTagColor = (): string => {
    return 'bg-muted hover:bg-muted/80 text-foreground';
  };

  const videoIsPlaylist = isPlaylist(video);

  // Get thumbnail URL based on video type
  const thumbnailUrl = (() => {
    // Playlist videos: use their pre-set thumbnail field
    if (videoIsPlaylist) {
      // If thumbnail is placeholder and we have access to all videos, try to use first video's thumbnail
      if (video.thumbnail === '/placeholder-thumbnail.jpg' && allVideos && video.videoIds && video.videoIds.length > 0) {
        const firstVideoId = video.videoIds[0];
        const firstVideo = allVideos.find(v => v.id === firstVideoId);
        if (firstVideo) {
          return getVideoThumbnailUrl(firstVideo, 'high');
        }
      }
      return video.thumbnail;
    }
    // Single videos (YouTube or Mux): use helper to get correct thumbnail
    return getVideoThumbnailUrl(video, 'high');
  })();

  return (
    <div className="relative group h-full">
      <PaywallLink
        href={getVideoUrl(video.id, video.isFree ?? false)}
        className="block h-full"
        isFree={video.isFree}
      >
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 h-full flex flex-col p-0 pb-4">
          <div className="relative aspect-video bg-muted overflow-hidden m-0">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={video.title}
                fill
                unoptimized
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Play className="w-16 h-16 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
              {!video.isFree && !hasSubscriberRole ? (
                <button
                  className="bg-black/60 backdrop-blur-sm p-3 rounded-full hover:scale-110 transition-transform duration-200 group/icon"
                  aria-label="Premium content"
                >
                  <Lock className="w-6 h-6 text-white group-hover/icon:text-primary transition-colors" />
                </button>
              ) : videoIsPlaylist ? (
                <button
                  className="bg-black/60 backdrop-blur-sm p-3 rounded-full hover:scale-110 transition-transform duration-200 group/icon"
                  aria-label="Watch playlist"
                >
                  <ListVideo className="w-6 h-6 text-white group-hover/icon:text-primary transition-colors" />
                </button>
              ) : (
                <button
                  className="bg-black/60 backdrop-blur-sm p-3 rounded-full hover:scale-110 transition-transform duration-200 group/icon"
                  aria-label="Watch video"
                >
                  <Play className="w-6 h-6 text-white group-hover/icon:text-primary transition-colors" />
                </button>
              )}
            </div>
            {videoIsPlaylist && (
              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                <ListVideo className="w-3 h-3" />
                Playlist
                {video.videoIds && video.videoIds.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px] font-medium">
                    {video.videoIds.length}
                  </span>
                )}
              </div>
            )}
            {!video.isFree && !hasSubscriberRole && (
              <div className="absolute bottom-2 right-2 bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium z-20">
                <Lock className="w-2.5 h-2.5" />
                Premium
              </div>
            )}
          </div>
          <CardHeader className="flex-1 pb-3">
            <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </CardTitle>
            <CardDescription className="line-clamp-3">
              {video.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>{formatDate(video.date)}</span>
            </div>
          </CardContent>
        </Card>
      </PaywallLink>

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
                onEdit(video);
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
                onDelete(video);
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
