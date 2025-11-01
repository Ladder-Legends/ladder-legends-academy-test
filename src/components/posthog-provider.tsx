'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { posthog, initPostHog } from '@/lib/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Initialize PostHog on mount
    initPostHog();
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      // Identify the user in PostHog
      posthog.identify(session.user.email || session.user.id, {
        email: session.user.email,
        name: session.user.name,
        // Add custom properties
        hasSubscriberRole: session.user.roles?.includes('subscribers') || false,
        hasCoachRole: session.user.roles?.includes('coaches') || false,
        roles: session.user.roles || [],
      });
    } else {
      // Reset user when logged out
      posthog.reset();
    }
  }, [session, status]);

  return <>{children}</>;
}
