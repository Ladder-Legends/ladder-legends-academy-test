# Storage Architecture

This document describes how data is stored across Vercel KV, Vercel Blob, and JSON files.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STORAGE LAYERS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Vercel KV (Redis)                 Vercel Blob                     │
│   ├── User replay metadata          ├── Replay files (.SC2Replay)  │
│   ├── User settings                 ├── Hash manifests             │
│   ├── Replay indexes                └── Coach fingerprints         │
│   └── Device auth codes                                             │
│                                                                     │
│   JSON Files (Git-versioned)                                        │
│   ├── src/data/videos.json                                          │
│   ├── src/data/coaches.json                                         │
│   ├── src/data/replays.json (coach replays only)                    │
│   ├── src/data/build-orders.json                                    │
│   └── src/data/events.json                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Vercel KV (Redis) - User Data

### Key Patterns

| Key Pattern | Type | Description |
|-------------|------|-------------|
| `user:{discordId}:replays` | `string[]` | List of replay IDs for user |
| `user:{discordId}:replay:{replayId}` | `UserReplayData` | Full replay metadata |
| `user:{discordId}:replay-index` | `ReplayIndex` | Lightweight index for list view |
| `user:{discordId}:settings` | `UserSettings` | User preferences |
| `user:{discordId}:references` | `Reference[]` | Reference builds per matchup |
| `device:{deviceCode}` | `DeviceCode` | Device auth flow |
| `user:{userCode}` | `DeviceCode` | Device auth flow (user code lookup) |

### UserReplayData Structure

```typescript
interface UserReplayData {
  id: string;                          // nanoid
  discord_user_id: string;
  uploaded_at: string;                 // ISO date
  filename: string;
  blob_url?: string;                   // Vercel Blob URL

  // Classification
  game_type?: string;                  // "1v1-ladder", "2v2-ladder", etc.
  region?: string;                     // "NA", "EU", "KR", "CN"
  player_name?: string;                // User's player name in this replay

  // Game metadata
  game_metadata?: {
    map: string;
    duration: number;                  // Seconds
    game_date: string;                 // ISO date
    game_type: string;
    category: string;
    patch: string;
    winner: string | null;
    loser: string | null;
  };

  // Analysis
  fingerprint?: ReplayFingerprint;     // Full fingerprint (see below)
  player_fingerprints?: Record<string, ReplayFingerprint>;  // All players
  suggested_player?: string;

  // Build detection
  detection?: BuildDetection;
  comparison?: BuildComparison;
  target_build_id?: string;
}
```

### ReplayFingerprint Structure (Key Fields)

```typescript
interface ReplayFingerprint {
  race: string;
  player_name: string;
  all_players: PlayerInfo[];

  metadata: {
    duration: number;
    map_name: string;
    // ...
  };

  economy: {
    // Supply management
    total_supply_block_time: number;    // Total seconds blocked
    supply_block_count: number;         // Number of block events
    supply_block_periods?: Array<{      // Detailed timeline
      start: number;
      end: number;
      duration: number;
    }>;

    // Production (per building)
    production_by_building?: Record<string, {
      idle_seconds: number;
      units_produced: number;
    }>;

    // ★ PHASES DATA ★ (for army supply/min calculation)
    phases?: Record<string, {
      phase: string;                    // "opening", "early", "mid", "late"
      end_time: number;
      worker_count: number;
      base_count: number;
      gas_buildings: number;
      total_army_supply_produced: number;  // ★ Key metric
      units_produced: Record<string, number>;
      production_buildings: Record<string, number>;  // ★ For theoretical max
      tech_buildings: string[];
      upgrades_completed: string[];
      upgrades_in_progress: string[];
      supply_blocks_in_phase: number;
      supply_block_time_in_phase: number;
    }>;

    // Macro ability tracking
    mule_count?: number;
    mule_possible?: number;
    mule_efficiency?: number;
    inject_efficiency?: number;
    chrono_efficiency?: number;

    // Resource snapshots
    supply_at_checkpoints?: Record<number, number>;
  };

  // Other sections: timings, sequences, army_composition, tactical, micro, etc.
}
```

### ReplayIndex Structure

Lightweight index for fast list views (one KV read instead of N):

```typescript
interface ReplayIndex {
  version: number;                     // Timestamp for staleness check
  last_updated: string;                // ISO date
  replay_count: number;
  entries: ReplayIndexEntry[];
}

interface ReplayIndexEntry {
  id: string;
  filename: string;
  uploaded_at: string;
  game_date?: string;
  map?: string;
  duration?: number;

  // Player info (for filtering)
  player_name?: string;
  player_race?: string;
  player_mmr?: number;

  // Opponent info (for nemesis tracking)
  opponent_name?: string;
  opponent_race?: string;
  opponent_mmr?: number;

  // Result
  result?: "Win" | "Loss" | "Tie";

  // Classification
  game_type?: string;
  matchup?: string;                    // e.g., "TvZ"
}
```

---

## Vercel Blob - Binary Storage

### Directory Structure

```
vercel-blob/
├── replays/                           # User replay files
│   └── {discordId}/
│       └── {replayId}/
│           └── {filename}.SC2Replay
│
├── replay-hashes/                     # Hash manifests for deduplication
│   └── {discordId}.json
│
└── coach-fingerprints/                # Coach replay fingerprints
    └── {replayId}.json
```

### Hash Manifest Structure

Prevents duplicate uploads across devices:

```typescript
interface HashManifest {
  discord_user_id: string;
  manifest_version: number;           // Incremented on changes
  updated_at: string;                 // ISO date
  total_count: number;

  hashes: Record<string, {            // SHA-256 hash → entry
    filename: string;
    file_size: number;
    uploaded_at: string;
    replay_id: string;
  }>;
}
```

The uploader app checks manifest version and syncs hashes to avoid re-uploading.

---

## JSON Files - CMS Content

### Videos (`src/data/videos.json`)

```typescript
interface Video {
  id: string;
  title: string;
  description: string;
  coachId: string;
  muxPlaybackId?: string;             // Mux video
  youtubeId?: string;                 // Legacy YouTube
  duration: number;
  thumbnail?: string;
  tags: string[];
  category: string;
  race: string;
  isFree: boolean;
  createdAt: string;
}
```

### Coaches (`src/data/coaches.json`)

```typescript
interface Coach {
  id: string;
  name: string;
  tag: string;                        // e.g., "Terran Coach"
  bio: string;
  race: string;
  avatar: string;                     // URL
  specialties: string[];
  socials: {
    twitter?: string;
    twitch?: string;
    youtube?: string;
  };
  bookingUrl?: string;                // Premium feature
}
```

### Coach Replays (`src/data/replays.json`)

```typescript
interface CoachReplay {
  id: string;
  title: string;
  coachId: string;
  downloadUrl?: string;               // Blob URL
  player1: { name: string; race: string; result: string };
  player2: { name: string; race: string; result: string };
  description: string;
  category: string;
  tags: string[];
}
```

---

## Data Relationships

```
User (Discord ID)
├── Settings (user:{id}:settings)
├── References (user:{id}:references)
├── Replay Index (user:{id}:replay-index)
├── Replays List (user:{id}:replays)
│   └── Replay IDs → user:{id}:replay:{replayId}
│       └── blob_url → Vercel Blob file
└── Hash Manifest (replay-hashes/{id}.json)
    └── SHA-256 hashes → replay_ids
```

---

## Important Notes

### Why Phases Data Matters

The `phases` field in `fingerprint.economy` is **critical** for the Production pillar:

1. `total_army_supply_produced` - Cumulative army supply at phase end
2. `production_buildings` - Building counts at phase end

These are used to calculate:
- **Actual supply/min** = total_army_supply / game_duration_min
- **Theoretical max** = Σ(building_count × supply_rate)
- **Efficiency** = actual / theoretical × 100%

### Remetrics Script Consideration

The `scripts/remetrics-replays.ts` currently merges:
- ✅ `production_by_building` (old idle time metric)
- ✅ `supply_block_periods` (supply timeline)
- ❌ `phases` (NOT currently merged - needs update)

For existing replays to show the new army supply/min metric, the remetrics script needs to also merge phases data.

### Index vs Full Data

- **Index** (~500 bytes per entry): Use for list view, filtering, sorting
- **Full data** (~10KB per entry): Use for detail view, analysis

Pattern: Load index on page load, lazy-load full data when user clicks.
