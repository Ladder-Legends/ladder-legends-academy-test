'use client';

import { PermissionGate } from '@/components/auth/permission-gate';
import { MasterclassEditModal } from '@/components/admin/masterclass-edit-modal';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';
import { Masterclass } from '@/types/masterclass';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { SubscriberBadge } from '@/components/subscriber-badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTrackPageView } from '@/hooks/use-track-page-view';
import { ShareDialog } from '@/components/social/share-dialog';
import { toast } from 'sonner';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Video } from '@/types/video';
import videosData from '@/data/videos.json';
import { Replay, normalizeReplays } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import replaysData from '@/data/replays.json';
import buildOrdersData from '@/data/build-orders.json';
import { usePlaylistNavigation } from '@/hooks/use-playlist-navigation';
import { VideoPlayer } from '@/components/videos/video-player';
import { PlaylistSidebar } from '@/components/videos/playlist-sidebar';
import { SoftPaywallOverlay } from '@/components/paywall/soft-paywall-overlay';

interface MasterclassDetailClientProps {
  masterclass: Masterclass;
}

export function MasterclassDetailClient({ masterclass }: MasterclassDetailClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  // Determine if paywall should be shown
  const isPremiumContent = !masterclass.isFree;
  const showPaywall = isPremiumContent && !hasSubscriberRole;

  useTrackPageView({
    contentType: 'masterclass',
    contentId: masterclass.id,
    contentTitle: masterclass.title,
    properties: {
      is_free: masterclass.isFree || false,
      coach: masterclass.coach || undefined,
      tags: masterclass.tags,
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${masterclass.title}"?`)) {
      addChange({
        id: masterclass.id,
        contentType: 'masterclasses',
        operation: 'delete',
        data: masterclass as unknown as Record<string, unknown>,
      });
      toast.success('Masterclass marked for deletion (pending commit)');
    }
  };

  const getRaceColor = (race: string) => {
    switch (race.toLowerCase()) {
      case 'terran': return 'text-orange-500';
      case 'zerg': return 'text-purple-500';
      case 'protoss': return 'text-cyan-500';
      default: return 'text-muted-foreground';
    }
  };

  // Look up videos
  const videos = videosData as Video[];
  const masterclassVideos = masterclass.videoIds && masterclass.videoIds.length > 0
    ? masterclass.videoIds.map(videoId =>
        videos.find(v => v.id === videoId || v.youtubeId === videoId)
      ).filter(Boolean) as Video[]
    : [];

  const hasMultipleVideos = masterclassVideos.length > 1;

  // Use shared playlist navigation hook
  const { currentVideoIndex, currentVideo, handleVideoSelect } = usePlaylistNavigation({
    videos: masterclassVideos,
    parentTitle: masterclass.title,
    isPlaylist: hasMultipleVideos,
  });

  // Look up replays and normalize so winner is always player1
  const allReplays = normalizeReplays(replaysData as Replay[]);
  const masterclassReplays = masterclass.replayIds && masterclass.replayIds.length > 0
    ? masterclass.replayIds.map(replayId =>
        allReplays.find(r => r.id === replayId)
      ).filter(Boolean) as Replay[]
    : [];

  // Look up build orders associated with the replays
  const allBuildOrders = buildOrdersData as BuildOrder[];
  const replayBuildOrders = new Map<string, BuildOrder[]>();
  masterclassReplays.forEach(replay => {
    const buildOrders = allBuildOrders.filter(bo => bo.replayId === replay.id);
    if (buildOrders.length > 0) {
      replayBuildOrders.set(replay.id, buildOrders);
    }
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 px-4 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {/* Back Button & Admin Actions */}
            <div className="flex items-center justify-between">
              <Link
                href="/masterclasses"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Masterclasses
              </Link>

              <div className="flex items-center gap-2">
                {/* Share Button */}
                <ShareDialog
                  url={`/masterclasses/${masterclass.id}`}
                  title={masterclass.title}
                  description={masterclass.description}
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
            <div className={hasMultipleVideos ? 'grid lg:grid-cols-4 gap-6' : ''}>
              {/* Main Video Player Section */}
              <div className={hasMultipleVideos ? 'lg:col-span-3' : ''}>
                {/* Video Player */}
                <div className="relative">
                  <VideoPlayer
                    videos={masterclassVideos}
                    currentVideoIndex={currentVideoIndex}
                    isPlaylist={hasMultipleVideos}
                    showPaywallPreview={showPaywall}
                  />
                  {/* Inline paywall overlay on video player */}
                  <SoftPaywallOverlay
                    show={showPaywall}
                    title="Premium Masterclass"
                    description="Subscribe to access exclusive masterclass content from professional coaches."
                    variant="inline"
                  />
                </div>

                {/* Masterclass Info */}
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold">{hasMultipleVideos ? currentVideo?.title || masterclass.title : masterclass.title}</h1>
                      <SubscriberBadge isFree={masterclass.isFree} />
                    </div>
                    {hasMultipleVideos && currentVideo && (
                      <p className="text-sm text-muted-foreground">
                        From masterclass: {masterclass.title}
                      </p>
                    )}
                    <p className="text-lg text-muted-foreground leading-relaxed">{hasMultipleVideos ? currentVideo?.description || masterclass.description : masterclass.description}</p>
                  </div>

                  {/* Info Card */}
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <h2 className="text-xl font-semibold mb-4">Masterclass Information</h2>
                    <dl className="grid md:grid-cols-2 gap-4">
                      {masterclass.coach && (
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                          <dd className="font-medium">{masterclass.coach}</dd>
                        </div>
                      )}
                      {masterclass.race && (
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Race</dt>
                          <dd className={`font-medium capitalize ${getRaceColor(masterclass.race)}`}>{masterclass.race}</dd>
                        </div>
                      )}
                      {masterclass.difficulty && (
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Difficulty</dt>
                          <dd className="font-medium capitalize">{masterclass.difficulty}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm text-muted-foreground mb-1">Created</dt>
                        <dd className="font-medium">{new Date(masterclass.createdAt).toLocaleDateString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground mb-1">Last Updated</dt>
                        <dd className="font-medium">{new Date(masterclass.updatedAt).toLocaleDateString()}</dd>
                      </div>
                      {hasMultipleVideos && (
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Videos</dt>
                          <dd className="font-medium">{masterclassVideos.length} videos</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Tags */}
                  {masterclass.tags && masterclass.tags.length > 0 && (
                    <div className="border border-border rounded-lg p-6 bg-card">
                      <h2 className="text-xl font-semibold mb-4">Tags</h2>
                      <div className="flex flex-wrap gap-2">
                        {masterclass.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-1.5 bg-muted text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Replays Section */}
                  {masterclassReplays.length > 0 && (
                    <div className="border border-border rounded-lg p-6 bg-card">
                      <h2 className="text-xl font-semibold mb-4">Example Replays</h2>
                      <div className="space-y-4">
                        {masterclassReplays.map(replay => (
                          <div key={replay.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                            <Link href={`/replays/${replay.id}`} className="block">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">{replay.title}</h3>
                                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                    <span>{replay.matchup}</span>
                                    <span>•</span>
                                    <span>{replay.map}</span>
                                    <span>•</span>
                                    <span>{replay.duration}</span>
                                  </div>
                                </div>
                                <div className="text-primary hover:underline">View →</div>
                              </div>
                            </Link>

                            {/* Associated Build Orders */}
                            {replayBuildOrders.has(replay.id) && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Related Build Orders:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {replayBuildOrders.get(replay.id)!.map(buildOrder => (
                                    <Link
                                      key={buildOrder.id}
                                      href={`/build-orders/${buildOrder.id}`}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-md text-sm hover:bg-primary/20 transition-colors"
                                    >
                                      {buildOrder.name}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Sidebar (only shown for playlists) */}
              {hasMultipleVideos && (
                <PlaylistSidebar
                  videos={masterclassVideos}
                  currentVideoIndex={currentVideoIndex}
                  onVideoSelect={handleVideoSelect}
                  showAdminControls={false}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Edit Modal */}
      <MasterclassEditModal
        masterclass={masterclass}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
