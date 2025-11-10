import { list as listBlobs } from '@vercel/blob';
import replaysData from '../src/data/replays.json';

interface OrphanedReplay {
  replayId: string;
  title: string;
  uploadDate: string;
  gameDate: string;
}

interface OrphanedBlob {
  url: string;
  pathname: string;
  uploadedAt: Date;
  size: number;
}

interface ReplayMatch {
  replay: OrphanedReplay;
  suggestedBlob?: OrphanedBlob;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}

async function findOrphanedReplays() {
  console.log('🔍 Finding orphaned replays and blobs...\n');

  // Find replays without downloadUrl
  const orphanedReplays: OrphanedReplay[] = replaysData
    .filter(r => !r.downloadUrl)
    .map(r => ({
      replayId: r.id,
      title: r.title,
      uploadDate: r.uploadDate,
      gameDate: r.gameDate,
    }));

  console.log(`📋 Found ${orphanedReplays.length} replays without downloadUrl:`);
  orphanedReplays.forEach(r => {
    console.log(`   - ${r.title} (${r.replayId})`);
    console.log(`     Upload: ${r.uploadDate}, Game: ${r.gameDate}`);
  });
  console.log();

  // Get all blobs from Vercel storage
  console.log('☁️  Fetching blobs from Vercel storage...');
  const { blobs } = await listBlobs();

  // Find blobs that aren't referenced in replays
  const usedBlobUrls = new Set(
    replaysData
      .filter(r => r.downloadUrl)
      .map(r => r.downloadUrl)
  );

  const orphanedBlobs: OrphanedBlob[] = blobs
    .filter(blob => !usedBlobUrls.has(blob.url))
    .map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      uploadedAt: blob.uploadedAt,
      size: blob.size,
    }));

  console.log(`\n📦 Found ${orphanedBlobs.length} orphaned blobs:`);
  orphanedBlobs.forEach(b => {
    console.log(`   - ${b.pathname}`);
    console.log(`     Uploaded: ${b.uploadedAt}, Size: ${(b.size / 1024).toFixed(2)} KB`);
  });
  console.log();

  // Try to match orphaned replays to orphaned blobs
  console.log('🔗 Attempting to match replays to blobs...\n');

  const matches: ReplayMatch[] = orphanedReplays.map(replay => {
    // Try to find a matching blob
    let bestMatch: OrphanedBlob | undefined;
    let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
    let reason = 'No matching blob found';

    for (const blob of orphanedBlobs) {
      const blobDate = blob.uploadedAt;
      const uploadDate = new Date(replay.uploadDate);
      const gameDate = new Date(replay.gameDate);

      // Calculate days difference
      const daysDiffUpload = Math.abs((blobDate.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysDiffGame = Math.abs((blobDate.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24));

      // High confidence: upload date within 1 day of blob upload
      if (daysDiffUpload <= 1) {
        bestMatch = blob;
        confidence = 'high';
        reason = `Upload dates match (${daysDiffUpload.toFixed(1)} days difference)`;
        break;
      }

      // Medium confidence: upload date within 7 days
      if (daysDiffUpload <= 7 && (!bestMatch || daysDiffUpload < 7)) {
        bestMatch = blob;
        confidence = 'medium';
        reason = `Upload dates close (${daysDiffUpload.toFixed(1)} days difference)`;
      }

      // Low confidence: game date within 7 days
      if (!bestMatch && daysDiffGame <= 7) {
        bestMatch = blob;
        confidence = 'low';
        reason = `Game date matches (${daysDiffGame.toFixed(1)} days difference)`;
      }
    }

    return {
      replay,
      suggestedBlob: bestMatch,
      confidence,
      reason,
    };
  });

  // Print matches
  console.log('=' .repeat(80));
  console.log('SUGGESTED MATCHES\n');

  matches.forEach(match => {
    console.log(`📌 Replay: ${match.replay.title}`);
    console.log(`   ID: ${match.replay.replayId}`);
    console.log(`   Upload Date: ${match.replay.uploadDate}`);
    console.log(`   Game Date: ${match.replay.gameDate}`);

    if (match.suggestedBlob) {
      console.log(`   ✅ Suggested Match (${match.confidence} confidence):`);
      console.log(`      Blob: ${match.suggestedBlob.pathname}`);
      console.log(`      URL: ${match.suggestedBlob.url}`);
      console.log(`      Reason: ${match.reason}`);
    } else {
      console.log(`   ❌ No match found`);
    }
    console.log();
  });

  // Generate update commands
  console.log('=' .repeat(80));
  console.log('SUGGESTED ACTIONS\n');
  console.log('To update the replays, add these downloadUrl fields to replays.json:\n');

  matches
    .filter(m => m.suggestedBlob && (m.confidence === 'high' || m.confidence === 'medium'))
    .forEach(match => {
      console.log(`Replay ID: ${match.replay.replayId}`);
      console.log(`"downloadUrl": "${match.suggestedBlob!.url}",`);
      console.log();
    });

  // Summary
  console.log('=' .repeat(80));
  console.log('SUMMARY\n');
  console.log(`Total orphaned replays: ${orphanedReplays.length}`);
  console.log(`Total orphaned blobs: ${orphanedBlobs.length}`);
  console.log(`High confidence matches: ${matches.filter(m => m.confidence === 'high').length}`);
  console.log(`Medium confidence matches: ${matches.filter(m => m.confidence === 'medium').length}`);
  console.log(`Low confidence matches: ${matches.filter(m => m.confidence === 'low').length}`);
  console.log(`No matches: ${matches.filter(m => m.confidence === 'none').length}`);
}

findOrphanedReplays().catch(console.error);
