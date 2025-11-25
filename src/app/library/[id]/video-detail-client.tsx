'use client';

import { PermissionGate } from '@/components/auth/permission-gate';
import { VideoEditModal } from '@/components/admin/video-edit-modal';
import { Footer } from '@/components/footer';
import Link from 'next/link';
import { Video, isPlaylist } from '@/types/video';
import {
  videos,
  buildOrders as buildOrdersData,
  replays as replaysData,
  masterclasses as masterclassesData,
} from '@/lib/data';
import { normalizeReplays } from '@/types/replay';
import { ArrowLeft, CalendarDays, Edit, Trash2, FileText, PlayCircle, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTrackPageView } from '@/hooks/use-track-page-view';
import { toast } from 'sonner';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { ShareDialog } from '@/components/social/share-dialog';
import { usePlaylistNavigation } from '@/hooks/use-playlist-navigation';
import { VideoPlayer } from '@/components/videos/video-player';
import { PlaylistSidebar } from '@/components/videos/playlist-sidebar';
import { BuildOrder } from '@/types/build-order';
import { Replay } from '@/types/replay';
import { Masterclass } from '@/types/masterclass';
import { SoftPaywallOverlay } from '@/components/paywall/soft-paywall-overlay';

interface VideoDetailClientProps {
  video: Video;
}

export function VideoDetailClient({ video }: VideoDetailClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlaylistVideo, setEditingPlaylistVideo] = useState<Video | null>(null);
  const [isPlaylistVideoEditModalOpen, setIsPlaylistVideoEditModalOpen] = useState(false);
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  // Determine if paywall should be shown
  const isPremiumContent = !video.isFree;
  const showPaywall = isPremiumContent && !hasSubscriberRole;

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
    : [video];

  // Use shared playlist navigation hook
  const { currentVideoIndex, currentVideo, handleVideoSelect } = usePlaylistNavigation({
    videos: playlistVideos,
    parentTitle: video.title,
    isPlaylist: videoIsPlaylist,
  });

  // Find related content - build orders, replays, and masterclasses that reference this video
  const allBuildOrders = buildOrdersData as BuildOrder[];
  const allReplays = normalizeReplays(replaysData as Replay[]); // Normalize so winner is always player1
  const allMasterclasses = masterclassesData as Masterclass[];

  // Find replays that reference this video
  const relatedReplays = allReplays.filter(replay =>
    replay.videoIds && replay.videoIds.includes(video.id)
  );

  // Find build orders that reference this video OR build orders linked to replays that reference this video
  const relatedBuildOrders = allBuildOrders.filter(bo => {
    // Direct video link
    if (bo.videoIds && bo.videoIds.includes(video.id)) {
      return true;
    }
    // Indirect link via replay
    if (bo.replayId) {
      const linkedReplay = relatedReplays.find(r => r.id === bo.replayId);
      if (linkedReplay) {
        return true;
      }
    }
    return false;
  });

  const relatedMasterclasses = allMasterclasses.filter(mc =>
    mc.videoIds && mc.videoIds.includes(video.id)
  );

  const hasRelatedContent = relatedBuildOrders.length > 0 || relatedReplays.length > 0 || relatedMasterclasses.length > 0;

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
      addChange({
        id: video.id,
        contentType: 'videos',
        operation: 'delete',
        data: video,
      });
      toast.success('Video marked for deletion (pending commit)');
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
      data: updatedVideo,
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

              <div className="flex items-center gap-2">
                {/* Share Button */}
                <ShareDialog
                  url={`/library/${video.id}`}
                  title={videoIsPlaylist ? currentVideo?.title || video.title : video.title}
                  description={videoIsPlaylist ? currentVideo?.description || video.description : video.description}
                  imageUrl={videoIsPlaylist ? currentVideo?.thumbnail || video.thumbnail : video.thumbnail}
                />

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
            </div>

            {/* Video Player and Playlist Layout */}
            <div className={videoIsPlaylist ? 'grid lg:grid-cols-4 gap-6' : ''}>
              {/* Main Video Player Section */}
              <div className={videoIsPlaylist ? 'lg:col-span-3' : ''}>
                {/* Video Player */}
                <div className="relative">
                  <VideoPlayer
                    videos={playlistVideos}
                    currentVideoIndex={currentVideoIndex}
                    isPlaylist={videoIsPlaylist}
                    showPaywallPreview={showPaywall}
                  />
                  {/* Inline paywall overlay on video player */}
                  <SoftPaywallOverlay
                    show={showPaywall}
                    title="Premium Video"
                    description="Subscribe to watch exclusive coaching videos from Grandmaster players."
                    variant="inline"
                  />
                </div>

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

                  {/* Related Content */}
                  {hasRelatedContent && (
                    <div className="border border-border rounded-lg p-6 bg-card">
                      <h2 className="text-xl font-semibold mb-4">Related Content</h2>
                      <div className="space-y-6">
                        {/* Build Orders */}
                        {relatedBuildOrders.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Build Orders ({relatedBuildOrders.length})
                            </h3>
                            <div className="space-y-2">
                              {relatedBuildOrders.map(bo => (
                                <Link
                                  key={bo.id}
                                  href={`/build-orders/${bo.id}`}
                                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                  <div>
                                    <p className="font-medium">{bo.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {bo.race} vs {bo.vsRace} • {bo.difficulty}
                                    </p>
                                  </div>
                                  <ArrowLeft className="h-4 w-4 rotate-180" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Replays */}
                        {relatedReplays.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                              <PlayCircle className="h-4 w-4" />
                              Replays ({relatedReplays.length})
                            </h3>
                            <div className="space-y-2">
                              {relatedReplays.map(replay => (
                                <Link
                                  key={replay.id}
                                  href={`/replays/${replay.id}`}
                                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                  <div>
                                    <p className="font-medium">{replay.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {replay.matchup} • {replay.map} • {replay.duration}
                                    </p>
                                  </div>
                                  <ArrowLeft className="h-4 w-4 rotate-180" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Masterclasses */}
                        {relatedMasterclasses.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              Masterclasses ({relatedMasterclasses.length})
                            </h3>
                            <div className="space-y-2">
                              {relatedMasterclasses.map(mc => (
                                <Link
                                  key={mc.id}
                                  href={`/masterclasses/${mc.id}`}
                                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                  <div>
                                    <p className="font-medium">{mc.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {mc.race !== 'all' ? mc.race : 'All Races'} • {mc.difficulty}
                                    </p>
                                  </div>
                                  <ArrowLeft className="h-4 w-4 rotate-180" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Sidebar (only shown for playlists) */}
              {videoIsPlaylist && (
                <PlaylistSidebar
                  videos={playlistVideos}
                  currentVideoIndex={currentVideoIndex}
                  onVideoSelect={handleVideoSelect}
                  showAdminControls={true}
                  onEditVideo={handleEditPlaylistVideo}
                  onRemoveVideo={handleRemoveFromPlaylist}
                />
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
