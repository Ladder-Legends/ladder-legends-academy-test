export interface Coach {
  id: string;
  name: string;
  displayName: string;
  race: 'terran' | 'zerg' | 'protoss' | 'all';
  bio: string;
  rank?: string;
  specialties: string[];
  image?: string;
  bookingUrl?: string;
  socialLinks?: {
    twitch?: string;
    youtube?: string;
    twitter?: string;
    discord?: string;
  };
}
