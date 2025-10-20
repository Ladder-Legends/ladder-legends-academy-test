import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ReplaysContent } from '@/components/replays/replays-content';
import Image from 'next/image';
import Link from 'next/link';

export default function ReplaysPage() {
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
                  className="object-contain"
                  priority
                />
                <h1 className="text-2xl font-bold hidden lg:block">Ladder Legends Academy</h1>
              </Link>

              <MainNav />
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Replays</h2>
              <p className="text-muted-foreground">
                Download and study replays from our coaches and top-level games. Filter by race, matchup, and MMR bracket.
              </p>
            </div>

            <ReplaysContent />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-8">
        <div className="text-center text-sm text-muted-foreground">
          © 2025 Ladder Legends Academy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
