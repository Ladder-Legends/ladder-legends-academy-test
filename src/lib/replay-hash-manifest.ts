import { put, list, del } from '@vercel/blob';

export interface ReplayHash {
  hash: string;
  filename: string;
  filesize: number;
  uploaded_at: string;
  replay_id: string;
}

export interface HashManifest {
  discord_user_id: string;
  updated_at: string;
  hashes: Record<string, ReplayHash>;
  total_count: number;
}

export class HashManifestManager {
  private getUserManifestPath(discordUserId: string): string {
    return `replay-hashes/${discordUserId}.json`;
  }

  /**
   * Load user's hash manifest from blob storage
   */
  async loadManifest(discordUserId: string): Promise<HashManifest> {
    const path = this.getUserManifestPath(discordUserId);

    try {
      // List blobs to find the manifest
      const { blobs } = await list({
        prefix: path,
        limit: 1,
      });

      if (blobs.length === 0) {
        console.log(`📊 No manifest found for user ${discordUserId}, creating empty`);
        return this.createEmptyManifest(discordUserId);
      }

      // Fetch the manifest
      const response = await fetch(blobs[0].url);
      if (!response.ok) {
        console.warn(`⚠️  Failed to fetch manifest: ${response.status}`);
        return this.createEmptyManifest(discordUserId);
      }

      const manifest = await response.json() as HashManifest;
      console.log(`✅ Loaded manifest for user ${discordUserId}: ${manifest.total_count} hashes`);
      return manifest;
    } catch (error) {
      console.error('❌ Error loading manifest:', error);
      return this.createEmptyManifest(discordUserId);
    }
  }

  /**
   * Save manifest to blob storage
   */
  async saveManifest(manifest: HashManifest): Promise<void> {
    const path = this.getUserManifestPath(manifest.discord_user_id);
    manifest.updated_at = new Date().toISOString();
    manifest.total_count = Object.keys(manifest.hashes).length;

    const content = JSON.stringify(manifest, null, 2);

    console.log(`💾 Saving manifest for user ${manifest.discord_user_id}: ${manifest.total_count} hashes`);

    // Delete existing manifest first if it exists (Vercel Blob doesn't support in-place updates)
    try {
      const blobs = await list({ prefix: path });
      if (blobs.blobs.length > 0) {
        await del(blobs.blobs[0].url);
      }
    } catch (error) {
      // Ignore errors if blob doesn't exist
      console.log(`Note: Could not delete existing manifest (might not exist yet): ${error}`);
    }

    await put(path, content, {
      access: 'public',
      contentType: 'application/json',
    });
  }

  /**
   * Add a hash to the manifest
   */
  async addHash(
    discordUserId: string,
    hash: string,
    filename: string,
    filesize: number,
    replayId: string
  ): Promise<void> {
    const manifest = await this.loadManifest(discordUserId);

    if (manifest.hashes[hash]) {
      console.log(`ℹ️  Hash ${hash} already exists in manifest, skipping`);
      return;
    }

    manifest.hashes[hash] = {
      hash,
      filename,
      filesize,
      uploaded_at: new Date().toISOString(),
      replay_id: replayId,
    };

    await this.saveManifest(manifest);
    console.log(`✅ Added hash ${hash} to manifest for user ${discordUserId}`);
  }

  /**
   * Check which hashes are new (not in manifest)
   */
  async checkHashes(
    discordUserId: string,
    hashes: Array<{ hash: string; filename: string; filesize: number }>
  ): Promise<string[]> {
    const manifest = await this.loadManifest(discordUserId);

    const newHashes = hashes
      .filter(h => !manifest.hashes[h.hash])
      .map(h => h.hash);

    console.log(`🔍 Checked ${hashes.length} hashes for user ${discordUserId}: ${newHashes.length} new, ${hashes.length - newHashes.length} existing`);

    return newHashes;
  }

  /**
   * Delete manifest (for testing/cleanup)
   */
  async deleteManifest(discordUserId: string): Promise<void> {
    const path = this.getUserManifestPath(discordUserId);

    try {
      const { blobs } = await list({
        prefix: path,
        limit: 1,
      });

      if (blobs.length > 0) {
        await del(blobs[0].url);
        console.log(`🗑️  Deleted manifest for user ${discordUserId}`);
      }
    } catch (error) {
      console.error('❌ Error deleting manifest:', error);
    }
  }

  private createEmptyManifest(discordUserId: string): HashManifest {
    return {
      discord_user_id: discordUserId,
      updated_at: new Date().toISOString(),
      hashes: {},
      total_count: 0,
    };
  }
}

// Singleton instance
export const hashManifestManager = new HashManifestManager();
