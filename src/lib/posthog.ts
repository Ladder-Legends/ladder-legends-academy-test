import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window !== 'undefined') {
    // Use our backend proxy to bypass ad blockers
    // Instead of sending requests directly to PostHog, we send them through /api/posthog
    const apiHost = typeof window !== 'undefined'
      ? `${window.location.origin}/api/posthog`
      : process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: apiHost,
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug();
        }
      },
    });
  }
  return posthog;
}

export { posthog };
