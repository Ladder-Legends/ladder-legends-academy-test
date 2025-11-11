import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import buildOrdersData from '@/data/build-orders.json';
import replaysData from '@/data/replays.json';
import videosData from '@/data/videos.json';
import masterclassesData from '@/data/masterclasses.json';
import eventsData from '@/data/events.json';
import coachesData from '@/data/coaches.json';
import { BuildOrder } from '@/types/build-order';
import { Replay } from '@/types/replay';
import { Video } from '@/types/video';
import { Masterclass } from '@/types/masterclass';
import { Event } from '@/types/event';
import { Coach } from '@/types/coach';
import {
  enrichBuildOrder,
  enrichReplay,
  enrichVideo,
  enrichMasterclass,
  enrichEvent,
  createSearchableText,
  ContentCollections,
} from '@/lib/content-enrichment';

const buildOrders = buildOrdersData as BuildOrder[];
const replays = replaysData as Replay[];
const videos = videosData as Video[];
const masterclasses = masterclassesData as Masterclass[];
const events = eventsData as Event[];
const coaches = coachesData as Coach[];

const collections: ContentCollections = {
  buildOrders,
  replays,
  videos,
  masterclasses,
  events,
  coaches,
};

/**
 * Search result interface
 */
interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'coach' | 'masterclass' | 'event' | 'buildOrder' | 'replay' | 'video';
  url: string;
  metadata?: Record<string, unknown>;
  score: number; // Relevance score
}

/**
 * Omnisearch response
 */
interface OmnisearchResponse {
  query: string;
  results: {
    coaches: SearchResult[];
    masterclasses: SearchResult[];
    events: SearchResult[];
    buildOrders: SearchResult[];
    replays: SearchResult[];
    videos: SearchResult[];
  };
  totalResults: number;
}

/**
 * Calculate relevance score based on where the match was found
 */
function calculateScore(
  query: string,
  title: string,
  description?: string,
  enrichedText?: string
): number {
  const lowerQuery = query.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description?.toLowerCase() || '';

  let score = 0;

  // Exact title match: highest score
  if (lowerTitle === lowerQuery) {
    score += 100;
  }
  // Title starts with query
  else if (lowerTitle.startsWith(lowerQuery)) {
    score += 75;
  }
  // Title contains query
  else if (lowerTitle.includes(lowerQuery)) {
    score += 50;
  }

  // Description contains query
  if (lowerDesc.includes(lowerQuery)) {
    score += 25;
  }

  // Enriched content contains query (related content)
  if (enrichedText?.includes(lowerQuery)) {
    score += 10;
  }

  return score;
}

/**
 * Search coaches
 */
function searchCoaches(query: string, limit: number): SearchResult[] {
  const lowerQuery = query.toLowerCase();

  return coaches
    .filter(coach => {
      const searchText = [
        coach.name,
        coach.bio,
        coach.race,
        coach.specialties?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(lowerQuery);
    })
    .map(coach => ({
      id: coach.id,
      title: coach.name,
      description: coach.bio,
      type: 'coach' as const,
      url: `/coaches/${coach.id}`,
      metadata: {
        race: coach.race,
        image: coach.image,
      },
      score: calculateScore(query, coach.name, coach.bio),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search masterclasses
 */
function searchMasterclasses(
  query: string,
  limit: number,
  hasSubscription: boolean
): SearchResult[] {
  const lowerQuery = query.toLowerCase();

  return masterclasses
    .filter(mc => {
      // Apply paywall filter
      if (!mc.isFree && !hasSubscription) {
        return false;
      }

      const enriched = enrichMasterclass(mc, collections);
      const searchText = [
        mc.title,
        mc.description,
        mc.coach,
        mc.race,
        ...mc.tags,
        ...enriched._enriched.videoTitles,
        ...enriched._enriched.buildOrderNames,
        ...enriched._enriched.replayTitles,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(lowerQuery);
    })
    .map(mc => {
      const enriched = enrichMasterclass(mc, collections);
      return {
        id: mc.id,
        title: mc.title,
        description: mc.description,
        type: 'masterclass' as const,
        url: `/masterclasses/${mc.id}`,
        metadata: {
          coach: mc.coach,
          race: mc.race,
          difficulty: mc.difficulty,
        },
        score: calculateScore(
          query,
          mc.title,
          mc.description,
          createSearchableText(enriched)
        ),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search events
 */
function searchEvents(
  query: string,
  limit: number,
  hasSubscription: boolean
): SearchResult[] {
  const lowerQuery = query.toLowerCase();

  return events
    .filter(event => {
      // Apply paywall filter
      if (!event.isFree && !hasSubscription) {
        return false;
      }

      const enriched = enrichEvent(event, collections);
      const searchText = [
        event.title,
        event.description,
        event.type,
        event.coach,
        ...event.tags,
        ...enriched._enriched.videoTitles,
        ...enriched._enriched.masterclassTitles,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(lowerQuery);
    })
    .map(event => {
      const enriched = enrichEvent(event, collections);
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        type: 'event' as const,
        url: `/events/${event.id}`,
        metadata: {
          type: event.type,
          date: event.date,
          coach: event.coach,
        },
        score: calculateScore(
          query,
          event.title,
          event.description,
          createSearchableText(enriched)
        ),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search build orders
 */
function searchBuildOrders(
  query: string,
  limit: number,
  hasSubscription: boolean
): SearchResult[] {
  const lowerQuery = query.toLowerCase();

  return buildOrders
    .filter(bo => {
      // Apply paywall filter
      if (!bo.isFree && !hasSubscription) {
        return false;
      }

      const enriched = enrichBuildOrder(bo, collections);
      const searchText = [
        bo.name,
        bo.description,
        bo.coach,
        bo.race,
        bo.vsRace,
        bo.type,
        ...bo.tags,
        ...enriched._enriched.videoTitles,
        ...enriched._enriched.replayPlayers,
        enriched._enriched.replayMap,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(lowerQuery);
    })
    .map(bo => {
      const enriched = enrichBuildOrder(bo, collections);
      return {
        id: bo.id,
        title: bo.name,
        description: bo.description,
        type: 'buildOrder' as const,
        url: `/build-orders/${bo.id}`,
        metadata: {
          race: bo.race,
          vsRace: bo.vsRace,
          difficulty: bo.difficulty,
          coach: bo.coach,
        },
        score: calculateScore(
          query,
          bo.name,
          bo.description,
          createSearchableText(enriched)
        ),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search replays
 */
function searchReplays(
  query: string,
  limit: number,
  hasSubscription: boolean
): SearchResult[] {
  const lowerQuery = query.toLowerCase();

  return replays
    .filter(replay => {
      // Apply paywall filter
      if (!replay.isFree && !hasSubscription) {
        return false;
      }

      const enriched = enrichReplay(replay, collections);
      const searchText = [
        replay.title,
        replay.description,
        replay.map,
        replay.player1.name,
        replay.player2.name,
        replay.coach,
        replay.matchup,
        ...replay.tags,
        ...enriched._enriched.videoTitles,
        ...enriched._enriched.buildOrderNames,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(lowerQuery);
    })
    .map(replay => {
      const enriched = enrichReplay(replay, collections);
      return {
        id: replay.id,
        title: replay.title,
        description: replay.description,
        type: 'replay' as const,
        url: `/replays/${replay.id}`,
        metadata: {
          matchup: replay.matchup,
          map: replay.map,
          player1: replay.player1.name,
          player2: replay.player2.name,
          coach: replay.coach,
        },
        score: calculateScore(
          query,
          replay.title,
          replay.description,
          createSearchableText(enriched)
        ),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search videos
 */
function searchVideos(
  query: string,
  limit: number,
  hasSubscription: boolean
): SearchResult[] {
  const lowerQuery = query.toLowerCase();

  return videos
    .filter(video => {
      // Apply paywall filter
      if (!video.isFree && !hasSubscription) {
        return false;
      }

      const enriched = enrichVideo(video, collections);
      const searchText = [
        video.title,
        video.description,
        video.coach,
        ...video.tags,
        ...enriched._enriched.buildOrderNames,
        ...enriched._enriched.replayTitles,
        ...enriched._enriched.replayPlayers,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(lowerQuery);
    })
    .map(video => {
      const enriched = enrichVideo(video, collections);
      return {
        id: video.id,
        title: video.title,
        description: video.description,
        type: 'video' as const,
        url: `/videos/${video.id}`,
        metadata: {
          coach: video.coach,
          date: video.date,
          source: video.muxPlaybackId ? 'mux' : video.youtubeId ? 'youtube' : 'playlist',
        },
        score: calculateScore(
          query,
          video.title,
          video.description,
          createSearchableText(enriched)
        ),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * GET /api/omnisearch
 * Search across all content types
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Check authentication for subscriber content
    const session = await auth();
    const hasSubscription =
      session?.user?.hasSubscriberRole ||
      session?.user?.roles?.includes('coaches') ||
      session?.user?.roles?.includes('owner') ||
      false;

    // Search all content types
    const coachResults = searchCoaches(query, limit);
    const masterclassResults = searchMasterclasses(query, limit, hasSubscription);
    const eventResults = searchEvents(query, limit, hasSubscription);
    const buildOrderResults = searchBuildOrders(query, limit, hasSubscription);
    const replayResults = searchReplays(query, limit, hasSubscription);
    const videoResults = searchVideos(query, limit, hasSubscription);

    const totalResults =
      coachResults.length +
      masterclassResults.length +
      eventResults.length +
      buildOrderResults.length +
      replayResults.length +
      videoResults.length;

    const response: OmnisearchResponse = {
      query,
      results: {
        coaches: coachResults,
        masterclasses: masterclassResults,
        events: eventResults,
        buildOrders: buildOrderResults,
        replays: replayResults,
        videos: videoResults,
      },
      totalResults,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Omnisearch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
