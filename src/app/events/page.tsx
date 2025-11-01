import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import Link from 'next/link';
import { EventsContent } from '@/components/events/events-content';

export const metadata = {
  title: 'Events | Ladder Legends Academy',
  description: 'Join our upcoming Starcraft 2 events: tournaments, coaching sessions, and community games',
};

export default function EventsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 lg:px-6 py-4">
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
      <EventsContent />

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4 lg:px-8 mt-12">
        <div className="text-center text-sm text-muted-foreground">
          © 2025 Ladder Legends Academy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
