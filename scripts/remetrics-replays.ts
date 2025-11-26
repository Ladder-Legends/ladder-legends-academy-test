#!/usr/bin/env tsx
/**
 * Unified Re-Metrics Script
 *
 * Handles BOTH user replays (KV) and coach replays (JSON/Blob):
 * - Downloads replay files from blob storage
 * - Extracts production metrics via sc2reader
 * - Updates KV for user replays
 * - Stores fingerprints in Vercel Blob for coach replays
 * - Deletes entries without blob files (cleanup mode)
 * - Bumps manifest version to signal uploaders to re-sync
 * - Rebuilds replay index with player/opponent info for nemesis tracking
 *
 * Usage:
 *   npx tsx scripts/remetrics-replays.ts                         # Dry run (user replays)
 *   npx tsx scripts/remetrics-replays.ts --execute               # Update user replays
 *   npx tsx scripts/remetrics-replays.ts --coach                 # Dry run (coach replays)
 *   npx tsx scripts/remetrics-replays.ts --coach --execute       # Update coach replays
 *   npx tsx scripts/remetrics-replays.ts --all-users             # All users
 *   npx tsx scripts/remetrics-replays.ts --cleanup               # Delete replays without blob
 *   npx tsx scripts/remetrics-replays.ts --cleanup --execute     # Actually delete
 *   npx tsx scripts/remetrics-replays.ts --user 123456           # Specific user
 *   npx tsx scripts/remetrics-replays.ts --limit 5               # Process only 5
 *   npx tsx scripts/remetrics-replays.ts --rebuild-index         # Rebuild replay index (dry run)
 *   npx tsx scripts/remetrics-replays.ts --rebuild-index --all-users --execute  # Rebuild all indexes
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables BEFORE importing @vercel/kv
config({ path: '.env.local' });
config({ path: '.env.production' });

// Map Upstash env vars to what @vercel/kv expects
process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_KV_REST_API_URL || process.env.KV_REST_API_URL;
process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

import { kv } from '@vercel/kv';
import axios from 'axios';
import FormData from 'form-data';
import { put, list, del } from '@vercel/blob';
import type { UserReplayData, MetricsResponse, ReplayFingerprint, ReplayIndex, ReplayIndexEntry } from '../src/lib/replay-types';
import type { HashManifest } from '../src/lib/replay-hash-manifest';
import { createIndexEntry } from '../src/lib/replay-kv';

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const CLEANUP_MODE = args.includes('--cleanup');
const COACH_MODE = args.includes('--coach');
const ALL_USERS = args.includes('--all-users');
const REBUILD_INDEX = args.includes('--rebuild-index');
const LIMIT = args.includes('--limit')
  ? parseInt(args[args.indexOf('--limit') + 1], 10)
  : undefined;
const REPLAY_ID = args.includes('--replay-id')
  ? args[args.indexOf('--replay-id') + 1]
  : undefined;
const USER_ID = args.includes('--user')
  ? args[args.indexOf('--user') + 1]
  : undefined;

// Default user ID
const DEFAULT_USER_ID = process.env.REMETRICS_USER_ID || '161384451518103552';

// SC2Reader API config
const SC2READER_API_URL = process.env.SC2READER_API_URL || 'http://localhost:8000';
const SC2READER_API_KEY = process.env.SC2READER_API_KEY || 'your-secret-key-change-this';

// Paths
const REPLAYS_JSON_PATH = path.join(__dirname, '..', 'src', 'data', 'replays.json');

// Key prefix constants
const KEYS = {
  userReplays: (userId: string) => `user:${userId}:replays`,
  userReplay: (userId: string, replayId: string) => `user:${userId}:replay:${replayId}`,
  userReplayIndex: (userId: string) => `user:${userId}:replay-index`,
};

interface Stats {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  deleted: number;
  missingBlob: number;
  alreadyHasData: number;
}

interface GlobalStats extends Stats {
  usersProcessed: number;
  hashesRemoved: number;
  manifestVersionsBumped: number;
}

interface CoachReplay {
  id: string;
  title: string;
  downloadUrl?: string;
  player1: { name: string; race: string; result: string };
  player2: { name: string; race: string; result: string };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function downloadReplay(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(response.data);
}

async function extractMetrics(
  buffer: Buffer,
  playerName: string | undefined,
  filename: string
): Promise<MetricsResponse> {
  const formData = new FormData();
  formData.append('file', buffer, {
    filename,
    contentType: 'application/octet-stream',
  });
  if (playerName) {
    formData.append('player_name', playerName);
  }

  const response = await axios.post(`${SC2READER_API_URL}/metrics`, formData, {
    headers: {
      ...formData.getHeaders(),
      'X-API-Key': SC2READER_API_KEY,
    },
    timeout: 30000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return response.data;
}

function buildFingerprints(
  metricsResponse: MetricsResponse,
  winningPlayerName?: string
): { main: ReplayFingerprint | null; all: Record<string, ReplayFingerprint> } {
  const playerFingerprints: Record<string, ReplayFingerprint> = {};
  let mainFingerprint: ReplayFingerprint | null = null;

  for (const [_pid, playerData] of Object.entries(metricsResponse.players)) {
    if (playerData.fingerprint) {
      const fp = { ...playerData.fingerprint };

      // Merge production_by_building
      if (playerData.production_by_building && fp.economy) {
        fp.economy = {
          ...fp.economy,
          production_by_building: playerData.production_by_building,
        };
      }

      // Merge supply_block_events
      if (playerData.supply_block_events && fp.economy) {
        fp.economy = {
          ...fp.economy,
          supply_block_periods: playerData.supply_block_events.map(e => ({
            start: e.time,
            end: e.time + e.duration,
            duration: e.duration,
          })),
        };
      }

      playerFingerprints[playerData.name] = fp;

      if (playerData.name === winningPlayerName) {
        mainFingerprint = fp;
      }
    }
  }

  if (!mainFingerprint) {
    mainFingerprint = Object.values(playerFingerprints)[0] || null;
  }

  return { main: mainFingerprint, all: playerFingerprints };
}

function hasProductionMetrics(fingerprint?: ReplayFingerprint): boolean {
  const economy = fingerprint?.economy;
  if (!economy) return false;
  return Boolean(economy.production_by_building && Object.keys(economy.production_by_building).length > 0);
}

// =============================================================================
// HASH MANIFEST OPERATIONS
// =============================================================================

async function loadHashManifest(discordUserId: string): Promise<HashManifest | null> {
  const manifestPath = `replay-hashes/${discordUserId}.json`;
  try {
    const { blobs } = await list({ prefix: manifestPath, limit: 1 });
    if (blobs.length === 0) return null;

    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;
    return await response.json() as HashManifest;
  } catch {
    return null;
  }
}

async function saveHashManifest(manifest: HashManifest): Promise<void> {
  const manifestPath = `replay-hashes/${manifest.discord_user_id}.json`;
  manifest.updated_at = new Date().toISOString();
  manifest.total_count = Object.keys(manifest.hashes).length;

  // Delete existing
  try {
    const { blobs } = await list({ prefix: manifestPath });
    if (blobs.length > 0) {
      await del(blobs[0].url);
    }
  } catch {
    // Ignore
  }

  await put(manifestPath, JSON.stringify(manifest, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
}

async function removeHashesAndBumpVersion(
  discordUserId: string,
  hashesToRemove: string[]
): Promise<{ removedCount: number; newVersion: number }> {
  const manifest = await loadHashManifest(discordUserId);
  if (!manifest) return { removedCount: 0, newVersion: 0 };

  let removedCount = 0;
  for (const hash of hashesToRemove) {
    if (manifest.hashes[hash]) {
      delete manifest.hashes[hash];
      removedCount++;
    }
  }

  if (removedCount > 0) {
    manifest.manifest_version = (manifest.manifest_version || 0) + 1;
    await saveHashManifest(manifest);
    console.log(`  🗑️  Removed ${removedCount} hashes, manifest version now ${manifest.manifest_version}`);
  }

  return { removedCount, newVersion: manifest.manifest_version || 0 };
}

// =============================================================================
// REPLAY INDEX OPERATIONS
// =============================================================================

async function rebuildUserReplayIndex(discordUserId: string, dryRun: boolean): Promise<number> {
  const replayIds = await kv.get<string[]>(KEYS.userReplays(discordUserId)) || [];

  if (replayIds.length === 0) {
    console.log(`   No replays to index`);
    return 0;
  }

  const entries: ReplayIndexEntry[] = [];

  for (const id of replayIds) {
    const replay = await kv.get<UserReplayData>(KEYS.userReplay(discordUserId, id));
    if (!replay) continue;

    const entry = createIndexEntry(replay);
    entries.push(entry);
  }

  // Sort by game date (newest first), then by upload date
  entries.sort((a, b) => {
    const dateA = a.game_date ? new Date(a.game_date).getTime() : new Date(a.uploaded_at).getTime();
    const dateB = b.game_date ? new Date(b.game_date).getTime() : new Date(b.uploaded_at).getTime();
    return dateB - dateA;
  });

  const index: ReplayIndex = {
    version: Date.now(),
    last_updated: new Date().toISOString(),
    replay_count: entries.length,
    entries,
  };

  if (dryRun) {
    console.log(`   Would create index with ${entries.length} entries`);
    // Show sample entry
    if (entries.length > 0) {
      const sample = entries[0];
      console.log(`   Sample entry: ${sample.player_name} (${sample.player_race}) vs ${sample.opponent_name} (${sample.opponent_race})`);
    }
  } else {
    await kv.set(KEYS.userReplayIndex(discordUserId), index);
    console.log(`   ✅ Index created with ${entries.length} entries`);
  }

  return entries.length;
}

// =============================================================================
// KV OPERATIONS (USER REPLAYS)
// =============================================================================

async function findAllUserIds(): Promise<string[]> {
  const userIds: Set<string> = new Set();
  let cursor = 0;

  do {
    const [nextCursor, keys] = await kv.scan(cursor, {
      match: 'user:*:replays',
      count: 100,
    });
    cursor = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : nextCursor;

    for (const key of keys) {
      const match = key.match(/^user:(\d+):replays$/);
      if (match) userIds.add(match[1]);
    }
  } while (cursor !== 0);

  return Array.from(userIds);
}

async function deleteUserReplay(discordUserId: string, replayId: string): Promise<void> {
  const replayIds = await kv.get<string[]>(KEYS.userReplays(discordUserId)) || [];
  const updatedIds = replayIds.filter(id => id !== replayId);
  await kv.set(KEYS.userReplays(discordUserId), updatedIds);
  await kv.del(KEYS.userReplay(discordUserId, replayId));

  try {
    const index = await kv.get<Array<{ id: string }>>(KEYS.userReplayIndex(discordUserId));
    if (index) {
      const updatedIndex = index.filter(entry => entry.id !== replayId);
      await kv.set(KEYS.userReplayIndex(discordUserId), updatedIndex);
    }
  } catch {
    // Index might not exist
  }
}

// =============================================================================
// COACH FINGERPRINT BLOB STORAGE
// =============================================================================

async function saveCoachFingerprint(
  replayId: string,
  fingerprints: { main: ReplayFingerprint | null; all: Record<string, ReplayFingerprint> }
): Promise<string> {
  const blobPath = `coach-fingerprints/${replayId}.json`;

  // Delete existing
  try {
    const { blobs } = await list({ prefix: blobPath });
    if (blobs.length > 0) {
      await del(blobs[0].url);
    }
  } catch {
    // Ignore
  }

  const result = await put(blobPath, JSON.stringify(fingerprints, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });

  return result.url;
}

async function hasCoachFingerprint(replayId: string): Promise<boolean> {
  const blobPath = `coach-fingerprints/${replayId}.json`;
  try {
    const { blobs } = await list({ prefix: blobPath, limit: 1 });
    return blobs.length > 0;
  } catch {
    return false;
  }
}

// =============================================================================
// PROCESS USER REPLAYS
// =============================================================================

async function processUserReplays(
  discordUserId: string,
  dryRun: boolean,
  limit?: number,
  specificReplayId?: string,
  cleanupMode?: boolean
): Promise<{ stats: Stats; hashesToRemove: string[] }> {
  let replayIds = await kv.get<string[]>(KEYS.userReplays(discordUserId)) || [];

  const stats: Stats = {
    total: 0, processed: 0, updated: 0, skipped: 0,
    errors: 0, deleted: 0, missingBlob: 0, alreadyHasData: 0,
  };

  if (replayIds.length === 0) return { stats, hashesToRemove: [] };

  if (specificReplayId) {
    if (!replayIds.includes(specificReplayId)) {
      console.log(`❌ Replay ID ${specificReplayId} not found`);
      return { stats, hashesToRemove: [] };
    }
    replayIds = [specificReplayId];
  }

  if (limit && limit < replayIds.length) {
    replayIds = replayIds.slice(0, limit);
  }

  const replays = await Promise.all(
    replayIds.map(async (id) => {
      const replay = await kv.get<UserReplayData>(KEYS.userReplay(discordUserId, id));
      return { id, replay };
    })
  );

  stats.total = replays.length;
  const hashesToRemove: string[] = [];
  const replaysToDelete: Array<{ id: string; replay: UserReplayData }> = [];

  for (const { id, replay } of replays) {
    stats.processed++;
    const prefix = `  [${stats.processed}/${stats.total}]`;

    if (!replay) {
      console.log(`${prefix} ⚠️  ${id} - Not found in KV`);
      stats.skipped++;
      continue;
    }

    if (!replay.blob_url) {
      console.log(`${prefix} ⚠️  ${replay.filename} - No blob URL`);
      stats.missingBlob++;
      if (cleanupMode) {
        replaysToDelete.push({ id, replay });
      } else {
        stats.skipped++;
      }
      continue;
    }

    if (cleanupMode) {
      console.log(`${prefix} ✅ ${replay.filename} - Has blob URL (kept)`);
      stats.skipped++;
      continue;
    }

    // Re-metrics mode
    if (hasProductionMetrics(replay.fingerprint)) {
      console.log(`${prefix} ⏭️  ${replay.filename} - Already has production metrics`);
      stats.alreadyHasData++;
      stats.skipped++;
      continue;
    }

    try {
      console.log(`${prefix} 📥 ${replay.filename} - Downloading...`);
      const buffer = await downloadReplay(replay.blob_url);

      console.log(`${prefix} 🔬 ${replay.filename} - Extracting metrics...`);
      const metricsResponse = await extractMetrics(
        buffer,
        replay.player_name || replay.suggested_player || undefined,
        replay.filename
      );

      const { main } = buildFingerprints(metricsResponse);
      if (!main || !hasProductionMetrics(main)) {
        console.log(`${prefix} ⏭️  ${replay.filename} - No production data from sc2reader`);
        stats.skipped++;
        continue;
      }

      // Update replay with merged fingerprint
      const updatedReplay = { ...replay };
      if (updatedReplay.fingerprint) {
        updatedReplay.fingerprint = {
          ...updatedReplay.fingerprint,
          economy: {
            ...updatedReplay.fingerprint.economy,
            production_by_building: main.economy?.production_by_building,
            supply_block_periods: main.economy?.supply_block_periods,
          },
        };
      }

      const buildingCount = Object.keys(main.economy?.production_by_building || {}).length;
      if (dryRun) {
        console.log(`${prefix} ✅ ${replay.filename} - Would update (${buildingCount} buildings)`);
      } else {
        await kv.set(KEYS.userReplay(discordUserId, id), updatedReplay);
        console.log(`${prefix} ✅ ${replay.filename} - Updated! (${buildingCount} buildings)`);
      }

      stats.updated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`${prefix} ❌ ${replay.filename} - Error: ${message}`);
      stats.errors++;
    }
  }

  // Handle cleanup deletions
  if (cleanupMode && replaysToDelete.length > 0) {
    if (!dryRun) {
      for (const { id, replay } of replaysToDelete) {
        try {
          await deleteUserReplay(discordUserId, id);
          console.log(`  ✅ Deleted ${replay.filename}`);
          stats.deleted++;

          // Find hash to remove
          const manifest = await loadHashManifest(discordUserId);
          if (manifest) {
            for (const [hash, entry] of Object.entries(manifest.hashes)) {
              if (entry.replay_id === id) {
                hashesToRemove.push(hash);
                break;
              }
            }
          }
        } catch (error) {
          console.log(`  ❌ Failed to delete ${replay.filename}: ${error}`);
          stats.errors++;
        }
      }
    } else {
      stats.deleted = replaysToDelete.length;
      // Collect hashes for reporting
      const manifest = await loadHashManifest(discordUserId);
      if (manifest) {
        for (const { id } of replaysToDelete) {
          for (const [hash, entry] of Object.entries(manifest.hashes)) {
            if (entry.replay_id === id) {
              hashesToRemove.push(hash);
              break;
            }
          }
        }
      }
    }
  }

  return { stats, hashesToRemove };
}

// =============================================================================
// PROCESS COACH REPLAYS
// =============================================================================

async function processCoachReplays(
  dryRun: boolean,
  limit?: number,
  specificReplayId?: string,
  cleanupMode?: boolean
): Promise<Stats> {
  console.log('\n📂 Loading coach replays from replays.json...');
  const replaysContent = fs.readFileSync(REPLAYS_JSON_PATH, 'utf-8');
  let replays: CoachReplay[] = JSON.parse(replaysContent);
  console.log(`   Found ${replays.length} coach replays`);

  const stats: Stats = {
    total: 0, processed: 0, updated: 0, skipped: 0,
    errors: 0, deleted: 0, missingBlob: 0, alreadyHasData: 0,
  };

  if (specificReplayId) {
    const found = replays.find(r => r.id === specificReplayId);
    if (!found) {
      console.log(`❌ Replay ID ${specificReplayId} not found`);
      return stats;
    }
    replays = [found];
  }

  if (limit && limit < replays.length) {
    replays = replays.slice(0, limit);
  }

  stats.total = replays.length;

  for (const replay of replays) {
    stats.processed++;
    const prefix = `  [${stats.processed}/${stats.total}]`;

    if (!replay.downloadUrl) {
      console.log(`${prefix} ⚠️  ${replay.id} - No download URL`);
      stats.missingBlob++;
      stats.skipped++;
      continue;
    }

    if (cleanupMode) {
      console.log(`${prefix} ✅ ${replay.id} - Has download URL (kept)`);
      stats.skipped++;
      continue;
    }

    // Check if already has fingerprint in blob
    const hasFingerprint = await hasCoachFingerprint(replay.id);
    if (hasFingerprint) {
      console.log(`${prefix} ⏭️  ${replay.id} - Already has fingerprint in blob`);
      stats.alreadyHasData++;
      stats.skipped++;
      continue;
    }

    try {
      console.log(`${prefix} 📥 ${replay.id} - Downloading...`);
      const buffer = await downloadReplay(replay.downloadUrl);

      const winningPlayer = replay.player1.result === 'win' ? replay.player1 : replay.player2;
      console.log(`${prefix} 🔬 ${replay.id} - Extracting metrics for ${winningPlayer.name}...`);

      const metricsResponse = await extractMetrics(
        buffer,
        winningPlayer.name,
        `${replay.title}.SC2Replay`
      );

      const fingerprints = buildFingerprints(metricsResponse, winningPlayer.name);
      if (!fingerprints.main) {
        console.log(`${prefix} ⏭️  ${replay.id} - No fingerprint data from sc2reader`);
        stats.skipped++;
        continue;
      }

      const buildingCount = Object.keys(fingerprints.main.economy?.production_by_building || {}).length;

      if (dryRun) {
        console.log(`${prefix} ✅ ${replay.id} - Would save fingerprint (${buildingCount} buildings)`);
      } else {
        const blobUrl = await saveCoachFingerprint(replay.id, fingerprints);
        console.log(`${prefix} ✅ ${replay.id} - Saved to blob (${buildingCount} buildings)`);
        console.log(`      URL: ${blobUrl}`);
      }

      stats.updated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`${prefix} ❌ ${replay.id} - Error: ${message}`);
      stats.errors++;
    }
  }

  return stats;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const modeLabel = COACH_MODE ? 'Coach Replays' : 'User Replays';
  const opLabel = REBUILD_INDEX ? 'Rebuild Index' : (CLEANUP_MODE ? 'Cleanup' : 'Re-Metrics');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔬 Unified Re-Metrics Script - ${modeLabel} - ${opLabel}`);
  console.log(`${'='.repeat(70)}`);
  if (!CLEANUP_MODE && !REBUILD_INDEX) {
    console.log(`SC2Reader API: ${SC2READER_API_URL}`);
  }
  console.log(`Mode: ${DRY_RUN ? '🔎 DRY RUN' : '⚠️  EXECUTE MODE'}`);
  console.log(`Target: ${COACH_MODE ? '🎓 COACH REPLAYS (JSON/Blob)' : '👤 USER REPLAYS (KV)'}`);
  if (!COACH_MODE) {
    console.log(`Users: ${ALL_USERS ? '👥 ALL USERS' : `👤 ${USER_ID || DEFAULT_USER_ID}`}`);
  }
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  if (REPLAY_ID) console.log(`Specific Replay: ${REPLAY_ID}`);
  console.log(`${'='.repeat(70)}\n`);

  // Handle rebuild-index mode separately (doesn't need sc2reader)
  if (REBUILD_INDEX && !COACH_MODE) {
    let userIds: string[];
    if (ALL_USERS) {
      console.log('🔍 Scanning for all users in KV...');
      userIds = await findAllUserIds();
      console.log(`   Found ${userIds.length} users with replays\n`);
    } else {
      userIds = [USER_ID || DEFAULT_USER_ID];
    }

    let totalIndexed = 0;
    for (const userId of userIds) {
      console.log(`\n📑 Rebuilding index for user: ${userId}`);
      const count = await rebuildUserReplayIndex(userId, DRY_RUN);
      totalIndexed += count;
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 SUMMARY:');
    console.log(`${'='.repeat(70)}`);
    console.log(`  Users: ${userIds.length}`);
    console.log(`  Total entries ${DRY_RUN ? 'to index' : 'indexed'}: ${totalIndexed}`);
    return;
  }

  if (COACH_MODE) {
    // Process coach replays
    const stats = await processCoachReplays(DRY_RUN, LIMIT, REPLAY_ID, CLEANUP_MODE);

    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 SUMMARY:');
    console.log(`${'='.repeat(70)}`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${stats.updated}`);
    console.log(`  Skipped: ${stats.skipped} (already: ${stats.alreadyHasData}, missing: ${stats.missingBlob})`);
    console.log(`  Errors: ${stats.errors}`);

  } else {
    // Process user replays
    let userIds: string[];
    if (ALL_USERS) {
      console.log('🔍 Scanning for all users in KV...');
      userIds = await findAllUserIds();
      console.log(`   Found ${userIds.length} users with replays\n`);
      if (userIds.length === 0) {
        console.log('✅ No users with replays found');
        return;
      }
    } else {
      userIds = [USER_ID || DEFAULT_USER_ID];
    }

    const globalStats: GlobalStats = {
      total: 0, processed: 0, updated: 0, skipped: 0,
      errors: 0, deleted: 0, missingBlob: 0, alreadyHasData: 0,
      usersProcessed: 0, hashesRemoved: 0, manifestVersionsBumped: 0,
    };

    for (const userId of userIds) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`👤 Processing user: ${userId}`);
      console.log(`${'─'.repeat(70)}`);

      const replayIds = await kv.get<string[]>(KEYS.userReplays(userId)) || [];
      console.log(`📊 Found ${replayIds.length} replays`);

      if (replayIds.length === 0) {
        console.log('   No replays to process');
        continue;
      }

      const { stats, hashesToRemove } = await processUserReplays(
        userId, DRY_RUN, LIMIT, REPLAY_ID, CLEANUP_MODE
      );

      // Update manifest
      if (CLEANUP_MODE && !DRY_RUN && hashesToRemove.length > 0) {
        const { removedCount, newVersion } = await removeHashesAndBumpVersion(userId, hashesToRemove);
        if (removedCount > 0) {
          globalStats.hashesRemoved += removedCount;
          globalStats.manifestVersionsBumped++;
          console.log(`  📋 Manifest version bumped to ${newVersion}`);
        }
      } else if (CLEANUP_MODE && DRY_RUN && hashesToRemove.length > 0) {
        console.log(`  📋 Would remove ${hashesToRemove.length} hashes from manifest`);
      }

      globalStats.usersProcessed++;
      globalStats.total += stats.total;
      globalStats.updated += stats.updated;
      globalStats.skipped += stats.skipped;
      globalStats.errors += stats.errors;
      globalStats.deleted += stats.deleted;

      console.log(`\n   Summary: ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 GLOBAL SUMMARY:');
    console.log(`${'='.repeat(70)}`);
    console.log(`  Users: ${globalStats.usersProcessed}`);
    console.log(`  Total: ${globalStats.total}`);
    if (CLEANUP_MODE) {
      console.log(`  ${DRY_RUN ? 'Would delete' : 'Deleted'}: ${globalStats.deleted}`);
      if (!DRY_RUN) {
        console.log(`  Hashes removed: ${globalStats.hashesRemoved}`);
        console.log(`  Manifests bumped: ${globalStats.manifestVersionsBumped}`);
      }
    } else {
      console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${globalStats.updated}`);
    }
    console.log(`  Skipped: ${globalStats.skipped}`);
    console.log(`  Errors: ${globalStats.errors}`);
  }

  if (DRY_RUN) {
    console.log(`\n🔎 DRY RUN - No changes made`);
    console.log(`\nTo execute, add --execute flag`);
  }
}

main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
