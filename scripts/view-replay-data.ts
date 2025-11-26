/**
 * View specific replay data from KV
 * Run with: npx tsx scripts/view-replay-data.ts <replayId>
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.production.local' });

import { createClient } from '@vercel/kv';

const replayId = process.argv[2] || '8NKRYgLdhS0z1oW-osfYZ';

async function main() {
  console.log(`🔍 Looking up replay: ${replayId}\n`);

  // Check if KV is configured
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    console.error('❌ KV credentials not found');
    console.log('KV_REST_API_URL:', kvUrl ? '✓' : '✗');
    console.log('KV_REST_API_TOKEN:', kvToken ? '✓' : '✗');
    process.exit(1);
  }

  console.log('✅ KV credentials found\n');

  const kv = createClient({
    url: kvUrl,
    token: kvToken,
  });

  // First, find all users
  console.log('📋 Looking for replay across all users...\n');

  // Try scanning for user replay keys
  const keys = await kv.keys('user:*:replay:*');
  console.log(`Found ${keys.length} replay keys total\n`);

  // Find the specific replay
  let foundReplay = null;
  let foundUserId = null;

  for (const key of keys) {
    if (key.includes(replayId)) {
      console.log(`✅ Found key: ${key}`);
      foundReplay = await kv.get(key);
      foundUserId = key.split(':')[1];
      break;
    }
  }

  if (!foundReplay) {
    // Try direct lookup with known user ID pattern
    console.log('Trying direct lookup...');

    // Get all user IDs
    const userKeys = await kv.keys('user:*:replays');
    console.log(`Found ${userKeys.length} users with replays\n`);

    for (const userKey of userKeys) {
      const userId = userKey.split(':')[1];
      const replayIds = await kv.get<string[]>(userKey);

      if (replayIds?.includes(replayId)) {
        console.log(`Found replay in user ${userId}'s list`);
        foundReplay = await kv.get(`user:${userId}:replay:${replayId}`);
        foundUserId = userId;
        break;
      }
    }
  }

  if (foundReplay) {
    console.log(`\n📊 Replay Data for user ${foundUserId}:\n`);
    console.log(JSON.stringify(foundReplay, null, 2));

    // Summarize key fields
    const replay = foundReplay as Record<string, unknown>;
    console.log('\n\n📝 Summary:');
    console.log(`   ID: ${replay.id}`);
    console.log(`   Filename: ${replay.filename}`);
    console.log(`   Uploaded: ${replay.uploaded_at}`);
    console.log(`   Blob URL: ${replay.blob_url || 'NOT STORED'}`);
    console.log(`   Game Type: ${replay.game_type}`);
    console.log(`   Player Name: ${replay.player_name}`);

    const fp = replay.fingerprint as Record<string, unknown> | undefined;
    if (fp) {
      console.log(`   Matchup: ${fp.matchup}`);
      console.log(`   Race: ${fp.race}`);

      const economy = fp.economy as Record<string, unknown> | undefined;
      if (economy) {
        console.log(`\n   Economy Data:`);
        console.log(`     - production_by_building: ${economy.production_by_building ? 'YES' : 'NO'}`);
        console.log(`     - supply_block_periods: ${economy.supply_block_periods ? 'YES' : 'NO'}`);
        console.log(`     - supply_at_checkpoints: ${economy.supply_at_checkpoints ? 'YES' : 'NO'}`);
        console.log(`     - workers_3min: ${economy.workers_3min}`);
        console.log(`     - workers_5min: ${economy.workers_5min}`);
        console.log(`     - workers_7min: ${economy.workers_7min}`);
        console.log(`     - mule_efficiency: ${economy.mule_efficiency}`);
      }
    }
  } else {
    console.log(`❌ Replay ${replayId} not found`);
  }
}

main().catch(console.error);
