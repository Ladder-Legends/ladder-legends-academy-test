#!/usr/bin/env node
/**
 * Backfill script to assign coaches to content that's missing coach assignments.
 *
 * Usage:
 *   node scripts/backfill-coaches.mjs           # Dry run - shows what would change
 *   node scripts/backfill-coaches.mjs --execute # Actually apply changes
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');

// Load data files
const coaches = JSON.parse(readFileSync(resolve(dataDir, 'coaches.json'), 'utf-8'));
const replays = JSON.parse(readFileSync(resolve(dataDir, 'replays.json'), 'utf-8'));
const videos = JSON.parse(readFileSync(resolve(dataDir, 'videos.json'), 'utf-8'));
const buildOrders = JSON.parse(readFileSync(resolve(dataDir, 'build-orders.json'), 'utf-8'));
const masterclasses = JSON.parse(readFileSync(resolve(dataDir, 'masterclasses.json'), 'utf-8'));
const events = JSON.parse(readFileSync(resolve(dataDir, 'events.json'), 'utf-8'));

// Build coach lookup maps
const coachById = new Map(coaches.map(c => [c.id, c]));
const coachByName = new Map(coaches.map(c => [c.name.toLowerCase(), c]));
const coachByDisplayName = new Map(coaches.map(c => [c.displayName.toLowerCase(), c]));

// Build battleTag to coach map
const coachByBattletag = new Map();
for (const coach of coaches) {
  if (coach.battleTags) {
    for (const tag of coach.battleTags) {
      coachByBattletag.set(tag.toLowerCase(), coach);
    }
  }
}

// Active coaches only
const activeCoaches = coaches.filter(c => c.isActive !== false);
console.log('\nActive coaches:');
for (const c of activeCoaches) {
  console.log(`  - ${c.displayName} (id: ${c.id}, name: ${c.name})`);
  if (c.battleTags?.length) {
    console.log(`    BattleTags: ${c.battleTags.join(', ')}`);
  }
}

/**
 * Try to resolve a coach from various identifiers.
 */
function resolveCoach(coachId, coachName) {
  // Try coachId first
  if (coachId) {
    const coach = coachById.get(coachId);
    if (coach) return coach;
  }

  // Try coach name
  if (coachName) {
    const nameLower = coachName.toLowerCase();
    // Check by name/id
    let coach = coachByName.get(nameLower) || coachById.get(coachName);
    if (coach) return coach;
    // Check by display name
    coach = coachByDisplayName.get(nameLower);
    if (coach) return coach;
    // Check by battletag
    coach = coachByBattletag.get(nameLower);
    if (coach) return coach;
  }

  return null;
}

/**
 * Try to infer the coach from replay content.
 * IMPORTANT: Nicoract is NOT the same as Nico (coach-nico)
 */
function inferCoachFromReplay(replay) {
  const playerNames = [
    replay.player1?.name?.toLowerCase(),
    replay.player2?.name?.toLowerCase(),
  ].filter(Boolean);

  const titleLower = replay.title?.toLowerCase() || '';

  // Check player names against battletags
  for (const name of playerNames) {
    const coach = coachByBattletag.get(name);
    if (coach && coach.isActive !== false) {
      return { coach, reason: `Player name "${name}" matches battletag` };
    }
  }

  // Check title for coach names
  for (const coach of activeCoaches) {
    if (titleLower.includes(coach.displayName.toLowerCase())) {
      return { coach, reason: `Title contains "${coach.displayName}"` };
    }
    if (coach.battleTags) {
      for (const tag of coach.battleTags) {
        if (titleLower.includes(tag.toLowerCase())) {
          return { coach, reason: `Title contains battletag "${tag}"` };
        }
      }
    }
  }

  // Special patterns
  if (titleLower.includes('nicosystem')) {
    const nico = coachById.get('coach-nico');
    if (nico) return { coach: nico, reason: 'Title contains "Nicosystem"' };
  }

  return null;
}

/**
 * Try to infer the coach from video content.
 * IMPORTANT: "Nicoract" is a different person from "Nico" (coach-nico)
 */
function inferCoachFromVideo(video) {
  const titleLower = video.title?.toLowerCase() || '';
  const descLower = video.description?.toLowerCase() || '';

  // IMPORTANT: Skip "Nicoract" - they are NOT the same as Nico
  if (titleLower.includes('nicoract')) {
    return null;
  }

  // Check title and description for coach names
  for (const coach of activeCoaches) {
    if (titleLower.includes(coach.displayName.toLowerCase()) ||
        descLower.includes(coach.displayName.toLowerCase())) {
      return { coach, reason: `Content contains "${coach.displayName}"` };
    }
    if (coach.battleTags) {
      for (const tag of coach.battleTags) {
        if (titleLower.includes(tag.toLowerCase()) ||
            descLower.includes(tag.toLowerCase())) {
          return { coach, reason: `Content contains battletag "${tag}"` };
        }
      }
    }
  }

  // Special patterns (but NOT Nicoract)
  if (titleLower.includes('nicosystem')) {
    const nico = coachById.get('coach-nico');
    if (nico) return { coach: nico, reason: 'Content mentions Nicosystem' };
  }

  return null;
}

/**
 * Try to infer the coach from build order content.
 * IMPORTANT: "Nicoract" is a different person from "Nico" (coach-nico)
 */
function inferCoachFromBuildOrder(buildOrder) {
  const nameLower = buildOrder.name?.toLowerCase() || '';
  const descLower = buildOrder.description?.toLowerCase() || '';

  // IMPORTANT: Skip "Nicoract" - they are NOT the same as Nico
  if (nameLower.includes('nicoract')) {
    return null;
  }

  // Check for other coach names
  for (const coach of activeCoaches) {
    if (nameLower.includes(coach.displayName.toLowerCase()) ||
        descLower.includes(coach.displayName.toLowerCase())) {
      return { coach, reason: `Content contains "${coach.displayName}"` };
    }
    if (coach.battleTags) {
      for (const tag of coach.battleTags) {
        if (nameLower.includes(tag.toLowerCase()) ||
            descLower.includes(tag.toLowerCase())) {
          return { coach, reason: `Content contains battletag "${tag}"` };
        }
      }
    }
  }

  // Special patterns (but NOT Nicoract)
  if (nameLower.includes('nicosystem')) {
    const nico = coachById.get('coach-nico');
    if (nico) return { coach: nico, reason: 'Name mentions Nicosystem' };
  }

  return null;
}

// Process all content types
const changes = {
  replays: [],
  videos: [],
  buildOrders: [],
  masterclasses: [],
  events: [],
};

console.log('\n=== REPLAYS ===');
for (const replay of replays) {
  const existingCoach = resolveCoach(replay.coachId, replay.coach);
  if (!existingCoach) {
    const inferred = inferCoachFromReplay(replay);
    if (inferred) {
      console.log(`\n[INFER] "${replay.title}"`);
      console.log(`  → ${inferred.coach.displayName} (${inferred.reason})`);
      changes.replays.push({
        id: replay.id,
        title: replay.title,
        newCoach: inferred.coach.name,
        newCoachId: inferred.coach.id,
        reason: inferred.reason,
      });
    } else {
      console.log(`\n[SKIP] "${replay.title}"`);
      console.log(`  Players: ${replay.player1?.name || '?'} vs ${replay.player2?.name || '?'}`);
      console.log(`  → Could not infer coach`);
    }
  }
}

console.log('\n=== VIDEOS ===');
for (const video of videos) {
  const existingCoach = resolveCoach(video.coachId, video.coach);
  if (!existingCoach) {
    const inferred = inferCoachFromVideo(video);
    if (inferred) {
      console.log(`\n[INFER] "${video.title}"`);
      console.log(`  → ${inferred.coach.displayName} (${inferred.reason})`);
      changes.videos.push({
        id: video.id,
        title: video.title,
        newCoach: inferred.coach.name,
        newCoachId: inferred.coach.id,
        reason: inferred.reason,
      });
    } else {
      console.log(`\n[SKIP] "${video.title}"`);
      console.log(`  → Could not infer coach`);
    }
  }
}

console.log('\n=== BUILD ORDERS ===');
for (const bo of buildOrders) {
  const existingCoach = resolveCoach(bo.coachId, bo.coach);
  if (!existingCoach) {
    const inferred = inferCoachFromBuildOrder(bo);
    if (inferred) {
      console.log(`\n[INFER] "${bo.name}"`);
      console.log(`  → ${inferred.coach.displayName} (${inferred.reason})`);
      changes.buildOrders.push({
        id: bo.id,
        name: bo.name,
        newCoach: inferred.coach.name,
        newCoachId: inferred.coach.id,
        reason: inferred.reason,
      });
    } else {
      console.log(`\n[SKIP] "${bo.name}"`);
      console.log(`  → Could not infer coach`);
    }
  }
}

console.log('\n=== MASTERCLASSES ===');
for (const mc of masterclasses) {
  const existingCoach = resolveCoach(mc.coachId, mc.coach);
  if (!existingCoach) {
    console.log(`\n[SKIP] "${mc.title}"`);
    console.log(`  → Requires manual assignment`);
  }
}

console.log('\n=== EVENTS ===');
for (const event of events) {
  if (!event.coach) {
    console.log(`\n[SKIP] "${event.title}"`);
    console.log(`  → Requires manual assignment`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Replays to update:     ${changes.replays.length}`);
console.log(`Videos to update:      ${changes.videos.length}`);
console.log(`Build orders to update: ${changes.buildOrders.length}`);

const isExecute = process.argv.includes('--execute');

if (!isExecute) {
  console.log('\nThis was a DRY RUN. To apply changes, run:');
  console.log('  node scripts/backfill-coaches.mjs --execute');
} else {
  console.log('\nApplying changes...');

  // Update replays
  for (const change of changes.replays) {
    const replay = replays.find(r => r.id === change.id);
    if (replay) {
      replay.coach = change.newCoach;
      replay.coachId = change.newCoachId;
    }
  }

  // Update videos
  for (const change of changes.videos) {
    const video = videos.find(v => v.id === change.id);
    if (video) {
      video.coach = change.newCoach;
      video.coachId = change.newCoachId;
    }
  }

  // Update build orders
  for (const change of changes.buildOrders) {
    const bo = buildOrders.find(b => b.id === change.id);
    if (bo) {
      bo.coach = change.newCoach;
      bo.coachId = change.newCoachId;
    }
  }

  // Write updated files
  if (changes.replays.length > 0) {
    writeFileSync(resolve(dataDir, 'replays.json'), JSON.stringify(replays, null, 2) + '\n');
    console.log(`  ✓ Updated replays.json`);
  }
  if (changes.videos.length > 0) {
    writeFileSync(resolve(dataDir, 'videos.json'), JSON.stringify(videos, null, 2) + '\n');
    console.log(`  ✓ Updated videos.json`);
  }
  if (changes.buildOrders.length > 0) {
    writeFileSync(resolve(dataDir, 'build-orders.json'), JSON.stringify(buildOrders, null, 2) + '\n');
    console.log(`  ✓ Updated build-orders.json`);
  }

  console.log('\nDone! Remember to commit the changes.');
}
