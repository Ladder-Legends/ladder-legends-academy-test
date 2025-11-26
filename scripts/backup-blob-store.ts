/**
 * Backup Vercel Blob Store
 * Downloads ALL files from Vercel Blob to a local directory
 * Includes: user-replays, metrics, thumbnails, and any other content
 *
 * Usage:
 *   npx tsx scripts/backup-blob-store.ts [output-dir]
 *
 * Example:
 *   npx tsx scripts/backup-blob-store.ts ./backups/2025-11-26
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { list } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

// Load production env
config({ path: '.env.production.local' });

const DEFAULT_OUTPUT_DIR = './backups/blob-store';

interface BackupStats {
  totalFiles: number;
  totalBytes: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  failedFiles: string[];
  byCategory: Record<string, { count: number; bytes: number }>;
}

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const dir = path.dirname(destPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(destPath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error(`  Failed to download: ${error}`);
    return false;
  }
}

function getCategoryFromPath(pathname: string): string {
  const parts = pathname.split('/');
  return parts[0] || 'root';
}

async function backupBlobStore(outputDir: string): Promise<BackupStats> {
  const stats: BackupStats = {
    totalFiles: 0,
    totalBytes: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    failedFiles: [],
    byCategory: {},
  };

  console.log('Scanning Vercel Blob Store (ALL content)...\n');

  // Check token
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN not found');
    console.log('Run: vercel env pull .env.production.local --environment=production');
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // List ALL blobs (no prefix filter - gets everything)
  let cursor: string | undefined;
  const allBlobs: Array<{ url: string; pathname: string; size: number; uploadedAt: Date }> = [];

  do {
    const result = await list({ limit: 1000, cursor });
    allBlobs.push(...result.blobs);
    cursor = result.cursor;
    console.log(`  Fetched ${allBlobs.length} blobs so far...`);
  } while (cursor);

  stats.totalFiles = allBlobs.length;
  stats.totalBytes = allBlobs.reduce((sum, b) => sum + b.size, 0);

  // Categorize blobs
  for (const blob of allBlobs) {
    const category = getCategoryFromPath(blob.pathname);
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = { count: 0, bytes: 0 };
    }
    stats.byCategory[category].count++;
    stats.byCategory[category].bytes += blob.size;
  }

  console.log(`\nFound ${stats.totalFiles} files (${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB)\n`);
  console.log('Categories:');
  for (const [category, data] of Object.entries(stats.byCategory).sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`  ${category}: ${data.count} files (${(data.bytes / 1024 / 1024).toFixed(2)} MB)`);
  }
  console.log('');

  if (stats.totalFiles === 0) {
    console.log('No files to backup.');
    return stats;
  }

  // Download each file
  for (let i = 0; i < allBlobs.length; i++) {
    const blob = allBlobs[i];
    const destPath = path.join(outputDir, blob.pathname);
    const progress = `[${i + 1}/${allBlobs.length}]`;

    // Check if file already exists with same size
    if (fs.existsSync(destPath)) {
      const existingStat = fs.statSync(destPath);
      if (existingStat.size === blob.size) {
        console.log(`${progress} Skipping (exists): ${blob.pathname}`);
        stats.skippedCount++;
        continue;
      }
    }

    console.log(`${progress} Downloading: ${blob.pathname} (${(blob.size / 1024).toFixed(1)} KB)`);

    const success = await downloadFile(blob.url, destPath);
    if (success) {
      stats.successCount++;
    } else {
      stats.failedCount++;
      stats.failedFiles.push(blob.pathname);
    }
  }

  return stats;
}

async function main() {
  const outputDir = process.argv[2] || DEFAULT_OUTPUT_DIR;

  console.log('═══════════════════════════════════════════════');
  console.log('  Vercel Blob Store Backup');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`Output directory: ${path.resolve(outputDir)}\n`);

  const startTime = Date.now();
  const stats = await backupBlobStore(outputDir);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Backup Complete');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total files:     ${stats.totalFiles}`);
  console.log(`  Total size:      ${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Downloaded:      ${stats.successCount}`);
  console.log(`  Skipped:         ${stats.skippedCount}`);
  console.log(`  Failed:          ${stats.failedCount}`);
  console.log(`  Duration:        ${duration}s`);
  console.log('═══════════════════════════════════════════════\n');

  if (stats.failedFiles.length > 0) {
    console.log('Failed files:');
    for (const file of stats.failedFiles) {
      console.log(`  - ${file}`);
    }
  }

  // Save manifest
  const manifestPath = path.join(outputDir, 'backup-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    duration: `${duration}s`,
  }, null, 2));
  console.log(`📋 Manifest saved to: ${manifestPath}`);
}

main().catch(console.error);
