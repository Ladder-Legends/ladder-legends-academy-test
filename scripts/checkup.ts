#!/usr/bin/env tsx

/**
 * Checkup script - Identifies stale assets and offers cleanup
 *
 * Checks for:
 * - Syncs Discord scheduled events to events.json
 * - Mux assets not linked to any video
 * - Blob replays not linked to any replay entry
 * - Broken references (replays/builds/masterclasses referencing missing resources)
 * - Past events (non-recurring past occurrence, recurring past end date)
 */

import { config } from 'dotenv';
import { list as listBlobs } from '@vercel/blob';
import Mux from '@mux/mux-node';
import * as readline from 'readline';
import { writeFileSync } from 'fs';
import { join } from 'path';

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

const DISCORD_GUILD_ID = '1386735340517195959';

interface DiscordEvent {
  id: string;
  name: string;
  description?: string;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  created_at?: string;
}

async function syncDiscordEvents(): Promise<void> {
  console.log('\n📅 Syncing Discord scheduled events...');

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.log('   ⚠️  DISCORD_BOT_TOKEN not found in .env.local - skipping sync');
    return;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/scheduled-events`,
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log(`   ⚠️  Could not fetch events (${response.status}) - skipping sync`);
      return;
    }

    const events = await response.json() as DiscordEvent[];
    console.log(`   ✅ Found ${events.length} Discord event(s)`);

    // Transform Discord events to our format
    const syncedEvents = events.map((event: DiscordEvent) => {
      const startTime = new Date(event.scheduled_start_time);
      const endTime = event.scheduled_end_time ? new Date(event.scheduled_end_time) : null;
      const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : 120;

      // Detect event type
      const text = (event.name + ' ' + (event.description || '')).toLowerCase();
      let type: 'tournament' | 'coaching' | 'arcade' | 'other' = 'other';
      if (text.includes('tournament')) type = 'tournament';
      else if (text.includes('coaching') || text.includes('workshop') || text.includes('lesson') || text.includes('replay analysis') || text.includes('micro monday')) type = 'coaching';
      else if (text.includes('team game') || text.includes('arcade') || text.includes('casual') || text.includes('inhouse')) type = 'arcade';

      // Extract tags
      const tags = new Set<string>();
      if (text.includes('replay analysis')) tags.add('replay analysis');
      if (text.includes('coaching')) tags.add('coaching');
      if (text.includes('ladder')) tags.add('ladder');
      if (text.includes('gameplay')) tags.add('gameplay');
      if (text.includes('commentary')) tags.add('commentary');
      if (text.includes('team games') || text.includes('team game')) tags.add('team games');
      if (text.includes('casual')) tags.add('casual');
      if (text.includes('micro')) tags.add('micro');
      if (text.includes('competition')) tags.add('competition');

      // Detect coach
      let coach: string | undefined;
      const coaches = ['hino', 'nico', 'groovy', 'gamerrichy', 'krystianer', 'eon'];
      for (const c of coaches) {
        if (text.includes(c)) {
          coach = c;
          break;
        }
      }

      // Check for recurring patterns in description
      let recurring: { enabled: boolean; frequency: 'weekly' | 'monthly'; dayOfWeek?: number } | undefined;
      if (text.includes('micro monday') || text.includes('mondays')) {
        recurring = { enabled: true, frequency: 'weekly', dayOfWeek: 1 };
      }

      // Enhance description
      let description = event.description || '';
      if (!description && text.includes('replay analysis')) {
        description = 'Join Groovy for live analysis of subscriber replays. Submit your games for professional feedback!';
      } else if (!description && text.includes('ladder grind')) {
        description = 'Watch high-level ladder gameplay and learn advanced strategies.';
      } else if (!description && text.includes('team game')) {
        description = 'Join us for casual team games and inhouse matches! All skill levels welcome.';
      } else if (!description && text.includes('ladder commentary')) {
        description = `Watch ${coach || 'our coach'} climb the ladder with live commentary and analysis.`;
      }

      return {
        id: event.id,
        title: event.name,
        description,
        type,
        date: startTime.toISOString().split('T')[0],
        time: startTime.toTimeString().split(' ')[0].slice(0, 5),
        timezone: 'America/New_York',
        duration,
        ...(coach && { coach }),
        videoIds: [],
        isFree: false,
        tags: Array.from(tags),
        ...(recurring && { recurring }),
        createdAt: event.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Write to events.json
    const eventsPath = join(process.cwd(), 'src', 'data', 'events.json');
    writeFileSync(eventsPath, JSON.stringify(syncedEvents, null, 2));
    console.log(`   ✅ Synced ${syncedEvents.length} event(s) to src/data/events.json`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Error syncing events:`, message);
  }
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
    if (buildOrder.videoIds && buildOrder.videoIds.length > 0) {
      for (const videoId of buildOrder.videoIds) {
        if (!videoIds.has(videoId)) {
          brokenBuildOrders.push({
            id: buildOrder.id,
            field: 'videoIds',
            missingId: videoId,
          });
        }
      }
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
    if (masterclass.videoIds && masterclass.videoIds.length > 0) {
      for (const videoId of masterclass.videoIds) {
        if (!videoIds.has(videoId)) {
          brokenMasterclasses.push({
            id: masterclass.id,
            field: 'videoIds',
            missingId: videoId,
          });
        }
      }
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

  // First sync Discord events
  await syncDiscordEvents();

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
