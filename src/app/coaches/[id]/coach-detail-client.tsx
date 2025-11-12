'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Filter } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Footer } from '@/components/footer';
import { VideoCard } from '@/components/videos/video-card';
import { DidYouKnow } from '@/components/coaches/did-you-know';
import type { Video } from '@/types/video';

interface Coach {
  id: string;
  name: string;
  displayName: string;
  race: string;
  bio: string;
  specialties: string[];
  bookingUrl: string;
  pricePerHour?: string;
  isActive?: boolean;
  socialLinks: Record<string, string>;
}

interface CoachDetailClientProps {
  coach: Coach;
  videos: Video[];
  allVideos?: Video[]; // Optional: used to resolve playlist thumbnails
}

export function CoachDetailClient({ coach, videos, allVideos }: CoachDetailClientProps) {
  const { data: session } = useSession();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null);

  const handleEdit = (video: Video) => {
    setVideoToEdit(video);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (video: Video) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"?`)) {
      return;
    }
    // TODO: Implement delete functionality
    console.log('Delete video:', video.id);
  };

  // Display label for coach (always show as "Coach")
  const coachLabel = 'Coach';

  // Check if user has subscriber role
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 px-6 py-12 pattern-circuit-content">
        <div className="max-w-7xl mx-auto">
          {/* Coach Header */}
          <div className="mb-8">
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2">{coach.displayName}</h1>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block px-3 py-1.5 text-sm font-semibold rounded-md border border-border bg-secondary capitalize">
                  {coach.race === 'all' ? 'All Races' : coach.race}
                </span>
                <span className="text-muted-foreground text-sm">
                  {coachLabel}
                </span>
                {coach.pricePerHour && (
                  <span className="inline-block px-3 py-1.5 text-sm font-semibold rounded-md border-2 border-primary bg-primary/10 text-primary">
                    {coach.pricePerHour}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
                {coach.bio}
              </p>
            </div>
          </div>

          {/* Did You Know Section with Booking CTA */}
          <DidYouKnow
            className="mb-8"
            bookingUrl={coach.bookingUrl}
            hasSubscriberRole={hasSubscriberRole}
          />

          {/* Videos Section */}
          <div className="border-t border-border pt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  Content by {coach.displayName}
                </h2>
                <p className="text-muted-foreground">
                  {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                </p>
              </div>

              {/* Link to filtered library */}
              <Link
                href={`/library?coaches=${encodeURIComponent(coach.id)}`}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium"
              >
                <Filter className="h-4 w-4" />
                Advanced Filtering
              </Link>
            </div>

            {/* Videos Grid */}
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    allVideos={allVideos}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  No content available from this coach yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
