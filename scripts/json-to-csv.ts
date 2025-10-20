#!/usr/bin/env tsx
/**
 * Convert videos.json to videos.csv
 *
 * Usage:
 *   npm run json-to-csv
 *
 * Or with custom paths:
 *   tsx scripts/json-to-csv.ts <input.json> <output.csv>
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  thumbnail: string;
  tags: string[];
  addedAt: string;
}

function jsonToCsv(videos: Video[]): string {
  // CSV Header
  const header = 'id,title,description,youtubeId,thumbnail,tags,addedAt';

  // Convert each video to CSV row
  const rows = videos.map(video => {
    // Escape fields that contain commas or quotes
    const escapeField = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    return [
      escapeField(video.id),
      escapeField(video.title),
      escapeField(video.description),
      escapeField(video.youtubeId),
      escapeField(video.thumbnail),
      escapeField(video.tags.join('|')), // Use | as tag separator
      escapeField(video.addedAt),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

// Main execution
const args = process.argv.slice(2);
const inputPath = args[0] || join(process.cwd(), 'src/data/videos.json');
const outputPath = args[1] || join(process.cwd(), 'src/data/videos.csv');

try {
  console.log(`📖 Reading JSON from: ${inputPath}`);
  const jsonData = readFileSync(inputPath, 'utf-8');
  const videos: Video[] = JSON.parse(jsonData);

  console.log(`✨ Converting ${videos.length} videos to CSV...`);
  const csvData = jsonToCsv(videos);

  console.log(`💾 Writing CSV to: ${outputPath}`);
  writeFileSync(outputPath, csvData, 'utf-8');

  console.log(`✅ Success! Converted ${videos.length} videos to CSV`);
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
