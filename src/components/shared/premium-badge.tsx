'use client';

import { Lock } from 'lucide-react';

interface PremiumBadgeProps {
  /** Whether this content is free */
  isFree: boolean;
  /** Whether the user has subscriber role */
  hasSubscriberRole: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Displays a "Premium" badge for content that requires subscription.
 * Only shows when content is not free AND user doesn't have subscriber role.
 */
export function PremiumBadge({ isFree, hasSubscriberRole, className = '' }: PremiumBadgeProps) {
  if (isFree || hasSubscriberRole) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 mt-1.5 ${className}`}>
      <span className="bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium whitespace-nowrap flex-shrink-0">
        <Lock className="w-2.5 h-2.5" />
        Premium
      </span>
    </div>
  );
}
