'use client';

import { useState, useEffect } from 'react';
import MuxPlayer from '@mux/mux-player-react';

interface MuxVideoPlayerProps {
  playbackId: string;
  videoId?: string; // Video ID for static thumbnail
  title?: string;
  className?: string;
  autoPlay?: boolean;
}

interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp
}

/**
 * MuxVideoPlayer component
 *
 * Plays Mux videos with signed URLs for secure playback.
 * Fetches a signed token from the API before playing the video.
 * Implements client-side caching to avoid refetching valid tokens.
 */
export function MuxVideoPlayer({
  playbackId,
  videoId,
  title,
  className = '',
  autoPlay = false,
}: MuxVideoPlayerProps) {
  const [playbackToken, setPlaybackToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use static thumbnail file for poster (downloaded at build time)
  const posterUrl = videoId ? `/thumbnails/${videoId}.jpg` : undefined;

  useEffect(() => {
    // Check if we have a valid cached token first
    const getCachedToken = (): string | null => {
      try {
        const cacheKey = `mux-token-${playbackId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const data: CachedToken = JSON.parse(cached);
          const now = Date.now();

          // Check if token is still valid (with 1 hour buffer)
          if (data.expiresAt > now + (60 * 60 * 1000)) {
            console.log('[MUX PLAYER] Using cached token for:', playbackId);
            return data.token;
          } else {
            // Token expired or about to expire, remove from cache
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (err) {
        console.warn('[MUX PLAYER] Error reading cached token:', err);
      }
      return null;
    };

    // Save token to cache
    const cacheToken = (token: string) => {
      try {
        const cacheKey = `mux-token-${playbackId}`;
        const expiresAt = Date.now() + (23 * 60 * 60 * 1000); // 23 hours

        const cached: CachedToken = { token, expiresAt };
        localStorage.setItem(cacheKey, JSON.stringify(cached));
      } catch (err) {
        console.warn('[MUX PLAYER] Error caching token:', err);
      }
    };

    // Try to get cached token first
    const cachedToken = getCachedToken();
    if (cachedToken) {
      setPlaybackToken(cachedToken);
      setLoading(false);
      return;
    }

    // Fetch signed playback tokens from API
    const fetchTokens = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/mux/playback?playbackId=${playbackId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch playback token');
        }

        const data = await response.json();
        console.log('[MUX PLAYER] Received fresh token for:', playbackId);

        // Support both new format (playback) and legacy format (token)
        const pbToken = data.playback || data.token;

        // Cache the token for future use
        cacheToken(pbToken);
        setPlaybackToken(pbToken);
      } catch (err) {
        console.error('Error fetching playback tokens:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [playbackId]);

  if (loading) {
    return (
      <div className={`relative w-full aspect-video bg-black/10 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative w-full aspect-video bg-destructive/10 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <p className="text-destructive font-semibold mb-2">Failed to load video</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!playbackToken) {
    return (
      <div className={`relative w-full aspect-video bg-black/10 flex items-center justify-center ${className}`}>
        <p className="text-sm text-muted-foreground">No playback token available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <MuxPlayer
        playbackId={playbackId}
        tokens={{
          playback: playbackToken,
        }}
        poster={posterUrl}
        metadata={{
          video_title: title,
        }}
        streamType="on-demand"
        autoPlay={autoPlay}
        style={{
          aspectRatio: '16/9',
          width: '100%',
        }}
      />
    </div>
  );
}
