#!/usr/bin/env tsx
/**
 * Convert videos.csv to videos.json
 *
 * Usage:
 *   npm run csv-to-json
 *
 * Or with custom paths:
 *   tsx scripts/csv-to-json.ts <input.csv> <output.json>
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

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

function csvToJson(csvData: string): Video[] {
  const lines = csvData.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  // Skip header (first line)
  const dataLines = lines.slice(1);

  const videos: Video[] = dataLines.map((line, index) => {
    const fields = parseCsvLine(line);

    if (fields.length !== 7) {
      throw new Error(
        `Line ${index + 2} has ${fields.length} fields, expected 7. Line: ${line.substring(0, 100)}...`
      );
    }

    const [id, title, description, youtubeId, thumbnail, tagsStr, addedAt] = fields;

    return {
      id: id.trim(),
      title: title.trim(),
      description: description.trim(),
      youtubeId: youtubeId.trim(),
      thumbnail: thumbnail.trim(),
      tags: tagsStr.split('|').map(t => t.trim()).filter(t => t.length > 0),
      addedAt: addedAt.trim(),
    };
  });

  return videos;
}

// Main execution
const args = process.argv.slice(2);
const inputPath = args[0] || join(process.cwd(), 'src/data/videos.csv');
const outputPath = args[1] || join(process.cwd(), 'src/data/videos.json');

try {
  console.log(`📖 Reading CSV from: ${inputPath}`);
  const csvData = readFileSync(inputPath, 'utf-8');

  console.log(`✨ Converting CSV to JSON...`);
  const videos = csvToJson(csvData);

  console.log(`💾 Writing JSON to: ${outputPath}`);
  const jsonData = JSON.stringify(videos, null, 2);
  writeFileSync(outputPath, jsonData, 'utf-8');

  console.log(`✅ Success! Converted ${videos.length} videos to JSON`);
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
