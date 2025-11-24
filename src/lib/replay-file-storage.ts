/**
 * Replay File Storage
 * Stores and retrieves actual .SC2Replay files in Vercel Blob
 */
import { put, list, del, getDownloadUrl } from '@vercel/blob';

/**
 * Generate blob path for a user's replay file
 */
function getReplayFilePath(discordUserId: string, replayId: string, filename: string): string {
  // Sanitize filename to remove special characters
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `user-replays/${discordUserId}/${replayId}/${sanitized}`;
}

/**
 * Store a replay file in Vercel Blob
 * Returns the blob URL for future retrieval
 */
export async function storeReplayFile(
  discordUserId: string,
  replayId: string,
  filename: string,
  fileBuffer: Buffer
): Promise<string> {
  const path = getReplayFilePath(discordUserId, replayId, filename);

  console.log(`📦 Storing replay file: ${path} (${fileBuffer.length} bytes)`);

  const blob = await put(path, fileBuffer, {
    access: 'public', // Required for Vercel Blob
    contentType: 'application/octet-stream',
    addRandomSuffix: false, // Keep predictable paths
  });

  console.log(`✅ Stored replay file: ${blob.url}`);
  return blob.url;
}

/**
 * Get download URL for a replay file
 * Generates a signed URL if needed
 */
export function getReplayDownloadUrl(blobUrl: string): string {
  return getDownloadUrl(blobUrl);
}

/**
 * Delete a replay file from Vercel Blob
 */
export async function deleteReplayFile(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);
    console.log(`🗑️ Deleted replay file: ${blobUrl}`);
  } catch (error) {
    console.error('Error deleting replay file:', error);
    // Don't throw - file might already be deleted
  }
}

/**
 * Check if a replay file exists
 */
export async function replayFileExists(
  discordUserId: string,
  replayId: string
): Promise<boolean> {
  const prefix = `user-replays/${discordUserId}/${replayId}/`;

  try {
    const { blobs } = await list({ prefix, limit: 1 });
    return blobs.length > 0;
  } catch (error) {
    console.error('Error checking replay file:', error);
    return false;
  }
}

/**
 * List all replay files for a user (for cleanup/admin)
 */
export async function listUserReplayFiles(
  discordUserId: string
): Promise<Array<{ url: string; pathname: string; size: number }>> {
  const prefix = `user-replays/${discordUserId}/`;

  try {
    const { blobs } = await list({ prefix });
    return blobs.map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
    }));
  } catch (error) {
    console.error('Error listing user replay files:', error);
    return [];
  }
}

/**
 * Delete all replay files for a user (for cleanup/reset)
 */
export async function deleteAllUserReplayFiles(
  discordUserId: string
): Promise<number> {
  const files = await listUserReplayFiles(discordUserId);

  for (const file of files) {
    await del(file.url);
  }

  console.log(`🗑️ Deleted ${files.length} replay files for user ${discordUserId}`);
  return files.length;
}
