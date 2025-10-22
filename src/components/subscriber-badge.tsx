'use client';

import { useSession } from 'next-auth/react';
import { Lock } from 'lucide-react';

interface SubscriberBadgeProps {
  isFree?: boolean;
  className?: string;
}

/**
 * Client component that shows "Subscriber Only" badge for premium content.
 * Only visible to non-subscribers viewing premium content.
 * Hydrates on the client to check session without blocking SSR/SSG.
 *
 * @param isFree - If true, content is free. If undefined or false, content is premium (default).
 */
export function SubscriberBadge({ isFree = false, className = '' }: SubscriberBadgeProps) {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  // Don't show badge if content is free or user is a subscriber
  if (isFree || hasSubscriberRole) {
    return null;
  }

  return (
    <span className={`bg-primary/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-primary-foreground flex items-center gap-1 font-medium ${className}`}>
      <Lock className="h-3 w-3" />
      Subscriber Only
    </span>
  );
}
