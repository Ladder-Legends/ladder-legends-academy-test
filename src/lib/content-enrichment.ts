/**
 * Content Enrichment Utilities
 *
 * These utilities enrich content items with metadata from related content,
 * enabling comprehensive search across all content types.
 */

import { BuildOrder } from '@/types/build-order';
import { Replay } from '@/types/replay';
import { Video } from '@/types/video';
import { Masterclass } from '@/types/masterclass';
import { Event } from '@/types/event';
import { Coach } from '@/types/coach';

/**
 * Enriched content types include searchable metadata from related content
 */
export interface EnrichedBuildOrder extends BuildOrder {
  _enriched: {
    videoTitles: string[];
    videoDescriptions: string[];
    videoCoaches: string[];
    videoCategories: string[];
    replayTitle?: string;
    replayMap?: string;
    replayPlayers: string[];
    masterclassTitles: string[];
    eventTitles: string[];
  };
}

export interface EnrichedReplay extends Replay {
  _enriched: {
    videoTitles: string[];
    videoDescriptions: string[];
    videoCoaches: string[];
    buildOrderNames: string[];
    buildOrderCategories: string[];
    masterclassTitles: string[];
    eventTitles: string[];
  };
}

export interface EnrichedVideo extends Video {
  _enriched: {
    buildOrderNames: string[];
    buildOrderRaces: string[];
    replayTitles: string[];
    replayMaps: string[];
    replayPlayers: string[];
    masterclassTitles: string[];
    eventTitles: string[];
  };
}

export interface EnrichedMasterclass extends Masterclass {
  _enriched: {
    videoTitles: string[];
    videoDescriptions: string[];
    buildOrderNames: string[];
    buildOrderRaces: string[];
    replayTitles: string[];
    replayMaps: string[];
    eventTitles: string[];
  };
}

export interface EnrichedEvent extends Event {
  _enriched: {
    videoTitles: string[];
    videoDescriptions: string[];
    buildOrderNames: string[];
    replayTitles: string[];
    masterclassTitles: string[];
  };
}

/**
 * Content collections for enrichment
 */
export interface ContentCollections {
  buildOrders: BuildOrder[];
  replays: Replay[];
  videos: Video[];
  masterclasses: Masterclass[];
  events: Event[];
  coaches: Coach[];
}

/**
 * Enrich a build order with related content metadata
 */
export function enrichBuildOrder(
  buildOrder: BuildOrder,
  collections: ContentCollections
): EnrichedBuildOrder {
  const { videos, replays, masterclasses, events } = collections;

  // Find related videos
  const relatedVideos = videos.filter(v =>
    buildOrder.videoIds?.includes(v.id) || buildOrder.videoIds?.includes(v.youtubeId || '')
  );

  // Find related replay
  const relatedReplay = buildOrder.replayId
    ? replays.find(r => r.id === buildOrder.replayId)
    : undefined;

  // Find masterclasses that reference this build order
  const relatedMasterclasses = masterclasses.filter(mc =>
    mc.buildOrderIds?.includes(buildOrder.id)
  );

  // Find events that might reference related videos
  const relatedEvents = events.filter(e =>
    buildOrder.videoIds?.some(vid => e.videoIds?.includes(vid))
  );

  return {
    ...buildOrder,
    _enriched: {
      videoTitles: relatedVideos.map(v => v.title),
      videoDescriptions: relatedVideos.map(v => v.description),
      videoCoaches: relatedVideos.map(v => v.coach).filter(Boolean) as string[],
      videoCategories: relatedVideos.flatMap(v => v.categories || []),
      replayTitle: relatedReplay?.title,
      replayMap: relatedReplay?.map,
      replayPlayers: relatedReplay
        ? [relatedReplay.player1.name, relatedReplay.player2.name]
        : [],
      masterclassTitles: relatedMasterclasses.map(mc => mc.title),
      eventTitles: relatedEvents.map(e => e.title),
    },
  };
}

/**
 * Enrich a replay with related content metadata
 */
export function enrichReplay(
  replay: Replay,
  collections: ContentCollections
): EnrichedReplay {
  const { videos, buildOrders, masterclasses, events } = collections;

  // Find related videos
  const relatedVideos = videos.filter(v =>
    replay.videoIds?.includes(v.id) || replay.videoIds?.includes(v.youtubeId || '')
  );

  // Find build orders that reference this replay
  const relatedBuildOrders = buildOrders.filter(bo => bo.replayId === replay.id);

  // Find masterclasses that reference this replay
  const relatedMasterclasses = masterclasses.filter(mc =>
    mc.replayIds?.includes(replay.id)
  );

  // Find events that reference related videos
  const relatedEvents = events.filter(e =>
    replay.videoIds?.some(vid => e.videoIds?.includes(vid))
  );

  return {
    ...replay,
    _enriched: {
      videoTitles: relatedVideos.map(v => v.title),
      videoDescriptions: relatedVideos.map(v => v.description),
      videoCoaches: relatedVideos.map(v => v.coach).filter(Boolean) as string[],
      buildOrderNames: relatedBuildOrders.map(bo => bo.name),
      buildOrderCategories: relatedBuildOrders.flatMap(bo => bo.categories || []),
      masterclassTitles: relatedMasterclasses.map(mc => mc.title),
      eventTitles: relatedEvents.map(e => e.title),
    },
  };
}

/**
 * Enrich a video with related content metadata
 */
export function enrichVideo(
  video: Video,
  collections: ContentCollections
): EnrichedVideo {
  const { buildOrders, replays, masterclasses, events } = collections;

  // Find build orders that reference this video
  const relatedBuildOrders = buildOrders.filter(bo =>
    bo.videoIds?.includes(video.id) || bo.videoIds?.includes(video.youtubeId || '')
  );

  // Find replays that reference this video
  const relatedReplays = replays.filter(r =>
    r.videoIds?.includes(video.id) || r.videoIds?.includes(video.youtubeId || '')
  );

  // Find masterclasses that reference this video
  const relatedMasterclasses = masterclasses.filter(mc =>
    mc.videoIds?.includes(video.id) || mc.videoIds?.includes(video.youtubeId || '')
  );

  // Find events that reference this video
  const relatedEvents = events.filter(e =>
    e.videoIds?.includes(video.id) || e.videoIds?.includes(video.youtubeId || '')
  );

  return {
    ...video,
    _enriched: {
      buildOrderNames: relatedBuildOrders.map(bo => bo.name),
      buildOrderRaces: relatedBuildOrders.map(bo => `${bo.race} vs ${bo.vsRace}`),
      replayTitles: relatedReplays.map(r => r.title),
      replayMaps: relatedReplays.map(r => r.map),
      replayPlayers: relatedReplays.flatMap(r => [r.player1.name, r.player2.name]),
      masterclassTitles: relatedMasterclasses.map(mc => mc.title),
      eventTitles: relatedEvents.map(e => e.title),
    },
  };
}

/**
 * Enrich a masterclass with related content metadata
 */
export function enrichMasterclass(
  masterclass: Masterclass,
  collections: ContentCollections
): EnrichedMasterclass {
  const { videos, buildOrders, replays, events } = collections;

  // Find related videos
  const relatedVideos = videos.filter(v =>
    masterclass.videoIds?.includes(v.id) || masterclass.videoIds?.includes(v.youtubeId || '')
  );

  // Find related build orders
  const relatedBuildOrders = masterclass.buildOrderIds
    ? buildOrders.filter(bo => masterclass.buildOrderIds!.includes(bo.id))
    : [];

  // Find related replays
  const relatedReplays = masterclass.replayIds
    ? replays.filter(r => masterclass.replayIds!.includes(r.id))
    : [];

  // Find events that reference related videos
  const relatedEvents = events.filter(e =>
    masterclass.videoIds?.some(vid => e.videoIds?.includes(vid))
  );

  return {
    ...masterclass,
    _enriched: {
      videoTitles: relatedVideos.map(v => v.title),
      videoDescriptions: relatedVideos.map(v => v.description),
      buildOrderNames: relatedBuildOrders.map(bo => bo.name),
      buildOrderRaces: relatedBuildOrders.map(bo => `${bo.race} vs ${bo.vsRace}`),
      replayTitles: relatedReplays.map(r => r.title),
      replayMaps: relatedReplays.map(r => r.map),
      eventTitles: relatedEvents.map(e => e.title),
    },
  };
}

/**
 * Enrich an event with related content metadata
 */
export function enrichEvent(
  event: Event,
  collections: ContentCollections
): EnrichedEvent {
  const { videos, buildOrders, replays, masterclasses } = collections;

  // Find related videos
  const relatedVideos = videos.filter(v =>
    event.videoIds?.includes(v.id) || event.videoIds?.includes(v.youtubeId || '')
  );

  // Find build orders that reference related videos
  const relatedBuildOrders = buildOrders.filter(bo =>
    bo.videoIds?.some(vid => event.videoIds?.includes(vid))
  );

  // Find replays that reference related videos
  const relatedReplays = replays.filter(r =>
    r.videoIds?.some(vid => event.videoIds?.includes(vid))
  );

  // Find masterclasses that reference related videos
  const relatedMasterclasses = masterclasses.filter(mc =>
    mc.videoIds?.some(vid => event.videoIds?.includes(vid))
  );

  return {
    ...event,
    _enriched: {
      videoTitles: relatedVideos.map(v => v.title),
      videoDescriptions: relatedVideos.map(v => v.description),
      buildOrderNames: relatedBuildOrders.map(bo => bo.name),
      replayTitles: relatedReplays.map(r => r.title),
      masterclassTitles: relatedMasterclasses.map(mc => mc.title),
    },
  };
}

/**
 * Create a searchable text from enriched content for full-text search
 */
export function createSearchableText(enriched: {
  _enriched: Record<string, string | string[] | undefined>;
}): string {
  const parts: string[] = [];

  Object.values(enriched._enriched).forEach(value => {
    if (Array.isArray(value)) {
      parts.push(...value.filter(Boolean));
    } else if (value) {
      parts.push(value);
    }
  });

  return parts.join(' ').toLowerCase();
}

/**
 * Enrich all content in collections
 */
export function enrichAllContent(collections: ContentCollections) {
  return {
    buildOrders: collections.buildOrders.map(bo => enrichBuildOrder(bo, collections)),
    replays: collections.replays.map(r => enrichReplay(r, collections)),
    videos: collections.videos.map(v => enrichVideo(v, collections)),
    masterclasses: collections.masterclasses.map(mc => enrichMasterclass(mc, collections)),
    events: collections.events.map(e => enrichEvent(e, collections)),
  };
}
