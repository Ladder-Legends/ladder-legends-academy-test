import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { buildOrders as allBuildOrders, videos as allVideos } from '@/lib/data';
import { BuildOrderDetailClient } from './build-order-detail-client';
import { BuildOrderStructuredData } from '@/components/seo/structured-data';
import { generatePlaylistMetadata } from '@/lib/metadata-helpers';

export async function generateStaticParams() {
  return allBuildOrders.map((buildOrder) => ({
    id: buildOrder.id,
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
  const buildOrder = allBuildOrders.find(bo => bo.id === id);

  if (!buildOrder) {
    return {
      title: 'Build Order Not Found | Ladder Legends Academy',
      description: 'The requested build order could not be found.',
    };
  }

  const baseMetadata = generatePlaylistMetadata({
    content: buildOrder,
    allVideos,
    searchParams: searchParamsResolved,
    basePath: '/build-orders',
    contentType: 'Build Order',
  });

  // Add build-order-specific metadata fields
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
      'buildorder:race': buildOrder.race,
      'buildorder:vsrace': buildOrder.vsRace,
      ...(buildOrder.type ? { 'buildorder:type': buildOrder.type } : {}),
      'buildorder:difficulty': buildOrder.difficulty,
    },
  };
}

export default async function BuildOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const buildOrder = allBuildOrders.find(bo => bo.id === id);

  if (!buildOrder) {
    notFound();
  }

  return (
    <>
      <BuildOrderStructuredData buildOrder={buildOrder} />
      <Suspense fallback={<div className="min-h-screen" />}>
        <BuildOrderDetailClient buildOrder={buildOrder} />
      </Suspense>
    </>
  );
}
