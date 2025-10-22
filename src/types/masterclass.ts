export type Race = 'terran' | 'zerg' | 'protoss' | 'all';

export interface Masterclass {
  id: string;
  title: string;
  description: string;
  coach: string;
  coachId: string;
  race: Race;
  videoId: string;
  duration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}
