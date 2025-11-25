import { Metadata } from 'next';
import { Video, getVideoThumbnailUrl } from '@/types/video';

interface GeneratePlaylistMetadataOptions {
  /**
   * The parent content item (video/masterclass/etc) with potential videoIds
   */
  content: {
    id: string;
    title?: string;
    name?: string; // Build orders use 'name' instead of 'title'
    description?: string;
    videoIds?: string[];
    tags?: string[];
    isFree?: boolean;
    // Video-specific properties (when content itself is a video)
    youtubeId?: string;
    muxPlaybackId?: string;
    thumbnail?: string;
  };
  /**
   * All available videos to look up from
   */
  allVideos: Video[];
  /**
   * Search params from the page (contains ?v= param for playlists)
   */
  searchParams: { [key: string]: string | string[] | undefined };
  /**
   * Base URL path (e.g., '/library', '/masterclasses')
   */
  basePath: string;
  /**
   * Content type for metadata (e.g., 'Video', 'Masterclass', 'Playlist')
   */
  contentType?: string;
}

/**
 * Generate metadata for content with optional playlist support
 *
 * Handles:
 * - ?v= query param for specific playlist videos
 * - Proper title/description for selected video
 * - Correct thumbnail URL
 * - Canonical URL with query params
 * - OpenGraph and Twitter card metadata
 *
 * @example
 * // In a page.tsx generateMetadata function
 * export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
 *   const searchParamsResolved = await searchParams;
 *   const masterclass = allMasterclasses.find(m => m.id === params.id);
 *   if (!masterclass) return { title: 'Not Found' };
 *
 *   return generatePlaylistMetadata({
 *     content: masterclass,
 *     allVideos: videosData as Video[],
 *     searchParams: searchParamsResolved,
 *     basePath: '/masterclasses',
 *     contentType: 'Masterclass',
 *   });
 * }
 */
export function generatePlaylistMetadata({
  content,
  allVideos,
  searchParams,
  basePath,
  contentType = 'Content',
}: GeneratePlaylistMetadataOptions): Metadata {
  // Determine if this content has videos and if it's a playlist
  const hasVideos = content.videoIds && content.videoIds.length > 0;
  const hasPlaylist = content.videoIds && content.videoIds.length > 1;

  // Default to the content itself (handle both 'title' and 'name' properties)
  let displayTitle = content.title || content.name || 'Content';
  let displayDescription = content.description || 'Master Starcraft 2 with expert coaching from Ladder Legends Academy';
  let displayThumbnail: string | null = null;
  let playlistContext = '';

  // Check if the content itself is a Video (has youtubeId or muxPlaybackId)
  const isVideoContent = content.youtubeId || content.muxPlaybackId;

  // If the content itself is a video, use its thumbnail
  if (isVideoContent) {
    // Create a minimal Video-compatible object for thumbnail generation
    const videoForThumbnail = {
      id: content.id,
      youtubeId: content.youtubeId,
      muxPlaybackId: content.muxPlaybackId,
      thumbnail: content.thumbnail || '',
      source: content.muxPlaybackId ? 'mux' : 'youtube',
    } as Video;
    displayThumbnail = getVideoThumbnailUrl(videoForThumbnail, 'high');
  }
  // For content with videos, check if a specific video is requested via ?v= query param
  else if (hasVideos && content.videoIds) {
    const vParam = searchParams.v;
    const videoIndex = typeof vParam === 'string' ? parseInt(vParam, 10) : 0;

    if (!isNaN(videoIndex) && videoIndex >= 0 && videoIndex < content.videoIds.length) {
      // Find the specific video
      const videoId = content.videoIds[videoIndex];
      const selectedVideo = allVideos.find(v => v.id === videoId);

      if (selectedVideo) {
        // For playlists, append parent title as context
        if (hasPlaylist) {
          displayTitle = selectedVideo.title;
          playlistContext = ` - ${content.title || content.name || 'Content'}`;
        }
        displayDescription = selectedVideo.description || content.description || displayDescription;
        displayThumbnail = getVideoThumbnailUrl(selectedVideo, 'high');
      }
    } else if (content.videoIds.length > 0) {
      // No specific video selected, use first video for thumbnail
      const firstVideo = allVideos.find(v => v.id === content.videoIds![0]);
      if (firstVideo) {
        displayThumbnail = getVideoThumbnailUrl(firstVideo, 'high');
      }
    }
  }

  const title = displayTitle + playlistContext;

  // Make thumbnail URL absolute
  const absoluteThumbnailUrl = displayThumbnail
    ? (displayThumbnail.startsWith('http')
        ? displayThumbnail
        : `https://www.ladderlegendsacademy.com${displayThumbnail}`)
    : 'https://www.ladderlegendsacademy.com/og-fallback.png'; // Fallback

  // Build canonical URL with query param if applicable
  let canonicalUrl = `https://www.ladderlegendsacademy.com${basePath}/${content.id}`;
  if (hasPlaylist && searchParams.v) {
    canonicalUrl += `?v=${searchParams.v}`;
  }

  // Determine content type label
  let typeLabel = contentType;
  if (hasPlaylist) {
    typeLabel = 'Playlist';
  }

  return {
    title,
    description: displayDescription,
    openGraph: {
      title: `${title} | Ladder Legends Academy`,
      description: displayDescription,
      url: canonicalUrl,
      type: 'video.other',
      images: [
        {
          url: absoluteThumbnailUrl,
          width: 1200,
          height: 630,
          alt: displayTitle,
        },
      ],
      siteName: 'Ladder Legends Academy',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Ladder Legends Academy`,
      description: displayDescription,
      images: [absoluteThumbnailUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    },
    other: {
      ...(content.tags && content.tags.length > 0 ? { 'video:tag': content.tags.join(', ') } : {}),
      'content:type': typeLabel,
    },
  };
}
