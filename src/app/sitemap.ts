import { MetadataRoute } from 'next';
import videosData from '@/data/videos.json';
import replaysData from '@/data/replays.json';
import buildOrdersData from '@/data/build-orders.json';
import masterclassesData from '@/data/masterclasses.json';
import coachesData from '@/data/coaches.json';
import eventsData from '@/data/events.json';
import { Video } from '@/types/video';
import { Replay } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import { Masterclass } from '@/types/masterclass';

const allVideos = videosData as Video[];
const allReplays = replaysData as Replay[];
const allBuildOrders = buildOrdersData as BuildOrder[];
const allMasterclasses = masterclassesData as Masterclass[];
const allCoaches = coachesData;
const allEvents = eventsData;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.ladderlegendsacademy.com';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/replays`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/build-orders`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/masterclasses`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/coaches`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/coaching/terran`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/coaching/zerg`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/coaching/protoss`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/coaching/random`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/subscribe`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  // Video/library pages
  const videoPages = allVideos.map((video) => ({
    url: `${baseUrl}/library/${video.id}`,
    lastModified: new Date(video.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Replay pages
  const replayPages = allReplays.map((replay) => ({
    url: `${baseUrl}/replays/${replay.id}`,
    lastModified: new Date(replay.uploadDate),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Build order pages
  const buildOrderPages = allBuildOrders.map((buildOrder) => ({
    url: `${baseUrl}/build-orders/${buildOrder.id}`,
    lastModified: new Date(buildOrder.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Masterclass pages
  const masterclassPages = allMasterclasses.map((masterclass) => ({
    url: `${baseUrl}/masterclasses/${masterclass.id}`,
    lastModified: new Date(masterclass.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Coach pages
  const coachPages = allCoaches
    .filter((coach) => coach.isActive !== false)
    .map((coach) => ({
      url: `${baseUrl}/coaches/${coach.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  // Event pages
  const eventPages = allEvents.map((event: { id: string; updatedAt?: string; createdAt?: string }) => ({
    url: `${baseUrl}/events/${event.id}`,
    lastModified: new Date(event.updatedAt || event.createdAt || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Free preview pages
  const freeVideoPages = allVideos
    .filter((video) => video.isFree)
    .map((video) => ({
      url: `${baseUrl}/free/library/${video.id}`,
      lastModified: new Date(video.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  const freeReplayPages = allReplays
    .filter((replay) => replay.isFree)
    .map((replay) => ({
      url: `${baseUrl}/free/replays/${replay.id}`,
      lastModified: new Date(replay.uploadDate),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

  const freeBuildOrderPages = allBuildOrders
    .filter((buildOrder) => buildOrder.isFree)
    .map((buildOrder) => ({
      url: `${baseUrl}/free/build-orders/${buildOrder.id}`,
      lastModified: new Date(buildOrder.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  const freeMasterclassPages = allMasterclasses
    .filter((masterclass) => masterclass.isFree)
    .map((masterclass) => ({
      url: `${baseUrl}/free/masterclasses/${masterclass.id}`,
      lastModified: new Date(masterclass.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  const freeEventPages = allEvents
    .filter((event: { isFree?: boolean }) => event.isFree)
    .map((event: { id: string; updatedAt?: string; createdAt?: string }) => ({
      url: `${baseUrl}/free/events/${event.id}`,
      lastModified: new Date(event.updatedAt || event.createdAt || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

  return [
    ...staticPages,
    ...videoPages,
    ...replayPages,
    ...buildOrderPages,
    ...masterclassPages,
    ...coachPages,
    ...eventPages,
    ...freeVideoPages,
    ...freeReplayPages,
    ...freeBuildOrderPages,
    ...freeMasterclassPages,
    ...freeEventPages,
  ];
}
