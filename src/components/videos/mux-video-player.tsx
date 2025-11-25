'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import MuxPlayer from '@mux/mux-player-react';

interface MuxVideoPlayerProps {
  playbackId: string;
  videoId?: string; // Video ID for static thumbnail
  title?: string;
  className?: string;
  autoPlay?: boolean;
  // User data for Mux Data analytics
  viewerUserId?: string; // Discord ID or user identifier
  viewerUserName?: string; // Discord username
  viewerIsSubscriber?: boolean; // Subscriber status
  // Paywall
  isPremium?: boolean; // Is this premium content?
  showPaywallPreview?: boolean; // Show blurred preview instead of player
}

interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp
}

interface JWTPayload {
  exp?: number; // Token expiration (Unix timestamp in seconds)
  iat?: number; // Issued at
  sub?: string; // Subject (playbackId)
  aud?: string; // Audience
  kid?: string; // Key ID
}

/**
 * Decode JWT payload without verification
 * We only need to check expiry, not validate signature
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[MUX PLAYER] Invalid JWT format');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (err) {
    console.error('[MUX PLAYER] Failed to decode JWT:', err);
    return null;
  }
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
  viewerUserId,
  viewerUserName,
  viewerIsSubscriber,
  isPremium = false,
  showPaywallPreview = false,
}: MuxVideoPlayerProps) {
  const [playbackToken, setPlaybackToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use static thumbnail file for poster (downloaded at build time)
  const posterUrl = videoId ? `/thumbnails/${videoId}.jpg` : undefined;

  // Determine if we should show the paywall preview
  const shouldShowPaywall = showPaywallPreview && isPremium && !viewerIsSubscriber;

  useEffect(() => {
    // Skip token fetching if showing paywall preview
    if (shouldShowPaywall) {
      setLoading(false);
      return;
    }
    // Check if we have a valid cached token first
    const getCachedToken = (): string | null => {
      try {
        const cacheKey = `mux-token-${playbackId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const data: CachedToken = JSON.parse(cached);
          const now = Date.now();
          const twoHourBuffer = 2 * 60 * 60 * 1000; // Increased from 1h to 2h

          // CRITICAL: Decode and validate the JWT token itself, not just localStorage timestamp
          const jwtPayload = decodeJWT(data.token);

          if (!jwtPayload || !jwtPayload.exp) {
            console.warn('[MUX PLAYER] Invalid JWT payload, clearing cache for:', playbackId);
            localStorage.removeItem(cacheKey);
            return null;
          }

          // JWT exp is in seconds, convert to milliseconds
          const jwtExpiresAt = jwtPayload.exp * 1000;
          const timeUntilExpiry = jwtExpiresAt - now;

          // Check if JWT token is still valid (expires more than 2 hours from now)
          if (timeUntilExpiry > twoHourBuffer) {
            const hoursRemaining = (timeUntilExpiry / (60 * 60 * 1000)).toFixed(1);
            console.log(`[MUX PLAYER] Using cached token for ${playbackId} (${hoursRemaining}h remaining)`);
            return data.token;
          } else {
            // Token expired or about to expire, remove from cache
            if (timeUntilExpiry <= 0) {
              console.warn(`[MUX PLAYER] JWT token EXPIRED for ${playbackId}, fetching new token`);
            } else {
              const minutesRemaining = (timeUntilExpiry / (60 * 1000)).toFixed(0);
              console.log(`[MUX PLAYER] JWT token expiring soon (${minutesRemaining}m), fetching new token for ${playbackId}`);
            }
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (err) {
        console.warn('[MUX PLAYER] Error reading cached token, clearing cache:', err);
        // If there's any error reading the cache, clear it to be safe
        try {
          const cacheKey = `mux-token-${playbackId}`;
          localStorage.removeItem(cacheKey);
        } catch {
          // Ignore cleanup errors
        }
      }
      return null;
    };

    // Save token to cache
    const cacheToken = (token: string) => {
      try {
        const cacheKey = `mux-token-${playbackId}`;
        const expiresAt = Date.now() + (12 * 60 * 60 * 1000); // 12 hours (matches server cache)

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
          console.error('[MUX PLAYER] Failed to fetch playback token:', {
            status: response.status,
            playbackId,
            error: errorData.error,
            code: errorData.code,
            details: errorData.details,
            retryable: errorData.retryable,
          });
          // Show user-friendly error message
          throw new Error(errorData.error || 'Failed to fetch playback token');
        }

        const data = await response.json();
        console.log('[MUX PLAYER] Received fresh token for:', playbackId);

        // Support both new format (playback) and legacy format (token)
        const pbToken = data.playback || data.token;

        if (!pbToken) {
          throw new Error('No playback token received from server');
        }

        // Cache the token for future use
        cacheToken(pbToken);
        setPlaybackToken(pbToken);
      } catch (err) {
        console.error('[MUX PLAYER] Error fetching playback tokens:', err);

        // Clear cache for this playback ID on error to prevent using stale tokens
        try {
          const cacheKey = `mux-token-${playbackId}`;
          localStorage.removeItem(cacheKey);
        } catch {
          // Ignore cleanup errors
        }

        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [playbackId, shouldShowPaywall]);

  // Show static thumbnail for premium content without subscription
  if (shouldShowPaywall) {
    return (
      <div className={`relative w-full aspect-video overflow-hidden bg-muted ${className}`}>
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title || 'Video thumbnail'}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
        )}
      </div>
    );
  }

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
          video_id: videoId,
          video_title: title,
          viewer_user_id: viewerUserId,
          viewer_user_name: viewerUserName,
          // Custom metadata for subscriber status (used for analytics segmentation)
          subscriber_status: viewerIsSubscriber ? 'premium' : 'free',
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
