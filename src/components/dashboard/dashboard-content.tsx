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

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

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
          {/* Background Image */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 bg-cover bg-no-repeat grayscale opacity-25"
              style={{
                backgroundImage: 'url(/homepage-hero-bg.jpg)',
                backgroundPosition: 'center 45%', // Shift up to crop bottom bar
                backgroundSize: 'cover',
              }}
            />
          </div>
          {/* Strong center wash to hide logo and create clean button area */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_center,_var(--tw-gradient-stops))] from-background from-0% via-background via-40% via-background/80 via-60% to-transparent" />

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
                  <Link
                    href="https://discord.gg/uHzvKAqu3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-8 py-4 bg-[#5865F2] text-white rounded-lg font-semibold text-lg hover:bg-[#4752C4] transition-colors shadow-lg hover:shadow-xl"
                  >
                    <DiscordIcon className="h-6 w-6" />
                    Join Discord
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/library"
                    className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
                  >
                    Explore Content Library
                  </Link>
                  <Link
                    href="https://discord.gg/uHzvKAqu3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-8 py-4 bg-[#5865F2] text-white rounded-lg font-semibold text-lg hover:bg-[#4752C4] transition-colors shadow-lg hover:shadow-xl"
                  >
                    <DiscordIcon className="h-6 w-6" />
                    Join Discord
                  </Link>
                </>
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
              Join hundreds of players improving their game with Ladder Legends Academy
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
