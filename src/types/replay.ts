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

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  coach?: string;
  coachId?: string; // Link to coach in coaches collection
  tags: string[];
  patch?: string;
  notes?: string;

  // Access control: undefined or false = premium (default), true = free
  isFree?: boolean;
}
