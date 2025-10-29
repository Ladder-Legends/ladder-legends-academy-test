'use client';

import { useState, useEffect } from 'react';
import MuxPlayer from '@mux/mux-player-react';

interface MuxVideoPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
}

/**
 * MuxVideoPlayer component
 *
 * Plays Mux videos with signed URLs for secure playback.
 * Fetches a signed token from the API before playing the video.
 */
export function MuxVideoPlayer({
  playbackId,
  title,
  className = '',
  autoPlay = false,
}: MuxVideoPlayerProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch signed playback token
    const fetchToken = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/mux/playback?playbackId=${playbackId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch playback token');
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        console.error('Error fetching playback token:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
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

  if (!token) {
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
        tokens={{ playback: token }}
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
