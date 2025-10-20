'use client';

import { HorizontalVideoScroller } from './horizontal-video-scroller';
import { HorizontalCoachScroller } from './horizontal-coach-scroller';
import videos from '@/data/videos.json';
import coaches from '@/data/coaches.json';
import { Video } from '@/types/video';
import { Coach } from '@/types/coach';

const allVideos = videos as Video[];
const allCoaches = coaches as Coach[];

export function DashboardContent() {
  // Filter videos by categories
  const zergVideos = allVideos.filter(v => v.tags.includes('zerg')).slice(0, 8);
  const terranVideos = allVideos.filter(v => v.tags.includes('terran')).slice(0, 8);
  const protossVideos = allVideos.filter(v => v.tags.includes('protoss')).slice(0, 8);
  const buildOrderVideos = allVideos.filter(v =>
    v.tags.includes('build order') ||
    v.title.toLowerCase().includes('build')
  ).slice(0, 8);
  const recentVideos = allVideos.slice(0, 8);

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

        {/* Recent Videos */}
        <HorizontalVideoScroller
          title="Recent Coaching Sessions"
          videos={recentVideos}
          viewAllHref="/library"
          viewAllLabel="View Full Library"
        />

        {/* Zerg Videos */}
        {zergVideos.length > 0 && (
          <HorizontalVideoScroller
            title="Zerg Coaching"
            videos={zergVideos}
            viewAllHref="/library?race=zerg"
            viewAllLabel="All Zerg Videos"
          />
        )}

        {/* Terran Videos */}
        {terranVideos.length > 0 && (
          <HorizontalVideoScroller
            title="Terran Coaching"
            videos={terranVideos}
            viewAllHref="/library?race=terran"
            viewAllLabel="All Terran Videos"
          />
        )}

        {/* Protoss Videos */}
        {protossVideos.length > 0 && (
          <HorizontalVideoScroller
            title="Protoss Coaching"
            videos={protossVideos}
            viewAllHref="/library?race=protoss"
            viewAllLabel="All Protoss Videos"
          />
        )}

        {/* Build Orders */}
        {buildOrderVideos.length > 0 && (
          <HorizontalVideoScroller
            title="Build Orders & Strategy"
            videos={buildOrderVideos}
            viewAllHref="/library?tag=build%20order"
            viewAllLabel="All Build Orders"
          />
        )}

        {/* Coaches */}
        <HorizontalCoachScroller
          title="Meet Our Coaches"
          coaches={allCoaches}
          viewAllHref="/coaches"
        />

        {/* Coming Soon Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Masterclasses</h3>
            <p className="text-sm text-muted-foreground">
              Structured courses and series coming soon
            </p>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Replay Library</h3>
            <p className="text-sm text-muted-foreground">
              Downloadable replays with filters coming soon
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
