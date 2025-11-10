'use client';

import { Video, getVideoThumbnailUrl } from '@/types/video';
import Image from 'next/image';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Pencil, X } from 'lucide-react';

interface PlaylistSidebarProps {
  videos: Video[];
  currentVideoIndex: number;
  onVideoSelect: (index: number) => void;
  showAdminControls?: boolean;
  onEditVideo?: (video: Video) => void;
  onRemoveVideo?: (videoId: string) => void;
}

/**
 * Reusable playlist sidebar component
 *
 * Features:
 * - Sticky sidebar that scrolls independently
 * - Video thumbnails with active state highlighting
 * - Optional admin controls (edit/remove) for coaches
 *
 * @example
 * <PlaylistSidebar
 *   videos={playlistVideos}
 *   currentVideoIndex={2}
 *   onVideoSelect={handleVideoSelect}
 *   showAdminControls={true}
 *   onEditVideo={handleEdit}
 *   onRemoveVideo={handleRemove}
 * />
 */
export function PlaylistSidebar({
  videos,
  currentVideoIndex,
  onVideoSelect,
  showAdminControls = false,
  onEditVideo,
  onRemoveVideo,
}: PlaylistSidebarProps) {
  return (
    <div className="lg:col-span-1">
      <div className="border border-border rounded-lg bg-card overflow-hidden sticky top-24">
        <div className="h-[calc(100vh-7rem)] overflow-y-auto">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={`relative group border-b-2 border-foreground/20 last:border-b-0 ${
                currentVideoIndex === index ? 'bg-primary/10 border-l-4 border-l-primary' : ''
              }`}
            >
              <button
                onClick={() => onVideoSelect(index)}
                className="w-full p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col px-2">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-muted rounded overflow-hidden mb-2 w-full">
                    <Image
                      key={`${video.id}-thumb`}
                      src={getVideoThumbnailUrl(video, 'medium')}
                      alt={video.title}
                      width={320}
                      height={180}
                      unoptimized
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <p className="text-xs font-medium line-clamp-2 text-center pb-1 w-full">{video.title}</p>
                </div>
              </button>

              {/* Edit and Remove buttons (only for coaches/owners when enabled) */}
              {showAdminControls && (
                <PermissionGate require="coaches">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEditVideo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditVideo(video);
                        }}
                        className="p-1.5 bg-background/90 hover:bg-background border border-border rounded-md transition-colors"
                        title="Edit video"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onRemoveVideo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove "${video.title}" from this playlist?`)) {
                            onRemoveVideo(video.id);
                          }
                        }}
                        className="p-1.5 bg-background/90 hover:bg-destructive hover:text-destructive-foreground border border-border hover:border-destructive rounded-md transition-colors"
                        title="Remove from playlist"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </PermissionGate>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
