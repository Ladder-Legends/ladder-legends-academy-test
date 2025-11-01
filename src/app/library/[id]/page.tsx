import { notFound } from 'next/navigation';
import videosData from '@/data/videos.json';
import { Video } from '@/types/video';
import { VideoDetailClient } from './video-detail-client';

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

export default async function VideoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const video = allVideos.find(v => v.id === id);

  if (!video) {
    notFound();
  }

  return <VideoDetailClient video={video} />;
}
