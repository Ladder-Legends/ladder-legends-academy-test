'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Filter, Edit } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Footer } from '@/components/footer';
import { VideoCard } from '@/components/videos/video-card';
import { ReplayCard } from '@/components/replays/replay-card';
import { BuildOrderCard } from '@/components/build-orders/build-order-card';
import { MasterclassCard } from '@/components/masterclasses/masterclass-card';
import { EventCard } from '@/components/events/event-card';
import { DidYouKnow } from '@/components/coaches/did-you-know';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { CoachEditModal } from '@/components/admin/coach-edit-modal';
import { ShareDialog } from '@/components/social/share-dialog';
import type { Video } from '@/types/video';
import type { Replay } from '@/types/replay';
import type { BuildOrder } from '@/types/build-order';
import type { Masterclass } from '@/types/masterclass';
import type { Event } from '@/types/event';
import type { Coach } from '@/types/coach';

interface CoachDetailClientProps {
  coach: Coach;
  videos: Video[];
  replays: Replay[];
  buildOrders: BuildOrder[];
  masterclasses: Masterclass[];
  events: Event[];
  allVideos?: Video[]; // Optional: used to resolve playlist thumbnails
}

export function CoachDetailClient({ coach, videos, replays, buildOrders, masterclasses, events, allVideos }: CoachDetailClientProps) {
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const [isCoachEditModalOpen, setIsCoachEditModalOpen] = useState(false);
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  // Generic sort function for content
  const sortContent = <T extends { date?: string; uploadDate?: string; createdAt?: string; updatedAt?: string; gameDate?: string; isFree?: boolean }>(items: T[]) => {
    return [...items].sort((a, b) => {
      // For non-subscribers, prioritize free content first
      if (!hasSubscriberRole) {
        const aIsFree = a.isFree ?? false;
        const bIsFree = b.isFree ?? false;
        if (aIsFree !== bIsFree) {
          return bIsFree ? 1 : -1; // Free items come first
        }
      }

      // Then sort by date (newest first)
      const aDate = new Date(a.date || a.uploadDate || a.updatedAt || a.createdAt || a.gameDate || 0).getTime();
      const bDate = new Date(b.date || b.uploadDate || b.updatedAt || b.createdAt || b.gameDate || 0).getTime();
      return bDate - aDate; // Descending (newest first)
    });
  };

  // Sort all content types
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sortContent uses hasSubscriberRole which is included
  const sortedVideos = useMemo(() => sortContent(videos), [videos, hasSubscriberRole]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sortedReplays = useMemo(() => sortContent(replays), [replays, hasSubscriberRole]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sortedBuildOrders = useMemo(() => sortContent(buildOrders), [buildOrders, hasSubscriberRole]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sortedMasterclasses = useMemo(() => sortContent(masterclasses), [masterclasses, hasSubscriberRole]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sortedEvents = useMemo(() => sortContent(events), [events, hasSubscriberRole]);

  // Calculate total content count
  const totalContent = sortedVideos.length + sortedReplays.length + sortedBuildOrders.length + sortedMasterclasses.length + sortedEvents.length;

  const handleDelete = async (video: Video) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"?`)) {
      return;
    }
    addChange({
      id: video.id,
      contentType: 'videos',
      operation: 'delete',
      data: video,
    });
    toast.success('Video marked for deletion (pending commit)');
  };

  // Display label for coach (always show as "Coach")
  const coachLabel = 'Coach';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 px-6 py-12 pattern-circuit-content">
        <div className="max-w-7xl mx-auto">
          {/* Coach Header */}
          <div className="mb-8 relative">
            {/* Share and Edit Buttons */}
            <div className="absolute top-0 right-0 flex items-center gap-2">
              <ShareDialog
                url={`/coaches/${coach.id}`}
                title={coach.displayName}
                description={coach.bio}
              />
              <PermissionGate require="coaches">
                <Button
                  onClick={() => setIsCoachEditModalOpen(true)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Coach
                </Button>
              </PermissionGate>
            </div>

            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2">{coach.displayName}</h1>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block px-3 py-1.5 text-sm font-semibold rounded-md border border-border bg-secondary capitalize">
                  {coach.race === 'all' ? 'All Races' : coach.race}
                </span>
                <span className="text-muted-foreground text-sm">
                  {coachLabel}
                </span>
                {coach.pricePerHour && (
                  <span className="inline-block px-3 py-1.5 text-sm font-semibold rounded-md border-2 border-primary bg-primary/10 text-primary">
                    {coach.pricePerHour}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
                {coach.bio}
              </p>
            </div>
          </div>

          {/* Did You Know Section with Booking CTA */}
          <DidYouKnow
            className="mb-8"
            bookingUrl={coach.bookingUrl}
            hasSubscriberRole={hasSubscriberRole}
          />

          {/* Content Section */}
          <div className="border-t border-border pt-8 space-y-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  Content by {coach.displayName}
                </h2>
                <p className="text-muted-foreground">
                  {totalContent} {totalContent === 1 ? 'item' : 'items'}
                </p>
              </div>

              {/* Link to filtered library */}
              <Link
                href={`/library?coaches=${encodeURIComponent(coach.id)}`}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium"
              >
                <Filter className="h-4 w-4" />
                Advanced Filtering
              </Link>
            </div>

            {totalContent === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  No content available from this coach yet.
                </p>
              </div>
            ) : (
              <>
                {/* Videos */}
                {sortedVideos.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Videos ({sortedVideos.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {sortedVideos.map((video) => (
                        <VideoCard
                          key={video.id}
                          video={video}
                          onDelete={handleDelete}
                          allVideos={allVideos}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Masterclasses */}
                {sortedMasterclasses.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Masterclasses ({sortedMasterclasses.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {sortedMasterclasses.map((masterclass) => (
                        <MasterclassCard
                          key={masterclass.id}
                          masterclass={masterclass}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Build Orders */}
                {sortedBuildOrders.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Build Orders ({sortedBuildOrders.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {sortedBuildOrders.map((buildOrder) => (
                        <BuildOrderCard
                          key={buildOrder.id}
                          buildOrder={buildOrder}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Replays */}
                {sortedReplays.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Replays ({sortedReplays.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {sortedReplays.map((replay) => (
                        <ReplayCard
                          key={replay.id}
                          replay={replay}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Events */}
                {sortedEvents.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Events ({sortedEvents.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {sortedEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Coach Edit Modal */}
      <CoachEditModal
        isOpen={isCoachEditModalOpen}
        onClose={() => setIsCoachEditModalOpen(false)}
        coach={coach}
      />
    </div>
  );
}
