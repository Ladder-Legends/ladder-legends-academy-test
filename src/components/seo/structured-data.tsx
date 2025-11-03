import { Video, isPlaylist, getVideoThumbnailUrl } from '@/types/video';
import { Replay } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import { Masterclass } from '@/types/masterclass';

interface VideoStructuredDataProps {
  video: Video;
}

export function VideoStructuredData({ video }: VideoStructuredDataProps) {
  const thumbnailUrl = getVideoThumbnailUrl(video, 'high');
  const absoluteThumbnailUrl = thumbnailUrl.startsWith('http')
    ? thumbnailUrl
    : `https://www.ladderlegendsacademy.com${thumbnailUrl}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': isPlaylist(video) ? 'ItemList' : 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: absoluteThumbnailUrl,
    uploadDate: video.date,
    ...(video.coach && {
      creator: {
        '@type': 'Person',
        name: video.coach,
      },
    }),
    ...(isPlaylist(video) && {
      numberOfItems: video.videoIds?.length || 0,
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface ReplayStructuredDataProps {
  replay: Replay;
}

export function ReplayStructuredData({ replay }: ReplayStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: replay.title,
    description: replay.notes || `${replay.matchup} on ${replay.map}`,
    datePublished: replay.uploadDate,
    author: replay.coach
      ? {
          '@type': 'Person',
          name: replay.coach,
        }
      : undefined,
    about: {
      '@type': 'VideoGame',
      name: 'StarCraft II',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface BuildOrderStructuredDataProps {
  buildOrder: BuildOrder;
}

export function BuildOrderStructuredData({ buildOrder }: BuildOrderStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: buildOrder.name,
    description: buildOrder.description,
    step: buildOrder.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: `Supply ${step.supply}`,
      text: step.action,
      ...(step.notes && { description: step.notes }),
    })),
    ...(buildOrder.coach && {
      author: {
        '@type': 'Person',
        name: buildOrder.coach,
      },
    }),
    about: {
      '@type': 'VideoGame',
      name: 'StarCraft II',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface MasterclassStructuredDataProps {
  masterclass: Masterclass;
}

export function MasterclassStructuredData({ masterclass }: MasterclassStructuredDataProps) {
  const thumbnailUrl = masterclass.thumbnail || '/placeholder-thumbnail.jpg';
  const absoluteThumbnailUrl = thumbnailUrl.startsWith('http')
    ? thumbnailUrl
    : `https://www.ladderlegendsacademy.com${thumbnailUrl}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: masterclass.title,
    description: masterclass.description,
    image: absoluteThumbnailUrl,
    ...(masterclass.coach && {
      provider: {
        '@type': 'Organization',
        name: 'Ladder Legends Academy',
      },
      instructor: {
        '@type': 'Person',
        name: masterclass.coach,
      },
    }),
    educationalLevel: masterclass.difficulty,
    about: {
      '@type': 'VideoGame',
      name: 'StarCraft II',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

// Organization structured data for the site
export function OrganizationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ladder Legends Academy',
    url: 'https://www.ladderlegendsacademy.com',
    logo: 'https://www.ladderlegendsacademy.com/icon.png',
    description: 'Master Starcraft 2 with expert coaching from Ladder Legends Academy',
    sameAs: [
      // Add social media links here when available
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
