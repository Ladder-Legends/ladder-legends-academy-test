import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
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

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const masterclass = allMasterclasses.find(mc => mc.id === id);

  if (!masterclass) {
    return {
      title: 'Masterclass Not Found | Ladder Legends Academy',
      description: 'The requested masterclass could not be found.',
    };
  }

  // For masterclasses with multiple videos, check if a specific video is requested via ?v= query param
  let displayVideo: Video | null = null;
  let playlistContext = '';
  const hasMultipleVideos = masterclass.videoIds && masterclass.videoIds.length > 1;

  if (hasMultipleVideos && masterclass.videoIds) {
    const vParam = searchParamsResolved.v;
    const videoIndex = typeof vParam === 'string' ? parseInt(vParam, 10) : 0;

    if (!isNaN(videoIndex) && videoIndex >= 0 && videoIndex < masterclass.videoIds.length) {
      const video = allVideos.find(v => v.id === masterclass.videoIds![videoIndex]);
      if (video) {
        displayVideo = video;
        playlistContext = ` - ${masterclass.title}`;
      }
    }
  }

  // Use video title if we have a selected video, otherwise use masterclass title
  const title = displayVideo
    ? `${displayVideo.title}${playlistContext} | Ladder Legends Academy`
    : `${masterclass.title} | Ladder Legends Academy`;

  const description = displayVideo?.description || masterclass.description ||
    `${masterclass.difficulty} level masterclass for ${masterclass.race}. ${masterclass.coach ? `Coached by ${masterclass.coach}.` : ''}`.trim();

  // Try to get thumbnail from selected video, masterclass thumbnail, or first video
  let thumbnailUrl = masterclass.thumbnail || '/placeholder-thumbnail.jpg';
  if (displayVideo) {
    thumbnailUrl = getVideoThumbnailUrl(displayVideo, 'high');
  } else if ((!masterclass.thumbnail || masterclass.thumbnail === '/placeholder-thumbnail.jpg') &&
      masterclass.videoIds && masterclass.videoIds.length > 0) {
    const firstVideo = allVideos.find(v => v.id === masterclass.videoIds[0]);
    if (firstVideo) {
      thumbnailUrl = getVideoThumbnailUrl(firstVideo, 'high');
    }
  }

  const absoluteThumbnailUrl = thumbnailUrl.startsWith('http')
    ? thumbnailUrl
    : `https://www.ladderlegendsacademy.com${thumbnailUrl}`;

  // Build the canonical URL with query param if a specific video is selected
  let canonicalUrl = `https://www.ladderlegendsacademy.com/masterclasses/${id}`;
  if (displayVideo) {
    const vParam = searchParamsResolved.v;
    if (vParam) {
      canonicalUrl += `?v=${vParam}`;
    }
  }

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
          alt: displayVideo?.title || masterclass.title,
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
    alternates: {
      canonical: canonicalUrl,
    },
    other: {
      ...(masterclass.race && { 'masterclass:race': masterclass.race }),
      ...(masterclass.difficulty && { 'masterclass:difficulty': masterclass.difficulty }),
      ...(displayVideo?.tags && { 'video:tag': displayVideo.tags.join(', ') }),
    },
  };
}

export default async function MasterclassDetailPage({ params }: PageProps) {
  const { id } = await params;
  const masterclass = allMasterclasses.find(mc => mc.id === id);

  if (!masterclass) {
    notFound();
  }

  return (
    <>
      <MasterclassStructuredData masterclass={masterclass} />
      <Suspense fallback={<div>Loading...</div>}>
        <MasterclassDetailClient masterclass={masterclass} />
      </Suspense>
    </>
  );
}
