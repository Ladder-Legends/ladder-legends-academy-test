import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import coachesData from '@/data/coaches.json';
import videosData from '@/data/videos.json';
import replaysData from '@/data/replays.json';
import buildOrdersData from '@/data/build-orders.json';
import { RaceCoachingClient } from './race-coaching-client';
import { Video } from '@/types/video';
import { Coach } from '@/types/coach';
import { BuildOrder } from '@/types/build-order';
import { Replay, normalizeReplays } from '@/types/replay';

type Race = 'terran' | 'zerg' | 'protoss' | 'random';

const raceConfig = {
  terran: {
    title: 'Terran',
    color: 'from-blue-500 to-blue-700',
    description: 'Master Terran with expert coaching from Grandmaster players. Learn macro management, harassment techniques, and powerful timing attacks.',
  },
  zerg: {
    title: 'Zerg',
    color: 'from-purple-500 to-purple-700',
    description: 'Dominate with Zerg through expert coaching. Master creep spread, inject timings, and deadly all-in strategies.',
  },
  protoss: {
    title: 'Protoss',
    color: 'from-yellow-500 to-yellow-700',
    description: 'Excel as Protoss with professional coaching. Learn powerful builds, perfect warp prism control, and game-ending timing attacks.',
  },
  random: {
    title: 'Random',
    color: 'from-green-500 to-green-700',
    description: 'Master all three races with versatile coaching. Learn fundamental strategies that work across Terran, Zerg, and Protoss.',
  },
};

export async function generateStaticParams() {
  return [
    { race: 'terran' },
    { race: 'zerg' },
    { race: 'protoss' },
    { race: 'random' },
  ];
}

export async function generateMetadata({ params }: { params: { race: string } }): Promise<Metadata> {
  const race = params.race as Race;
  const config = raceConfig[race];

  if (!config) {
    return {
      title: 'Race Not Found',
      description: 'The requested race coaching page could not be found.',
    };
  }

  const title = `StarCraft 2 ${config.title} Coaching`;
  const description = `${config.description} Get personalized coaching from Grandmaster ${config.title} players at Ladder Legends Academy.`;
  const url = `https://www.ladderlegendsacademy.com/coaching/${race}`;

  return {
    title,
    description,
    keywords: [
      `StarCraft 2 ${config.title} coaching`,
      `SC2 ${config.title} coach`,
      `${config.title} build orders`,
      `${config.title} strategy`,
      `${config.title} gameplay`,
      'Grandmaster coaching',
      'esports coaching',
      'RTS coaching',
    ],
    openGraph: {
      title: `${title} | Ladder Legends Academy`,
      description,
      url,
      type: 'website',
      siteName: 'Ladder Legends Academy',
      images: [
        {
          url: race === 'terran'
            ? 'https://www.ladderlegendsacademy.com/terran-hero-bg.png'
            : 'https://www.ladderlegendsacademy.com/og-fallback.png',
          width: 1200,
          height: 630,
          alt: `${config.title} Coaching - Ladder Legends Academy`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Ladder Legends Academy`,
      description,
      images: [race === 'terran'
        ? 'https://www.ladderlegendsacademy.com/terran-hero-bg.png'
        : 'https://www.ladderlegendsacademy.com/og-fallback.png'],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function RaceCoachingPage({ params }: { params: { race: string } }) {
  const race = params.race as Race;
  const config = raceConfig[race];

  if (!config) {
    notFound();
  }

  // Type the JSON data imports
  const coaches = coachesData as Coach[];
  const videos = videosData as Video[];
  const buildOrders = buildOrdersData as BuildOrder[];

  // Filter coaches by race (random coaches appear on all pages)
  const raceCoaches = coaches.filter((coach) => {
    if (coach.isActive === false) return false;
    if (race === 'random') return coach.race === 'all';
    return coach.race === race || coach.race === 'all';
  });

  // Filter videos by race
  const raceVideos = videos.filter((video) => {
    if (race === 'random') return true; // Show all for random
    return video.race === race || video.race === 'all' || video.race === race.charAt(0).toUpperCase() + race.slice(1);
  });

  // Normalize replays so winner is always player1, then filter by race
  // After normalization, player1 is always the winner, so we just check player1.race
  const normalizedReplays = normalizeReplays(replaysData as Replay[]);
  const raceReplays = normalizedReplays.filter((replay) => {
    if (race === 'random') return true;
    // Player1 is always the winner after normalization
    const winnerRace = replay.player1.race?.toLowerCase() || '';
    return winnerRace === race;
  });

  // Filter build orders - only show where the build order's race matches the target race
  const raceBuildOrders = buildOrders.filter((buildOrder) => {
    if (race === 'random') return true;
    const buildOrderRace = buildOrder.race?.toLowerCase() || '';
    return buildOrderRace === race;
  });

  const allVideos = videos;

  return (
    <RaceCoachingClient
      race={race}
      config={config}
      coaches={raceCoaches}
      videos={raceVideos.slice(0, 12)}
      replays={raceReplays.slice(0, 12)}
      buildOrders={raceBuildOrders.slice(0, 12)}
      allVideos={allVideos}
    />
  );
}
