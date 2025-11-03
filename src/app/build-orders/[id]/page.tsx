import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import buildOrdersData from '@/data/build-orders.json';
import videosData from '@/data/videos.json';
import { BuildOrder } from '@/types/build-order';
import { Video, getVideoThumbnailUrl } from '@/types/video';
import { BuildOrderDetailClient } from './build-order-detail-client';

const allBuildOrders = buildOrdersData as BuildOrder[];
const allVideos = videosData as Video[];

export async function generateStaticParams() {
  return allBuildOrders.map((buildOrder) => ({
    id: buildOrder.id,
  }));
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const buildOrder = allBuildOrders.find(bo => bo.id === params.id);

  if (!buildOrder) {
    return {
      title: 'Build Order Not Found | Ladder Legends Academy',
      description: 'The requested build order could not be found.',
    };
  }

  const title = `${buildOrder.name} | Ladder Legends Academy`;
  const description = buildOrder.description ||
    `${buildOrder.race} vs ${buildOrder.vsRace} - ${buildOrder.type} build. ${buildOrder.difficulty} difficulty. ${buildOrder.coach ? `Coached by ${buildOrder.coach}.` : ''}`.trim();

  // Try to get thumbnail from associated video
  let thumbnailUrl = '/placeholder-thumbnail.jpg';
  if (buildOrder.videoIds && buildOrder.videoIds.length > 0) {
    const firstVideo = allVideos.find(v => v.id === buildOrder.videoIds[0]);
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
          alt: buildOrder.name,
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
      'buildorder:race': buildOrder.race,
      'buildorder:vsrace': buildOrder.vsRace,
      'buildorder:type': buildOrder.type,
      'buildorder:difficulty': buildOrder.difficulty,
    },
  };
}

export default function BuildOrderDetailPage({ params }: { params: { id: string } }) {
  const buildOrder = allBuildOrders.find(bo => bo.id === params.id);

  if (!buildOrder) {
    notFound();
  }

  return <BuildOrderDetailClient buildOrder={buildOrder} />;
}
