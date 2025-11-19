#!/usr/bin/env tsx
/**
 * Script to flush all replays for a specific user from KV and Blob storage
 * Usage:
 *   tsx scripts/flush-user-replays.ts <discord_user_id>           # Dry run (shows what would be deleted)
 *   tsx scripts/flush-user-replays.ts <discord_user_id> --execute # Actually delete
 */

import { config } from 'dotenv';

// Load production environment variables BEFORE importing @vercel/kv
config({ path: '.env.production' });

// Map Upstash env vars to what @vercel/kv expects
process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_KV_REST_API_URL;
process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

import { kv } from '@vercel/kv';
import { del } from '@vercel/blob';
import { UserReplayData } from '../src/lib/replay-types';

const DISCORD_USER_ID = process.argv[2] || '161384451518103552'; // Default to your ID
const DRY_RUN = !process.argv.includes('--execute');

// Key prefix constants (same as replay-kv.ts)
const KEYS = {
  userReplays: (userId: string) => `user:${userId}:replays`,
  userReplay: (userId: string, replayId: string) => `user:${userId}:replay:${replayId}`,
};

async function flushUserReplays(discordUserId: string, dryRun: boolean) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Replay Flush Script`);
  console.log(`${'='.repeat(70)}`);
  console.log(`User ID: ${discordUserId}`);
  console.log(`Mode: ${dryRun ? '🔎 DRY RUN (no changes will be made)' : '⚠️  EXECUTE MODE (will delete data!)'}`);
  console.log(`${'='.repeat(70)}\n`);

  // Get all replay IDs
  const replayIds = await kv.get<string[]>(KEYS.userReplays(discordUserId)) || [];
  console.log(`📊 Found ${replayIds.length} replays in KV for user ${discordUserId}`);

  if (replayIds.length === 0) {
    console.log('✅ No replays to flush');
    return;
  }

  // Get all replay data to find blob URLs
  console.log('\n📥 Fetching replay data...');
  const replays = await Promise.all(
    replayIds.map(async (id) => {
      const replay = await kv.get<UserReplayData>(KEYS.userReplay(discordUserId, id));
      return { id, replay };
    })
  );

  // Show what we found
  console.log('\n📋 Replays to be deleted:');
  replays.forEach(({ id, replay }, index) => {
    console.log(`  ${index + 1}. ${replay?.filename || id}`);
    console.log(`     - Uploaded: ${replay?.uploaded_at || 'unknown'}`);
    console.log(`     - Map: ${replay?.fingerprint?.metadata?.map || 'unknown'}`);
    console.log(`     - Matchup: ${replay?.fingerprint?.matchup || 'unknown'}`);
  });

  if (dryRun) {
    console.log('\n🔎 DRY RUN - No changes made');
    console.log('');
    console.log('To actually delete these replays, run:');
    console.log(`  npx tsx scripts/flush-user-replays.ts ${discordUserId} --execute`);
    return;
  }

  // EXECUTE MODE - Actually delete
  console.log('\n⚠️  EXECUTE MODE - Deleting data...');

  // Delete from Blob storage first
  console.log('\n🗑️  Deleting replay files from Blob storage...');
  let blobDeleteCount = 0;
  for (const { id, replay } of replays) {
    if (replay?.filename) {
      try {
        // Blob URLs are typically stored in a format like:
        // https://xxx.public.blob.vercel-storage.com/replays/user-id/filename
        const blobUrl = `https://xxxxx.public.blob.vercel-storage.com/replays/${discordUserId}/${replay.filename}`;
        console.log(`  Deleting: ${replay.filename}`);
        await del(blobUrl);
        blobDeleteCount++;
      } catch (error) {
        // Blob might not exist, that's okay
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ⚠️  Could not delete blob for ${replay.filename}: ${message}`);
      }
    }
  }
  console.log(`✅ Deleted ${blobDeleteCount} files from Blob storage`);

  // Delete from KV
  console.log('\n🗑️  Deleting replay data from KV...');
  for (const replayId of replayIds) {
    await kv.del(KEYS.userReplay(discordUserId, replayId));
    console.log(`  Deleted: ${replayId}`);
  }

  // Clear the replay IDs list
  await kv.set(KEYS.userReplays(discordUserId), []);

  console.log(`\n✅ Successfully flushed ${replayIds.length} replays from KV`);
  console.log('');
  console.log('Summary:');
  console.log(`  - KV entries deleted: ${replayIds.length}`);
  console.log(`  - Blob files deleted: ${blobDeleteCount}`);
}

// Run the script
flushUserReplays(DISCORD_USER_ID, DRY_RUN)
  .then(() => {
    if (!DRY_RUN) {
      console.log('\n✨ Flush complete!');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error flushing replays:', error);
    process.exit(1);
  });
