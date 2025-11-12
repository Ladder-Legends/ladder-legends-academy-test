/**
 * Tests for content enrichment utilities
 */

import {
  enrichBuildOrder,
  enrichReplay,
  enrichVideo,
  enrichMasterclass,
  enrichEvent,
  type ContentCollections,
} from '../content-enrichment';
import type { BuildOrder } from '@/types/build-order';
import type { Replay } from '@/types/replay';
import type { Video } from '@/types/video';
import type { Masterclass } from '@/types/masterclass';
import type { Event } from '@/types/event';

describe('enrichBuildOrder', () => {
  it('should enrich build order with related video metadata', () => {
    const buildOrder: BuildOrder = {
      id: 'bo-1',
      name: 'Test Build',
      race: 'terran',
      vsRace: 'zerg',
      description: 'Test',
      difficulty: 'basic',
      coach: 'Coach Name',
      coachId: 'coach-1',
      tags: [],
      steps: [],
      videoIds: ['video-1'],
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [
        {
          id: 'video-1',
          title: 'Video Title',
          description: 'Video Description',
          coach: 'coach-1',
          categories: ['fundamentals'],
        } as Video,
      ],
      replays: [],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichBuildOrder(buildOrder, collections);

    expect(enriched._enriched.videoTitles).toEqual(['Video Title']);
    expect(enriched._enriched.videoDescriptions).toEqual(['Video Description']);
    expect(enriched._enriched.videoCoaches).toEqual(['coach-1']);
    expect(enriched._enriched.videoCategories).toEqual(['fundamentals']);
  });

  it('should enrich build order with related replay metadata', () => {
    const buildOrder: BuildOrder = {
      id: 'bo-1',
      name: 'Test Build',
      race: 'terran',
      vsRace: 'zerg',
      description: 'Test',
      difficulty: 'basic',
      coach: 'Coach Name',
      coachId: 'coach-1',
      tags: [],
      steps: [],
      videoIds: [],
      replayId: 'replay-1',
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [
        {
          id: 'replay-1',
          title: 'Pro Game',
          map: 'Altitude LE',
          player1: { name: 'Player1', race: 'terran', result: 'win' },
          player2: { name: 'Player2', race: 'zerg', result: 'loss' },
        } as Replay,
      ],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichBuildOrder(buildOrder, collections);

    expect(enriched._enriched.replayTitle).toBe('Pro Game');
    expect(enriched._enriched.replayMap).toBe('Altitude LE');
    expect(enriched._enriched.replayPlayers).toEqual(['Player1', 'Player2']);
  });

  it('should enrich build order with masterclass references', () => {
    const buildOrder: BuildOrder = {
      id: 'bo-1',
      name: 'Test Build',
      race: 'terran',
      vsRace: 'zerg',
      description: 'Test',
      difficulty: 'basic',
      coach: 'Coach Name',
      coachId: 'coach-1',
      tags: [],
      steps: [],
      videoIds: [],
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [],
      buildOrders: [],
      masterclasses: [
        {
          id: 'mc-1',
          title: 'Masterclass Title',
          buildOrderIds: ['bo-1'],
        } as Masterclass,
      ],
      events: [],
      coaches: [],
    };

    const enriched = enrichBuildOrder(buildOrder, collections);

    expect(enriched._enriched.masterclassTitles).toEqual(['Masterclass Title']);
  });

  it('should handle build order with no related content', () => {
    const buildOrder: BuildOrder = {
      id: 'bo-1',
      name: 'Test Build',
      race: 'terran',
      vsRace: 'zerg',
      description: 'Test',
      difficulty: 'basic',
      coach: 'Coach Name',
      coachId: 'coach-1',
      tags: [],
      steps: [],
      videoIds: [],
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichBuildOrder(buildOrder, collections);

    expect(enriched._enriched.videoTitles).toEqual([]);
    expect(enriched._enriched.videoDescriptions).toEqual([]);
    expect(enriched._enriched.replayPlayers).toEqual([]);
    expect(enriched._enriched.masterclassTitles).toEqual([]);
  });
});

describe('enrichReplay', () => {
  it('should enrich replay with related video metadata', () => {
    const replay: Replay = {
      id: 'replay-1',
      title: 'Test Replay',
      map: 'Test Map',
      player1: { name: 'P1', race: 'terran', result: 'win' },
      player2: { name: 'P2', race: 'zerg', result: 'loss' },
      matchup: 'TvZ',
      duration: '10:00',
      gameDate: '2024-01-01',
      uploadDate: '2024-01-02',
      tags: [],
      videoIds: ['video-1'],
    };

    const collections: ContentCollections = {
      videos: [
        {
          id: 'video-1',
          title: 'Replay Analysis',
          description: 'Analysis video',
          coach: 'coach-1',
        } as Video,
      ],
      replays: [],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichReplay(replay, collections);

    expect(enriched._enriched.videoTitles).toEqual(['Replay Analysis']);
    expect(enriched._enriched.videoDescriptions).toEqual(['Analysis video']);
    expect(enriched._enriched.videoCoaches).toEqual(['coach-1']);
  });

  it('should enrich replay with build order references', () => {
    const replay: Replay = {
      id: 'replay-1',
      title: 'Test Replay',
      map: 'Test Map',
      player1: { name: 'P1', race: 'terran', result: 'win' },
      player2: { name: 'P2', race: 'zerg', result: 'loss' },
      matchup: 'TvZ',
      duration: '10:00',
      gameDate: '2024-01-01',
      uploadDate: '2024-01-02',
      tags: [],
      videoIds: [],
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [],
      buildOrders: [
        {
          id: 'bo-1',
          name: 'Build from Replay',
          replayId: 'replay-1',
          categories: ['timing'],
        } as BuildOrder,
      ],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichReplay(replay, collections);

    expect(enriched._enriched.buildOrderNames).toEqual(['Build from Replay']);
    expect(enriched._enriched.buildOrderCategories).toEqual(['timing']);
  });
});

describe('enrichVideo', () => {
  it('should enrich video with build order metadata', () => {
    const video: Video = {
      id: 'video-1',
      title: 'Test Video',
      description: 'Test',
      date: '2024-01-01',
      youtubeId: 'yt-1',
      coach: 'coach-1',
      race: 'terran',
      categories: [],
      tags: [],
      thumbnail: 'https://example.com/thumb.jpg',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [],
      buildOrders: [
        {
          id: 'bo-1',
          name: 'Marine Rush',
          race: 'terran',
          vsRace: 'zerg',
          videoIds: ['video-1'],
        } as BuildOrder,
      ],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichVideo(video, collections);

    expect(enriched._enriched.buildOrderNames).toEqual(['Marine Rush']);
    expect(enriched._enriched.buildOrderRaces).toEqual(['terran vs zerg']);
  });

  it('should enrich video with replay metadata', () => {
    const video: Video = {
      id: 'video-1',
      title: 'Test Video',
      description: 'Test',
      date: '2024-01-01',
      coach: 'coach-1',
      race: 'terran',
      categories: [],
      tags: [],
      thumbnail: 'https://example.com/thumb.jpg',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [
        {
          id: 'replay-1',
          title: 'Epic Game',
          map: 'Altitude LE',
          player1: { name: 'Pro1', race: 'terran', result: 'win' },
          player2: { name: 'Pro2', race: 'zerg', result: 'loss' },
          videoIds: ['video-1'],
        } as Replay,
      ],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichVideo(video, collections);

    expect(enriched._enriched.replayTitles).toEqual(['Epic Game']);
    expect(enriched._enriched.replayMaps).toEqual(['Altitude LE']);
    expect(enriched._enriched.replayPlayers).toEqual(['Pro1', 'Pro2']);
  });

  it('should match videos by youtubeId', () => {
    const video: Video = {
      id: 'video-1',
      title: 'Test Video',
      description: 'Test',
      date: '2024-01-01',
      youtubeId: 'yt-123',
      coach: 'coach-1',
      race: 'terran',
      categories: [],
      tags: [],
      thumbnail: 'https://example.com/thumb.jpg',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [],
      buildOrders: [
        {
          id: 'bo-1',
          name: 'Build',
          race: 'terran',
          vsRace: 'zerg',
          videoIds: ['yt-123'],
        } as BuildOrder,
      ],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichVideo(video, collections);

    expect(enriched._enriched.buildOrderNames).toEqual(['Build']);
  });
});

describe('enrichMasterclass', () => {
  it('should enrich masterclass with video metadata', () => {
    const masterclass: Masterclass = {
      id: 'mc-1',
      title: 'Test Masterclass',
      description: 'Test',
      coach: 'coach-1',
      race: 'terran',
      categories: [],
      tags: [],
      videoIds: ['video-1'],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [
        {
          id: 'video-1',
          title: 'Lesson 1',
          description: 'First lesson',
        } as Video,
      ],
      replays: [],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichMasterclass(masterclass, collections);

    expect(enriched._enriched.videoTitles).toEqual(['Lesson 1']);
    expect(enriched._enriched.videoDescriptions).toEqual(['First lesson']);
  });

  it('should enrich masterclass with build order metadata', () => {
    const masterclass: Masterclass = {
      id: 'mc-1',
      title: 'Test Masterclass',
      description: 'Test',
      coach: 'coach-1',
      race: 'terran',
      categories: [],
      tags: [],
      videoIds: [],
      buildOrderIds: ['bo-1', 'bo-2'],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [],
      buildOrders: [
        {
          id: 'bo-1',
          name: 'Build 1',
          race: 'terran',
          vsRace: 'zerg',
        } as BuildOrder,
        {
          id: 'bo-2',
          name: 'Build 2',
          race: 'terran',
          vsRace: 'protoss',
        } as BuildOrder,
      ],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichMasterclass(masterclass, collections);

    expect(enriched._enriched.buildOrderNames).toEqual(['Build 1', 'Build 2']);
    expect(enriched._enriched.buildOrderRaces).toEqual([
      'terran vs zerg',
      'terran vs protoss',
    ]);
  });

  it('should enrich masterclass with replay metadata', () => {
    const masterclass: Masterclass = {
      id: 'mc-1',
      title: 'Test Masterclass',
      description: 'Test',
      coach: 'coach-1',
      race: 'terran',
      categories: [],
      tags: [],
      videoIds: [],
      replayIds: ['replay-1'],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [
        {
          id: 'replay-1',
          title: 'Pro Game',
          map: 'Test Map',
        } as Replay,
      ],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichMasterclass(masterclass, collections);

    expect(enriched._enriched.replayTitles).toEqual(['Pro Game']);
    expect(enriched._enriched.replayMaps).toEqual(['Test Map']);
  });
});

describe('enrichEvent', () => {
  it('should enrich event with video metadata', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Tournament',
      description: 'Test',
      date: '2024-01-01',
      time: '12:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: ['video-1'],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [
        {
          id: 'video-1',
          title: 'Tournament VOD',
          description: 'VOD description',
        } as Video,
      ],
      replays: [],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichEvent(event, collections);

    expect(enriched._enriched.videoTitles).toEqual(['Tournament VOD']);
    expect(enriched._enriched.videoDescriptions).toEqual(['VOD description']);
  });

  it('should enrich event with related content through videos', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Test',
      date: '2024-01-01',
      time: '12:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: ['video-1'],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [
        {
          id: 'video-1',
          title: 'Event Video',
        } as Video,
      ],
      replays: [
        {
          id: 'replay-1',
          title: 'Event Replay',
          videoIds: ['video-1'],
        } as Replay,
      ],
      buildOrders: [
        {
          id: 'bo-1',
          name: 'Event Build',
          videoIds: ['video-1'],
        } as BuildOrder,
      ],
      masterclasses: [
        {
          id: 'mc-1',
          title: 'Event Masterclass',
          videoIds: ['video-1'],
        } as Masterclass,
      ],
      events: [],
      coaches: [],
    };

    const enriched = enrichEvent(event, collections);

    expect(enriched._enriched.buildOrderNames).toEqual(['Event Build']);
    expect(enriched._enriched.replayTitles).toEqual(['Event Replay']);
    expect(enriched._enriched.masterclassTitles).toEqual(['Event Masterclass']);
  });

  it('should handle event with no related content', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Test',
      date: '2024-01-01',
      time: '12:00',
      timezone: 'America/New_York',
      type: 'streaming',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const collections: ContentCollections = {
      videos: [],
      replays: [],
      buildOrders: [],
      masterclasses: [],
      events: [],
      coaches: [],
    };

    const enriched = enrichEvent(event, collections);

    expect(enriched._enriched.videoTitles).toEqual([]);
    expect(enriched._enriched.buildOrderNames).toEqual([]);
    expect(enriched._enriched.replayTitles).toEqual([]);
    expect(enriched._enriched.masterclassTitles).toEqual([]);
  });
});
