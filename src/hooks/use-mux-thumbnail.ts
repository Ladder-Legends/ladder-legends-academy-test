'use client';

import { useState, useEffect } from 'react';
import { Video, isMuxVideo } from '@/types/video';

interface MuxThumbnailData {
  url: string;
  isLoading: boolean;
}

export function useMuxThumbnail(video: Video): MuxThumbnailData {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only fetch thumbnail token for Mux videos
    if (!isMuxVideo(video) || !video.muxPlaybackId) {
      return;
    }

    let isMounted = true;

    const fetchThumbnailToken = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/mux/playback?playbackId=${video.muxPlaybackId}`);

        if (!response.ok) {
          console.error('Failed to fetch Mux thumbnail token:', response.statusText);
          // Fallback to unsigned URL
          setThumbnailUrl(video.thumbnail || '');
          return;
        }

        const data = await response.json();
        if (isMounted && data.thumbnailToken && video.muxPlaybackId) {
          // Use signed thumbnail URL
          const signedUrl = `https://image.mux.com/${video.muxPlaybackId}/thumbnail.png?token=${data.thumbnailToken}`;
          setThumbnailUrl(signedUrl);
        } else if (isMounted) {
          // Fallback to stored thumbnail URL
          setThumbnailUrl(video.thumbnail || '');
        }
      } catch (error) {
        console.error('Error fetching Mux thumbnail token:', error);
        if (isMounted) {
          setThumbnailUrl(video.thumbnail || '');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchThumbnailToken();

    return () => {
      isMounted = false;
    };
  }, [video.muxPlaybackId, video.thumbnail]);

  return {
    url: thumbnailUrl,
    isLoading,
  };
}
