#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const videos = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'videos.json'), 'utf-8'));
const coaches = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'coaches.json'), 'utf-8'));

coaches.forEach(coach => {
  const coachVideos = videos.filter(video => {
    if (video.coachId && video.coachId === coach.id) return true;
    if (video.coach?.toLowerCase() === coach.name.toLowerCase()) return true;
    if (video.coach?.toLowerCase() === coach.displayName.toLowerCase()) return true;
    return false;
  });
  console.log(`${coach.displayName} (${coach.id}): ${coachVideos.length} videos`);
  coachVideos.forEach(v => console.log(`  - ${v.title} (coach: ${v.coach}, coachId: ${v.coachId})`));
  console.log('');
});
