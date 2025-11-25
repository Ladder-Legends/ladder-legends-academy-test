#!/usr/bin/env tsx

/**
 * Enhanced Checkup CLI script
 *
 * Uses the discord-sync service for bi-directional event sync.
 * Provides interactive conflict resolution.
 */

import { config } from 'dotenv';
import * as readline from 'readline';

// Load .env.local
config({ path: '.env.local' });

// Import service functions
import {
  fetchDiscordEvents,
  detectConflicts,
  readLocalEvents,
  writeLocalEvents,
  transformDiscordToLocal,
  createDiscordEvent,
  updateDiscordEvent,
  type EventConflict,
} from '../src/services/discord-sync.service';

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1386735340517195959';

// CLI-specific display functions

async function displayConflicts(conflicts: EventConflict[]): Promise<void> {
  if (conflicts.length === 0) {
    console.log('\n✅ No conflicts found! Local and Discord events are in sync.');
    return;
  }

  console.log('\n⚠️  Event Sync Conflicts Found');
  console.log('━'.repeat(60));

  for (const conflict of conflicts) {
    console.log();
    if (conflict.type === 'missing_local') {
      console.log(`📥 Event in Discord but NOT in local system:`);
      console.log(`   ID: ${conflict.discordEvent!.id}`);
      console.log(`   Title: ${conflict.discordEvent!.name}`);
      console.log(`   Date: ${new Date(conflict.discordEvent!.scheduled_start_time).toISOString().slice(0, 16)}`);
    } else if (conflict.type === 'missing_discord') {
      console.log(`📤 Event in local system but NOT in Discord:`);
      console.log(`   ID: ${conflict.localEvent!.id}`);
      console.log(`   Title: ${conflict.localEvent!.title}`);
      console.log(`   Date: ${conflict.localEvent!.date} ${conflict.localEvent!.time}`);
    } else {
      console.log(`⚠️  Event exists in both but has differences:`);
      console.log(`   ID: ${conflict.localEvent!.id}`);
      console.log(`   Differences:`);
      for (const diff of conflict.differences!) {
        console.log(`      - ${diff}`);
      }
    }
  }

  console.log('━'.repeat(60));
}

async function promptConflictResolution(conflicts: EventConflict[]): Promise<Map<string, 'keep_discord' | 'keep_local' | 'skip'>> {
  const resolutions = new Map<string, 'keep_discord' | 'keep_local' | 'skip'>();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  for (const conflict of conflicts) {
    const id = conflict.localEvent?.id || conflict.discordEvent?.id || '';

    console.log('\n━'.repeat(60));
    if (conflict.type === 'missing_local') {
      console.log(`\n📥 Event "${conflict.discordEvent!.name}" exists in Discord but not locally.`);
      console.log(`\nOptions:`);
      console.log(`  [d] Import from Discord`);
      console.log(`  [s] Skip`);

      const answer = await new Promise<string>((resolve) => {
        rl.question('Your choice (d/s): ', resolve);
      });

      if (answer.toLowerCase() === 'd') {
        resolutions.set(id, 'keep_discord');
      } else {
        resolutions.set(id, 'skip');
      }
    } else if (conflict.type === 'missing_discord') {
      console.log(`\n📤 Event "${conflict.localEvent!.title}" exists locally but not in Discord.`);
      console.log(`\nOptions:`);
      console.log(`  [l] Create in Discord`);
      console.log(`  [s] Skip`);

      const answer = await new Promise<string>((resolve) => {
        rl.question('Your choice (l/s): ', resolve);
      });

      if (answer.toLowerCase() === 'l') {
        resolutions.set(id, 'keep_local');
      } else {
        resolutions.set(id, 'skip');
      }
    } else {
      console.log(`\n⚠️  Event "${conflict.localEvent!.title}" has differences.`);
      console.log(`\nDifferences:`);
      for (const diff of conflict.differences!) {
        console.log(`  - ${diff}`);
      }
      console.log(`\nOptions:`);
      console.log(`  [d] Use Discord version`);
      console.log(`  [l] Use local version (update Discord)`);
      console.log(`  [s] Skip`);

      const answer = await new Promise<string>((resolve) => {
        rl.question('Your choice (d/l/s): ', resolve);
      });

      if (answer.toLowerCase() === 'd') {
        resolutions.set(id, 'keep_discord');
      } else if (answer.toLowerCase() === 'l') {
        resolutions.set(id, 'keep_local');
      } else {
        resolutions.set(id, 'skip');
      }
    }
  }

  rl.close();
  return resolutions;
}

async function applySyncResolutions(
  conflicts: EventConflict[],
  resolutions: Map<string, 'keep_discord' | 'keep_local' | 'skip'>,
  botToken: string
): Promise<void> {
  console.log('\n🔄 Applying sync resolutions...');

  const localEvents = readLocalEvents();
  const localById = new Map(localEvents.map((e, i) => [e.id, i]));
  const updatedLocalEvents = [...localEvents];

  for (const conflict of conflicts) {
    const id = conflict.localEvent?.id || conflict.discordEvent?.id || '';
    const resolution = resolutions.get(id);

    if (resolution === 'skip') {
      console.log(`   ⏭️  Skipped: ${id}`);
      continue;
    }

    if (resolution === 'keep_discord' && conflict.discordEvent) {
      // Import from Discord to local
      const transformedEvent = transformDiscordToLocal(conflict.discordEvent);

      const index = localById.get(id);
      if (index !== undefined) {
        // Update existing
        updatedLocalEvents[index] = transformedEvent;
        console.log(`   ✅ Updated local event: ${transformedEvent.title}`);
      } else {
        // Add new
        updatedLocalEvents.push(transformedEvent);
        console.log(`   ✅ Added local event: ${transformedEvent.title}`);
      }
    } else if (resolution === 'keep_local' && conflict.localEvent) {
      // Sync to Discord (create/update)
      console.log(`   🚀 Syncing to Discord: ${conflict.localEvent.title}`);

      try {
        if (conflict.type === 'missing_discord') {
          // Create new event in Discord
          const createdEvent = await createDiscordEvent(botToken, DISCORD_GUILD_ID, conflict.localEvent);
          console.log(`   ✅ Created Discord event: ${createdEvent.name} (ID: ${createdEvent.id})`);

          // Update local event with Discord ID if it was different
          if (createdEvent.id !== conflict.localEvent.id) {
            const index = localById.get(conflict.localEvent.id);
            if (index !== undefined) {
              updatedLocalEvents[index] = {
                ...conflict.localEvent,
                id: createdEvent.id, // Use Discord's ID
                updatedAt: new Date().toISOString(),
              };
              console.log(`   ℹ️  Updated local event ID to match Discord: ${createdEvent.id}`);
            }
          }
        } else if (conflict.type === 'mismatch') {
          // Update existing Discord event
          const updatedEvent = await updateDiscordEvent(botToken, DISCORD_GUILD_ID, id, conflict.localEvent);
          console.log(`   ✅ Updated Discord event: ${updatedEvent.name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Failed to sync to Discord: ${message}`);
      }
    }
  }

  // Write updated events to file
  writeLocalEvents(updatedLocalEvents);
  console.log(`\n✅ Updated events.json`);
}

async function syncDiscordEventsEnhanced(): Promise<void> {
  console.log('\n📅 Syncing Discord scheduled events (Enhanced)...');

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.log('   ⚠️  DISCORD_BOT_TOKEN not found in .env.local - skipping sync');
    return;
  }

  try {
    const discordEvents = await fetchDiscordEvents(botToken, DISCORD_GUILD_ID);
    console.log(`   ✅ Found ${discordEvents.length} Discord event(s)`);

    const localEvents = readLocalEvents();
    console.log(`   ✅ Found ${localEvents.length} local event(s)`);

    const conflicts = detectConflicts(localEvents, discordEvents);

    await displayConflicts(conflicts);

    if (conflicts.length > 0) {
      const resolutions = await promptConflictResolution(conflicts);
      await applySyncResolutions(conflicts, resolutions, botToken);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Error syncing events:`, message);
  }
}

// Export for testing (same exports as before for compatibility)
export {
  transformDiscordToLocal,
  transformLocalToDiscord,
  createDiscordEvent,
  updateDiscordEvent,
  detectConflicts,
  type LocalEvent,
  type DiscordEvent,
  type EventConflict,
} from '../src/services/discord-sync.service';

// Run enhanced sync
async function main() {
  console.log('🔍 Running enhanced Discord event sync...');
  console.log('━'.repeat(60));

  await syncDiscordEventsEnhanced();

  console.log('\n✨ Sync complete!');
}

if (require.main === module) {
  main().catch(console.error);
}
