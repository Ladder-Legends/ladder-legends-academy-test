'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Video } from '@/types/video';

interface UsePlaylistNavigationOptions {
  videos: Video[];
  parentTitle: string;
  isPlaylist: boolean;
}

interface UsePlaylistNavigationResult {
  currentVideoIndex: number;
  currentVideo: Video | undefined;
  handleVideoSelect: (index: number) => void;
}

/**
 * Hook for managing playlist navigation state, URL params, and document title
 *
 * Handles:
 * - currentVideoIndex state initialized from URL ?v= param
 * - URL synchronization when video changes
 * - Document title updates for SEO and browser tabs
 *
 * @example
 * const { currentVideoIndex, currentVideo, handleVideoSelect } = usePlaylistNavigation({
 *   videos: playlistVideos,
 *   parentTitle: masterclass.title,
 *   isPlaylist: hasMultipleVideos
 * });
 */
export function usePlaylistNavigation({
  videos,
  parentTitle,
  isPlaylist,
}: UsePlaylistNavigationOptions): UsePlaylistNavigationResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL query param if present
  const [currentVideoIndex, setCurrentVideoIndex] = useState(() => {
    const vParam = searchParams.get('v');
    if (vParam !== null) {
      const index = parseInt(vParam, 10);
      return !isNaN(index) && index >= 0 && index < videos.length ? index : 0;
    }
    return 0;
  });

  // Get current video
  const currentVideo = videos[currentVideoIndex];

  // Handle video selection
  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index);

    // Update URL with query param for playlists
    if (isPlaylist) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('v', index.toString());
      router.push(`?${params.toString()}`, { scroll: false });
    }
  };

  // Update document title when video changes
  useEffect(() => {
    const displayTitle = isPlaylist && currentVideo
      ? `${currentVideo.title} - ${parentTitle} | Ladder Legends Academy`
      : `${parentTitle} | Ladder Legends Academy`;

    document.title = displayTitle;
  }, [currentVideoIndex, isPlaylist, currentVideo, parentTitle]);

  return {
    currentVideoIndex,
    currentVideo,
    handleVideoSelect,
  };
}
