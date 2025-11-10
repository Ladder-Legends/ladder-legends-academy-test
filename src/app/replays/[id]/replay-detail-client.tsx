'use client';

import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { PermissionGate } from '@/components/auth/permission-gate';
import { ReplayEditModal } from '@/components/admin/replay-edit-modal';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';
import { Replay } from '@/types/replay';
import { Download, ArrowLeft, Calendar, Clock, Map, Edit, Trash2, FileText } from 'lucide-react';
import { SubscriberBadge } from '@/components/subscriber-badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTrackPageView } from '@/hooks/use-track-page-view';
import videosData from '@/data/videos.json';
import buildOrdersData from '@/data/build-orders.json';
import { Video as VideoType } from '@/types/video';
import { BuildOrder } from '@/types/build-order';
import { usePlaylistNavigation } from '@/hooks/use-playlist-navigation';
import { VideoPlayer } from '@/components/videos/video-player';
import { PlaylistSidebar } from '@/components/videos/playlist-sidebar';

interface ReplayDetailClientProps {
  replay: Replay;
}

export function ReplayDetailClient({ replay }: ReplayDetailClientProps) {
  const allVideos = videosData as VideoType[];
  const allBuildOrders = buildOrdersData as BuildOrder[];
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Look up videos from videoIds
  const replayVideos = replay.videoIds && replay.videoIds.length > 0
    ? replay.videoIds.map(videoId =>
        allVideos.find(v => v.id === videoId)
      ).filter(Boolean) as VideoType[]
    : [];

  // Find related build order (if this replay is linked to a build order)
  const relatedBuildOrder = allBuildOrders.find(bo => bo.replayId === replay.id);

  const hasVideos = replayVideos.length > 0;
  const hasMultipleVideos = replayVideos.length > 1;

  // Use shared playlist navigation hook
  const { currentVideoIndex, currentVideo, handleVideoSelect } = usePlaylistNavigation({
    videos: replayVideos,
    parentTitle: replay.title,
    isPlaylist: hasMultipleVideos,
  });

  useTrackPageView({
    contentType: 'replay',
    contentId: replay.id,
    contentTitle: replay.title,
    properties: {
      matchup: replay.matchup,
      is_free: replay.isFree || false,
      coach: replay.coach || undefined,
      has_video: hasVideos,
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${replay.title}"?`)) {
      console.log('Delete replay:', replay.id);
      // The actual delete would be handled by the modal/CMS system
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
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
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {/* Back Button & Admin Actions */}
            <div className="flex items-center justify-between">
              <Link
                href="/replays"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Replays
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

            {/* Video Player and Playlist Layout (if videos exist) */}
            {hasVideos && (
              <div className={hasMultipleVideos ? 'grid lg:grid-cols-4 gap-6' : ''}>
                {/* Main Video Player Section */}
                <div className={hasMultipleVideos ? 'lg:col-span-3' : ''}>
                  <VideoPlayer
                    videos={replayVideos}
                    currentVideoIndex={currentVideoIndex}
                    isPlaylist={hasMultipleVideos}
                  />
                </div>

                {/* Playlist Sidebar (only shown for playlists) */}
                {hasMultipleVideos && (
                  <PlaylistSidebar
                    videos={replayVideos}
                    currentVideoIndex={currentVideoIndex}
                    onVideoSelect={handleVideoSelect}
                    showAdminControls={false}
                  />
                )}
              </div>
            )}

            {/* Title Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-bold">{replay.title}</h1>
                <SubscriberBadge isFree={replay.isFree} />
                {replay.downloadUrl && (
                  <a
                    href={`/api/replay-download?replayId=${replay.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium ml-auto"
                  >
                    <Download className="h-4 w-4" />
                    Download Replay
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(replay.gameDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {replay.duration}
                </div>
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  {replay.map}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{replay.matchup}</span>
                </div>
              </div>
            </div>

            {/* Players Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Players</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`p-4 rounded-lg border-2 ${replay.player1.result === 'win' ? 'border-green-500 bg-green-500/5' : 'border-border bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${getRaceColor(replay.player1.race)}`}>
                        {replay.player1.race.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-lg font-semibold">{replay.player1.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{replay.player1.race}</div>
                      </div>
                    </div>
                    {replay.player1.result === 'win' && (
                      <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                        WIN
                      </span>
                    )}
                  </div>
                  {replay.player1.mmr && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">MMR:</span>{' '}
                      <span className="font-semibold">{replay.player1.mmr}</span>
                    </div>
                  )}
                </div>

                <div className={`p-4 rounded-lg border-2 ${replay.player2.result === 'win' ? 'border-green-500 bg-green-500/5' : 'border-border bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${getRaceColor(replay.player2.race)}`}>
                        {replay.player2.race.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-lg font-semibold">{replay.player2.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{replay.player2.race}</div>
                      </div>
                    </div>
                    {replay.player2.result === 'win' && (
                      <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                        WIN
                      </span>
                    )}
                  </div>
                  {replay.player2.mmr && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">MMR:</span>{' '}
                      <span className="font-semibold">{replay.player2.mmr}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Details Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Replay Details</h2>
              <dl className="grid md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Map</dt>
                  <dd className="font-medium">{replay.map}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Matchup</dt>
                  <dd className="font-medium">{replay.matchup}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Duration</dt>
                  <dd className="font-medium">{replay.duration}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Game Date</dt>
                  <dd className="font-medium">{new Date(replay.gameDate).toLocaleDateString()}</dd>
                </div>
                {replay.patch && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Patch</dt>
                    <dd className="font-medium">{replay.patch}</dd>
                  </div>
                )}
                {replay.coach && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                    <dd className="font-medium">{replay.coach}</dd>
                  </div>
                )}
                {relatedBuildOrder && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Related Build Order</dt>
                    <dd>
                      <Link
                        href={`/build-orders/${relatedBuildOrder.id}`}
                        className="font-medium text-primary hover:underline inline-flex items-center gap-1.5"
                      >
                        <FileText className="h-4 w-4" />
                        {relatedBuildOrder.name}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>

              {replay.notes && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{replay.notes}</p>
                </div>
              )}

              {replay.tags && replay.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {replay.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-muted text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Edit Modal */}
      <ReplayEditModal
        replay={replay}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
