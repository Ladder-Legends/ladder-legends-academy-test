'use client';

import { Coach } from '@/types/coach';
import { CoachCard } from '@/components/coaches/coach-card';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import videos from '@/data/videos.json';

interface HorizontalCoachScrollerProps {
  title: string;
  coaches: Coach[];
  viewAllHref: string;
}

export function HorizontalCoachScroller({
  title,
  coaches,
  viewAllHref
}: HorizontalCoachScrollerProps) {
  // Calculate video count for each coach
  const getVideoCount = (coachId: string) => {
    return videos.filter(video =>
      video.tags.some(tag => tag.toLowerCase() === coachId.toLowerCase())
    ).length;
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="flex gap-4 min-w-max">
            {coaches.map((coach) => (
              <div key={coach.id} className="w-96 flex-shrink-0">
                <CoachCard coach={coach} videoCount={getVideoCount(coach.id)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
