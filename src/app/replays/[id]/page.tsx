import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import replaysData from '@/data/replays.json';
import videosData from '@/data/videos.json';
import { Replay } from '@/types/replay';
import { Video } from '@/types/video';
import { ReplayDetailClient } from './replay-detail-client';
import { ReplayStructuredData } from '@/components/seo/structured-data';
import { generatePlaylistMetadata } from '@/lib/metadata-helpers';

const allReplays = replaysData as Replay[];
const allVideos = videosData as Video[];

export async function generateStaticParams() {
  return allReplays.map((replay) => ({
    id: replay.id,
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
  const replay = allReplays.find(r => r.id === id);

  if (!replay) {
    return {
      title: 'Replay Not Found | Ladder Legends Academy',
      description: 'The requested replay could not be found.',
    };
  }

  const baseMetadata = generatePlaylistMetadata({
    content: replay,
    allVideos,
    searchParams: searchParamsResolved,
    basePath: '/replays',
    contentType: 'Replay',
  });

  // Add replay-specific metadata fields
  // Filter out undefined values from baseMetadata.other
  const filteredOther: Record<string, string> = {};
  if (baseMetadata.other) {
    Object.entries(baseMetadata.other).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        filteredOther[key] = String(value);
      }
    });
  }

  return {
    ...baseMetadata,
    other: {
      ...filteredOther,
      'replay:matchup': replay.matchup,
      'replay:map': replay.map,
      'replay:duration': replay.duration,
    },
  };
}

export default async function ReplayDetailPage({ params }: PageProps) {
  const { id } = await params;
  const replay = allReplays.find(r => r.id === id);

  if (!replay) {
    notFound();
  }

  return (
    <>
      <ReplayStructuredData replay={replay} />
      <Suspense fallback={<div className="min-h-screen" />}>
        <ReplayDetailClient replay={replay} />
      </Suspense>
    </>
  );
}
