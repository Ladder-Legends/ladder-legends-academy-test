'use client';

import { PermissionGate } from '@/components/auth/permission-gate';
import { BuildOrderEditModal } from '@/components/admin/build-order-edit-modal';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import Link from 'next/link';
import { BuildOrder } from '@/types/build-order';
import { ArrowLeft, Edit, Trash2, Download } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { SubscriberBadge } from '@/components/subscriber-badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTrackPageView } from '@/hooks/use-track-page-view';
import replaysData from '@/data/replays.json';
import videosData from '@/data/videos.json';
import { Replay } from '@/types/replay';
import { Video } from '@/types/video';
import { usePlaylistNavigation } from '@/hooks/use-playlist-navigation';
import { VideoPlayer } from '@/components/videos/video-player';
import { PlaylistSidebar } from '@/components/videos/playlist-sidebar';

const allReplays = replaysData as Replay[];
const allVideos = videosData as Video[];

interface BuildOrderDetailClientProps {
  buildOrder: BuildOrder;
}

export function BuildOrderDetailClient({ buildOrder }: BuildOrderDetailClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Look up videos from videoIds
  const buildOrderVideos = buildOrder.videoIds && buildOrder.videoIds.length > 0
    ? buildOrder.videoIds.map(videoId =>
        allVideos.find(v => v.id === videoId)
      ).filter(Boolean) as Video[]
    : [];

  const hasVideos = buildOrderVideos.length > 0;
  const hasMultipleVideos = buildOrderVideos.length > 1;

  // Use shared playlist navigation hook
  const { currentVideoIndex, currentVideo, handleVideoSelect } = usePlaylistNavigation({
    videos: buildOrderVideos,
    parentTitle: buildOrder.name,
    isPlaylist: hasMultipleVideos,
  });

  useTrackPageView({
    contentType: 'build-order',
    contentId: buildOrder.id,
    contentTitle: buildOrder.name,
    properties: {
      race: buildOrder.race,
      difficulty: buildOrder.difficulty,
      is_free: buildOrder.isFree || false,
      has_video: hasVideos,
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${buildOrder.name}"?`)) {
      console.log('Delete build order:', buildOrder.id);
      // The actual delete would be handled by the modal/CMS system
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'macro': return 'bg-blue-500/10 text-blue-500';
      case 'all-in': return 'bg-red-500/10 text-red-500';
      case 'timing': return 'bg-purple-500/10 text-purple-500';
      case 'cheese': return 'bg-orange-500/10 text-orange-500';
      case 'defensive': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Look up replay if replayId is present
  const linkedReplay = buildOrder.replayId
    ? allReplays.find(r => r.id === buildOrder.replayId)
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {/* Back Button & Admin Actions */}
            <div className="flex items-center justify-between">
              <Link
                href="/build-orders"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Build Orders
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
                    videos={buildOrderVideos}
                    currentVideoIndex={currentVideoIndex}
                    isPlaylist={hasMultipleVideos}
                  />
                </div>

                {/* Playlist Sidebar (only shown for playlists) */}
                {hasMultipleVideos && (
                  <PlaylistSidebar
                    videos={buildOrderVideos}
                    currentVideoIndex={currentVideoIndex}
                    onVideoSelect={handleVideoSelect}
                    showAdminControls={false}
                  />
                )}
              </div>
            )}

            {/* Title Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-bold">{buildOrder.name}</h1>
                <SubscriberBadge isFree={buildOrder.isFree} />
                {linkedReplay?.downloadUrl && (
                  <a
                    href={`/api/replay-download?replayId=${linkedReplay.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium ml-auto"
                  >
                    <Download className="h-4 w-4" />
                    Download Replay
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {buildOrder.type && (
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getTypeColor(buildOrder.type)}`}>
                    {buildOrder.type}
                  </span>
                )}
                <span className={`px-3 py-1.5 text-sm font-medium text-white rounded-full ${getDifficultyColor(buildOrder.difficulty)}`}>
                  {buildOrder.difficulty}
                </span>
                <span className="px-3 py-1.5 text-sm font-medium bg-muted rounded-full capitalize">
                  {buildOrder.race} vs {buildOrder.vsRace}
                </span>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">{buildOrder.description}</p>
            </div>

            {/* Info Card */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Build Order Information</h2>
              <dl className="grid md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Coach</dt>
                  <dd className="font-medium">{buildOrder.coach}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Matchup</dt>
                  <dd className="font-medium capitalize">{buildOrder.race} vs {buildOrder.vsRace}</dd>
                </div>
                {buildOrder.type && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Type</dt>
                    <dd className="font-medium capitalize">{buildOrder.type}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Difficulty</dt>
                  <dd className="font-medium capitalize">{buildOrder.difficulty}</dd>
                </div>
                {buildOrder.patch && (
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Patch</dt>
                    <dd className="font-medium">{buildOrder.patch}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Last Updated</dt>
                  <dd className="font-medium">{new Date(buildOrder.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>


            {/* Build Order Steps */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Build Order Steps</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Supply</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Time</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Action</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildOrder.steps.map((step, index) => (
                      <tr
                        key={index}
                        className={`border-t border-border ${index % 2 === 0 ? 'bg-card' : 'bg-muted/10'}`}
                      >
                        <td className="px-4 py-3 font-semibold">{step.supply}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{step.time || '-'}</td>
                        <td className="px-4 py-3 font-medium">{step.action}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{step.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tags */}
            {buildOrder.tags && buildOrder.tags.length > 0 && (
              <div className="border border-border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-semibold mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {buildOrder.tags.map(tag => (
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
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Edit Modal */}
      <BuildOrderEditModal
        buildOrder={buildOrder}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
