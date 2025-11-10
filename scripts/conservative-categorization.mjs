#!/usr/bin/env node

/**
 * CONSERVATIVE content categorization
 *
 * Only adds categories when we have SOLID EVIDENCE:
 * - Explicit tags
 * - Clear title indicators (not assumptions)
 * - Structured data fields (race, vsRace, matchup, type)
 *
 * Does NOT add categories based on:
 * - Pattern matching assumptions
 * - Guesses about content type
 * - Inferred strategy phases
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// ========================================
// EXPLICIT TAG MAPPINGS
// ========================================

const TAG_MAPPINGS = {
  // Build types (only when explicitly tagged)
  'macro': 'builds.macro',
  'cheese': 'builds.cheese',
  'timing': 'builds.timing-attack',
  'timing attack': 'builds.timing-attack',
  'defense': 'builds.defensive',
  'defensive': 'builds.defensive',
  'all-in': 'builds.all-in',
  'allin': 'builds.all-in',

  // Mechanics (only when explicitly tagged)
  'micro': 'mechanics.micro',
  'multitasking': 'mechanics.multitasking',
  'army control': 'mechanics.army-control',

  // Strategy (only when explicitly tagged)
  'scouting': 'strategy.scouting',
  'early game': 'strategy.early-game',
  'mid game': 'strategy.mid-game',
  'late game': 'strategy.late-game',
  'transitions': 'strategy.transitions',

  // Mindset (only when explicitly tagged)
  'mentality': 'mindset.decision-making',
  'mental': 'mindset.decision-making',
  'decision-making': 'mindset.decision-making',
  'tilt': 'mindset.tilt-management',
  'mindgames': 'mindset.game-sense',
  'mind games': 'mindset.game-sense',

  // Analysis (only when explicitly tagged)
  'replay review': 'analysis.replay-reviews',
  'replayreview': 'analysis.replay-reviews',
  'coaching session': 'analysis.ladder-games',

  // Misc (only when explicitly tagged)
  'tips and tricks': 'misc.tips-tricks',
  'tipsandtricks': 'misc.tips-tricks',
  'tipsntricks': 'misc.tips-tricks',
  'gamecast': 'misc.casual',
  'maps': 'misc.maps',
  'meta': 'misc.meta-discussion',
};

// ========================================
// EXPLICIT TITLE PATTERNS
// (ONLY obvious, unambiguous ones)
// ========================================

const TITLE_PATTERNS = {
  // Only match EXACT phrases that clearly indicate content type
  'cannon rush': 'builds.cheese',
  'proxy': 'builds.cheese',
  '12 pool': 'builds.cheese',
  '6 pool': 'builds.cheese',

  // Only match if title says "Tips and Tricks" explicitly
  'tips and tricks': 'misc.tips-tricks',
  'tips & tricks': 'misc.tips-tricks',

  // Only match if title says "mentality coaching" explicitly
  'mentality coaching': 'mindset.decision-making',

  // Only match if title explicitly says "replay analysis"
  'replay analysis': 'analysis.replay-reviews',
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function normalizeTag(tag) {
  return tag.toLowerCase().trim();
}

function getCategoriesFromTags(tags) {
  const categories = new Set();

  if (!tags || !Array.isArray(tags)) return categories;

  tags.forEach(tag => {
    const normalized = normalizeTag(tag);

    // Explicit tag mappings
    if (TAG_MAPPINGS[normalized]) {
      categories.add(TAG_MAPPINGS[normalized]);
    }

    // Matchup tags (exact format: tvt, pvz, etc.)
    if (/^[tpz]v[tpz]$/i.test(normalized)) {
      categories.add(`matchups.${normalized.toLowerCase()}`);
    }
  });

  return categories;
}

function getCategoriesFromTitle(title) {
  const categories = new Set();
  const lowerTitle = title.toLowerCase();

  // Only check for EXACT phrase matches
  for (const [phrase, category] of Object.entries(TITLE_PATTERNS)) {
    if (lowerTitle.includes(phrase)) {
      categories.add(category);
    }
  }

  // Extract matchups from title (OBVIOUS cases like "TvT", "ZvP", etc.)
  // Match word boundaries to avoid false positives
  const matchupMatch = lowerTitle.match(/\b([tpz])v([tpz])\b/i);
  if (matchupMatch) {
    const matchup = matchupMatch[0].toLowerCase();
    categories.add(`matchups.${matchup}`);
  }

  // ZvX means Zerg (but we don't know the opponent, so just skip for now)

  // Worker micro is OBVIOUSLY mechanics
  if (lowerTitle.includes('worker') && lowerTitle.includes('micro')) {
    categories.add('mechanics.micro');
  }

  // Tutorials that mention micro
  if (lowerTitle.includes('micro') && lowerTitle.includes('tutorial')) {
    categories.add('mechanics.micro');
  }

  return categories;
}

function getMatchupCategory(race, vsRace) {
  if (!race || !vsRace || vsRace === 'all') return null;

  const r = race[0].toLowerCase();
  const vs = vsRace[0].toLowerCase();
  return `matchups.${r}v${vs}`;
}

// ========================================
// CATEGORIZATION FUNCTIONS
// ========================================

function categorizeVideo(video) {
  const categories = new Set(video.categories || []);

  // Add categories from explicit tags
  const tagCats = getCategoriesFromTags(video.tags);
  tagCats.forEach(cat => categories.add(cat));

  // Add categories from explicit title phrases
  const titleCats = getCategoriesFromTitle(video.title || '');
  titleCats.forEach(cat => categories.add(cat));

  return Array.from(categories).sort();
}

function categorizeReplay(replay) {
  const categories = new Set(replay.categories || []);

  // Replays are always analysis (we know this for certain)
  categories.add('analysis');

  // Add matchup from matchup field (explicit data)
  if (replay.matchup) {
    const matchup = normalizeTag(replay.matchup);
    if (/^[tpz]v[tpz]$/i.test(matchup)) {
      categories.add(`matchups.${matchup.toLowerCase()}`);
    }
  }

  // Add categories from explicit tags
  const tagCats = getCategoriesFromTags(replay.tags);
  tagCats.forEach(cat => categories.add(cat));

  // ONLY add specific analysis types if we have clear evidence
  const title = (replay.title || '').toLowerCase();
  if (title.includes('masters cup') || title.includes('tournament') || title.includes('quali')) {
    categories.add('analysis.tournament-games');
  } else if (title.includes('replay analysis') || title.includes('vs') && title.includes('replay')) {
    categories.add('analysis.replay-reviews');
  }
  // Otherwise just leave it as 'analysis' - we don't assume ladder vs tournament

  return Array.from(categories).sort();
}

function categorizeBuildOrder(buildOrder) {
  const categories = new Set(buildOrder.categories || []);

  // Build orders are always builds (we know this for certain)
  categories.add('builds');

  // Add matchup from race/vsRace fields (explicit data)
  const matchupCat = getMatchupCategory(buildOrder.race, buildOrder.vsRace);
  if (matchupCat) {
    categories.add(matchupCat);
  }

  // Add build type from type field (explicit data)
  if (buildOrder.type) {
    const typeMap = {
      'macro': 'builds.macro',
      'timing': 'builds.timing-attack',
      'all-in': 'builds.all-in',
      'cheese': 'builds.cheese',
      'defensive': 'builds.defensive',
    };
    if (typeMap[buildOrder.type]) {
      categories.add(typeMap[buildOrder.type]);
    }
  }

  // Add categories from explicit tags
  const tagCats = getCategoriesFromTags(buildOrder.tags);
  tagCats.forEach(cat => categories.add(cat));

  // ONLY add specific build types if title CLEARLY indicates them
  const name = (buildOrder.name || '').toLowerCase();
  if (name.includes('cannon rush') || name.includes('proxy') || name.includes('12 pool') || name.includes('6 pool')) {
    categories.add('builds.cheese');
  } else if (name.includes('allin') || name.includes('all-in') || name.includes('all in')) {
    categories.add('builds.all-in');
  } else if (name.includes('timing') || name.includes('push')) {
    categories.add('builds.timing-attack');
  }

  return Array.from(categories).sort();
}

function categorizeMasterclass(masterclass) {
  const categories = new Set(masterclass.categories || []);

  // Masterclasses are always analysis (we know this for certain)
  categories.add('analysis');

  // Add categories from explicit tags
  const tagCats = getCategoriesFromTags(masterclass.tags);
  tagCats.forEach(cat => categories.add(cat));

  // Add categories from explicit title phrases
  const titleCats = getCategoriesFromTitle(masterclass.title || '');
  titleCats.forEach(cat => categories.add(cat));

  return Array.from(categories).sort();
}

// ========================================
// MAIN PROCESSING
// ========================================

function processFile(filename, categorizeFn) {
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${filename} not found, skipping`);
    return;
  }

  console.log(`\n📄 Processing ${filename}...`);

  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(items)) {
    console.log(`  ⚠️  Not an array, skipping`);
    return;
  }

  let changedCount = 0;
  const updatedItems = items.map(item => {
    const newCategories = categorizeFn(item);
    const oldCats = JSON.stringify((item.categories || []).sort());
    const newCats = JSON.stringify(newCategories);

    if (oldCats !== newCats) {
      const itemName = item.title || item.name || item.id;
      console.log(`  ✏️  ${itemName}`);
      console.log(`     ${item.categories?.length || 0} → ${newCategories.length} categories`);
      if (newCategories.length <= 8) {
        console.log(`     ${newCategories.join(', ')}`);
      }
      changedCount++;
      return { ...item, categories: newCategories };
    }
    return item;
  });

  if (changedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(updatedItems, null, 2) + '\n');
    console.log(`  ✅ Updated ${changedCount}/${items.length} items`);
  } else {
    console.log(`  ℹ️  No changes needed`);
  }
}

console.log('🔍 CONSERVATIVE CATEGORIZATION');
console.log('Only adding categories with solid evidence');
console.log('=====================================\n');

processFile('videos.json', categorizeVideo);
processFile('masterclasses.json', categorizeMasterclass);
processFile('replays.json', categorizeReplay);
processFile('build-orders.json', categorizeBuildOrder);

console.log('\n✨ Categorization complete!\n');
