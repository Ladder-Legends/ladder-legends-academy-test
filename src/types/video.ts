export interface Video {
  id: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  coach?: string;
  coachId?: string;
  youtubeId: string;
  thumbnail: string;
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
