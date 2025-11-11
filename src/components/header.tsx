'use client';

import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { OmnisearchClient } from '@/components/search/omnisearch-client';
import Image from 'next/image';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
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

            {/* Navigation */}
            <MainNav />
          </div>

          {/* Omnisearch - Flex-grow on all screens, centered on desktop */}
          <div className="flex-1 max-w-md mx-4">
            <OmnisearchClient placeholder="Search all content..." />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
