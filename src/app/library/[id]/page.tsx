import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { videos as allVideos } from '@/lib/data';
import { VideoDetailClient } from './video-detail-client';
import { VideoStructuredData } from '@/components/seo/structured-data';
import { generatePlaylistMetadata } from '@/lib/metadata-helpers';

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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const video = allVideos.find(v => v.id === id);

  if (!video) {
    return {
      title: 'Video Not Found',
      description: 'The requested video could not be found.',
    };
  }

  return generatePlaylistMetadata({
    content: video,
    allVideos,
    searchParams: searchParamsResolved,
    basePath: '/library',
    contentType: 'Video',
  });
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
      <Suspense fallback={<div>Loading...</div>}>
        <VideoDetailClient video={video} />
      </Suspense>
    </>
  );
}
