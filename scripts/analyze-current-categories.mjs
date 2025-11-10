#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const files = ['videos.json', 'masterclasses.json', 'replays.json', 'build-orders.json'];

files.forEach(file => {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return;

  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`\n${file} (${items.length} items):`);
  console.log('==========================================');

  const categoryCounts = {};
  let uncategorized = 0;
  let onlyPrimary = 0;

  items.forEach(item => {
    const cats = item.categories || [];
    if (cats.length === 0) {
      uncategorized++;
    } else {
      const hasSubcategory = cats.some(c => c.includes('.'));
      if (!hasSubcategory) onlyPrimary++;

      cats.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    }
  });

  console.log(`Uncategorized: ${uncategorized}`);
  console.log(`Only primary (no subcategories): ${onlyPrimary}`);
  console.log('\nCategory breakdown:');
  Object.entries(categoryCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(35)} ${count}`);
    });
});
