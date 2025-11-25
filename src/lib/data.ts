/**
 * Type-safe data loaders for all JSON data files.
 *
 * This is the single source of truth for accessing data.
 * Import from here instead of directly from @/data/*.json
 */

// JSON imports
import videosJson from '@/data/videos.json';
import coachesJson from '@/data/coaches.json';
import replaysJson from '@/data/replays.json';
import buildOrdersJson from '@/data/build-orders.json';
import masterclassesJson from '@/data/masterclasses.json';
import eventsJson from '@/data/events.json';
import sponsorshipsJson from '@/data/sponsorships.json';
import aboutJson from '@/data/about.json';

// Type imports
import { Video } from '@/types/video';
import { Coach } from '@/types/coach';
import { Replay } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import { Masterclass } from '@/types/masterclass';
import { Event } from '@/types/event';
import { SponsorshipData } from '@/types/sponsorship';

// Types for content pages
export interface AboutData {
  content: string;
}

// Typed exports - arrays
export const videos: Video[] = videosJson as Video[];
export const coaches: Coach[] = coachesJson as Coach[];
export const replays: Replay[] = replaysJson as Replay[];
export const buildOrders: BuildOrder[] = buildOrdersJson as BuildOrder[];
export const masterclasses: Masterclass[] = masterclassesJson as Masterclass[];
export const events: Event[] = eventsJson as Event[];

// Typed exports - objects
export const sponsorships: SponsorshipData = sponsorshipsJson as SponsorshipData;
export const about: AboutData = aboutJson as AboutData;

// Helper functions for common lookups
export function getVideoById(id: string): Video | undefined {
  return videos.find((v) => v.id === id);
}

export function getCoachById(id: string): Coach | undefined {
  return coaches.find((c) => c.id === id);
}

export function getReplayById(id: string): Replay | undefined {
  return replays.find((r) => r.id === id);
}

export function getBuildOrderById(id: string): BuildOrder | undefined {
  return buildOrders.find((b) => b.id === id);
}

export function getMasterclassById(id: string): Masterclass | undefined {
  return masterclasses.find((m) => m.id === id);
}

export function getEventById(id: string): Event | undefined {
  return events.find((e) => e.id === id);
}

// Helper to get coach name from ID (common pattern)
export function getCoachName(coachId: string | undefined): string {
  if (!coachId) return '—';
  const coach = coaches.find((c) => c.id === coachId);
  return coach?.displayName || coachId;
}

// Helper to get active coaches only
export function getActiveCoaches(): Coach[] {
  return coaches.filter((c) => c.isActive !== false);
}
