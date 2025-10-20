export type Race = 'terran' | 'zerg' | 'protoss' | 'all';

export interface MasterclassEpisode {
  episodeNumber: number;
  title: string;
  videoId: string;
  duration: string;
  description?: string;
}

export interface Masterclass {
  id: string;
  title: string;
  description: string;
  coach: string;
  coachId: string;
  race: Race;
  episodes: MasterclassEpisode[];
  totalDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}
