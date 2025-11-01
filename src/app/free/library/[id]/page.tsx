import { notFound } from 'next/navigation';
import videosData from '@/data/videos.json';
import { Video } from '@/types/video';
import { VideoDetailClient } from '@/app/library/[id]/video-detail-client';

const allVideos = videosData as Video[];

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
}

export default async function FreeVideoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const video = allVideos.find(v => v.id === id);

  // 404 if video doesn't exist OR if it's not free
  if (!video || !video.isFree) {
    notFound();
  }

  return <VideoDetailClient video={video} />;
}
