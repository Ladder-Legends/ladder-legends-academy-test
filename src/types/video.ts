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

export type TagType =
  | 'terran'
  | 'zerg'
  | 'protoss'
  | 'coach nico'
  | 'gamerrichy'
  | 'macro'
  | 'mentality'
  | 'micro';
