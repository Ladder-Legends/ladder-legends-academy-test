/**
 * Helper functions for working with videos and playlists across content types
 */

interface VideoReference {
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
 * Get the first video ID (useful for thumbnails, etc.)
 *
 * @example
 * getFirstVideoId({ videoIds: ['a', 'b'] }) // 'a'
 * getFirstVideoId({ videoIds: [] }) // undefined
 */
export function getFirstVideoId(content: VideoReference): string | undefined {
  return content.videoIds.length > 0 ? content.videoIds[0] : undefined;
}
