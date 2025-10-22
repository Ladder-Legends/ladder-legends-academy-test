export type VideoRace = 'terran' | 'zerg' | 'protoss' | 'all';

export interface Video {
  id: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  race: VideoRace;
  coach?: string;
  coachId?: string;

  // Backwards compatible: support both single video and playlists
  youtubeId?: string;  // For single videos (existing)
  youtubeIds?: string[];  // For playlists (new)

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

export type TagType =
  | 'terran'
  | 'zerg'
  | 'protoss'
  | 'coach nico'
  | 'gamerrichy'
  | 'macro'
  | 'mentality'
  | 'micro';
