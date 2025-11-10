'use client';

import { Video, isMuxVideo } from '@/types/video';
import { MuxVideoPlayer } from '@/components/videos/mux-video-player';

interface VideoPlayerProps {
  videos: Video[];
  currentVideoIndex: number;
  isPlaylist: boolean;
  className?: string;
}

/**
 * Reusable video player component that handles both single videos and playlists
 *
 * Features:
 * - Supports Mux and YouTube videos
 * - Playlist mode hides inactive videos instead of unmounting (prevents reload)
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
export function VideoPlayer({ videos, currentVideoIndex, isPlaylist, className = '' }: VideoPlayerProps) {
  const currentVideo = videos[currentVideoIndex];

  // No video available
  if (!currentVideo) {
    return null;
  }

  // Playlist mode: render all videos but hide inactive ones to avoid reload
  if (isPlaylist) {
    return (
      <div className={`relative ${className}`}>
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={currentVideoIndex === index ? 'block' : 'hidden'}
          >
            {isMuxVideo(video) ? (
              video.muxPlaybackId ? (
                <MuxVideoPlayer
                  playbackId={video.muxPlaybackId}
                  videoId={video.id}
                  title={video.title}
                  className="rounded-lg overflow-hidden"
                />
              ) : (
                <div className="aspect-video bg-black/10 rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="text-muted-foreground">
                      {video.muxAssetStatus === 'preparing' ? 'Video is processing...' : 'Video not available'}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${video.youtubeId}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        ))}
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
