import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import masterclassesData from '@/data/masterclasses.json';
import videosData from '@/data/videos.json';
import { Masterclass } from '@/types/masterclass';
import { Video, getVideoThumbnailUrl } from '@/types/video';
import { MasterclassDetailClient } from './masterclass-detail-client';
import { MasterclassStructuredData } from '@/components/seo/structured-data';

const allMasterclasses = masterclassesData as Masterclass[];
const allVideos = videosData as Video[];

export async function generateStaticParams() {
  return allMasterclasses.map((masterclass) => ({
    id: masterclass.id,
  }));
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const masterclass = allMasterclasses.find(mc => mc.id === params.id);

  if (!masterclass) {
    return {
      title: 'Masterclass Not Found | Ladder Legends Academy',
      description: 'The requested masterclass could not be found.',
    };
  }

  const title = `${masterclass.title} | Ladder Legends Academy`;
  const description = masterclass.description ||
    `${masterclass.difficulty} level masterclass for ${masterclass.race}. ${masterclass.coach ? `Coached by ${masterclass.coach}.` : ''}`.trim();

  // Try to get thumbnail from masterclass thumbnail or associated video
  let thumbnailUrl = masterclass.thumbnail || '/placeholder-thumbnail.jpg';
  if ((!masterclass.thumbnail || masterclass.thumbnail === '/placeholder-thumbnail.jpg') &&
      masterclass.videoIds && masterclass.videoIds.length > 0) {
    const firstVideo = allVideos.find(v => v.id === masterclass.videoIds[0]);
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
          alt: masterclass.title,
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
      ...(masterclass.race && { 'masterclass:race': masterclass.race }),
      ...(masterclass.difficulty && { 'masterclass:difficulty': masterclass.difficulty }),
    },
  };
}

export default function MasterclassDetailPage({ params }: { params: { id: string } }) {
  const masterclass = allMasterclasses.find(mc => mc.id === params.id);

  if (!masterclass) {
    notFound();
  }

  return (
    <>
      <MasterclassStructuredData masterclass={masterclass} />
      <MasterclassDetailClient masterclass={masterclass} />
    </>
  );
}
