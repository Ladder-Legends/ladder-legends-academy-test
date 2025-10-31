#!/usr/bin/env node

/**
 * Download Mux Thumbnails Script
 *
 * This script runs at build time to download thumbnails for all Mux videos
 * and save them as static assets in public/thumbnails/
 *
 * This eliminates the need to generate thumbnail tokens at runtime,
 * reducing serverless compute costs.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import Mux from '@mux/mux-node';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: '.env.local' });

const VIDEOS_PATH = path.join(__dirname, '../src/data/videos.json');
const THUMBNAILS_DIR = path.join(__dirname, '../public/thumbnails');

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_API_KEY,
  tokenSecret: process.env.MUX_SECRET,
});

/**
 * Download a file from a URL to a local path
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

/**
 * Generate a signed Mux thumbnail URL
 */
async function getSignedThumbnailUrl(playbackId) {
  if (!process.env.MUX_SIGNING_KEY_ID || !process.env.MUX_SIGNING_KEY_PRIVATE_KEY) {
    throw new Error('Mux signing keys not configured');
  }

  const token = await mux.jwt.signPlaybackId(playbackId, {
    keyId: process.env.MUX_SIGNING_KEY_ID,
    keySecret: process.env.MUX_SIGNING_KEY_PRIVATE_KEY,
    expiration: '1h', // Only need it for the download
    type: 'thumbnail',
  });

  return `https://image.mux.com/${playbackId}/thumbnail.jpg?token=${token}&width=1280`;
}

async function main() {
  console.log('🎬 Downloading Mux thumbnails...\n');

  // Ensure thumbnails directory exists
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    console.log('✅ Created thumbnails directory\n');
  }

  // Read videos.json
  const videosData = JSON.parse(fs.readFileSync(VIDEOS_PATH, 'utf-8'));

  // Find all Mux videos
  const muxVideos = videosData.filter(video =>
    video.muxPlaybackId && video.source === 'mux'
  );

  if (muxVideos.length === 0) {
    console.log('ℹ️  No Mux videos found, skipping thumbnail download\n');
    return;
  }

  console.log(`📊 Found ${muxVideos.length} Mux video(s)\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Download thumbnails for each Mux video
  for (const video of muxVideos) {
    const thumbnailPath = path.join(THUMBNAILS_DIR, `${video.id}.jpg`);

    // Skip if already exists
    if (fs.existsSync(thumbnailPath)) {
      console.log(`⏭️  ${video.title} - already exists`);
      skipCount++;
      continue;
    }

    try {
      console.log(`⬇️  Downloading: ${video.title}`);

      // Generate signed URL
      const signedUrl = await getSignedThumbnailUrl(video.muxPlaybackId);

      // Download the image
      await downloadFile(signedUrl, thumbnailPath);

      console.log(`   ✅ Saved to /thumbnails/${video.id}.jpg`);
      successCount++;

    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors:  ${errorCount}`);
  console.log('='.repeat(50) + '\n');

  if (errorCount > 0) {
    console.warn('⚠️  Some thumbnails failed to download. Check errors above.\n');
    process.exit(1);
  }

  console.log('🎉 All Mux thumbnails downloaded successfully!\n');
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
