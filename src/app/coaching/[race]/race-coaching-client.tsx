'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/footer';
import { CoachCard } from '@/components/coaches/coach-card';
import { VideoCard } from '@/components/videos/video-card';
import { ReplayCard } from '@/components/replays/replay-card';
import { BuildOrderCard } from '@/components/build-orders/build-order-card';
import { ChevronRight } from 'lucide-react';
import type { Coach } from '@/types/coach';
import type { Video } from '@/types/video';
import type { Replay } from '@/types/replay';
import type { BuildOrder } from '@/types/build-order';

interface RaceConfig {
  title: string;
  color: string;
  description: string;
}

interface RaceCoachingClientProps {
  race: string;
  config: RaceConfig;
  coaches: Coach[];
  videos: Video[];
  replays: Replay[];
  buildOrders: BuildOrder[];
}

export function RaceCoachingClient({
  race,
  config,
  coaches,
  videos,
  replays,
  buildOrders,
}: RaceCoachingClientProps) {
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
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-8 py-16 md:py-24 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <div
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 ${
                race === 'zerg'
                  ? 'sepia'
                  : race === 'protoss'
                  ? '[filter:saturate(50%)]'
                  : 'grayscale'
              }`}
              style={{
                backgroundImage: `url(/${race}-hero-bg.jpg)`,
                backgroundPosition: 'center center',
                backgroundSize: 'cover',
              }}
            />
          </div>
          {/* Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-10`} />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center space-y-6 mb-12">
              <h1 className="text-4xl md:text-6xl font-bold">
                StarCraft 2 {config.title} Coaching
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                {config.description}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  href="/coaches"
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
                >
                  Meet Our Coaches
                </Link>
                <Link
                  href="/subscribe"
                  className="px-8 py-4 bg-card border-2 border-primary text-foreground rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors"
                >
                  Get Premium Access
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center p-6 bg-card rounded-lg border border-border">
                <div className="text-3xl font-bold text-primary">{coaches.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Expert Coaches</div>
              </div>
              <div className="text-center p-6 bg-card rounded-lg border border-border">
                <div className="text-3xl font-bold text-primary">{videos.length}+</div>
                <div className="text-sm text-muted-foreground mt-1">Video Lessons</div>
              </div>
              <div className="text-center p-6 bg-card rounded-lg border border-border">
                <div className="text-3xl font-bold text-primary">{buildOrders.length}+</div>
                <div className="text-sm text-muted-foreground mt-1">Build Orders</div>
              </div>
              <div className="text-center p-6 bg-card rounded-lg border border-border">
                <div className="text-3xl font-bold text-primary">{replays.length}+</div>
                <div className="text-sm text-muted-foreground mt-1">Pro Replays</div>
              </div>
            </div>
          </div>
        </section>

        {/* Coaches Section */}
        {coaches.length > 0 && (
          <section className="px-8 py-12 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {config.title} Coaches
                  </h2>
                  <p className="text-muted-foreground">
                    Learn from Grandmaster {config.title} players
                  </p>
                </div>
                <Link
                  href="/coaches"
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View All Coaches
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coaches.map((coach) => {
                  // Count videos for this coach
                  const coachVideoCount = videos.filter((video) => {
                    if (video.coachId && video.coachId === coach.id) return true;
                    if (video.coach?.toLowerCase() === coach.name.toLowerCase()) return true;
                    if (video.coach?.toLowerCase() === coach.displayName.toLowerCase()) return true;
                    return false;
                  }).length;

                  return <CoachCard key={coach.id} coach={coach} videoCount={coachVideoCount} />;
                })}
              </div>
            </div>
          </section>
        )}

        {/* Videos Section */}
        {videos.length > 0 && (
          <section className="px-8 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {config.title} Video Lessons
                  </h2>
                  <p className="text-muted-foreground">
                    Master strategies and techniques
                  </p>
                </div>
                <Link
                  href={`/library?races=${race}`}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View All Videos
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Build Orders Section */}
        {buildOrders.length > 0 && (
          <section className="px-8 py-12 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {config.title} Build Orders
                  </h2>
                  <p className="text-muted-foreground">
                    Proven builds from pro players
                  </p>
                </div>
                <Link
                  href={`/build-orders?races=${race}`}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View All Build Orders
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {buildOrders.map((buildOrder) => (
                  <BuildOrderCard key={buildOrder.id} buildOrder={buildOrder} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Replays Section */}
        {replays.length > 0 && (
          <section className="px-8 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {config.title} Pro Replays
                  </h2>
                  <p className="text-muted-foreground">
                    Learn from high-level gameplay
                  </p>
                </div>
                <Link
                  href="/replays"
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View All Replays
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {replays.map((replay) => (
                  <ReplayCard key={replay.id} replay={replay} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="px-8 py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-4xl font-bold">
              Ready to Master {config.title}?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join hundreds of players improving their {config.title} gameplay with personalized coaching
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/subscribe"
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
              >
                Start Learning Today
              </Link>
              <Link
                href="/coaches"
                className="px-8 py-4 bg-card border-2 border-primary text-foreground rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors"
              >
                Book a Coaching Session
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
