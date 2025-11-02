#!/usr/bin/env node
/**
 * Migration script to convert video playlists from youtubeIds[] to videoIds[]
 *
 * This script:
 * 1. Finds all videos with youtubeIds[] (playlists)
 * 2. For each YouTube ID in the playlist:
 *    - Checks if a video entry already exists with that youtubeId
 *    - If not, creates a new video entry for it
 * 3. Converts youtubeIds[] to videoIds[] that reference the video entries
 * 4. Removes youtubeIds[] and thumbnailVideoIndex from playlists
 * 5. Adds source: 'playlist' to playlist videos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videosPath = path.join(__dirname, '../src/data/videos.json');
const videos = JSON.parse(fs.readFileSync(videosPath, 'utf-8'));

console.log('🎬 Starting video playlist migration...\n');
console.log(`📊 Found ${videos.length} total videos`);

// Step 1: Find playlists (videos with youtubeIds[])
const playlists = videos.filter(v => v.youtubeIds && v.youtubeIds.length > 0);
console.log(`📝 Found ${playlists.length} playlist(s) to migrate`);

// Step 2: Create a lookup map of YouTube ID -> Video ID
const youtubeIdToVideoId = new Map();
for (const video of videos) {
  if (video.youtubeId) {
    youtubeIdToVideoId.set(video.youtubeId, video.id);
  }
}

console.log(`🗺️  Built lookup map with ${youtubeIdToVideoId.size} YouTube IDs\n`);

// Step 3: Process each playlist
const newVideos = [];
let createdCount = 0;

for (const playlist of playlists) {
  console.log(`\n🎵 Processing playlist: "${playlist.title}" (${playlist.id})`);
  console.log(`   YouTube IDs: ${playlist.youtubeIds?.join(', ')}`);

  const videoIds = [];

  for (const ytId of playlist.youtubeIds || []) {
    // Check if video entry exists
    let videoId = youtubeIdToVideoId.get(ytId);

    if (!videoId) {
      // Create new video entry
      videoId = randomUUID();
      createdCount++;

      const newVideo = {
        id: videoId,
        title: `Video ${ytId}`, // Generic title - user can edit later
        description: `Imported from playlist: ${playlist.title}`,
        date: playlist.date,
        tags: playlist.tags || [],
        race: playlist.race,
        coach: playlist.coach,
        coachId: playlist.coachId,
        source: 'youtube',
        youtubeId: ytId,
        thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        isFree: playlist.isFree,
      };

      newVideos.push(newVideo);
      youtubeIdToVideoId.set(ytId, videoId);

      console.log(`   ✅ Created new video entry: ${videoId} for YouTube ID ${ytId}`);
    } else {
      console.log(`   ♻️  Reusing existing video: ${videoId} for YouTube ID ${ytId}`);
    }

    videoIds.push(videoId);
  }

  // Update playlist to use videoIds
  playlist.videoIds = videoIds;
  playlist.source = 'playlist';
  delete playlist.youtubeIds;
  delete playlist.thumbnailVideoIndex;

  console.log(`   🔗 Converted to videoIds: ${videoIds.join(', ')}`);
}

// Step 4: Combine and sort all videos
const allVideos = [...videos, ...newVideos];

// Sort by date (newest first)
allVideos.sort((a, b) => {
  const dateA = new Date(a.date || '1970-01-01');
  const dateB = new Date(b.date || '1970-01-01');
  return dateB.getTime() - dateA.getTime();
});

// Step 5: Write back to file
fs.writeFileSync(videosPath, JSON.stringify(allVideos, null, 2) + '\n');

console.log('\n\n✅ Migration complete!');
console.log(`📊 Summary:`);
console.log(`   - Migrated ${playlists.length} playlist(s)`);
console.log(`   - Created ${createdCount} new video entry(ies)`);
console.log(`   - Total videos: ${allVideos.length}`);
console.log(`\n💾 Updated ${videosPath}`);
