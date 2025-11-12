export interface Sponsorship {
  id: string;
  name: string;
  description: string;
  url: string;
  logoUrl: string;
  displayOrder: number;
}

export interface SponsorshipData {
  communityFunding: string;
  sponsors: Sponsorship[];
}
