import { VideoGrid } from '@/components/videos/video-grid';
import { UserMenu } from '@/components/user-menu';
import videos from '@/data/videos.json';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 relative">
                <Image
                  src="/logo.svg"
                  alt="Ladder Legends Academy"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                  Ladder Legends Academy
                </h1>
                <p className="text-muted-foreground">Master Starcraft 2 with Expert Coaching</p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Video Library</h2>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Browse our collection of coaching videos covering strategies, mechanics, and mentality
              for all three races. Filter by race, coach, or topic to find exactly what you need.
            </p>
          </div>

          <VideoGrid videos={videos} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Ladder Legends Academy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
