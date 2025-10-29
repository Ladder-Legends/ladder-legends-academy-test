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

  // Video source - defaults to 'youtube' for backwards compatibility
  source?: VideoSource;

  // YouTube videos (backwards compatible: support both single video and playlists)
  youtubeId?: string;  // For single videos (existing)
  youtubeIds?: string[];  // For playlists (new)

  // Mux videos
  muxPlaybackId?: string;  // Mux playback ID for video player
  muxAssetId?: string;  // Mux asset ID for management
  muxAssetStatus?: 'preparing' | 'ready' | 'errored';  // Processing status

  // Optional: which video to use for thumbnail (defaults to 0)
  thumbnailVideoIndex?: number;

  thumbnail: string;

  // Access control: undefined or false = premium (default), true = free
  isFree?: boolean;
}

// Helper function to detect if video is a playlist
export function isPlaylist(video: Video): boolean {
  return (video.youtubeIds?.length ?? 0) > 1;
}

// Helper to get all YouTube IDs (works for both single and playlist)
export function getYoutubeIds(video: Video): string[] {
  if (video.youtubeIds && video.youtubeIds.length > 0) {
    return video.youtubeIds;
  }
  return video.youtubeId ? [video.youtubeId] : [];
}

// Helper to get thumbnail YouTube ID
export function getThumbnailYoutubeId(video: Video): string {
  const ids = getYoutubeIds(video);
  const index = video.thumbnailVideoIndex ?? 0;
  return ids[index] ?? ids[0] ?? '';
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

export type TagType =
  | 'terran'
  | 'zerg'
  | 'protoss'
  | 'coach nico'
  | 'gamerrichy'
  | 'macro'
  | 'mentality'
  | 'micro';
