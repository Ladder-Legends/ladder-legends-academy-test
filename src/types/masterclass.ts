import { Video, getVideoThumbnailUrl } from './video';

export type Race = 'terran' | 'zerg' | 'protoss' | 'all';

export interface Masterclass {
  id: string;
  title: string;
  description: string;
  coach?: string;
  coachId?: string;
  race: Race;

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  replayIds?: string[]; // Multiple example replays demonstrating the concepts
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;

  // Access control: undefined or false = premium (default), true = free
  isFree?: boolean;
}

// Helper to get the appropriate thumbnail URL for a masterclass
// Uses the first video's thumbnail if available, otherwise returns null
export function getMasterclassThumbnailUrl(masterclass: Masterclass, videos: Video[], quality: 'low' | 'medium' | 'high' = 'medium'): string | null {
  // If masterclass has explicit thumbnail set, use it
  if (masterclass.thumbnail) {
    return masterclass.thumbnail;
  }

  // Try to get thumbnail from first video
  if (masterclass.videoIds && masterclass.videoIds.length > 0) {
    const firstVideoId = masterclass.videoIds[0];
    const firstVideo = videos.find(v => v.id === firstVideoId || v.youtubeId === firstVideoId);

    if (firstVideo) {
      return getVideoThumbnailUrl(firstVideo, quality);
    }
  }

  // No thumbnail available
  return null;
}
