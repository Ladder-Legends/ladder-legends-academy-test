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

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  replayId?: string; // Link to replay in replays collection
  steps: BuildOrderStep[];
  tags: string[];
  patch?: string;
  updatedAt: string;

  // Access control: undefined or false = premium (default), true = free
  isFree?: boolean;
}
