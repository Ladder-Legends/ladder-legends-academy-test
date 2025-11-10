import { put } from '@vercel/blob';
import { readFile } from 'fs/promises';
import replaysData from '../src/data/replays.json';

interface ReplayUpload {
  replayId: string;
  filePath: string;
  title: string;
}

const uploadsToProcess: ReplayUpload[] = [
  {
    replayId: 'replay-503d5519-ff29-400e-b68a-7154efa43dda',
    filePath: '/Users/chadfurman/Downloads/EON banebust into macro example.SC2Replay',
    title: 'ZvP Baneling bust example Replay',
  },
  {
    replayId: 'replay-f00d30af-e81c-4e06-8c0f-e7d503c95917',
    filePath: '/Users/chadfurman/Downloads/EON pool first Ling Ravager example.SC2Replay',
    title: 'ZvT pool first Into Ling Ravager Allin Replay',
  },
];

async function uploadReplays() {
  console.log('🚀 Starting Eon replay uploads...\n');

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
        access: 'public',
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
