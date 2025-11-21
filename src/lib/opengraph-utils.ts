/**
 * OpenGraph Metadata Utilities
 * Reusable helpers for creating consistent OpenGraph and Twitter card metadata
 */

import type { Metadata } from 'next';

const DEFAULT_SITE_NAME = 'Ladder Legends Academy';
const DEFAULT_BASE_URL = 'https://www.ladderlegendsacademy.com';
const DEFAULT_FALLBACK_IMAGE = `${DEFAULT_BASE_URL}/og-fallback.png`;
const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 630;

export interface OpenGraphOptions {
  /** Page title (will be suffixed with " | Ladder Legends Academy") */
  title: string;
  /** Page description */
  description: string;
  /** Relative or absolute URL path (e.g., "/library" or full URL) */
  url: string;
  /** Image URL (defaults to og-fallback.png) */
  imageUrl?: string;
  /** Image alt text (defaults to title) */
  imageAlt?: string;
  /** OpenGraph type (defaults to 'website') */
  type?: 'website' | 'article' | 'profile';
  /** Site name (defaults to 'Ladder Legends Academy') */
  siteName?: string;
  /** Locale (defaults to 'en_US') */
  locale?: string;
  /** Twitter card type (defaults to 'summary_large_image') */
  twitterCard?: 'summary' | 'summary_large_image';
}

/**
 * Generate complete metadata with OpenGraph and Twitter cards
 *
 * @example
 * ```ts
 * export const metadata: Metadata = createOpenGraphMetadata({
 *   title: 'Video Library',
 *   description: 'Browse our video library',
 *   url: '/library',
 * });
 * ```
 *
 * @example With custom image
 * ```ts
 * export const metadata: Metadata = createOpenGraphMetadata({
 *   title: 'Terran Coaching',
 *   description: 'Master Terran gameplay',
 *   url: '/coaching/terran',
 *   imageUrl: 'https://example.com/terran-hero.png',
 * });
 * ```
 */
export function createOpenGraphMetadata(options: OpenGraphOptions): Metadata {
  const {
    title,
    description,
    url,
    imageUrl = DEFAULT_FALLBACK_IMAGE,
    imageAlt,
    type = 'website',
    siteName = DEFAULT_SITE_NAME,
    locale = 'en_US',
    twitterCard = 'summary_large_image',
  } = options;

  // Normalize URL to absolute
  const absoluteUrl = url.startsWith('http')
    ? url
    : `${DEFAULT_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;

  // Normalize image URL to absolute
  const absoluteImageUrl = imageUrl.startsWith('http')
    ? imageUrl
    : `${DEFAULT_BASE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;

  const fullTitle = `${title} | ${siteName}`;
  const altText = imageAlt || `${title} - ${siteName}`;

  return {
    title,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: absoluteUrl,
      siteName,
      locale,
      type,
      images: [
        {
          url: absoluteImageUrl,
          width: DEFAULT_IMAGE_WIDTH,
          height: DEFAULT_IMAGE_HEIGHT,
          alt: altText,
        },
      ],
    },
    twitter: {
      card: twitterCard,
      title: fullTitle,
      description,
      images: [absoluteImageUrl],
    },
    alternates: {
      canonical: absoluteUrl,
    },
  };
}

/**
 * Quick helper for pages with just title, description, and path
 * Uses all defaults (fallback image, website type, etc.)
 *
 * @example
 * ```ts
 * export const metadata = quickMetadata({
 *   title: 'About Us',
 *   description: 'Learn about our mission',
 *   path: '/about',
 * });
 * ```
 */
export function quickMetadata(params: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return createOpenGraphMetadata({
    title: params.title,
    description: params.description,
    url: params.path,
  });
}
