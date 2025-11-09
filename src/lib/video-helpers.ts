/**
 * Helper functions for working with videos and playlists across content types
 */

export interface VideoReference {
  videoIds: string[];
}

/**
 * Get video IDs from content item
 *
 * @example
 * getVideoIds({ videoIds: ['abc', 'def'] }) // ['abc', 'def']
 * getVideoIds({ videoIds: [] }) // []
 */
export function getVideoIds(content: VideoReference): string[] {
  return content.videoIds || [];
}

/**
 * Check if content has multiple videos (is a playlist)
 *
 * @example
 * isPlaylist({ videoIds: ['a', 'b'] }) // true
 * isPlaylist({ videoIds: ['a'] }) // false
 * isPlaylist({ videoIds: [] }) // false
 */
export function isPlaylist(content: VideoReference): boolean {
  return content.videoIds.length > 1;
}

/**
 * Check if content has any videos
 *
 * @example
 * hasVideos({ videoIds: ['a', 'b'] }) // true
 * hasVideos({ videoIds: [] }) // false
 */
export function hasVideos(content: VideoReference): boolean {
  return content.videoIds.length > 0;
}

/**
 * Get the first video ID (useful for thumbnails, single video display, etc.)
 *
 * @example
 * getFirstVideoId({ videoIds: ['a', 'b'] }) // 'a'
 * getFirstVideoId({ videoIds: [] }) // undefined
 */
export function getFirstVideoId(content: VideoReference): string | undefined {
  return content.videoIds.length > 0 ? content.videoIds[0] : undefined;
}

/**
 * Get the appropriate video URL based on whether the video/content is free
 * Note: This returns the base path - PaywallLink will add /free prefix if needed
 *
 * @param videoId - The ID of the video
 * @param isFree - Whether the video or parent content is free (currently unused, kept for backwards compatibility)
 * @returns The URL path to the video (/library/{id})
 *
 * @example
 * getVideoUrl('abc123', true) // '/library/abc123' (PaywallLink will handle /free prefix)
 * getVideoUrl('abc123', false) // '/library/abc123'
 */
export function getVideoUrl(videoId: string, isFree: boolean): string {
  return `/library/${videoId}`;
}

/**
 * Get the appropriate video URL for content with videos
 * Intelligently finds a valid video/playlist from the videoIds array
 *
 * Strategy:
 * 1. Check if any videoId matches a playlist in videos.json
 * 2. If not, check if any videoId exists as a standalone video
 * 3. Otherwise return undefined (no valid video found)
 *
 * @param content - Content with videoIds and isFree properties
 * @param allVideos - Array of all videos to check against
 * @returns The URL path to a valid video/playlist, or undefined if none found
 *
 * @example
 * getContentVideoUrl({ videoIds: ['abc'], isFree: true }, allVideos) // '/library/abc'
 * getContentVideoUrl({ videoIds: ['invalid'], isFree: false }, allVideos) // undefined
 */
export function getContentVideoUrl(
  content: VideoReference & { isFree?: boolean },
  allVideos?: Array<{ id: string; source?: string; videoIds?: string[] }>
): string | undefined {
  if (!content.videoIds || content.videoIds.length === 0) return undefined;

  // If we don't have allVideos to validate against, use the first videoId (legacy behavior)
  if (!allVideos) {
    const firstVideoId = getFirstVideoId(content);
    if (!firstVideoId) return undefined;
    return getVideoUrl(firstVideoId, content.isFree ?? false);
  }

  // Strategy 1: Find a playlist that contains any of our videoIds
  for (const videoId of content.videoIds) {
    const playlist = allVideos.find(
      v => v.source === 'playlist' && v.videoIds?.includes(videoId)
    );
    if (playlist) {
      return getVideoUrl(playlist.id, content.isFree ?? false);
    }
  }

  // Strategy 2: Find any standalone video that matches our videoIds
  for (const videoId of content.videoIds) {
    const video = allVideos.find(v => v.id === videoId);
    if (video) {
      return getVideoUrl(video.id, content.isFree ?? false);
    }
  }

  // No valid video found
  return undefined;
}
