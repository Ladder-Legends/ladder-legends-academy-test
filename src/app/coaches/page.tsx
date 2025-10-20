import { CoachesContent } from '@/components/coaches-content';
import { UserMenu } from '@/components/user-menu';
import Image from 'next/image';
import Link from 'next/link';

export default function CoachesPage() {
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
                <h1 className="text-2xl font-bold">Ladder Legends Academy</h1>
              </Link>

              {/* Navigation */}
              <nav className="flex gap-4 ml-8">
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Videos
                </Link>
                <Link
                  href="/coaches"
                  className="px-4 py-2 text-sm font-medium text-foreground border-b-2 border-primary"
                >
                  Coaches
                </Link>
              </nav>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <CoachesContent />

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
