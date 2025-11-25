#!/usr/bin/env node

/**
 * Migrates content from single primaryCategory/secondaryCategory to multiple categories array
 *
 * This script:
 * 1. Converts primaryCategory + secondaryCategory to categories array
 * 2. Removes the old primaryCategory and secondaryCategory fields
 * 3. Preserves existing tags
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const DATA_FILES = [
  'videos.json',
  'masterclasses.json',
  'replays.json',
  'build-orders.json',
  'events.json',
];

function migrateItem(item) {
  const categories = [];

  // Convert old format to new format
  if (item.primaryCategory) {
    if (item.secondaryCategory) {
      // Has both primary and secondary
      categories.push(`${item.primaryCategory}.${item.secondaryCategory}`);
    } else {
      // Only primary
      categories.push(item.primaryCategory);
    }
  }

  // Remove old fields
  const { primaryCategory: _primaryCategory, secondaryCategory: _secondaryCategory, ...rest } = item;

  // Add new categories field (empty array if none)
  return {
    ...rest,
    categories: categories.length > 0 ? categories : [],
  };
}

function migrateFile(filename) {
  const filePath = path.join(DATA_DIR, filename);

  console.log(`\n📄 Processing ${filename}...`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found, skipping`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const items = JSON.parse(content);

  if (!Array.isArray(items)) {
    console.log(`  ⚠️  Not an array, skipping`);
    return;
  }

  let migrationCount = 0;
  const migratedItems = items.map((item) => {
    const migrated = migrateItem(item);

    // Count items that actually had categories
    if (migrated.categories.length > 0) {
      migrationCount++;
    }

    return migrated;
  });

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(migratedItems, null, 2) + '\n');

  console.log(`  ✅ Migrated ${migrationCount} items with categories`);
  console.log(`  📊 Total items: ${items.length}`);
}

console.log('🚀 Starting multi-category migration...\n');

DATA_FILES.forEach(migrateFile);

console.log('\n✨ Migration complete!\n');
