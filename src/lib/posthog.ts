import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
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
