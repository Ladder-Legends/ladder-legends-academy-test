'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Filter } from 'lucide-react';
import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/footer';
import { VideoCard } from '@/components/videos/video-card';
import type { Video } from '@/types/video';

interface Coach {
  id: string;
  name: string;
  displayName: string;
  race: string;
  bio: string;
  specialties: string[];
  bookingUrl: string;
  isActive?: boolean;
  socialLinks: Record<string, string>;
}

interface CoachDetailClientProps {
  coach: Coach;
  videos: Video[];
}

export function CoachDetailClient({ coach, videos }: CoachDetailClientProps) {
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
      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Coach Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{coach.displayName}</h1>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block px-3 py-1.5 text-sm font-semibold rounded-md border border-border bg-secondary capitalize">
                    {coach.race === 'all' ? 'All Races' : coach.race}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {coachLabel}
                  </span>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
                  {coach.bio}
                </p>
              </div>

              {/* Booking Button */}
              {coach.bookingUrl && (
                <Link
                  href={coach.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold whitespace-nowrap"
                >
                  Book Session
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

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
