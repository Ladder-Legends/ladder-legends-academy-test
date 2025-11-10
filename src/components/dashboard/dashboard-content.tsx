'use client';

import { HorizontalVideoScroller } from './horizontal-video-scroller';
import { HorizontalCoachScroller } from './horizontal-coach-scroller';
import videos from '@/data/videos.json';
import coaches from '@/data/coaches.json';
import masterclassesData from '@/data/masterclasses.json';
import replaysData from '@/data/replays.json';
import buildOrdersData from '@/data/build-orders.json';
import { Video } from '@/types/video';
import { Coach } from '@/types/coach';
import { Masterclass } from '@/types/masterclass';
import { Replay } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { HorizontalScrollContainer } from '@/components/ui/horizontal-scroll-container';
import { ReplayCard } from '@/components/replays/replay-card';
import { MasterclassCard } from '@/components/masterclasses/masterclass-card';
import { BuildOrderCard } from '@/components/build-orders/build-order-card';

const allVideos = videos as Video[];
const allCoaches = coaches as Coach[];
const allMasterclasses = masterclassesData as Masterclass[];
const allReplays = replaysData as Replay[];
const allBuildOrders = buildOrdersData as BuildOrder[];

export function DashboardContent() {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  console.log('[DASHBOARD] hasSubscriberRole:', hasSubscriberRole);

  const featuredVideos = allVideos.slice(0, 8);
  const featuredMasterclasses = allMasterclasses.slice(0, 6);
  const featuredReplays = allReplays.slice(0, 6);
  const featuredBuildOrders = allBuildOrders.slice(0, 6);

  // Calculate stats for marketing
  const totalVideos = allVideos.length;
  const totalCoaches = allCoaches.filter(c => c.isActive !== false).length;
  const totalMasterclasses = allMasterclasses.length;
  const totalContent = totalVideos + totalMasterclasses + allReplays.length + allBuildOrders.length;

  return (
    <main className="flex-1">
      <div className="max-w-[1920px] mx-auto">
        {/* Hero Section - Enhanced marketing style */}
        <section className="relative px-8 py-16 md:py-24 lg:py-32 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

          <div className="relative max-w-5xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Master StarCraft 2 with
                <span className="block text-primary mt-2">Expert Coaching</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Learn from professional coaches through video tutorials, build orders, masterclasses, and personalized guidance
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {!session ? (
                <>
                  <Link
                    href="/library"
                    className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
                  >
                    Browse Free Content
                  </Link>
                  <Link
                    href="/subscribe"
                    className="px-8 py-4 bg-card border-2 border-primary text-foreground rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors"
                  >
                    Get Premium Access
                  </Link>
                </>
              ) : (
                <Link
                  href="/library"
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
                >
                  Explore Content Library
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 max-w-4xl mx-auto">
              <div className="space-y-1">
                <div className="text-4xl font-bold text-primary">{totalContent}+</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Lessons</div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-primary">{totalCoaches}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Expert Coaches</div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-primary">{totalMasterclasses}+</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Masterclasses</div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-primary">{allBuildOrders.length}+</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Build Orders</div>
              </div>
            </div>
          </div>
        </section>

        {/* Content sections with consistent padding */}
        <div className="px-8 py-8 space-y-16">

        {/* Latest VODs */}
        <HorizontalVideoScroller
          title="Latest VODs"
          videos={featuredVideos}
          viewAllHref="/library"
          viewAllLabel="View Full Library"
        />

        {/* Masterclasses */}
        {featuredMasterclasses.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Masterclasses</h2>
              <Link
                href="/masterclasses"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View All Masterclasses
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <HorizontalScrollContainer showFadeIndicator>
              <div className="flex gap-4 min-w-max items-stretch">
                {featuredMasterclasses.map((masterclass) => (
                  <div key={masterclass.id} className="w-80 flex-shrink-0">
                    <MasterclassCard masterclass={masterclass} />
                  </div>
                ))}
              </div>
            </HorizontalScrollContainer>
          </section>
        )}

        {/* Replays */}
        {featuredReplays.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Replays</h2>
              <Link
                href="/replays"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View All Replays
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <HorizontalScrollContainer showFadeIndicator>
              <div className="flex gap-4 min-w-max items-stretch">
                {featuredReplays.map((replay) => (
                  <div key={replay.id} className="w-80 flex-shrink-0">
                    <ReplayCard replay={replay} />
                  </div>
                ))}
              </div>
            </HorizontalScrollContainer>
          </section>
        )}

        {/* Build Orders */}
        {featuredBuildOrders.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Build Orders</h2>
              <Link
                href="/build-orders"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View All Build Orders
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <HorizontalScrollContainer showFadeIndicator>
              <div className="flex gap-4 min-w-max items-stretch">
                {featuredBuildOrders.map((buildOrder) => (
                  <div key={buildOrder.id} className="w-80 flex-shrink-0">
                    <BuildOrderCard buildOrder={buildOrder} />
                  </div>
                ))}
              </div>
            </HorizontalScrollContainer>
          </section>
        )}

          {/* Meet Our Coaches */}
          <HorizontalCoachScroller
            title="Meet Our Coaches"
            coaches={allCoaches}
            viewAllHref="/coaches"
          />
        </div>

        {/* Final CTA Section */}
        <section className="relative px-8 py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background" />
          <div className="relative max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Climb the Ladder?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of players improving their game with Ladder Legends Academy
            </p>
            {!session ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  href="/subscribe"
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg"
                >
                  Start Learning Today
                </Link>
                <Link
                  href="/library"
                  className="px-8 py-4 text-foreground rounded-lg font-semibold text-lg hover:bg-muted transition-colors"
                >
                  Browse Free Lessons
                </Link>
              </div>
            ) : (
              <Link
                href="/library"
                className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg"
              >
                Continue Learning
              </Link>
            )}
          </div>
        </section>

        <div className="mb-12" />
      </div>
    </main>
  );
}
