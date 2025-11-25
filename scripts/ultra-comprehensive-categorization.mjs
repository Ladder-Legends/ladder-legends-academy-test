#!/usr/bin/env node

/**
 * ULTRA-COMPREHENSIVE content categorization
 *
 * This script applies intelligent, multi-category tagging based on:
 * - Title analysis
 * - Description analysis
 * - Existing tags
 * - Content type patterns
 * - Matchup information
 * - Coach-specific patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// ========================================
// PATTERN MATCHERS
// ========================================

const PATTERNS = {
  // Matchup patterns
  matchups: {
    'tvt': /\btvt\b|terran vs terran|tvt/i,
    'tvz': /\btvz\b|terran vs zerg|tvz/i,
    'tvp': /\btvp\b|terran vs.*(?:toss|protoss)|vs toss|vs protoss/i,
    'zvt': /\bzvt\b|zerg vs terran|zvt/i,
    'zvz': /\bzvz\b|zerg vs zerg|zvz/i,
    'zvp': /\bzvp\b|zerg vs.*(?:toss|protoss)|zvp/i,
    'pvt': /\bpvt\b|protoss vs terran|pvt|toss vs terran/i,
    'pvz': /\bpvz\b|protoss vs zerg|pvz|toss vs zerg/i,
    'pvp': /\bpvp\b|protoss vs protoss|pvp|toss vs toss/i,
  },

  // Build type patterns
  builds: {
    'cheese': /\bcheese\b|12\s*pool|cannon rush|proxy|6\s*pool|worker\s*rush/i,
    'all-in': /\ball[- ]in\b|allin|nydus.*allin|bust/i,
    'timing-attack': /timing|push|2[- ]1[- ]1|5[- ]1[- ]1|tank push|stimbat/i,
    'defensive': /defen(?:d|se|sive)|vs.*rush|vs.*proxy|anti[- ]|counter/i,
    'macro': /\bmacro\b|standard|economic|3\s*(?:cc|base|hatch|nexus)|greedy/i,
  },

  // Strategy patterns
  strategy: {
    'early-game': /early.*game|first.*5.*min|opening|opener/i,
    'mid-game': /mid.*game|transition/i,
    'late-game': /late.*game|late.*stage|endgame/i,
    'scouting': /scout(?:ing)?|information|intel/i,
    'transitions': /tech.*switch|transition/i,
  },

  // Mechanics patterns
  mechanics: {
    'micro': /\bmicro\b|stutter|split|engag(?:e|ement)|a[- ]move|control/i,
    'macro-mechanics': /inject|chrono|mule|production|spawn larvae/i,
    'multitasking': /multitask|multi[- ]task|harass.*while/i,
    'army-control': /army.*control|positioning|concave/i,
  },

  // Mindset patterns
  mindset: {
    'decision-making': /decision|choose|when to|mentality|mental|comeback/i,
    'tilt-management': /tilt|frustrat|calm|mental.*game/i,
    'learning': /learn|improve|practice|training/i,
    'game-sense': /game.*sense|read|mind.*game|playing.*player/i,
  },

  // Analysis patterns
  analysis: {
    'replay-reviews': /replay.*(?:review|analysis)|(?:review|analyz).*replay|vs\s+\w+\s+(?:replay|game)/i,
    'pro-games': /pro.*game|tournament.*game|masters.*cup|gsl|dreamhack/i,
    'ladder-games': /ladder|ranked|(?:gm|grandmaster|master).*(?:game|vod)/i,
    'tournament-games': /tournament|championship|cup|quali(?:fier)?|bracket/i,
  },

  // Misc patterns
  misc: {
    'tips-tricks': /tips?\s*(?:and|&|n)?\s*tricks?|guide|how\s*to|tutorial/i,
    'casual': /casual|fun|gamecast|cast:/i,
    'maps': /\bmap\b|terrain|wall|base.*location/i,
    'meta-discussion': /\bmeta\b|patch|new.*style|balance/i,
  },
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function matchPattern(text, patterns) {
  const matches = [];
  for (const [key, regex] of Object.entries(patterns)) {
    if (regex.test(text)) {
      matches.push(key);
    }
  }
  return matches;
}

function analyzeContent(title, description, tags) {
  const fullText = `${title} ${description} ${tags.join(' ')}`;
  const categories = new Set();

  // Match all pattern categories
  for (const [primaryCat, subPatterns] of Object.entries(PATTERNS)) {
    const matches = matchPattern(fullText, subPatterns);
    for (const match of matches) {
      categories.add(`${primaryCat}.${match}`);
    }
  }

  return Array.from(categories);
}

function _getMatchupFromRace(race, vsRace) {
  if (!race || !vsRace) return null;
  const r = race[0].toLowerCase();
  const vs = vsRace[0].toLowerCase();
  return `matchups.${r}v${vs}`;
}

// ========================================
// CATEGORIZATION LOGIC
// ========================================

function categorizeVideo(video) {
  const title = video.title || '';
  const description = video.description || '';
  const tags = video.tags || [];
  const currentCategories = new Set(video.categories || []);

  // Pattern-based analysis
  const detected = analyzeContent(title, description, tags);
  detected.forEach(cat => currentCategories.add(cat));

  // Tag-based additions
  const TAG_MAPPINGS = {
    'macro': 'builds.macro',
    'cheese': 'builds.cheese',
    'timing': 'builds.timing-attack',
    'defense': 'builds.defensive',
    'micro': 'mechanics.micro',
    'scouting': 'strategy.scouting',
    'first5minutes': 'strategy.early-game',
    'mentality': 'mindset.decision-making',
    'mindgames': 'mindset.game-sense',
    'replayreview': 'analysis.replay-reviews',
    'coaching session': 'analysis.ladder-games',
    'tipsandtricks': 'misc.tips-tricks',
    'tipsntricks': 'misc.tips-tricks',
    'gamecast': 'misc.casual',
    'maps': 'misc.maps',
    'meta': 'misc.meta-discussion',
    'advanced': 'mechanics',
  };

  tags.forEach(tag => {
    const normalized = tag.toLowerCase().trim();
    if (TAG_MAPPINGS[normalized]) {
      currentCategories.add(TAG_MAPPINGS[normalized]);
    }

    // Matchup tags
    if (/^[tpz]v[tpz]$/i.test(normalized)) {
      currentCategories.add(`matchups.${normalized.toLowerCase()}`);
    }
  });

  // Special patterns for specific content

  // Nicosystem builds - these are BOTH builds AND matchups
  if (/nicosystem|nicoract/i.test(title)) {
    if (!Array.from(currentCategories).some(c => c.startsWith('builds.'))) {
      currentCategories.add('builds');
    }
  }

  // hinO ladder VODs - these are analysis
  if (/hino.*(?:gm|ladder|vod)/i.test(title)) {
    currentCategories.add('analysis.ladder-games');
  }

  // Masterclass content
  if (/masterclass/i.test(title)) {
    currentCategories.add('analysis');
  }

  // Coaching sessions
  if (/coaching/i.test(title)) {
    if (/session/i.test(title)) {
      currentCategories.add('analysis.ladder-games');
    }
  }

  // Worker micro/splits
  if (/worker.*micro|mineral.*walk|mining.*trick/i.test(title)) {
    currentCategories.add('mechanics.micro');
    currentCategories.add('misc.tips-tricks');
  }

  // Base camera/hotkeys
  if (/camera|hotkey|control.*group/i.test(title)) {
    currentCategories.add('mechanics');
    currentCategories.add('misc.tips-tricks');
  }

  return Array.from(currentCategories).sort();
}

function categorizeMasterclass(masterclass) {
  const title = masterclass.title || '';
  const description = masterclass.description || '';
  const tags = masterclass.tags || [];
  const categories = new Set(masterclass.categories || []);

  // Pattern analysis
  const detected = analyzeContent(title, description, tags);
  detected.forEach(cat => categories.add(cat));

  // Masterclasses are always analysis
  categories.add('analysis');

  // Check for matchups in title
  const matchupMatches = matchPattern(title + ' ' + description, PATTERNS.matchups);
  matchupMatches.forEach(matchup => categories.add(`matchups.${matchup}`));

  return Array.from(categories).sort();
}

function categorizeReplay(replay) {
  const title = replay.title || '';
  const description = replay.description || '';
  const tags = replay.tags || [];
  const categories = new Set(replay.categories || []);

  // Replays are always analysis
  categories.add('analysis');

  // Determine if pro/tournament or ladder
  if (/masters.*cup|tournament|quali|bracket|championship/i.test(title)) {
    categories.add('analysis.tournament-games');
  } else if (/ladder|ranked/i.test(title)) {
    categories.add('analysis.ladder-games');
  } else {
    categories.add('analysis.replay-reviews');
  }

  // Add matchup from matchup field
  if (replay.matchup) {
    const matchup = replay.matchup.toLowerCase();
    categories.add(`matchups.${matchup.toLowerCase()}`);
  }

  // Pattern analysis
  const detected = analyzeContent(title, description, tags);
  detected.forEach(cat => categories.add(cat));

  return Array.from(categories).sort();
}

function categorizeBuildOrder(buildOrder) {
  const name = buildOrder.name || '';
  const description = buildOrder.description || '';
  const tags = buildOrder.tags || [];
  const categories = new Set(buildOrder.categories || []);

  // Build orders are always builds
  categories.add('builds');

  // Get matchup from race/vsRace
  if (buildOrder.race && buildOrder.vsRace && buildOrder.vsRace !== 'all') {
    const r = buildOrder.race[0].toLowerCase();
    const vs = buildOrder.vsRace[0].toLowerCase();
    categories.add(`matchups.${r}v${vs}`);
  }

  // Pattern analysis
  const detected = analyzeContent(name, description, tags);
  detected.forEach(cat => categories.add(cat));

  // Build type from type field
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
      if (newCategories.length <= 5) {
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

console.log('🚀 ULTRA-COMPREHENSIVE CATEGORIZATION');
console.log('=====================================\n');

processFile('videos.json', categorizeVideo);
processFile('masterclasses.json', categorizeMasterclass);
processFile('replays.json', categorizeReplay);
processFile('build-orders.json', categorizeBuildOrder);

console.log('\n📊 FINAL CATEGORY DISTRIBUTION');
console.log('================================\n');

// Show distribution across all content
const allFiles = ['videos.json', 'masterclasses.json', 'replays.json', 'build-orders.json'];
const categoryCounts = {};

allFiles.forEach(filename => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return;

  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  items.forEach(item => {
    (item.categories || []).forEach(cat => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  });
});

Object.entries(categoryCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(30)} ${count}`);
  });

console.log('\n✨ Categorization complete!\n');
