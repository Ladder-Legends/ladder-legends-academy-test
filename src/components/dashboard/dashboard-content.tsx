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
import { ChevronRight, Play, Download, Video as VideoIcon } from 'lucide-react';

const allVideos = videos as Video[];
const allCoaches = coaches as Coach[];
const allMasterclasses = masterclassesData as Masterclass[];
const allReplays = replaysData as Replay[];
const allBuildOrders = buildOrdersData as BuildOrder[];

export function DashboardContent() {
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
            <div className="relative">
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <div className="flex gap-4 min-w-max">
                  {featuredMasterclasses.map((masterclass) => (
                    <Link
                      key={masterclass.id}
                      href={`/masterclasses/${masterclass.id}`}
                      className="w-80 flex-shrink-0 border border-border rounded-lg p-6 bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-semibold line-clamp-2">{masterclass.title}</h3>
                          <Play className="h-5 w-5 text-primary flex-shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {masterclass.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{masterclass.coach}</span>
                          <span>•</span>
                          <span className="capitalize">{masterclass.race}</span>
                          <span>•</span>
                          <span>{masterclass.episodes.length} episodes</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
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
            <div className="relative">
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <div className="flex gap-4 min-w-max">
                  {featuredReplays.map((replay) => (
                    <Link
                      key={replay.id}
                      href={`/replays/${replay.id}`}
                      className="w-80 flex-shrink-0 border border-border rounded-lg p-6 bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-semibold line-clamp-2">{replay.title}</h3>
                          <Download className="h-5 w-5 text-primary flex-shrink-0" />
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{replay.player1.name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="text-muted-foreground">{replay.player2.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{replay.map}</span>
                            <span>•</span>
                            <span className="font-medium">{replay.matchup}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
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
            <div className="relative">
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <div className="flex gap-4 min-w-max">
                  {featuredBuildOrders.map((buildOrder) => (
                    <Link
                      key={buildOrder.id}
                      href={`/build-orders/${buildOrder.id}`}
                      className="w-80 flex-shrink-0 border border-border rounded-lg p-6 bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-semibold line-clamp-2">{buildOrder.name}</h3>
                          {buildOrder.videoId && <VideoIcon className="h-5 w-5 text-primary flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {buildOrder.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-medium uppercase">{buildOrder.race.charAt(0)}v{buildOrder.vsRace.charAt(0)}</span>
                          <span>•</span>
                          <span className="capitalize">{buildOrder.type}</span>
                          <span>•</span>
                          <span className="capitalize">{buildOrder.difficulty}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Meet Our Coaches */}
        <HorizontalCoachScroller
          title="Meet Our Coaches"
          coaches={allCoaches}
          viewAllHref="/coaches"
        />
      </div>
    </main>
  );
}
