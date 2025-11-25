'use client';

import { Video, isMuxVideo } from '@/types/video';
import { MuxVideoPlayer } from '@/components/videos/mux-video-player';
import { useSession } from 'next-auth/react';

interface VideoPlayerProps {
  videos: Video[];
  currentVideoIndex: number;
  isPlaylist: boolean;
  className?: string;
  showPaywallPreview?: boolean; // Show blurred preview for premium content
}

/**
 * Reusable video player component that handles both single videos and playlists
 *
 * Features:
 * - Supports Mux and YouTube videos
 * - Playlist mode unmounts inactive videos to stop playback
 * - Shows processing/error states for Mux videos
 *
 * @example
 * // Single video
 * <VideoPlayer videos={[video]} currentVideoIndex={0} isPlaylist={false} />
 *
 * @example
 * // Playlist
 * <VideoPlayer videos={playlistVideos} currentVideoIndex={2} isPlaylist={true} />
 */
export function VideoPlayer({ videos, currentVideoIndex, isPlaylist, className = '', showPaywallPreview = false }: VideoPlayerProps) {
  const { data: session } = useSession();
  const currentVideo = videos[currentVideoIndex];

  // Extract user data for Mux Data analytics
  const viewerUserId = session?.user?.discordId ?? undefined;
  const viewerUserName = session?.user?.name ?? undefined;
  const viewerIsSubscriber = session?.user?.hasSubscriberRole ?? false;

  // Determine if current video is premium
  const isPremium = !currentVideo?.isFree;

  // No video available
  if (!currentVideo) {
    return null;
  }

  // Playlist mode: only render the current video to ensure others stop playing
  if (isPlaylist) {
    return (
      <div className={`relative ${className}`}>
        {isMuxVideo(currentVideo) ? (
          currentVideo.muxPlaybackId ? (
            <MuxVideoPlayer
              key={currentVideo.id} // Force remount when video changes
              playbackId={currentVideo.muxPlaybackId}
              videoId={currentVideo.id}
              title={currentVideo.title}
              className="rounded-lg overflow-hidden"
              viewerUserId={viewerUserId}
              viewerUserName={viewerUserName}
              viewerIsSubscriber={viewerIsSubscriber}
              isPremium={isPremium}
              showPaywallPreview={showPaywallPreview}
            />
          ) : (
            <div className="aspect-video bg-black/10 rounded-lg flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-muted-foreground">
                  {currentVideo.muxAssetStatus === 'preparing' ? 'Video is processing...' : 'Video not available'}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              key={currentVideo.id} // Force remount when video changes
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${currentVideo.youtubeId}`}
              title={currentVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        )}
      </div>
    );
  }

  // Single video mode
  return (
    <div className={className}>
      {isMuxVideo(currentVideo) ? (
        currentVideo.muxPlaybackId ? (
          <MuxVideoPlayer
            playbackId={currentVideo.muxPlaybackId}
            videoId={currentVideo.id}
            title={currentVideo.title}
            className="rounded-lg overflow-hidden"
            viewerUserId={viewerUserId}
            viewerUserName={viewerUserName}
            viewerIsSubscriber={viewerIsSubscriber}
            isPremium={isPremium}
            showPaywallPreview={showPaywallPreview}
          />
        ) : (
          <div className="aspect-video bg-black/10 rounded-lg flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-muted-foreground">
                {currentVideo.muxAssetStatus === 'preparing' ? 'Video is processing...' : 'Video not available'}
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${currentVideo.youtubeId}`}
            title={currentVideo.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
}
