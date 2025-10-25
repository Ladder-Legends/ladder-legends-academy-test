# SC2 Replay Analysis Integration

This document describes the SC2 replay analysis integration that automatically extracts metadata and build orders from StarCraft 2 replay files.

## Overview

The replay analysis system consists of three main components:

1. **Flask API** (`sc2reader` API) - Analyzes .SC2Replay files and extracts:
   - Game metadata (map, duration, date, patch, etc.)
   - Player information (names, races, MMR, APM, results)
   - Build orders for each player (supply, time, actions)

2. **Next.js API Route** (`/api/analyze-replay`) - Serverless proxy that:
   - Secures the Flask API key on the server side
   - Validates uploaded replay files
   - Forwards requests to the Flask API
   - Returns analysis results to the client

3. **TypeScript Client Library** (`src/lib/sc2reader-client.ts`) - Provides:
   - Type-safe API client
   - Utility functions for formatting data
   - Error handling

## Setup

### 1. Flask API Setup

The Flask API should be running separately. See the `sc2reader` project for setup instructions.

```bash
# In the sc2reader project directory
python api.py
```

The API runs on `http://localhost:8000` by default.

### 2. Environment Variables

Add these variables to your `.env.local`:

```bash
# SC2 Replay Analyzer API (Flask API for parsing replay files)
SC2READER_API_URL=http://localhost:8000
SC2READER_API_KEY=your-secret-key-change-this
```

**Important:** Keep `SC2READER_API_KEY` secure. It should match the `API_SECRET` in the Flask API's `.env` file.

### 3. NextJS Integration

The integration is already implemented in:
- `src/app/api/analyze-replay/route.ts` - API proxy
- `src/lib/sc2reader-client.ts` - Client library
- `src/components/admin/replay-edit-modal.tsx` - Replay metadata import
- `src/components/admin/build-order-edit-modal.tsx` - Build order import

## Features

### 1. Replay Metadata Auto-Fill

When editing or creating a replay in the admin CMS:

1. **Upload Replay File**
   - Click "Upload File" in the Replay Edit Modal
   - Select a `.SC2Replay` file (max 5MB)
   - File is uploaded to Vercel Blob storage

2. **Analyze Replay**
   - After upload, click "Analyze Replay & Auto-Fill"
   - System extracts metadata from the replay
   - Form fields are automatically populated:
     - **Title**: Generated from player names
     - **Map**: Map name
     - **Matchup**: Calculated from player races (e.g., TvP)
     - **Players**: Names, races, results, MMR
     - **Duration**: Game length in MM:SS format
     - **Game Date**: When the game was played
     - **Patch**: SC2 version/patch

3. **Edit & Save**
   - Review auto-filled data
   - Make any necessary edits
   - Add tags, notes, coach, etc.
   - Save to local storage → Commit to GitHub

### 2. Build Order Import from Replay

When creating or editing a build order:

1. **Upload Replay for Analysis**
   - In the "Import from Replay" section
   - Click "Upload Replay to Import Build Order"
   - Select a `.SC2Replay` file

2. **Select Player**
   - After analysis, two player cards appear
   - Each shows: Name, Race, Result, APM
   - Click a player card to import their build order

3. **Auto-Populated Data**
   - **Build Order Name**: Generated from player name and map
   - **Race**: Player's race
   - **Patch**: SC2 version
   - **Steps**: Complete build order with:
     - Supply count
     - Time (MM:SS format)
     - Action (unit/building/upgrade)

4. **Edit Steps**
   - Steps are fully editable after import
   - Add notes to individual steps
   - Reorder steps using up/down arrows
   - Add or remove steps manually

### 3. Build Order Step Filtering

The system automatically filters out:
- **Unknown events**: Events without identifiable actions
- **Spray events**: Cosmetic sprays (e.g., "SprayTerran")
- **First 12 workers**: Initial game setup
- **Events before 1 second**: Game initialization

This ensures clean, relevant build orders.

## API Reference

### POST /api/analyze-replay

Analyzes a .SC2Replay file and returns metadata and build orders.

**Request:**
```typescript
FormData {
  file: File  // .SC2Replay file
}
```

**Response:**
```typescript
{
  filename: string;
  metadata: {
    map_name: string;
    game_length: string;
    game_length_seconds: number;
    date: string;
    patch: string;
    release_string: string;
    winner: string;
    loser: string;
    players: [
      {
        name: string;
        race: "Terran" | "Zerg" | "Protoss";
        result: "Win" | "Loss";
        mmr: number | null;
        apm: number | null;
        highest_league: number | null;
      }
    ];
  };
  build_orders: {
    [playerName: string]: [
      {
        time: string;        // seconds as string
        supply: number;
        event: "unit_born" | "building_started" | "morph_complete" | "upgrade";
        unit?: string;       // e.g., "Marine", "Barracks"
        upgrade?: string;    // e.g., "Stim Pack"
      }
    ];
  };
}
```

**Error Responses:**
- `400` - Invalid file type or missing file
- `401` - Unauthorized (requires coach/owner permissions)
- `422` - Failed to parse replay (corrupted file)
- `502` - Flask API error

## TypeScript Client Usage

```typescript
import { SC2ReplayAPIClient, convertToBuildOrderSteps } from '@/lib/sc2reader-client';

// Create client (uses environment variables)
const client = new SC2ReplayAPIClient();

// Analyze replay
const result = await client.analyzeReplay(file);

// Convert to build order steps
const steps = convertToBuildOrderSteps(result.build_orders['PlayerName']);

// Format time
import { formatReplayTime } from '@/lib/sc2reader-client';
const timeStr = formatReplayTime(123);  // "2:03"

// Normalize race
import { normalizeRace } from '@/lib/sc2reader-client';
const race = normalizeRace('Terran');  // "terran"

// Determine matchup
import { determineMatchup } from '@/lib/sc2reader-client';
const matchup = determineMatchup('Terran', 'Protoss');  // "TvP"
```

## Supply Tracking

The system accurately tracks supply throughout the game:

- **Initial supply**: Starts at 12 (initial workers)
- **Units**: Supply counted when unit completes (UnitBornEvent)
- **Buildings**: Supply counted when construction starts (UnitInitEvent)
- **Morphed units**: Special handling for units like Archons (supply doesn't change)
- **Deaths**: Supply freed when units die (UnitDiedEvent)
- **Transformations**: Siege tanks, burrowed units, etc. don't change supply

## Troubleshooting

### "Failed to analyze replay"

**Cause**: Flask API is not running or unreachable

**Solution**:
1. Start the Flask API: `cd sc2reader && python api.py`
2. Verify it's accessible: `curl http://localhost:8000/health`
3. Check `SC2READER_API_URL` in `.env.local`

### "Authentication failed with replay analyzer API"

**Cause**: API key mismatch

**Solution**:
1. Check `SC2READER_API_KEY` in NextJS `.env.local`
2. Check `API_SECRET` in Flask API `.env`
3. Ensure both match exactly

### "Failed to parse replay file"

**Cause**: Corrupted or invalid replay file

**Solution**:
1. Verify file is a valid `.SC2Replay` file
2. Try opening the replay in SC2 to verify it's not corrupted
3. Ensure file is under 5MB

### Empty or Missing Data

**Cause**: Not all replays contain all data fields (especially MMR)

**Expected Behavior**:
- MMR may be `null` for non-ladder games
- APM is calculated from player actions
- Some replays may have partial data

## Production Deployment

### Vercel Deployment

1. **Environment Variables**:
   ```bash
   SC2READER_API_URL=https://your-flask-api.com
   SC2READER_API_KEY=your-production-api-key
   ```

2. **Flask API Hosting**:
   - Deploy Flask API separately (e.g., Railway, Render, AWS)
   - Ensure it's publicly accessible
   - Use HTTPS in production
   - Set strong API_SECRET

3. **CORS Configuration** (if needed):
   - Flask API may need CORS headers for browser requests
   - NextJS API route acts as proxy, so CORS may not be needed

## File Storage Flow

1. **Upload**: User uploads `.SC2Replay` → Vercel Blob Storage
2. **Analysis**: File is analyzed via `/api/analyze-replay`
3. **Temporary Storage**: Analysis results stored in component state
4. **Save Decision**:
   - **If saved**: Replay stays in Vercel Blob, metadata committed to GitHub
   - **If cancelled**: Replay deleted from Vercel Blob via `/api/delete-replay`

## Security Considerations

1. **API Key**: Never expose `SC2READER_API_KEY` to the client
2. **Authentication**: Only coaches and owners can analyze replays
3. **File Validation**: Max 5MB, `.SC2Replay` extension only
4. **Rate Limiting**: Consider adding rate limits to `/api/analyze-replay`
5. **Blob Storage**: Files are publicly accessible via URL (by design)

## Future Enhancements

Potential improvements:

1. **Batch Analysis**: Analyze multiple replays at once
2. **Build Order Comparison**: Compare build orders across replays
3. **Advanced Filters**: Filter builds by supply/time ranges
4. **Replay Search**: Search replays by build order characteristics
5. **Caching**: Cache analysis results to reduce API calls
6. **Background Processing**: Queue analysis jobs for large files

## Support

For issues or questions:
- Flask API issues: Check the `sc2reader` project documentation
- NextJS integration issues: Check this file or the component source code
- Replay parsing issues: Verify with `python test_api.py` in sc2reader project
