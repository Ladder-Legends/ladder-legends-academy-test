import { Video, getVideoThumbnailUrl, Difficulty } from './video';
import type { PrimaryCategory, SecondaryCategory } from '@/lib/taxonomy';

export type Race = 'terran' | 'zerg' | 'protoss';
export type VsRace = 'terran' | 'zerg' | 'protoss' | 'all';
export type BuildType = 'macro' | 'all-in' | 'timing' | 'cheese' | 'defensive';

export interface BuildOrderStep {
  supply: number;
  time?: string;
  action: string;
  notes?: string;
}

export interface BuildOrder {
  id: string;
  name: string;
  race: Race;
  vsRace: VsRace;
  type?: BuildType; // Optional - deprecated in favor of categories
  difficulty: Difficulty;
  coach: string;
  coachId: string;
  description: string;

  // Hierarchical categories (replaces tags)
  primaryCategory?: PrimaryCategory;
  secondaryCategory?: SecondaryCategory;

  // Legacy tags field (will be removed after migration)
  tags: string[];

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  replayId?: string; // Link to replay in replays collection
  steps: BuildOrderStep[];
  patch?: string;
  updatedAt: string;

  // Access control: undefined or false = premium (default), true = free
  isFree?: boolean;
}

// Helper to get the appropriate thumbnail URL for a build order
// Uses the first video's thumbnail if available, otherwise returns null
export function getBuildOrderThumbnailUrl(buildOrder: BuildOrder, videos: Video[], quality: 'low' | 'medium' | 'high' = 'medium'): string | null {
  // Try to get thumbnail from first video
  if (buildOrder.videoIds && buildOrder.videoIds.length > 0) {
    const firstVideoId = buildOrder.videoIds[0];
    const firstVideo = videos.find(v => v.id === firstVideoId || v.youtubeId === firstVideoId);

    if (firstVideo) {
      return getVideoThumbnailUrl(firstVideo, quality);
    }
  }

  // No thumbnail available
  return null;
}
