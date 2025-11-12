'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import coachesData from '@/data/coaches.json';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

interface NavItem {
  href?: string;
  label: string;
  external?: boolean;
  icon?: string;
  children?: NavItem[];
}

// Get active coaches for navigation
const activeCoaches = coachesData.filter(coach => coach.isActive !== false);

const navItems: NavItem[] = [
  {
    href: '/library',
    label: 'Content',
    children: [
      { href: '/library', label: 'VOD Library' },
      { href: '/masterclasses', label: 'Masterclasses' },
      { href: '/build-orders', label: 'Build Orders' },
      { href: '/replays', label: 'Replays' },
    ],
  },
  {
    href: '/coaches',
    label: 'Coaching',
    children: activeCoaches.map(coach => ({
      href: `/coaches/${coach.id}`,
      label: coach.displayName,
    })),
  },
  {
    href: '/events',
    label: 'Community',
    children: [
      { href: '/events', label: 'Events' },
      { href: 'https://discord.gg/uHzvKAqu3F', label: 'Discord', external: true, icon: 'discord' },
    ],
  },
  { href: '/about', label: 'About' },
];

function DesktopNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    // On click, navigate to parent href if it exists
    if (item.href) {
      router.push(item.href);
    } else {
      // On touch devices, toggle dropdown
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // On touch, toggle dropdown
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // If item has children, render dropdown
  if (item.children) {
    const hasActiveChild = item.children.some(child => child.href === pathname);
    const isActive = pathname === item.href || hasActiveChild;

    return (
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-primary hover:text-white'
          }`}
        >
          {item.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-card border border-border rounded-md shadow-lg py-1 z-[100]">
            {item.children.map((child) => {
              const isActive = pathname === child.href;
              const linkProps = child.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
              return (
                <Link
                  key={child.href || child.label}
                  href={child.href || '#'}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-primary hover:text-white'
                  }`}
                  {...linkProps}
                >
                  {child.icon === 'discord' && <DiscordIcon className="h-4 w-4" />}
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Regular link item
  const isActive = pathname === item.href;
  const linkProps = item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Link
      href={item.href || '#'}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-primary hover:text-white'
      }`}
      {...linkProps}
    >
      {item.icon === 'discord' && <DiscordIcon className="h-4 w-4" />}
      {item.label}
    </Link>
  );
}

function MobileNavItem({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  // If item has children, render expandable section
  if (item.children) {
    const hasActiveChild = item.children.some(child => child.href === pathname);

    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-md transition-colors ${
            hasActiveChild
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:text-white hover:bg-primary'
          }`}
        >
          <span>{item.label}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children.map((child) => {
              const isActive = pathname === child.href;
              const linkProps = child.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
              return (
                <Link
                  key={child.href || child.label}
                  href={child.href || '#'}
                  onClick={onClose}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:text-white hover:bg-primary'
                  }`}
                  {...linkProps}
                >
                  {child.icon === 'discord' && <DiscordIcon className="h-4 w-4" />}
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Regular link item
  const isActive = pathname === item.href;
  const linkProps = item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Link
      href={item.href || '#'}
      onClick={onClose}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:text-white hover:bg-primary'
      }`}
      {...linkProps}
    >
      {item.icon === 'discord' && <DiscordIcon className="h-4 w-4" />}
      {item.label}
    </Link>
  );
}

export function MainNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mobileMenu = mounted ? (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border shadow-2xl z-50 transition-transform duration-200 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 relative z-50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <MobileNavItem
                key={item.href || item.label}
                item={item}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            ))}
          </nav>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex gap-1">
        {navItems.map((item) => (
          <DesktopNavItem key={item.href || item.label} item={item} />
        ))}
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden p-2 hover:bg-primary hover:text-white rounded-md transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Menu - Rendered via Portal outside header */}
      {mounted && typeof document !== 'undefined' && createPortal(mobileMenu, document.body)}
    </>
  );
}
