import { put } from '@vercel/blob';
import { readFile } from 'fs/promises';
import { join } from 'path';
import replaysData from '../src/data/replays.json';

interface ReplayUpload {
  replayId: string;
  filePath: string;
  title: string;
}

const uploadsToProcess: ReplayUpload[] = [
  {
    replayId: 'replay-216edeea-a1da-4fae-834f-6d08e98761a8',
    filePath: '/Users/chadfurman/Downloads/TvZ 2-1-1 basic guide.SC2Replay',
    title: 'Pylon LE - GamerNico vs A.I. 1 (Very Easy)',
  },
  {
    replayId: 'replay-cc3ee635-88f1-4fd9-b53e-82f2d7a4beb0',
    filePath: '/Users/chadfurman/Downloads/TvT guide - RFE.SC2Replay',
    title: 'Ultralove - GamerNico vs A.I. 1 (Very Easy)',
  },
  {
    replayId: 'replay-7df54317-f263-42db-830e-7ccd854cde76',
    filePath: '/Users/chadfurman/Downloads/TvP 5-1-1 AI replay.SC2Replay',
    title: 'Ultralove - Mabadi vs A.I. 1 (Very Easy)',
  },
];

async function uploadReplays() {
  console.log('🚀 Starting replay uploads...\n');

  const results: { replayId: string; url: string; success: boolean }[] = [];

  for (const upload of uploadsToProcess) {
    try {
      console.log(`📤 Uploading: ${upload.title}`);
      console.log(`   File: ${upload.filePath}`);

      // Read the file
      const fileBuffer = await readFile(upload.filePath);
      const fileName = upload.filePath.split('/').pop() || 'replay.SC2Replay';

      console.log(`   Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

      // Upload to Vercel Blob
      const blob = await put(fileName, fileBuffer, {
        access: 'public', // Using public for now to match existing uploads
        addRandomSuffix: true,
        contentType: 'application/octet-stream',
      });

      console.log(`   ✅ Uploaded: ${blob.url}\n`);

      results.push({
        replayId: upload.replayId,
        url: blob.url,
        success: true,
      });
    } catch (error) {
      console.error(`   ❌ Failed to upload ${upload.title}:`, error);
      results.push({
        replayId: upload.replayId,
        url: '',
        success: false,
      });
    }
  }

  // Print summary
  console.log('=' .repeat(80));
  console.log('UPLOAD SUMMARY\n');

  console.log('Successful uploads:');
  results
    .filter(r => r.success)
    .forEach(r => {
      console.log(`\nReplay ID: ${r.replayId}`);
      console.log(`Download URL: ${r.url}`);
    });

  if (results.some(r => !r.success)) {
    console.log('\n\nFailed uploads:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`- ${r.replayId}`);
      });
  }

  console.log('\n' + '='.repeat(80));
  console.log('NEXT STEPS\n');
  console.log('Update replays.json with the following downloadUrl values:\n');

  results
    .filter(r => r.success)
    .forEach(r => {
      const replay = replaysData.find(rep => rep.id === r.replayId);
      console.log(`Find replay "${replay?.title}" (${r.replayId})`);
      console.log(`Add: "downloadUrl": "${r.url}",\n`);
    });
}

uploadReplays().catch(console.error);
