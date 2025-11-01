#!/usr/bin/env tsx

/**
 * Checkup script - Identifies stale assets and offers cleanup
 *
 * Checks for:
 * - Mux assets not linked to any video
 * - Blob replays not linked to any replay entry
 * - Broken references (replays/builds/masterclasses referencing missing resources)
 * - Past events (non-recurring past occurrence, recurring past end date)
 */

import { config } from 'dotenv';
import { list as listBlobs } from '@vercel/blob';
import Mux from '@mux/mux-node';
import * as readline from 'readline';

// Load .env.local
config({ path: '.env.local' });

// Import data files
import videosData from '../src/data/videos.json' assert { type: 'json' };
import replaysData from '../src/data/replays.json' assert { type: 'json' };
import buildOrdersData from '../src/data/build-orders.json' assert { type: 'json' };
import masterclassesData from '../src/data/masterclasses.json' assert { type: 'json' };
import eventsData from '../src/data/events.json' assert { type: 'json' };
import coachesData from '../src/data/coaches.json' assert { type: 'json' };

interface StaleAssets {
  muxAssets: string[]; // playbackIds
  blobReplays: string[]; // blob URLs
  brokenReplayRefs: { id: string; field: string; missingId: string }[];
  brokenBuildOrderRefs: { id: string; field: string; missingId: string }[];
  brokenMasterclassRefs: { id: string; field: string; missingId: string }[];
  staleEvents: { id: string; title: string; reason: string }[];
}

async function checkMuxAssets(): Promise<string[]> {
  console.log('\n🎬 Checking Mux assets...');

  const mux = new Mux({
    tokenId: process.env.MUX_API_KEY!,
    tokenSecret: process.env.MUX_SECRET!,
  });

  const staleAssets: string[] = [];

  try {
    // Get all Mux assets
    const response = await mux.video.assets.list({ limit: 100 });
    const assets = Array.isArray(response) ? response : response.data || [];

    // Get all playback IDs from videos.json
    const usedPlaybackIds = new Set(
      videosData
        .filter((v) => v.muxPlaybackId)
        .map((v) => v.muxPlaybackId)
    );

    // Check each asset
    for (const asset of assets) {
      const playbackIds = asset.playback_ids || [];
      const hasUsedPlaybackId = playbackIds.some((p: { id: string }) => usedPlaybackIds.has(p.id));

      if (!hasUsedPlaybackId && playbackIds.length > 0) {
        staleAssets.push(playbackIds[0].id);
      }
    }

    console.log(`   Found ${staleAssets.length} unused Mux asset(s)`);
  } catch (error) {
    console.error('   Error checking Mux assets:', error);
  }

  return staleAssets;
}

async function checkBlobReplays(): Promise<string[]> {
  console.log('\n📦 Checking Vercel Blob replays...');

  const staleReplays: string[] = [];

  try {
    // Get all blobs
    const { blobs } = await listBlobs();

    // Get all blob URLs from replays.json (check downloadUrl for blob storage URLs)
    const usedBlobUrls = new Set(
      replaysData
        .filter((r) => r.downloadUrl && r.downloadUrl.includes('blob.vercel-storage.com'))
        .map((r) => r.downloadUrl as string)
    );

    // Check each blob
    for (const blob of blobs) {
      if (!usedBlobUrls.has(blob.url)) {
        staleReplays.push(blob.url);
      }
    }

    console.log(`   Found ${staleReplays.length} unused blob replay(s)`);
  } catch (error) {
    console.error('   Error checking blob replays:', error);
  }

  return staleReplays;
}

function checkBrokenReferences(): {
  replays: { id: string; field: string; missingId: string }[];
  buildOrders: { id: string; field: string; missingId: string }[];
  masterclasses: { id: string; field: string; missingId: string }[];
} {
  console.log('\n🔗 Checking for broken references...');

  const brokenReplays: { id: string; field: string; missingId: string }[] = [];
  const brokenBuildOrders: { id: string; field: string; missingId: string }[] = [];
  const brokenMasterclasses: { id: string; field: string; missingId: string }[] = [];

  // Create lookup sets
  const coachIds = new Set(coachesData.map((c) => c.id));
  const videoIds = new Set(videosData.map((v) => v.id));

  // Check replays
  for (const replay of replaysData) {
    const coachId = (replay as { coachId?: string }).coachId;
    if (coachId && !coachIds.has(coachId)) {
      brokenReplays.push({
        id: replay.id,
        field: 'coachId',
        missingId: coachId,
      });
    }
  }

  // Check build orders
  for (const buildOrder of buildOrdersData) {
    if (buildOrder.coachId && !coachIds.has(buildOrder.coachId)) {
      brokenBuildOrders.push({
        id: buildOrder.id,
        field: 'coachId',
        missingId: buildOrder.coachId,
      });
    }
    if (buildOrder.videoId && !videoIds.has(buildOrder.videoId)) {
      brokenBuildOrders.push({
        id: buildOrder.id,
        field: 'videoId',
        missingId: buildOrder.videoId,
      });
    }
  }

  // Check masterclasses
  for (const masterclass of masterclassesData) {
    if (masterclass.coachId && !coachIds.has(masterclass.coachId)) {
      brokenMasterclasses.push({
        id: masterclass.id,
        field: 'coachId',
        missingId: masterclass.coachId,
      });
    }
    if (masterclass.videoId && !videoIds.has(masterclass.videoId)) {
      brokenMasterclasses.push({
        id: masterclass.id,
        field: 'videoId',
        missingId: masterclass.videoId,
      });
    }
  }

  console.log(`   Found ${brokenReplays.length} broken replay reference(s)`);
  console.log(`   Found ${brokenBuildOrders.length} broken build order reference(s)`);
  console.log(`   Found ${brokenMasterclasses.length} broken masterclass reference(s)`);

  return {
    replays: brokenReplays,
    buildOrders: brokenBuildOrders,
    masterclasses: brokenMasterclasses,
  };
}

function checkStaleEvents(): { id: string; title: string; reason: string }[] {
  console.log('\n📅 Checking for stale events...');

  const staleEvents: { id: string; title: string; reason: string }[] = [];
  const now = new Date();

  for (const event of eventsData) {
    if (!event.recurring?.enabled) {
      // Non-recurring event - check if past
      const eventDate = new Date(`${event.date}T${event.time}`);
      if (eventDate < now) {
        staleEvents.push({
          id: event.id,
          title: event.title,
          reason: `Past event (${event.date})`,
        });
      }
    } else {
      // Recurring event - check if past end date
      const endDate = (event.recurring as { endDate?: string }).endDate;
      if (endDate) {
        const endDateTime = new Date(endDate);
        if (endDateTime < now) {
          staleEvents.push({
            id: event.id,
            title: event.title,
            reason: `Recurring series ended (${endDate})`,
          });
        }
      }
    }
  }

  console.log(`   Found ${staleEvents.length} stale event(s)`);

  return staleEvents;
}

async function promptForCleanup(staleAssets: StaleAssets): Promise<boolean> {
  const total =
    staleAssets.muxAssets.length +
    staleAssets.blobReplays.length +
    staleAssets.brokenReplayRefs.length +
    staleAssets.brokenBuildOrderRefs.length +
    staleAssets.brokenMasterclassRefs.length +
    staleAssets.staleEvents.length;

  if (total === 0) {
    console.log('\n✅ No stale assets found! Everything looks good.');
    return false;
  }

  console.log('\n⚠️  Stale Assets Summary:');
  console.log('━'.repeat(60));

  if (staleAssets.muxAssets.length > 0) {
    console.log(`   📹 ${staleAssets.muxAssets.length} unused Mux video(s)`);
  }

  if (staleAssets.blobReplays.length > 0) {
    console.log(`   📦 ${staleAssets.blobReplays.length} unused blob replay(s)`);
  }

  if (staleAssets.brokenReplayRefs.length > 0) {
    console.log(`   🔗 ${staleAssets.brokenReplayRefs.length} broken replay reference(s)`);
  }

  if (staleAssets.brokenBuildOrderRefs.length > 0) {
    console.log(`   🔗 ${staleAssets.brokenBuildOrderRefs.length} broken build order reference(s)`);
  }

  if (staleAssets.brokenMasterclassRefs.length > 0) {
    console.log(`   🔗 ${staleAssets.brokenMasterclassRefs.length} broken masterclass reference(s)`);
  }

  if (staleAssets.staleEvents.length > 0) {
    console.log(`   📅 ${staleAssets.staleEvents.length} stale event(s)`);
  }

  console.log('━'.repeat(60));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n🗑️  Clean stale assets? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function cleanupAssets(staleAssets: StaleAssets): Promise<void> {
  console.log('\n🧹 Cleaning up stale assets...');

  // TODO: Implement cleanup logic
  // For now, just show what would be cleaned

  if (staleAssets.muxAssets.length > 0) {
    console.log('\n   Mux assets to delete:');
    staleAssets.muxAssets.forEach(id => console.log(`      - ${id}`));
  }

  if (staleAssets.blobReplays.length > 0) {
    console.log('\n   Blob replays to delete:');
    staleAssets.blobReplays.forEach(url => console.log(`      - ${url}`));
  }

  if (staleAssets.brokenReplayRefs.length > 0) {
    console.log('\n   Replay entries with broken refs:');
    staleAssets.brokenReplayRefs.forEach(ref =>
      console.log(`      - ${ref.id}: ${ref.field} -> ${ref.missingId}`)
    );
  }

  if (staleAssets.brokenBuildOrderRefs.length > 0) {
    console.log('\n   Build order entries with broken refs:');
    staleAssets.brokenBuildOrderRefs.forEach(ref =>
      console.log(`      - ${ref.id}: ${ref.field} -> ${ref.missingId}`)
    );
  }

  if (staleAssets.brokenMasterclassRefs.length > 0) {
    console.log('\n   Masterclass entries with broken refs:');
    staleAssets.brokenMasterclassRefs.forEach(ref =>
      console.log(`      - ${ref.id}: ${ref.field} -> ${ref.missingId}`)
    );
  }

  if (staleAssets.staleEvents.length > 0) {
    console.log('\n   Stale events to remove:');
    staleAssets.staleEvents.forEach(event =>
      console.log(`      - ${event.id} (${event.title}): ${event.reason}`)
    );
  }

  console.log('\n⚠️  Cleanup not yet implemented - this is a dry run.');
  console.log('   Implement actual cleanup logic in scripts/checkup.ts');
}

async function main() {
  console.log('🔍 Running asset checkup...');
  console.log('━'.repeat(60));

  const staleAssets: StaleAssets = {
    muxAssets: await checkMuxAssets(),
    blobReplays: await checkBlobReplays(),
    brokenReplayRefs: [],
    brokenBuildOrderRefs: [],
    brokenMasterclassRefs: [],
    staleEvents: checkStaleEvents(),
  };

  const brokenRefs = checkBrokenReferences();
  staleAssets.brokenReplayRefs = brokenRefs.replays;
  staleAssets.brokenBuildOrderRefs = brokenRefs.buildOrders;
  staleAssets.brokenMasterclassRefs = brokenRefs.masterclasses;

  const shouldClean = await promptForCleanup(staleAssets);

  if (shouldClean) {
    await cleanupAssets(staleAssets);
  } else {
    console.log('\n✋ Cleanup cancelled.');
  }

  console.log('\n✨ Checkup complete!');
}

main().catch(console.error);
