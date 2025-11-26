/**
 * Explore Vercel Blob Store
 * Run with: npx tsx scripts/explore-blob-store.ts
 */
import 'dotenv/config';
import { list } from '@vercel/blob';

// Load production env
import { config } from 'dotenv';
config({ path: '.env.production.local' });

async function main() {
  console.log('🔍 Exploring Vercel Blob Store...\n');

  // Check if token is available
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN not found in environment');
    console.log('Run: vercel env pull .env.production.local --environment=production');
    process.exit(1);
  }

  console.log('✅ Blob token found\n');

  // List all blobs
  console.log('📦 Listing all user-replays...\n');

  try {
    const { blobs, cursor } = await list({ prefix: 'user-replays/', limit: 100 });

    console.log(`Found ${blobs.length} blobs${cursor ? ' (more available)' : ''}:\n`);

    // Group by user
    const byUser: Record<string, typeof blobs> = {};

    for (const blob of blobs) {
      const parts = blob.pathname.split('/');
      const userId = parts[1] || 'unknown';
      if (!byUser[userId]) byUser[userId] = [];
      byUser[userId].push(blob);
    }

    // Show summary by user
    for (const [userId, userBlobs] of Object.entries(byUser)) {
      console.log(`👤 User: ${userId}`);
      console.log(`   Replays: ${userBlobs.length}`);
      console.log(`   Total size: ${(userBlobs.reduce((s, b) => s + b.size, 0) / 1024 / 1024).toFixed(2)} MB`);

      // Show first few replays
      for (const blob of userBlobs.slice(0, 3)) {
        const filename = blob.pathname.split('/').pop() || blob.pathname;
        console.log(`   - ${filename} (${(blob.size / 1024).toFixed(1)} KB)`);
      }
      if (userBlobs.length > 3) {
        console.log(`   ... and ${userBlobs.length - 3} more`);
      }
      console.log('');
    }

    // Show total stats
    const totalSize = blobs.reduce((s, b) => s + b.size, 0);
    console.log(`\n📊 Total: ${blobs.length} replays, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Error listing blobs:', error);
  }
}

main().catch(console.error);
