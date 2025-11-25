import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { videos as allVideos } from '@/lib/data';
import { getVideoThumbnailUrl, isPlaylist } from '@/types/video';
import { VideoDetailClient } from '@/app/library/[id]/video-detail-client';

// Generate static paths for all FREE videos at build time
export async function generateStaticParams() {
  return allVideos
    .filter(video => video.isFree === true)
    .map((video) => ({
      id: video.id,
    }));
}

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const video = allVideos.find(v => v.id === id);

  if (!video || !video.isFree) {
    return {
      title: 'Video Not Found',
      description: 'The requested video could not be found.',
    };
  }

  // For playlists, check if a specific video is requested via ?v= query param
  let displayVideo = video;
  let playlistContext = '';

  if (isPlaylist(video) && video.videoIds && video.videoIds.length > 0) {
    const vParam = searchParamsResolved.v;
    const videoIndex = typeof vParam === 'string' ? parseInt(vParam, 10) : 0;

    if (!isNaN(videoIndex) && videoIndex >= 0 && videoIndex < video.videoIds.length) {
      // Find the specific video in the playlist
      const playlistVideo = allVideos.find(v => v.id === video.videoIds![videoIndex]);
      if (playlistVideo) {
        displayVideo = playlistVideo;
        playlistContext = ` - ${video.title}`;
      }
    }
  }

  const title = displayVideo.title + playlistContext;
  const description = displayVideo.description || video.description || 'Master Starcraft 2 with expert coaching from Ladder Legends Academy';
  const thumbnailUrl = getVideoThumbnailUrl(displayVideo, 'high');
  const absoluteThumbnailUrl = thumbnailUrl.startsWith('http')
    ? thumbnailUrl
    : `https://www.ladderlegendsacademy.com${thumbnailUrl}`;

  // Build the canonical URL with query param if in playlist
  let canonicalUrl = `https://www.ladderlegendsacademy.com/free/library/${id}`;
  if (isPlaylist(video) && displayVideo.id !== video.id) {
    const vParam = searchParamsResolved.v;
    if (vParam) {
      canonicalUrl += `?v=${vParam}`;
    }
  }

  const contentType = isPlaylist(video) ? 'Playlist' : 'Video';

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Ladder Legends Academy`,
      description,
      url: canonicalUrl,
      type: 'video.other',
      images: [
        {
          url: absoluteThumbnailUrl,
          width: 1280,
          height: 720,
          alt: displayVideo.title,
        },
      ],
      siteName: 'Ladder Legends Academy',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Ladder Legends Academy`,
      description,
      images: [absoluteThumbnailUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    },
    other: {
      'video:tag': displayVideo.tags.join(', '),
      'content:type': contentType,
    },
  };
}

export default async function FreeVideoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const video = allVideos.find(v => v.id === id);

  // 404 if video doesn't exist OR if it's not free
  if (!video || !video.isFree) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VideoDetailClient video={video} />
    </Suspense>
  );
}
