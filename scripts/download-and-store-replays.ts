#!/usr/bin/env tsx

/**
 * Download coach replays from Discord and upload to Vercel Blob storage
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { put } from '@vercel/blob';
import { config } from 'dotenv';

config({ path: '.env.local' });

const DISCORD_TOKEN = '***REDACTED_DISCORD_TOKEN***';
const SCRAPED_REPLAYS_PATH = '/Users/chadfurman/projects/ladder-legends-bot/scraped-data/replays.json';
const OUTPUT_PATH = join(process.cwd(), 'src', 'data', 'replays.json');
const TEMP_DIR = join(process.cwd(), 'temp-replays');

interface ScrapedReplay {
  id: string;
  title: string;
  coach?: string;
  notes?: string;
  downloadUrl: string;
  gameDate: string;
  uploadDate: string;
  tags: string[];
}

interface StoredReplay {
  id: string;
  title: string;
  map: string;
  matchup: string;
  player1: {
    name: string;
    race: string;
    mmr?: number;
    result: string;
  };
  player2: {
    name: string;
    race: string;
    mmr?: number;
    result: string;
  };
  duration: string;
  gameDate: string;
  uploadDate: string;
  coach?: string;
  tags: string[];
  patch?: string;
  notes?: string;
  downloadUrl: string;
  videoIds?: string[];
}

async function downloadReplayFromDiscord(url: string, filename: string): Promise<string | null> {
  try {
    const filepath = join(TEMP_DIR, filename);

    const response = await fetch(url, {
      headers: {
        'Authorization': DISCORD_TOKEN,
      },
    });

    if (!response.ok) {
      console.error(`   ❌ Download failed: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify it's a real file (SC2Replay files should be at least 10KB typically)
    if (buffer.length < 1000) {
      console.error(`   ⚠️  File too small (${buffer.length} bytes) - likely expired URL`);
      return null;
    }

    writeFileSync(filepath, buffer);
    console.log(`   ✅ Downloaded ${(buffer.length / 1024).toFixed(1)}KB`);

    return filepath;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Error downloading:`, message);
    return null;
  }
}

async function uploadToBlob(filepath: string, filename: string): Promise<string | null> {
  try {
    const file = readFileSync(filepath);
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/octet-stream',
    });

    console.log(`   ✅ Uploaded to blob: ${blob.url}`);
    return blob.url;
  } catch (error) {
    // If blob already exists, construct the URL and return it
    const message = error instanceof Error ? error.message : '';
    if (message.includes('This blob already exists')) {
      const blobUrl = `https://8hmp7utaer4z3mma.public.blob.vercel-storage.com/${filename}`;
      console.log(`   ℹ️  Blob exists, using existing URL: ${blobUrl}`);
      return blobUrl;
    }
    console.error(`   ❌ Error uploading to blob:`, message);
    return null;
  }
}

async function analyzeReplay(filepath: string): Promise<Record<string, unknown> | null> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Use curl since we know it works
    const { stdout } = await execAsync(
      `curl -X POST http://localhost:8000/analyze -H "X-API-Key: ***REDACTED_API_KEY***" -F "file=@${filepath}" -s`
    );

    const result = JSON.parse(stdout) as Record<string, unknown>;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Error analyzing replay:`, message);
    return null;
  }
}

async function main() {
  console.log('🎮 Downloading and storing coach replays...\n');

  // Create temp directory
  try {
    mkdirSync(TEMP_DIR, { recursive: true });
  } catch {
    // Directory already exists, ignore
  }

  // Load scraped replays
  const scrapedReplays: ScrapedReplay[] = JSON.parse(readFileSync(SCRAPED_REPLAYS_PATH, 'utf-8'));
  console.log(`📦 Found ${scrapedReplays.length} scraped replay(s)\n`);

  const storedReplays: StoredReplay[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < scrapedReplays.length; i++) {
    const replay = scrapedReplays[i];
    console.log(`[${i + 1}/${scrapedReplays.length}] ${replay.title}`);

    try {
      // Download from Discord
      console.log('   📥 Downloading from Discord...');
      const filename = `${replay.id}.SC2Replay`;
      const filepath = await downloadReplayFromDiscord(replay.downloadUrl, filename);

      if (!filepath) {
        console.log('   ⚠️  Skipping - download failed\n');
        failCount++;
        continue;
      }

      // Verify file size
      const stats = statSync(filepath);
      console.log(`   🔍 Verifying replay file (${(stats.size / 1024).toFixed(1)}KB)...`);

      // Analyze replay
      console.log('   🔬 Analyzing with SC2Reader...');
      const analysis = await analyzeReplay(filepath);

      if (!analysis || !analysis.metadata) {
        console.log('   ⚠️  Skipping - analysis failed\n');
        failCount++;
        continue;
      }

      const metadata = analysis.metadata as Record<string, unknown>;
      const players = (metadata.players as Array<Record<string, unknown>>) || [];

      // Upload to Vercel Blob
      console.log('   ☁️  Uploading to Vercel Blob...');
      const blobUrl = await uploadToBlob(filepath, filename);

      if (!blobUrl) {
        console.log('   ⚠️  Skipping - blob upload failed\n');
        failCount++;
        continue;
      }

      // Determine matchup
      let matchup = 'Unknown';
      if (players.length >= 2) {
        const race1 = String(players[0].race)?.[0]?.toUpperCase() || '?';
        const race2 = String(players[1].race)?.[0]?.toUpperCase() || '?';
        matchup = `${race1}v${race2}`;
      }

      // Create stored replay entry
      const stored: StoredReplay = {
        id: replay.id,
        title: replay.title,
        map: String(metadata.map_name) || 'Unknown Map',
        matchup,
        player1: {
          name: String(players[0]?.name) || 'Player 1',
          race: String(players[0]?.race)?.toLowerCase() || 'unknown',
          mmr: players[0]?.mmr as number | undefined,
          result: String(players[0]?.result)?.toLowerCase() || 'unknown',
        },
        player2: {
          name: String(players[1]?.name) || 'Player 2',
          race: String(players[1]?.race)?.toLowerCase() || 'unknown',
          mmr: players[1]?.mmr as number | undefined,
          result: String(players[1]?.result)?.toLowerCase() || 'unknown',
        },
        duration: String(metadata.game_length)?.replace('0:', '') || '00:00',
        gameDate: replay.gameDate,
        uploadDate: replay.uploadDate,
        coach: replay.coach,
        tags: replay.tags,
        patch: String(metadata.release_string),
        notes: replay.notes,
        downloadUrl: blobUrl,
        videoIds: [],
      };

      storedReplays.push(stored);
      successCount++;
      console.log(`   ✅ ${stored.map} - ${stored.matchup} (${stored.duration})\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   ❌ Error processing replay:`, message, '\n');
      failCount++;
    }
  }

  // Write to output file
  writeFileSync(OUTPUT_PATH, JSON.stringify(storedReplays, null, 2));
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed:  ${failCount}`);
  console.log(`\n💾 Wrote ${storedReplays.length} replay(s) to ${OUTPUT_PATH}`);

  // Cleanup
  console.log('🧹 Cleaning up temp files...');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  await execAsync(`rm -rf "${TEMP_DIR}"`);
  console.log('✨ Done!\n');
}

main().catch(console.error);
