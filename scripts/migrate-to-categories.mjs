#!/usr/bin/env node

/**
 * Migrates content from tag-based system to hierarchical category system
 *
 * This script:
 * 1. Updates difficulty levels (beginner -> basic, advanced -> expert)
 * 2. Maps tags to primaryCategory and secondaryCategory
 * 3. Preserves original tags for backwards compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Mapping tags to categories
const TAG_TO_CATEGORY = {
  // Builds
  'macro': { primary: 'builds', secondary: 'macro' },
  'timing': { primary: 'builds', secondary: 'timing-attack' },
  'timing-attack': { primary: 'builds', secondary: 'timing-attack' },
  'all-in': { primary: 'builds', secondary: 'all-in' },
  'allin': { primary: 'builds', secondary: 'all-in' },
  'cheese': { primary: 'builds', secondary: 'cheese' },
  'defensive': { primary: 'builds', secondary: 'defensive' },
  'defense': { primary: 'builds', secondary: 'defensive' },
  'build order': { primary: 'builds', secondary: null },
  'build-order': { primary: 'builds', secondary: null },

  // Strategy
  'strategy': { primary: 'strategy', secondary: null },
  'early-game': { primary: 'strategy', secondary: 'early-game' },
  'mid-game': { primary: 'strategy', secondary: 'mid-game' },
  'late-game': { primary: 'strategy', secondary: 'late-game' },
  'transitions': { primary: 'strategy', secondary: 'transitions' },
  'scouting': { primary: 'strategy', secondary: 'scouting' },

  // Mechanics
  'mechanics': { primary: 'mechanics', secondary: null },
  'micro': { primary: 'mechanics', secondary: 'micro' },
  'multitasking': { primary: 'mechanics', secondary: 'multitasking' },
  'army-control': { primary: 'mechanics', secondary: 'army-control' },

  // Mindset
  'mindset': { primary: 'mindset', secondary: null },
  'mental': { primary: 'mindset', secondary: null },
  'decision-making': { primary: 'mindset', secondary: 'decision-making' },
  'tilt': { primary: 'mindset', secondary: 'tilt-management' },
  'learning': { primary: 'mindset', secondary: 'learning' },
  'game-sense': { primary: 'mindset', secondary: 'game-sense' },

  // Matchups
  'tvt': { primary: 'matchups', secondary: 'tvt' },
  'tvz': { primary: 'matchups', secondary: 'tvz' },
  'tvp': { primary: 'matchups', secondary: 'tvp' },
  'zvt': { primary: 'matchups', secondary: 'zvt' },
  'zvz': { primary: 'matchups', secondary: 'zvz' },
  'zvp': { primary: 'matchups', secondary: 'zvp' },
  'pvt': { primary: 'matchups', secondary: 'pvt' },
  'pvz': { primary: 'matchups', secondary: 'pvz' },
  'pvp': { primary: 'matchups', secondary: 'pvp' },

  // Analysis
  'analysis': { primary: 'analysis', secondary: null },
  'replay': { primary: 'analysis', secondary: 'replay-reviews' },
  'replay-review': { primary: 'analysis', secondary: 'replay-reviews' },
  'pro-game': { primary: 'analysis', secondary: 'pro-games' },
  'ladder': { primary: 'analysis', secondary: 'ladder-games' },
  'tournament': { primary: 'analysis', secondary: 'tournament-games' },

  // Misc
  'tipsandtricks': { primary: 'misc', secondary: 'tips-tricks' },
  'tipsntricks': { primary: 'misc', secondary: 'tips-tricks' },
  'tips-tricks': { primary: 'misc', secondary: 'tips-tricks' },
  'maps': { primary: 'misc', secondary: 'maps' },
  'team-games': { primary: 'misc', secondary: 'team-games' },
  'casual': { primary: 'misc', secondary: 'casual' },
  'meta': { primary: 'misc', secondary: 'meta-discussion' },
};

function categorizeTags(tags) {
  if (!tags || tags.length === 0) {
    return { primaryCategory: null, secondaryCategory: null };
  }

  // Priority order: More specific categories first
  const priorityOrder = [
    // Specific build types (highest priority)
    'cheese', 'all-in', 'allin', 'defensive', 'defense', 'timing-attack', 'timing',
    // Matchups (high priority)
    'tvt', 'tvz', 'tvp', 'zvt', 'zvz', 'zvp', 'pvt', 'pvz', 'pvp',
    // Analysis types (high priority)
    'replay', 'replay-review', 'pro-game', 'tournament', 'ladder',
    // Specific mechanics/strategy (medium priority)
    'micro', 'multitasking', 'army-control', 'scouting', 'transitions',
    'early-game', 'mid-game', 'late-game', 'decision-making', 'tilt', 'learning', 'game-sense',
    // Broad categories (lower priority)
    'macro', 'mechanics', 'strategy', 'mindset', 'analysis',
    // Misc (lowest priority)
    'tipsandtricks', 'tipsntricks', 'tips-tricks', 'maps', 'team-games', 'casual', 'meta'
  ];

  // Try priority tags first
  for (const priorityTag of priorityOrder) {
    if (tags.some(t => t.toLowerCase().trim() === priorityTag) && TAG_TO_CATEGORY[priorityTag]) {
      return {
        primaryCategory: TAG_TO_CATEGORY[priorityTag].primary,
        secondaryCategory: TAG_TO_CATEGORY[priorityTag].secondary
      };
    }
  }

  // Fallback: try any matching tag
  for (const tag of tags) {
    const normalized = tag.toLowerCase().trim();
    if (TAG_TO_CATEGORY[normalized]) {
      return {
        primaryCategory: TAG_TO_CATEGORY[normalized].primary,
        secondaryCategory: TAG_TO_CATEGORY[normalized].secondary
      };
    }
  }

  // Default to misc if no match found
  return { primaryCategory: 'misc', secondaryCategory: null };
}

function migrateDifficulty(difficulty) {
  if (!difficulty) return undefined;

  const mapping = {
    'beginner': 'basic',
    'intermediate': 'intermediate',
    'advanced': 'expert',
    'basic': 'basic',
    'expert': 'expert'
  };

  return mapping[difficulty.toLowerCase()] || difficulty;
}

function migrateContent(items, type) {
  let changeCount = 0;

  const migrated = items.map(item => {
    const changes = {};

    // Migrate difficulty
    if (item.difficulty) {
      const newDifficulty = migrateDifficulty(item.difficulty);
      if (newDifficulty !== item.difficulty) {
        changes.difficulty = newDifficulty;
        changeCount++;
      }
    }

    // Recalculate categories based on tags (always, to fix any incorrect mappings)
    if (item.tags && item.tags.length > 0) {
      const { primaryCategory, secondaryCategory } = categorizeTags(item.tags);
      // Only update if different from current value
      if (primaryCategory && primaryCategory !== item.primaryCategory) {
        changes.primaryCategory = primaryCategory;
        changeCount++;
      }
      if (secondaryCategory !== item.secondaryCategory) {
        changes.secondaryCategory = secondaryCategory;
        if (secondaryCategory) changeCount++;
      }
    }

    return { ...item, ...changes };
  });

  console.log(`  ${type}: ${changeCount} items updated`);
  return migrated;
}

async function main() {
  console.log('🔄 Migrating content to category system...\n');

  const files = [
    { name: 'videos.json', type: 'Videos' },
    { name: 'build-orders.json', type: 'Build Orders' },
    { name: 'replays.json', type: 'Replays' },
    { name: 'masterclasses.json', type: 'Masterclasses' },
    { name: 'events.json', type: 'Events' },
  ];

  for (const { name, type } of files) {
    const filePath = path.join(DATA_DIR, name);

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const migrated = migrateContent(content, type);

      // Write back with pretty formatting
      fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2) + '\n', 'utf-8');
    } catch (error) {
      console.error(`  ❌ Error processing ${name}:`, error.message);
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('\nNote: Original tags have been preserved for backwards compatibility.');
}

main().catch(console.error);
