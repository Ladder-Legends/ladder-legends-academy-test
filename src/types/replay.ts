import { Video, getVideoThumbnailUrl, Difficulty } from './video';

export type Race = 'terran' | 'zerg' | 'protoss';
export type Matchup = 'TvT' | 'TvZ' | 'TvP' | 'ZvT' | 'ZvZ' | 'ZvP' | 'PvT' | 'PvZ' | 'PvP';

export interface ReplayPlayer {
  name: string;
  race: Race;
  mmr?: number;
  result: 'win' | 'loss';
}

export interface Replay {
  id: string;
  title: string;
  map: string;
  matchup: Matchup;
  player1: ReplayPlayer;
  player2: ReplayPlayer;
  duration: string; // e.g., "12:34"
  gameDate: string;
  uploadDate: string;
  downloadUrl?: string;

  // Multiple categories support - each entry is "primary" or "primary.secondary"
  categories?: string[];
  difficulty?: Difficulty; // Optional difficulty level

  // Legacy tags field (kept for race and other metadata)
  tags: string[];

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  coach?: string;
  coachId?: string; // Link to coach in coaches collection
  patch?: string;
  notes?: string;

  // Access control: undefined or false = premium (default), true = free
  isFree?: boolean;
}

// Helper to get the appropriate thumbnail URL for a replay
// Uses the first video's thumbnail if available, otherwise returns null
export function getReplayThumbnailUrl(replay: Replay, videos: Video[], quality: 'low' | 'medium' | 'high' = 'medium'): string | null {
  // Try to get thumbnail from first video
  if (replay.videoIds && replay.videoIds.length > 0) {
    const firstVideoId = replay.videoIds[0];
    const firstVideo = videos.find(v => v.id === firstVideoId || v.youtubeId === firstVideoId);

    if (firstVideo) {
      return getVideoThumbnailUrl(firstVideo, quality);
    }
  }

  // No thumbnail available
  return null;
}
