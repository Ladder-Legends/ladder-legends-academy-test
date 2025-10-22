export type Race = 'terran' | 'zerg' | 'protoss';
export type VsRace = 'terran' | 'zerg' | 'protoss' | 'all';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
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
  type: BuildType;
  difficulty: Difficulty;
  coach: string;
  coachId: string;
  description: string;
  videoUrl?: string;
  videoId?: string;
  steps: BuildOrderStep[];
  tags: string[];
  patch?: string;
  updatedAt: string;
}
