#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

console.log('=== REMAINING UNCATEGORIZED VIDEOS ===\n');
const videos = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'videos.json'), 'utf-8'));
const uncategorized = videos.filter(v => !v.categories || v.categories.length === 0);

console.log(`Total: ${uncategorized.length}\n`);
uncategorized.forEach((v, i) => {
  console.log(`${i + 1}. ${v.title}`);
  console.log(`   Tags: ${(v.tags || []).join(', ') || 'NONE'}`);
  console.log('');
});
