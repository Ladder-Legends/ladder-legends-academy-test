'use client';

import { useEffect } from 'react';
import { posthog } from '@/lib/posthog';

interface PageViewProps {
  contentType: 'video' | 'event' | 'build-order' | 'replay' | 'masterclass' | 'coach';
  contentId: string;
  contentTitle: string;
  properties?: Record<string, unknown>;
}

export function useTrackPageView({ contentType, contentId, contentTitle, properties = {} }: PageViewProps) {
  useEffect(() => {
    // Track page view when component mounts
    posthog.capture('content_viewed', {
      content_type: contentType,
      content_id: contentId,
      content_title: contentTitle,
      ...properties,
    });
  }, [contentType, contentId, contentTitle, properties]);
}
