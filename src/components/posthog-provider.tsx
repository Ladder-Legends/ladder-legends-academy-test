'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { posthog, initPostHog } from '@/lib/posthog';
import { PostHogPageView } from '@/components/posthog-page-view';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Initialize PostHog on mount
    initPostHog();
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      // Identify the user in PostHog with Discord ID as primary identifier
      const userId = session.user.discordId || session.user.email || 'unknown';

      posthog.identify(userId, {
        // Core user properties (email, username, avatar)
        email: session.user.email,
        name: session.user.name,
        username: session.user.name, // Also send as 'username' for clarity
        avatar: session.user.image, // Discord avatar URL
        // Discord-specific properties
        discord_id: session.user.discordId,
        discord_name: session.user.name,
        discord_avatar: session.user.image,
        // Subscription and role properties
        has_subscriber_role: session.user.hasSubscriberRole ?? false,
        subscriber_status: session.user.hasSubscriberRole ? 'premium' : 'free',
        roles: session.user.roles || [],
        // Computed role flags for easier filtering
        has_coach_role: session.user.roles?.includes('coaches') || false,
      });
    } else {
      // Reset user when logged out
      posthog.reset();
    }
  }, [session, status]);

  return (
    <>
      <PostHogPageView />
      {children}
    </>
  );
}
