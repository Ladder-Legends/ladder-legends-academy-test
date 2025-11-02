import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read videos.json
const videosPath = path.join(__dirname, '../src/data/videos.json');
const videos = JSON.parse(fs.readFileSync(videosPath, 'utf-8'));

console.log('🔍 Analyzing playlists...\n');

// Find all playlists
const playlists = videos.filter(v => v.source === 'playlist');
console.log(`📊 Total playlists: ${playlists.length}\n`);

// Find single-video playlists
const singleVideoPlaylists = playlists.filter(p => p.videoIds && p.videoIds.length === 1);
console.log(`⚠️  Single-video playlists: ${singleVideoPlaylists.length}\n`);

if (singleVideoPlaylists.length === 0) {
  console.log('✅ No single-video playlists found!');
  process.exit(0);
}

console.log('Single-video playlists:\n');
singleVideoPlaylists.forEach(playlist => {
  const referencedVideoId = playlist.videoIds[0];
  const referencedVideo = videos.find(v => v.id === referencedVideoId);

  console.log(`📝 ${playlist.title} (${playlist.id})`);
  console.log(`   References: ${referencedVideoId}`);
  if (referencedVideo) {
    console.log(`   ✅ Referenced video exists: "${referencedVideo.title}"`);
  } else {
    console.log(`   ❌ Referenced video NOT found`);
  }
  console.log('');
});

// Suggest action
console.log('\n💡 Recommendation:');
console.log('   - Remove these single-video playlists since the actual videos exist');
console.log('   - This will clean up the duplicate entries');

// Create fixed videos array
const fixedVideos = videos.filter(v => {
  // Remove single-video playlists
  if (v.source === 'playlist' && v.videoIds && v.videoIds.length === 1) {
    return false;
  }
  return true;
});

console.log(`\n📊 Before: ${videos.length} videos`);
console.log(`📊 After:  ${fixedVideos.length} videos`);
console.log(`🗑️  Removed: ${videos.length - fixedVideos.length} single-video playlists`);

// Ask for confirmation
console.log('\n⚠️  To apply these changes, the script will update videos.json');
console.log('   Run with --apply flag to make changes');

if (process.argv.includes('--apply')) {
  fs.writeFileSync(videosPath, JSON.stringify(fixedVideos, null, 2));
  console.log('\n✅ Changes applied to videos.json');
} else {
  console.log('\n💾 No changes made (dry run)');
  console.log('   Run: node scripts/fix-single-video-playlists.mjs --apply');
}
