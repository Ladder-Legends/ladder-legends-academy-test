#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

console.log('=== UNCATEGORIZED VIDEOS (sample) ===\n');
const videos = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'videos.json'), 'utf-8'));
const uncategorized = videos.filter(v => !v.categories || v.categories.length === 0).slice(0, 15);
uncategorized.forEach(v => {
  console.log(`Title: ${v.title}`);
  console.log(`Tags: ${(v.tags || []).join(', ')}`);
  console.log('');
});

console.log('\n=== UNCATEGORIZED REPLAYS (sample) ===\n');
const replays = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'replays.json'), 'utf-8'));
const uncategorizedReplays = replays.filter(r => !r.categories || r.categories.length === 0).slice(0, 10);
uncategorizedReplays.forEach(r => {
  console.log(`Title: ${r.title}`);
  console.log(`Matchup: ${r.matchup || 'N/A'}`);
  console.log(`Tags: ${(r.tags || []).join(', ')}`);
  console.log('');
});

console.log('\n=== UNCATEGORIZED BUILD ORDERS (all) ===\n');
const builds = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'build-orders.json'), 'utf-8'));
const uncategorizedBuilds = builds.filter(b => !b.categories || b.categories.length === 0);
uncategorizedBuilds.forEach(b => {
  console.log(`Name: ${b.name}`);
  console.log(`Race: ${b.race} vs ${b.vsRace}`);
  console.log(`Type: ${b.type || 'N/A'}`);
  console.log(`Tags: ${(b.tags || []).join(', ')}`);
  console.log('');
});
