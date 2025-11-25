import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  coaches as coachesData,
  videos as videosData,
  replays as replaysData,
  buildOrders as buildOrdersData,
  masterclasses as masterclassesData,
  events as eventsData,
} from '@/lib/data';
import { CoachDetailClient } from './coach-detail-client';
import { CoachStructuredData } from '@/components/seo/structured-data';
import { Coach } from '@/types/coach';
import { Video } from '@/types/video';
import { Replay, normalizeReplays } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import { Masterclass } from '@/types/masterclass';
import { Event } from '@/types/event';
import { getReplaysByCoach } from '@/lib/replay-coach-mapping';

export async function generateStaticParams() {
  return coachesData.map((coach) => ({
    id: coach.id,
  }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const coach = coachesData.find((c) => c.id === params.id);

  if (!coach) {
    return {
      title: 'Coach Not Found',
      description: 'The requested coach could not be found.',
    };
  }

  const raceLabel = coach.race === 'all' ? 'All Races' : coach.race.charAt(0).toUpperCase() + coach.race.slice(1);
  const title = `${coach.displayName} - ${raceLabel} Coach`;
  const description = coach.bio || `StarCraft 2 coaching with ${coach.displayName}, specializing in ${raceLabel} gameplay.`;
  const url = `https://www.ladderlegendsacademy.com/coaches/${coach.id}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Ladder Legends Academy`,
      description,
      url,
      type: 'profile',
      siteName: 'Ladder Legends Academy',
      images: [
        {
          url: 'https://www.ladderlegendsacademy.com/og-fallback.png',
          width: 1200,
          height: 630,
          alt: `${coach.displayName} - Ladder Legends Academy Coach`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Ladder Legends Academy`,
      description,
      images: ['https://www.ladderlegendsacademy.com/og-fallback.png'],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function CoachDetailPage({ params }: { params: { id: string } }) {
  const coach = coachesData.find((c) => c.id === params.id) as Coach | undefined;

  if (!coach) {
    notFound();
  }

  // Helper function to match content by coach
  const matchesCoach = (item: { coach?: string; coachId?: string }) => {
    // Match by coachId (preferred)
    if (item.coachId && item.coachId === coach.id) {
      return true;
    }
    // Fall back to name matching (case-insensitive)
    if (item.coach?.toLowerCase() === coach.name.toLowerCase()) {
      return true;
    }
    // Also match if item.coach matches the displayName
    if (item.coach?.toLowerCase() === coach.displayName.toLowerCase()) {
      return true;
    }
    return false;
  };

  // Find all content by this coach
  const coachVideos = videosData.filter(matchesCoach) as Video[];
  const coachReplays = getReplaysByCoach(normalizeReplays(replaysData as Replay[]), coach.id);
  const coachBuildOrders = (buildOrdersData as BuildOrder[]).filter(matchesCoach);
  const coachMasterclasses = (masterclassesData as Masterclass[]).filter(matchesCoach);
  const coachEvents = (eventsData as Event[]).filter(matchesCoach);

  const allVideos = videosData as Video[];

  return (
    <>
      <CoachStructuredData coach={coach} />
      <CoachDetailClient
        coach={coach}
        videos={coachVideos}
        replays={coachReplays}
        buildOrders={coachBuildOrders}
        masterclasses={coachMasterclasses}
        events={coachEvents}
        allVideos={allVideos}
      />
    </>
  );
}
