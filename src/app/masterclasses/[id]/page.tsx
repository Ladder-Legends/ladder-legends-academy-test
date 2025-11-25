import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { masterclasses as allMasterclasses, videos as allVideos } from '@/lib/data';
import { MasterclassDetailClient } from './masterclass-detail-client';
import { MasterclassStructuredData } from '@/components/seo/structured-data';
import { generatePlaylistMetadata } from '@/lib/metadata-helpers';

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

  const baseMetadata = generatePlaylistMetadata({
    content: masterclass,
    allVideos,
    searchParams: searchParamsResolved,
    basePath: '/masterclasses',
    contentType: 'Masterclass',
  });

  // Add masterclass-specific metadata fields
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
      ...(masterclass.race ? { 'masterclass:race': masterclass.race } : {}),
      ...(masterclass.difficulty ? { 'masterclass:difficulty': masterclass.difficulty } : {}),
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
