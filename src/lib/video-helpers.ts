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
 *
 * @param videoId - The ID of the video
 * @param isFree - Whether the video or parent content is free
 * @returns The URL path to the video (either /library or /free/library)
 *
 * @example
 * getVideoUrl('abc123', true) // '/free/library/abc123'
 * getVideoUrl('abc123', false) // '/library/abc123'
 */
export function getVideoUrl(videoId: string, isFree: boolean): string {
  return isFree ? `/free/library/${videoId}` : `/library/${videoId}`;
}

/**
 * Get the appropriate video URL for content with videos
 * Uses the first video ID and the content's isFree flag
 *
 * @param content - Content with videoIds and isFree properties
 * @returns The URL path to the first video, or undefined if no videos
 *
 * @example
 * getContentVideoUrl({ videoIds: ['abc'], isFree: true }) // '/free/library/abc'
 * getContentVideoUrl({ videoIds: [], isFree: false }) // undefined
 */
export function getContentVideoUrl(content: VideoReference & { isFree?: boolean }): string | undefined {
  const firstVideoId = getFirstVideoId(content);
  if (!firstVideoId) return undefined;
  return getVideoUrl(firstVideoId, content.isFree ?? false);
}
