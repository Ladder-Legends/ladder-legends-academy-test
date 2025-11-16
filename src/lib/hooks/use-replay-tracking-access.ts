/**
 * Hook to check if user has access to replay tracking feature
 * Uses PostHog feature flags and/or Discord ID whitelist
 */
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { posthog } from '@/lib/posthog';

// Discord IDs with replay tracking access (coaches and beta testers)
const REPLAY_TRACKING_WHITELIST: string[] = [
  // Add Discord IDs here
  // Example: '123456789012345678',
];

export function useReplayTrackingAccess() {
  const { data: session } = useSession();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setHasAccess(false);
      setIsLoading(false);
      return;
    }

    // Check whitelist
    const isWhitelisted = REPLAY_TRACKING_WHITELIST.includes(session.user.id);

    if (isWhitelisted) {
      setHasAccess(true);
      setIsLoading(false);
      return;
    }

    // Check PostHog feature flag
    if (typeof window !== 'undefined' && posthog) {
      posthog.onFeatureFlags(() => {
        const flagValue = posthog.getFeatureFlag('replay_tracking');
        setHasAccess(flagValue === true || flagValue === 'true');
        setIsLoading(false);
      });

      // Also check immediately in case flags are already loaded
      const flagValue = posthog.getFeatureFlag('replay_tracking');
      if (flagValue !== undefined) {
        setHasAccess(flagValue === true || flagValue === 'true');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [session]);

  return { hasAccess, isLoading };
}
