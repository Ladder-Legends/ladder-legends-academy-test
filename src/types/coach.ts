export interface Coach {
  id: string;
  name: string;
  displayName: string;
  race: 'terran' | 'zerg' | 'protoss' | 'all' | 'none';
  bio: string;
  rank?: string;
  specialties: string[];
  image?: string;
  bookingUrl?: string;
  pricePerHour?: string; // e.g., "£30/hr" or "$25/hr"
  isActive?: boolean; // If false, coach is hidden from filters/UI but content remains
  battleTags?: string[]; // SC2 battle tags for identifying replays featuring this coach
  socialLinks?: {
    twitch?: string;
    youtube?: string;
    twitter?: string;
    discord?: string;
  };
}
