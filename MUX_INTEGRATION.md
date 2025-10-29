# Mux Video Integration Guide

This document explains the Mux video integration added to Ladder Legends Academy.

## Overview

Mux is now integrated alongside YouTube for video hosting. You can:
- Upload videos directly to Mux from the admin panel
- Play Mux videos with secure signed URLs
- Keep existing YouTube videos working as before

## Features

### 1. Direct Video Uploads
- Coaches and owners can upload videos directly to Mux
- Videos are encoded in up to 1080p quality (basic tier)
- Files up to 5GB supported (Mux free tier limit)
- Upload progress tracking with automatic retries
- Uses UpChunk for reliable chunked uploads

### 2. Secure Playback
- All Mux videos use signed URLs for security
- Tokens expire after 24 hours
- Only authenticated users can watch videos

### 3. Dual Source Support
- Keep using YouTube for existing content
- Add new Mux videos for premium content
- Mix and match both sources in your library

## Configuration

### Environment Variables

The following environment variables are already configured in `.env.local`:

```bash
# Mux Video Platform
MUX_API_KEY=your-mux-token-id
MUX_SECRET=your-mux-token-secret
MUX_SIGNING_KEY_ID=your-signing-key-id
MUX_SIGNING_KEY_PRIVATE_KEY=your-signing-key-private-key
# Video quality: 'basic' (free tier) or 'plus' (paid tier)
MUX_VIDEO_QUALITY=basic
```

**Important:** The free tier uses `basic` video quality, which supports up to 1080p. If you upgrade to a paid plan, you can use `plus` for adaptive bitrate streaming.

**Note:** Mux recently updated their API terminology:
- `encoding_tier` → `video_quality`
- `baseline` → `basic`
- `smart` → `plus`

### Getting Signing Keys

If you haven't set up signing keys yet:

1. Go to [Mux Dashboard](https://dashboard.mux.com/)
2. Navigate to Settings → Signing Keys
3. Click "Generate Signing Key"
4. Copy the Key ID and Private Key to your `.env.local` file
5. Restart your dev server

### Webhook Setup (Optional but Recommended)

To receive notifications when videos finish processing:

1. Go to [Mux Dashboard](https://dashboard.mux.com/) → Settings → Webhooks
2. Add a new webhook URL: `https://your-domain.com/api/mux/webhook`
3. Set the webhook secret in `.env.local`:
   ```bash
   MUX_WEBHOOK_SECRET=your-webhook-secret
   ```

## Usage

### Uploading Videos

1. Go to the admin panel and click "New Video"
2. Fill in the video details (title, description, coach, etc.)
3. Select **"Mux (Upload)"** as the video source
4. Click "Select Video File" and choose your video
5. Wait for the upload to complete (progress bar will show status)
6. Once uploaded, the asset ID and playback ID will be automatically saved
7. Click "Save to Local Storage" and then commit your changes

### Playing Videos

Videos are automatically played with the correct player:
- YouTube videos use the YouTube iframe player
- Mux videos use the Mux Player with signed URLs

The system detects the source and renders the appropriate player automatically.

### Managing Videos

In the video edit modal:
- **YouTube videos**: Shows the YouTube ID input (existing behavior)
- **Mux videos**: Shows upload interface or uploaded video info
- You can switch between sources using the source selector

## API Endpoints

### POST /api/mux/upload
Creates a direct upload URL for video uploads.

**Request Body:**
```json
{
  "title": "Video Title",
  "description": "Video Description"
}
```

**Response:**
```json
{
  "uploadId": "xxx",
  "uploadUrl": "https://storage.googleapis.com/...",
  "message": "Upload URL created successfully"
}
```

### GET /api/mux/upload?uploadId=xxx
Checks the status of an upload.

**Response:**
```json
{
  "status": "asset_created",
  "assetId": "xxx",
  "error": null
}
```

### GET /api/mux/playback?playbackId=xxx
Generates a signed playback token for secure video viewing.

**Response:**
```json
{
  "playbackId": "xxx",
  "token": "eyJhbGc...",
  "expiresIn": "24h"
}
```

### POST /api/mux/playback
Gets asset information by asset ID.

**Request Body:**
```json
{
  "assetId": "xxx"
}
```

**Response:**
```json
{
  "assetId": "xxx",
  "playbackId": "xxx",
  "status": "ready",
  "duration": 123.45,
  "aspectRatio": "16:9",
  "resolution": "1080p"
}
```

### POST /api/mux/webhook
Receives webhook notifications from Mux about video processing status.

## Video Type Schema

The `Video` type now supports both YouTube and Mux:

```typescript
interface Video {
  id: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  race: VideoRace;
  coach?: string;
  coachId?: string;

  // Video source
  source?: 'youtube' | 'mux'; // defaults to 'youtube'

  // YouTube videos
  youtubeId?: string;
  youtubeIds?: string[];
  thumbnailVideoIndex?: number;

  // Mux videos
  muxPlaybackId?: string;
  muxAssetId?: string;
  muxAssetStatus?: 'preparing' | 'ready' | 'errored';

  thumbnail: string;
  isFree?: boolean;
}
```

## Helper Functions

Use these helper functions to work with videos:

```typescript
import { isMuxVideo, isYoutubeVideo, getVideoSource } from '@/types/video';

// Check if a video is from Mux
if (isMuxVideo(video)) {
  // Handle Mux video
}

// Check if a video is from YouTube
if (isYoutubeVideo(video)) {
  // Handle YouTube video
}

// Get the video source
const source = getVideoSource(video); // 'mux' | 'youtube'
```

## Components

### MuxVideoPlayer
Renders a Mux video with secure playback.

```tsx
import { MuxVideoPlayer } from '@/components/videos/mux-video-player';

<MuxVideoPlayer
  playbackId={video.muxPlaybackId}
  title={video.title}
  className="rounded-lg"
  autoPlay={false}
/>
```

### MuxUpload
Upload interface for admin panel (already integrated in video-edit-modal).

```tsx
import { MuxUpload } from '@/components/admin/mux-upload';

<MuxUpload
  onUploadComplete={(assetId, playbackId) => {
    // Handle upload completion
  }}
  title="Video Title"
  description="Video Description"
/>
```

## Mux Free Tier Limits

The Mux free tier includes:
- ✅ 10 videos (total storage)
- ✅ Basic video quality (up to 1080p resolution)
- ✅ 100 GB of video delivery per month
- ✅ Standard features (signed URLs, thumbnails)

**Video Quality Levels:**
- **basic** (free): Videos encoded up to 1080p resolution
- **plus** (paid): Adaptive bitrate streaming with multiple quality levels

**Note:** Mux previously called these "encoding tiers" with "baseline" and "smart" options. The functionality is the same, just with updated naming.

If you need more videos or advanced features, you'll need to upgrade your Mux plan.

## Upload Reliability with UpChunk

The integration uses **UpChunk**, Mux's official upload library, which provides:

- ✅ **Chunked uploads**: Large files are split into manageable chunks
- ✅ **Automatic retries**: Network issues are handled automatically
- ✅ **Resume capability**: Interrupted uploads can resume from where they left off
- ✅ **Progress tracking**: Real-time upload progress updates
- ✅ **Better performance**: Optimized for large video files

UpChunk is configured with 30MB chunks, which is the recommended size for optimal performance.

## Troubleshooting

### Upload fails with "Unauthorized"
- Make sure you're logged in as a coach or owner
- Check that your session hasn't expired

### Video won't play
- Ensure signing keys are properly configured in `.env.local`
- Check that the playback ID is correct
- Verify the video status is 'ready' (not 'preparing' or 'errored')

### Upload gets stuck at "Processing"
- Video processing can take several minutes depending on file size
- Check the Mux dashboard for asset status
- If processing fails, you'll see an error in the webhook logs

### "Mux signing keys not configured" error
- You need to create signing keys in the Mux dashboard
- Add them to your `.env.local` file
- Restart your dev server

### "Invalid encoding tier" or "Invalid parameters" errors
- Mux updated their API in 2024/2025
- Make sure you're using `video_quality` (not `encoding_tier`)
- Use `basic` for free tier (not `baseline`)
- Use `plus` for paid tier (not `smart`)
- Check that `MUX_VIDEO_QUALITY=basic` is set in `.env.local`

## Development Notes

### Testing Uploads
To test the upload flow:
1. Start the dev server: `npm run dev`
2. Log in with coach/owner permissions
3. Go to the library page
4. Click "New Video"
5. Select "Mux (Upload)" as the source
6. Upload a small test video file

### Webhook Testing Locally
To test webhooks locally, use a tool like ngrok:
```bash
ngrok http 3000
```
Then use the ngrok URL in your Mux webhook settings.

## Next Steps

Consider these enhancements:
- [ ] Add thumbnail customization for Mux videos
- [ ] Implement video analytics dashboard using Mux Data
- [ ] Add video transcription/captions support
- [ ] Implement video preview/scrubbing on hover
- [ ] Add download protection (disable MP4 downloads)
- [ ] Implement multi-quality streaming (auto, 720p, 1080p)

## Support

For Mux-related issues:
- [Mux Documentation](https://docs.mux.com/)
- [Mux Support](https://www.mux.com/support)
- [Mux Community Discord](https://discord.gg/mux)
