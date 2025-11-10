import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import coachesData from '@/data/coaches.json';
import videosData from '@/data/videos.json';
import { CoachDetailClient } from './coach-detail-client';
import { CoachStructuredData } from '@/components/seo/structured-data';

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
          url: 'https://www.ladderlegendsacademy.com/LL_LOGO.png',
          width: 512,
          height: 512,
          alt: `${coach.displayName} - Ladder Legends Academy Coach`,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: `${title} | Ladder Legends Academy`,
      description,
      images: ['https://www.ladderlegendsacademy.com/LL_LOGO.png'],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function CoachDetailPage({ params }: { params: { id: string } }) {
  const coach = coachesData.find((c) => c.id === params.id);

  if (!coach) {
    notFound();
  }

  // Find all videos by this coach
  // Match by coachId first, then fall back to coach name comparison
  const coachVideos = videosData.filter((video) => {
    // Match by coachId (preferred)
    if (video.coachId && video.coachId === coach.id) {
      return true;
    }
    // Fall back to name matching (case-insensitive)
    if (video.coach?.toLowerCase() === coach.name.toLowerCase()) {
      return true;
    }
    // Also match if video.coach matches the displayName
    if (video.coach?.toLowerCase() === coach.displayName.toLowerCase()) {
      return true;
    }
    return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any; // Cast to any to handle the type mismatch from JSON

  return (
    <>
      <CoachStructuredData coach={coach} />
      <CoachDetailClient coach={coach} videos={coachVideos} />
    </>
  );
}
