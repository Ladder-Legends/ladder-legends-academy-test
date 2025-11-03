export type VideoRace = 'terran' | 'zerg' | 'protoss' | 'all';
export type VideoSource = 'youtube' | 'mux';

export interface Video {
  id: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  race: VideoRace;
  coach?: string;
  coachId?: string;

  // Video source - 'youtube', 'mux', or 'playlist'
  source?: VideoSource | 'playlist';

  // Single YouTube video
  youtubeId?: string;

  // Single Mux video
  muxPlaybackId?: string;  // Mux playback ID for video player
  muxAssetId?: string;  // Mux asset ID for management
  muxAssetStatus?: 'preparing' | 'ready' | 'errored';  // Processing status

  // Playlist: references to other videos in videos.json
  // If this is set, youtubeId and muxPlaybackId should NOT be set
  videoIds?: string[];

  thumbnail: string;

  // Access control: undefined or false = premium (default), true = free
  isFree?: boolean;
}

// Helper function to detect if video is a playlist
export function isPlaylist(video: Video): boolean {
  return (video.videoIds?.length ?? 0) > 0;
}

// Helper to get thumbnail YouTube ID for single YouTube videos
export function getThumbnailYoutubeId(video: Video): string {
  return video.youtubeId || '';
}

// Helper to check if video is from Mux
export function isMuxVideo(video: Video): boolean {
  return video.source === 'mux' || !!video.muxPlaybackId;
}

// Helper to check if video is from YouTube
export function isYoutubeVideo(video: Video): boolean {
  return !isMuxVideo(video);
}

// Helper to get video source
export function getVideoSource(video: Video): VideoSource {
  return isMuxVideo(video) ? 'mux' : 'youtube';
}

// Helper to get the appropriate thumbnail URL for a video
export function getVideoThumbnailUrl(video: Video | undefined, quality: 'low' | 'medium' | 'high' = 'medium'): string {
  if (!video) {
    return '/placeholder-thumbnail.jpg';
  }

  // YouTube video - use YouTube thumbnail
  if (video.youtubeId) {
    const qualityMap = {
      low: 'default',
      medium: 'mqdefault',
      high: 'hqdefault'
    };
    return `https://img.youtube.com/vi/${video.youtubeId}/${qualityMap[quality]}.jpg`;
  }

  // Mux video - use static thumbnail file (downloaded at build time)
  // Mux thumbnails require signed URLs when playback is signed, so we use static files
  if (video.muxPlaybackId || (video.source === 'mux' && video.muxPlaybackId)) {
    return `/thumbnails/${video.id}.jpg`;
  }

  // Fallback to thumbnail field
  return video.thumbnail || '/placeholder-thumbnail.jpg';
}

export type TagType =
  | 'terran'
  | 'zerg'
  | 'protoss'
  | 'coach nico'
  | 'gamerrichy'
  | 'macro'
  | 'mentality'
  | 'micro';
