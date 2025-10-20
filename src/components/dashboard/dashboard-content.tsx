'use client';

import { useState, useMemo } from 'react';
import { HorizontalVideoScroller } from './horizontal-video-scroller';
import { HorizontalCoachScroller } from './horizontal-coach-scroller';
import { Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  // Filter all content by search query
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return allVideos.slice(0, 8);
    const query = searchQuery.toLowerCase();
    return allVideos.filter(v =>
      v.title.toLowerCase().includes(query) ||
      v.description.toLowerCase().includes(query) ||
      v.tags.some(tag => tag.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [searchQuery]);

  const filteredMasterclasses = useMemo(() => {
    if (!searchQuery.trim()) return allMasterclasses.slice(0, 6);
    const query = searchQuery.toLowerCase();
    return allMasterclasses.filter(mc =>
      mc.title.toLowerCase().includes(query) ||
      mc.description.toLowerCase().includes(query) ||
      mc.coach.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [searchQuery]);

  const filteredReplays = useMemo(() => {
    if (!searchQuery.trim()) return allReplays.slice(0, 6);
    const query = searchQuery.toLowerCase();
    return allReplays.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.map.toLowerCase().includes(query) ||
      r.player1.name.toLowerCase().includes(query) ||
      r.player2.name.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [searchQuery]);

  const filteredBuildOrders = useMemo(() => {
    if (!searchQuery.trim()) return allBuildOrders.slice(0, 6);
    const query = searchQuery.toLowerCase();
    return allBuildOrders.filter(bo =>
      bo.name.toLowerCase().includes(query) ||
      bo.description.toLowerCase().includes(query) ||
      bo.tags.some(tag => tag.toLowerCase().includes(query))
    ).slice(0, 6);
  }, [searchQuery]);

  return (
    <main className="flex-1 px-8 py-8">
      <div className="max-w-[1920px] mx-auto space-y-12">
        {/* Hero Section with Search */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Welcome to Ladder Legends Academy</h1>
            <p className="text-lg text-muted-foreground">
              Master StarCraft 2 with coaching videos, build orders, and expert guidance
            </p>
          </div>

          {/* Search Box */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, masterclasses, replays, build orders..."
              className="w-full pl-12 pr-12 py-4 text-base bg-background border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Coaching VODs */}
        {filteredVideos.length > 0 && (
          <HorizontalVideoScroller
            title="Coaching VODs"
            videos={filteredVideos}
            viewAllHref="/library"
            viewAllLabel="View Full Library"
          />
        )}

        {/* Masterclasses */}
        {filteredMasterclasses.length > 0 && (
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
                  {filteredMasterclasses.map((masterclass) => (
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
        {filteredReplays.length > 0 && (
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
                  {filteredReplays.map((replay) => (
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
        {filteredBuildOrders.length > 0 && (
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
                  {filteredBuildOrders.map((buildOrder) => (
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
