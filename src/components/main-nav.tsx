'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/library', label: 'VOD Library' },
  { href: '/build-orders', label: 'Build Orders' },
  { href: '/replays', label: 'Replays' },
  { href: '/masterclasses', label: 'Masterclasses' },
  { href: '/coaches', label: 'Meet the Coaches' },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
