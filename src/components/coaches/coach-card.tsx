'use client';

import type { Coach } from '@/types/coach';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface CoachCardProps {
  coach: Coach;
  videoCount: number;
}

export function CoachCard({ coach, videoCount }: CoachCardProps) {
  const { data: session } = useSession();
  return (
    <div className="rounded-lg border-2 border-border bg-card/50 p-6 transition-all hover:shadow-lg hover:border-primary/50 flex flex-col h-full">
      <div className="flex flex-col h-full space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold capitalize">{coach.displayName}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-md border border-border bg-secondary capitalize">
                {coach.race}
              </span>
              <span className="text-sm text-muted-foreground">
                {videoCount} video{videoCount !== 1 ? 's' : ''}
              </span>
              {coach.pricePerHour && (
                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-md border border-primary/30 bg-primary/10 text-primary">
                  {coach.pricePerHour}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-muted-foreground text-sm flex-1">{coach.bio}</p>

        {/* Buttons */}
        <div className="flex gap-2 mt-auto">
          <Link
            href={`/library?coaches=${coach.id}`}
            className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            View Videos
          </Link>
          {coach.bookingUrl && (
            <Link
              href={session?.user?.hasSubscriberRole ? coach.bookingUrl : '/subscribe'}
              target={session?.user?.hasSubscriberRole ? "_blank" : undefined}
              rel={session?.user?.hasSubscriberRole ? "noopener noreferrer" : undefined}
              className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium border-2 border-primary text-primary bg-transparent rounded-md hover:bg-primary/10 transition-colors"
            >
              Book Session
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
