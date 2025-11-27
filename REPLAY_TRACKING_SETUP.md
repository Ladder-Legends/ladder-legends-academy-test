# Replay Tracking System - Setup Instructions

This document provides complete setup instructions for the Replay Tracking System.

## Overview

The Replay Tracking System allows users to:
- Upload .SC2Replay files
- Auto-detect build orders (fingerprint-based, no hardcoded rules)
- Compare execution to coach benchmarks
- Track improvement over time
- Get comprehensive analysis (timings, composition, tactics, micro)

## Architecture

```
┌─────────────────┐
│  User Browser   │
│  (Next.js App)  │
└────────┬────────┘
         │
         ├─► /api/my-replays (Next.js API)
         │   └─► sc2reader API (FastAPI)
         │       ├─► /fingerprint
         │       ├─► /detect-build
         │       ├─► /compare
         │       └─► /builds
         │
         └─► Vercel KV (Redis)
             └─► user:{id}:replays
```

## Part 1: sc2reader API Setup

### 1. Navigate to sc2reader project

```bash
cd /Users/chadfurman/projects/sc2reader
git checkout feature/replay-tracking-system
```

### 2. Install Python dependencies

```bash
pip3 install -r requirements.txt
# Required: fastapi, uvicorn, sc2reader, python-dotenv
```

### 3. Configure environment

Create `.env` file (copy from `.env.example`):
```env
API_SECRET=<your-api-secret-here>
```

### 4. Start the API server

```bash
python3 api.py
```

Server will run on `http://localhost:8000`

### 5. Verify API is working

```bash
curl -X GET "http://localhost:8000/builds" \
  -H "X-API-Key: $SC2READER_API_KEY"
```

Should return:
```json
{
  "builds": [
    {
      "id": "learned_tvp_speed_banshee_mech",
      "name": "Speed Banshee Mech",
      "matchup": "TvP",
      "num_examples": 1
    }
  ],
  "total": 1
}
```

## Part 2: ladder-legends-academy Setup

### 1. Navigate to academy project

```bash
cd /Users/chadfurman/projects/ladder-legends-academy
git checkout feature/replay-tracking-system
```

### 2. Install Node dependencies

```bash
npm install
# This will install @vercel/kv and nanoid
```

### 3. Configure environment variables

Add to `.env.local`:

```env
# sc2reader API
NEXT_PUBLIC_SC2READER_API_URL=http://localhost:8000
SC2READER_API_KEY=<your-api-key-here>

# Vercel KV (for local development, use mock or skip)
# These will be added automatically when deploying to Vercel
# KV_REST_API_URL=<your-kv-url>
# KV_REST_API_TOKEN=<your-kv-token>

# PostHog (already configured)
NEXT_PUBLIC_POSTHOG_KEY=<your-posthog-key>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 4. Start the development server

```bash
npm run dev
```

App will run on `http://localhost:3000`

### 5. Access the replay tracking pages

- Upload: http://localhost:3000/my-replays/upload
- List: http://localhost:3000/my-replays
- Detail: http://localhost:3000/my-replays/[id]

## Part 3: Access Control Setup

### Option 1: PostHog Feature Flag

1. Go to PostHog dashboard
2. Create new feature flag: `replay_tracking`
3. Enable for specific users or percentage rollout
4. Users with flag enabled will have access

### Option 2: Discord ID Whitelist

1. Edit `/Users/chadfurman/projects/ladder-legends-academy/src/lib/hooks/use-replay-tracking-access.ts`
2. Add Discord user IDs to whitelist:

```typescript
const REPLAY_TRACKING_WHITELIST = [
  '123456789012345678', // User 1
  '987654321098765432', // User 2
  // Add more IDs here
];
```

3. Save and restart dev server

### Option 3: Both (Recommended)

Use both PostHog feature flag AND whitelist. Users need either one to access.

## Part 4: Vercel Deployment

### 1. Deploy sc2reader API

**Option A: Deploy to separate service (Railway, Render, Fly.io)**

1. Create new Python app
2. Set environment variable: `API_SECRET`
3. Deploy from `feature/replay-tracking-system` branch
4. Note the deployed URL

**Option B: Deploy to Vercel as separate project**

1. Create new Vercel project for sc2reader
2. Configure as Python app with FastAPI
3. Set environment variables
4. Deploy

### 2. Set up Vercel KV

1. Go to Vercel dashboard → your ladder-legends-academy project
2. Navigate to Storage tab
3. Create new KV database
4. Vercel will automatically add these env vars:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### 3. Update environment variables

In Vercel dashboard for ladder-legends-academy:

```env
NEXT_PUBLIC_SC2READER_API_URL=https://your-sc2reader-api.com
SC2READER_API_KEY=<your-production-api-key>
# KV vars are auto-added by Vercel
```

### 4. Deploy ladder-legends-academy

```bash
git push origin feature/replay-tracking-system
```

Create pull request and merge to main, or deploy directly from feature branch.

## Part 5: Testing

### Local Testing (Both servers running)

1. Start sc2reader API:
   ```bash
   cd /Users/chadfurman/projects/sc2reader
   python3 api.py
   ```

2. Start academy in another terminal:
   ```bash
   cd /Users/chadfurman/projects/ladder-legends-academy
   npm run dev
   ```

3. Test upload flow:
   - Navigate to http://localhost:3000/my-replays/upload
   - Upload a .SC2Replay file (e.g., `lotus_vs_guigui_1.SC2Replay`)
   - Wait for analysis (10-30 seconds)
   - Verify detection results
   - Check execution score if comparing to target build

4. Test list page:
   - Navigate to http://localhost:3000/my-replays
   - Verify replay appears in list
   - Check stats dashboard

5. Test detail page:
   - Click on a replay
   - Verify all sections display correctly:
     - Build detection
     - Execution score
     - Timing comparison
     - Army composition
     - Tactical events
     - Micro stats

### Production Testing

Same flow as local, but use production URLs.

## Part 6: Adding New Builds

To add a new learned build:

1. Collect 3-5 example replays of the build
2. Place in `/Users/chadfurman/projects/sc2reader/`
3. Run learning script:
   ```bash
   python3 learn_build.py \
     replay1.SC2Replay \
     replay2.SC2Replay \
     replay3.SC2Replay \
     --name "Build Name" \
     --matchup "TvZ" \
     --output benchmarks/learned_tvz_build_name.json
   ```

4. Restart sc2reader API
5. New build will appear in `/api/builds` endpoint
6. Users can now select it as target build when uploading

## Troubleshooting

### sc2reader API not responding

```bash
# Check if running
lsof -i :8000

# Check logs
tail -f api.log  # if logging configured
```

### KV storage not working

```bash
# Check KV connection (in Vercel dashboard logs)
# Verify env vars are set correctly
```

### Builds not detected

```bash
# Verify benchmarks exist
ls benchmarks/learned_*.json

# Test fingerprint extraction directly
python3 fingerprint_enhanced.py your_replay.SC2Replay
```

### Upload failing

- Check sc2reader API is running and accessible
- Verify API key matches in both projects
- Check browser console for errors
- Verify file is valid .SC2Replay format

## File Structure Reference

### sc2reader project
```
sc2reader/
├── api.py                          # FastAPI server with all endpoints
├── fingerprint_enhanced.py         # Comprehensive feature extraction
├── detect_build_fingerprint.py     # Build detection logic
├── learn_build.py                  # Learning from examples
├── test_api.py                     # API test script
└── benchmarks/
    └── learned_*.json              # Learned build fingerprints
```

### ladder-legends-academy project
```
ladder-legends-academy/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── my-replays/route.ts       # Upload, list, delete
│   │   │   └── builds/route.ts           # List builds
│   │   └── my-replays/
│   │       ├── page.tsx                  # List page
│   │       ├── upload/page.tsx           # Upload page
│   │       └── [id]/page.tsx             # Detail page
│   └── lib/
│       ├── replay-types.ts               # TypeScript types
│       ├── replay-kv.ts                  # KV client
│       ├── sc2reader-client.ts           # API client
│       └── hooks/
│           └── use-replay-tracking-access.ts  # Access control
├── IMPLEMENTATION_STATUS.md
└── REPLAY_TRACKING_SETUP.md (this file)
```

## Support

For issues or questions:
- Check IMPLEMENTATION_STATUS.md for current status
- Review sc2reader API logs
- Check browser console for frontend errors
- Verify all environment variables are set correctly
