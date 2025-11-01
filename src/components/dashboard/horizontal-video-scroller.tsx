'use client';

import { Video } from '@/types/video';
import { VideoCard } from '@/components/videos/video-card';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { HorizontalScrollContainer } from '@/components/ui/horizontal-scroll-container';

interface HorizontalVideoScrollerProps {
  title: string;
  videos: Video[];
  viewAllHref: string;
  viewAllLabel?: string;
}

export function HorizontalVideoScroller({
  title,
  videos,
  viewAllHref,
  viewAllLabel = "View All"
}: HorizontalVideoScrollerProps) {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {viewAllLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Horizontal Scroll Container */}
      <HorizontalScrollContainer>
        <div className="flex gap-4 min-w-max items-stretch">
          {videos.map((video) => (
            <div key={video.id} className="w-80 flex-shrink-0">
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      </HorizontalScrollContainer>
    </section>
  );
}
