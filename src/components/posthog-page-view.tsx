'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { posthog } from '@/lib/posthog';

/**
 * PostHogPageView component
 *
 * Tracks page views in PostHog whenever the URL changes.
 * This includes:
 * - Page path changes
 * - Query parameter changes
 *
 * Should be included in the root layout to track all navigation.
 */
function PostHogPageViewInternal(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }

      // Track page view with PostHog
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogPageView(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInternal />
    </Suspense>
  );
}
