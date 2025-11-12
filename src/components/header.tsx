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
      <div className="px-6 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
              {/* Desktop light mode: Black text */}
              <Image
                src="/logos/logo-light.png"
                alt="Ladder Legends"
                width={120}
                height={32}
                unoptimized
                className="logo-desktop-light"
                priority
              />
              {/* Desktop dark mode: White text */}
              <Image
                src="/logos/logo-dark.png"
                alt="Ladder Legends"
                width={120}
                height={32}
                unoptimized
                className="logo-desktop-dark"
                priority
              />
              {/* Mobile light mode: Icon */}
              <Image
                src="/logos/icon.png"
                alt="Ladder Legends"
                width={40}
                height={40}
                unoptimized
                className="logo-mobile-light"
                priority
              />
              {/* Mobile dark mode: Icon (white ladder on black circle) */}
              <Image
                src="/logos/icon-black.png"
                alt="Ladder Legends"
                width={40}
                height={40}
                unoptimized
                className="logo-mobile-dark"
                priority
              />
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
