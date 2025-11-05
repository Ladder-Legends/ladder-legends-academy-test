'use client';

import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { PermissionGate } from '@/components/auth/permission-gate';
import { VideoEditModal } from '@/components/admin/video-edit-modal';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';
import { Video, isPlaylist, isMuxVideo, getVideoThumbnailUrl } from '@/types/video';
import videos from '@/data/videos.json';
import { ArrowLeft, CalendarDays, Edit, Trash2, X, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { MuxVideoPlayer } from '@/components/videos/mux-video-player';
import { useTrackPageView } from '@/hooks/use-track-page-view';
import { toast } from 'sonner';
import { usePendingChanges } from '@/hooks/use-pending-changes';

interface VideoDetailClientProps {
  video: Video;
}

export function VideoDetailClient({ video }: VideoDetailClientProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlaylistVideo, setEditingPlaylistVideo] = useState<Video | null>(null);
  const [isPlaylistVideoEditModalOpen, setIsPlaylistVideoEditModalOpen] = useState(false);
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  const videoIsPlaylist = isPlaylist(video);

  // For playlists, load the referenced videos
  const allPlaylistVideos = videoIsPlaylist
    ? (video.videoIds || []).map(id => (videos as Video[]).find(v => v.id === id)).filter(Boolean) as Video[]
    : [];

  // Filter playlist videos based on user access - if playlist is free, only show free videos
  const playlistVideos = videoIsPlaylist
    ? allPlaylistVideos.filter(v => {
        // If user has subscriber role, show all videos
        if (hasSubscriberRole) return true;
        // If the playlist itself is free, only show free videos
        if (video.isFree) return v.isFree === true;
        // Otherwise show all (this handles premium playlists viewed by non-subscribers - they shouldn't see this anyway)
        return true;
      })
    : [];

  // Get current video to play
  const currentVideo = videoIsPlaylist ? playlistVideos[currentVideoIndex] : video;
  const currentYoutubeId = currentVideo?.youtubeId;

  // Track video view
  useTrackPageView({
    contentType: 'video',
    contentId: video.id.toString(),
    contentTitle: video.title,
    properties: {
      is_playlist: videoIsPlaylist,
      is_free: video.isFree || false,
      coach: video.coach || undefined,
      tags: video.tags,
      video_count: videoIsPlaylist ? playlistVideos.length : 1,
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${video.title}"?`)) {
      console.log('Delete video:', video.id);
      // The actual delete would be handled by the modal/CMS system
    }
  };

  const handleEditPlaylistVideo = (plVideo: Video) => {
    setEditingPlaylistVideo(plVideo);
    setIsPlaylistVideoEditModalOpen(true);
  };

  const handleRemoveFromPlaylist = (videoIdToRemove: string) => {
    if (!video.videoIds) return;

    const updatedVideoIds = video.videoIds.filter(id => id !== videoIdToRemove);
    const updatedVideo = { ...video, videoIds: updatedVideoIds };

    addChange({
      id: video.id,
      contentType: 'videos',
      operation: 'update',
      data: updatedVideo as unknown as Record<string, unknown>,
    });

    toast.success('Video removed from playlist (pending commit)');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <Image
                  src="/LL_LOGO.png"
                  alt="Ladder Legends"
                  width={48}
                  height={48}
                  unoptimized
                  className="object-contain"
                  priority
                />
                <h1 className="text-2xl font-bold hidden lg:block">Ladder Legends Academy</h1>
              </Link>

              <MainNav />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {/* Back Button & Admin Actions */}
            <div className="flex items-center justify-between">
              <Link
                href="/library"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Library
              </Link>

              {/* Admin Actions */}
              <PermissionGate require="coaches">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </PermissionGate>
            </div>

            {/* Video Player and Playlist Layout */}
            <div className={videoIsPlaylist ? 'grid lg:grid-cols-4 gap-6' : ''}>
              {/* Main Video Player Section */}
              <div className={videoIsPlaylist ? 'lg:col-span-3' : ''}>
                {/* Video Player */}
                {isMuxVideo(currentVideo) ? (
                  // Mux Video Player
                  currentVideo?.muxPlaybackId ? (
                    <MuxVideoPlayer
                      playbackId={currentVideo.muxPlaybackId}
                      videoId={currentVideo.id}
                      title={currentVideo.title}
                      className="rounded-lg overflow-hidden"
                    />
                  ) : (
                    <div className="aspect-video bg-black/10 rounded-lg flex items-center justify-center">
                      <div className="text-center p-4">
                        <p className="text-muted-foreground">
                          {currentVideo?.muxAssetStatus === 'preparing' ? 'Video is processing...' : 'Video not available'}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  // YouTube Video Player
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${currentYoutubeId}`}
                      title={currentVideo?.title || video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}

                {/* Video Info */}
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold">{videoIsPlaylist ? currentVideo?.title || video.title : video.title}</h1>
                    {videoIsPlaylist && currentVideo && (
                      <p className="text-sm text-muted-foreground">
                        From playlist: {video.title}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        <span>{formatDate(videoIsPlaylist ? currentVideo?.date || video.date : video.date)}</span>
                      </div>
                      {(videoIsPlaylist ? currentVideo?.coach || video.coach : video.coach) && (
                        <>
                          <span>•</span>
                          <span>Coach: {videoIsPlaylist ? currentVideo?.coach || video.coach : video.coach}</span>
                        </>
                      )}
                      {videoIsPlaylist && (
                        <>
                          <span>•</span>
                          <span>{playlistVideos.length} videos</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {((videoIsPlaylist ? currentVideo?.tags : video.tags) && (videoIsPlaylist ? currentVideo?.tags : video.tags)!.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {(videoIsPlaylist ? currentVideo?.tags || video.tags : video.tags).map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-muted hover:bg-muted/80 text-foreground border-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {(videoIsPlaylist ? currentVideo?.description || video.description : video.description) && (
                    <div className="border border-border rounded-lg p-6 bg-card">
                      <h2 className="text-xl font-semibold mb-3">About</h2>
                      <p className="text-muted-foreground leading-relaxed">{videoIsPlaylist ? currentVideo?.description || video.description : video.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Sidebar (only shown for playlists) */}
              {videoIsPlaylist && (
                <div className="lg:col-span-1">
                  <div className="border border-border rounded-lg bg-card overflow-hidden sticky top-24">
                    <div className="max-h-[600px] overflow-y-auto">
                      {playlistVideos.map((plVideo, index) => (
                        <div
                          key={plVideo.id}
                          className={`relative group border-b-2 border-foreground/20 last:border-b-0 ${
                            currentVideoIndex === index ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <button
                            onClick={() => setCurrentVideoIndex(index)}
                            className="w-full p-2 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex flex-col px-2">
                              {/* Thumbnail - uses helper to get correct URL for YouTube/Mux videos */}
                              <div className="aspect-video bg-muted rounded overflow-hidden mb-2 w-full">
                                <Image
                                  key={`${plVideo.id}-thumb`}
                                  src={getVideoThumbnailUrl(plVideo, 'medium')}
                                  alt={plVideo.title}
                                  width={320}
                                  height={180}
                                  unoptimized
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <p className="text-xs font-medium line-clamp-2 text-center pb-1 w-full">{plVideo.title}</p>
                            </div>
                          </button>

                          {/* Edit and Remove buttons (only for coaches/owners) */}
                          <PermissionGate require="coaches">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPlaylistVideo(plVideo);
                                }}
                                className="p-1.5 bg-background/90 hover:bg-background border border-border rounded-md transition-colors"
                                title="Edit video"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Remove "${plVideo.title}" from this playlist?`)) {
                                    handleRemoveFromPlaylist(plVideo.id);
                                  }
                                }}
                                className="p-1.5 bg-background/90 hover:bg-destructive hover:text-destructive-foreground border border-border hover:border-destructive rounded-md transition-colors"
                                title="Remove from playlist"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </PermissionGate>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Edit Modal for Playlist */}
      <VideoEditModal
        video={video}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Edit Modal for Individual Playlist Videos */}
      {editingPlaylistVideo && (
        <VideoEditModal
          video={editingPlaylistVideo}
          isOpen={isPlaylistVideoEditModalOpen}
          onClose={() => {
            setIsPlaylistVideoEditModalOpen(false);
            setEditingPlaylistVideo(null);
          }}
        />
      )}
    </div>
  );
}
