import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import replaysData from '@/data/replays.json';
import videosData from '@/data/videos.json';
import { Replay } from '@/types/replay';
import { Video, getVideoThumbnailUrl } from '@/types/video';
import { ReplayDetailClient } from './replay-detail-client';

const allReplays = replaysData as Replay[];
const allVideos = videosData as Video[];

export async function generateStaticParams() {
  return allReplays.map((replay) => ({
    id: replay.id,
  }));
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const replay = allReplays.find(r => r.id === params.id);

  if (!replay) {
    return {
      title: 'Replay Not Found | Ladder Legends Academy',
      description: 'The requested replay could not be found.',
    };
  }

  const title = `${replay.title} | Ladder Legends Academy`;
  const description = replay.notes ||
    `${replay.matchup} on ${replay.map} - ${replay.player1.name} (${replay.player1.race}) vs ${replay.player2.name} (${replay.player2.race}). ${replay.coach ? `Coached by ${replay.coach}.` : ''}`.trim();

  // Try to get thumbnail from associated video
  let thumbnailUrl = '/placeholder-thumbnail.jpg';
  if (replay.videoIds && replay.videoIds.length > 0) {
    const firstVideo = allVideos.find(v => v.id === replay.videoIds[0]);
    if (firstVideo) {
      thumbnailUrl = getVideoThumbnailUrl(firstVideo, 'high');
    }
  }

  const absoluteThumbnailUrl = thumbnailUrl.startsWith('http')
    ? thumbnailUrl
    : `https://www.ladderlegendsacademy.com${thumbnailUrl}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [
        {
          url: absoluteThumbnailUrl,
          width: 1280,
          height: 720,
          alt: replay.title,
        },
      ],
      siteName: 'Ladder Legends Academy',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteThumbnailUrl],
    },
    other: {
      'replay:matchup': replay.matchup,
      'replay:map': replay.map,
      'replay:duration': replay.duration,
    },
  };
}

export default function ReplayDetailPage({ params }: { params: { id: string } }) {
  const replay = allReplays.find(r => r.id === params.id);

  if (!replay) {
    notFound();
  }

  return <ReplayDetailClient replay={replay} />;
}
