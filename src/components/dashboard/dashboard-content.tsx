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

  return (
    <main className="flex-1 px-8 py-8">
      <div className="max-w-[1920px] mx-auto space-y-12">
        {/* Hero Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Welcome to Ladder Legends Academy</h1>
          <p className="text-lg text-muted-foreground">
            Master StarCraft 2 with coaching videos, build orders, and expert guidance
          </p>
        </div>

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
      <div className="mb-12" />
    </main>
  );
}
