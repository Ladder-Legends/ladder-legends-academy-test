import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import videosData from '@/data/videos.json';
import { Video, getVideoThumbnailUrl, isPlaylist } from '@/types/video';
import { VideoDetailClient } from './video-detail-client';
import { VideoStructuredData } from '@/components/seo/structured-data';

const allVideos = videosData as Video[];

// Generate static paths for all videos at build time
export async function generateStaticParams() {
  return allVideos.map((video) => ({
    id: video.id,
  }));
}

// Enable static generation with revalidation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const video = allVideos.find(v => v.id === id);

  if (!video) {
    return {
      title: 'Video Not Found | Ladder Legends Academy',
      description: 'The requested video could not be found.',
    };
  }

  const title = `${video.title} | Ladder Legends Academy`;
  const description = video.description || 'Master Starcraft 2 with expert coaching from Ladder Legends Academy';
  const thumbnailUrl = getVideoThumbnailUrl(video, 'high');
  const absoluteThumbnailUrl = thumbnailUrl.startsWith('http')
    ? thumbnailUrl
    : `https://www.ladderlegendsacademy.com${thumbnailUrl}`;

  const contentType = isPlaylist(video) ? 'Playlist' : 'Video';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.other',
      images: [
        {
          url: absoluteThumbnailUrl,
          width: 1280,
          height: 720,
          alt: video.title,
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
      'video:tag': video.tags.join(', '),
      'content:type': contentType,
    },
  };
}

export default async function VideoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const video = allVideos.find(v => v.id === id);

  if (!video) {
    notFound();
  }

  return (
    <>
      <VideoStructuredData video={video} />
      <VideoDetailClient video={video} />
    </>
  );
}
