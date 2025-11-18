'use client';

import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SoftPaywallOverlayProps {
  show: boolean;
  title?: string;
  description?: string;
  className?: string;
  variant?: 'fullPage' | 'inline'; // New prop to control overlay style
}

/**
 * Soft paywall overlay that can be removed via browser dev tools.
 * The hard paywall is enforced at the API level (signed URLs, downloads, etc).
 * This is primarily for SEO and social sharing while encouraging subscriptions.
 */
export function SoftPaywallOverlay({
  show,
  title = 'Premium Academy Content',
  description = 'Subscribe to Ladder Legends Academy to access exclusive coaching content, replays, and build orders.',
  className,
  variant = 'inline',
}: SoftPaywallOverlayProps) {
  if (!show) return null;

  // Inline variant for video players and specific content blocks
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm px-8 py-16 overflow-y-auto',
          className
        )}
        data-paywall-overlay
      >
        <div className="mx-4 max-w-sm rounded-lg border border-orange-500/20 bg-card p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-full bg-orange-500/10 p-3">
              <Lock className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <h3 className="mb-2 text-center text-lg font-bold text-foreground">
            {title}
          </h3>

          <p className="mb-4 text-center text-sm text-muted-foreground">
            {description}
          </p>

          <Link
            href="/subscribe"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-orange-500 hover:to-orange-400 hover:shadow-lg hover:shadow-orange-500/50"
          >
            <Sparkles className="h-4 w-4" />
            Unlock Premium Access
          </Link>
        </div>
      </div>
    );
  }

  // Full page variant (legacy - not used anymore)
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm',
        className
      )}
      data-paywall-overlay
    >
      <div className="mx-4 max-w-md rounded-lg border border-orange-500/20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-center">
          <div className="rounded-full bg-orange-500/10 p-4">
            <Lock className="h-12 w-12 text-orange-500" />
          </div>
        </div>

        <h2 className="mb-3 text-center text-2xl font-bold text-white">
          {title}
        </h2>

        <p className="mb-6 text-center text-gray-300">
          {description}
        </p>

        <div className="space-y-3">
          <Link
            href="/subscribe"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-3 font-semibold text-white transition-all hover:from-orange-500 hover:to-orange-400 hover:shadow-lg hover:shadow-orange-500/50"
          >
            <Sparkles className="h-5 w-5" />
            Unlock Premium Access
          </Link>

          <Link
            href="/library"
            className="flex w-full items-center justify-center rounded-lg border border-gray-600 px-6 py-3 font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            Browse All Content
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Get access to 100+ videos, replays, and build orders from top coaches
        </p>
      </div>
    </div>
  );
}
