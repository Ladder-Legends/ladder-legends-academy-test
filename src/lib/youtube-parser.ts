/**
 * Extracts YouTube video ID from various URL formats
 *
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - VIDEO_ID (just the ID)
 *
 * YouTube IDs can contain alphanumeric characters, hyphens, and underscores.
 * They can even start with a hyphen (e.g., -gHDUWDA-5g)
 */
export function extractYouTubeId(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // If it looks like just an ID (11 characters, alphanumeric + - and _)
  // YouTube IDs are typically 11 characters but can start with hyphen
  if (/^[-\w]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Try to extract from URL
  try {
    const url = new URL(trimmed);

    // youtube.com/watch?v=ID
    if (url.hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        return videoId;
      }
    }

    // youtu.be/ID
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1); // Remove leading slash
      if (videoId) {
        return videoId;
      }
    }

    // youtube.com/embed/ID
    if (url.hostname.includes('youtube.com') && url.pathname.includes('/embed/')) {
      const videoId = url.pathname.split('/embed/')[1]?.split('?')[0];
      if (videoId) {
        return videoId;
      }
    }
  } catch {
    // Not a valid URL, might be just an ID
    // Allow IDs with various lengths (some old videos have different lengths)
    if (/^[-\w]{8,15}$/.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Validates if a string is a valid YouTube video ID
 */
export function isValidYouTubeId(id: string): boolean {
  return /^[-\w]{8,15}$/.test(id);
}
