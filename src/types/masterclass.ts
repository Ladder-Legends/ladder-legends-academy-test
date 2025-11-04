export type Race = 'terran' | 'zerg' | 'protoss' | 'all';

export interface Masterclass {
  id: string;
  title: string;
  description: string;
  coach: string;
  coachId: string;
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
