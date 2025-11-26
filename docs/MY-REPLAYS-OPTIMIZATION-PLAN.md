# My Replays Optimization Plan

## Current Problems (November 2025)

### 1. Missing Production Idle Time Data
- **Symptom**: Production pillar shows "Based on execution" instead of actual idle time
- **Cause**: sc2reader has production tracking code but it's not integrated into fingerprint output
- **Impact**: Users can't see actual production idle metrics

### 2. Massive API Response Size
- **Current**: `/api/my-replays` returns ~1.5MB for 35 replays
- **Per replay**: ~40KB average (includes full fingerprint, build_order, sequences, etc.)
- **Impact**: Slow page loads, high Vercel compute costs, poor mobile experience

### 3. Double API Calls
- **Symptom**: Network tab shows 2x calls to `/api/my-replays` and `/api/settings`
- **Possible causes**:
  - React Strict Mode (dev only)
  - Multiple components fetching independently
  - Missing request deduplication
- **Impact**: 2x bandwidth, 2x Vercel compute costs

### 4. No Client-Side Caching
- **Current**: Every page load fetches all replay data fresh
- **Impact**: Unnecessary Vercel compute costs, slow repeat visits

---

## Solution Architecture

### Phase 1: Fix Production Idle Time ✅ COMPLETE (2025-11-26)

**Solution**: Merge production metrics in Academy API (instead of modifying sc2reader)

The sc2reader `/metrics` endpoint already returns `production_by_building` and
`supply_block_events` at the player level (from `ReplayProcessor`), but this data
wasn't being merged into `fingerprint.economy` when storing replays.

**Changes made**:
1. Updated `PlayerMetrics` type in `src/lib/replay-types.ts` to include:
   - `production_by_building` - Per-building idle times
   - `supply_block_events` - Supply block timestamps
   - Other enhanced metrics

2. Modified `/api/my-replays/route.ts` to merge processor data into fingerprint:
   ```typescript
   // Merge production_by_building from processor into fingerprint.economy
   if (playerData.production_by_building && fp.economy) {
     fp.economy = {
       ...fp.economy,
       production_by_building: playerData.production_by_building,
     };
   }
   ```

**Result**: New replay uploads will include production idle time data.
Existing replays need the re-metrics script to backfill this data (see below).

**UI graceful handling** (also completed):
- Three Pillars shows "Based on execution" when score exists but no time data
- Performance Trends hides NaN values with `Number.isFinite()` checks
- Toggle buttons now use `bg-primary text-primary-foreground` for visibility

---

### Phase 1b: Unified Re-Metrics & Cleanup Architecture ✅ UPDATED (2025-11-26)

**Architecture Decision**: All replay files MUST be stored in Vercel Blob. This includes:
- User replays uploaded via desktop uploader
- Coach replays uploaded via CMS/admin interface

Replays without `blob_url` cannot be re-indexed and must be cleaned up.

---

#### Implementation Checklist

**Core Script (`scripts/remetrics-replays.ts`)**:
- [x] Create unified script that handles BOTH user and coach replays
- [x] Remove `--local` flag (only operate on remote blob storage)
- [x] Add `--coach` flag to process coach replays from JSON/Blob
- [x] Add `--cleanup` mode to delete replays without blob_url
- [x] Bump `manifest_version` on cleanup to trigger uploader re-sync

**User Replay Processing**:
- [x] Fetch replays from Vercel KV by user ID
- [x] Download replay file from `blob_url`
- [x] Call sc2reader `/metrics` endpoint for production data
- [x] Merge production metrics into fingerprint
- [x] Update replay in KV with enhanced fingerprint
- [x] Update replay index entry
- [x] Handle replays without `blob_url` (skip in re-metrics, delete in cleanup)

**Coach Replay Processing**:
- [x] Read replays from `src/data/replays.json`
- [x] Download replay file from `downloadUrl` (Vercel Blob)
- [x] Call sc2reader `/fingerprint-all` endpoint for all player fingerprints
- [x] Store fingerprints in Vercel Blob at `coach-fingerprints/{replayId}.json`
- [x] Do NOT modify `src/data/replays.json` (avoids static build bloat)

**Hash Manifest Versioning**:
- [x] Add `manifest_version` field to `HashManifest` interface
- [x] Add `removeHashesAndBumpVersion()` method to hash manifest manager
- [x] Return `manifest_version` in `/api/my-replays/check-hashes` response
- [ ] Update uploader to detect version mismatch and re-sync (pending)

**CMS Auto-Fingerprinting (Future)**:
- [ ] Add fingerprint extraction when coaches upload replays via CMS
- [ ] Store fingerprints in blob automatically on save
- [ ] Create `/api/coach-fingerprints/{replayId}` endpoint for retrieval

---

#### Script: `scripts/remetrics-replays.ts`

**Purpose**: Unified re-metrics for ALL replay types (user + coach)

**Modes**:
1. **Re-metrics mode (default)**: Extract metrics from blob-stored replays
2. **Cleanup mode (`--cleanup`)**: Delete replays without `blob_url`
3. **Coach mode (`--coach`)**: Process coach replays, store fingerprints in blob

**Prerequisites**:

1. **sc2reader must be running** (for re-metrics mode):
   ```bash
   cd /Users/chadfurman/projects/sc2reader
   python api/index.py
   ```

2. **Environment variables** (in `.env.local`):
   ```bash
   SC2READER_API_URL=http://localhost:8000
   SC2READER_API_KEY=your-api-key
   UPSTASH_REDIS_KV_REST_API_URL=...
   UPSTASH_REDIS_KV_REST_API_TOKEN=...
   BLOB_READ_WRITE_TOKEN=...
   ```

**Usage**:

```bash
cd ladder-legends-academy

# === USER REPLAY RE-METRICS (add production data) ===

# Dry run - preview what would be updated
npx tsx scripts/remetrics-replays.ts

# Test on 2 replays
npx tsx scripts/remetrics-replays.ts --limit 2 --execute

# Update ALL replays for default user
npx tsx scripts/remetrics-replays.ts --execute

# Update specific user's replays
npx tsx scripts/remetrics-replays.ts --user 987654321 --execute

# Update ALL users
npx tsx scripts/remetrics-replays.ts --all-users --execute

# === COACH REPLAY FINGERPRINTS (store in blob) ===

# Preview what would be fingerprinted
npx tsx scripts/remetrics-replays.ts --coach

# Test on 2 coach replays
npx tsx scripts/remetrics-replays.ts --coach --limit 2 --execute

# Fingerprint ALL coach replays
npx tsx scripts/remetrics-replays.ts --coach --execute

# Fingerprint specific coach replay
npx tsx scripts/remetrics-replays.ts --coach --replay-id replay-123 --execute

# === CLEANUP MODE (delete replays without blob_url) ===

# Preview what would be deleted
npx tsx scripts/remetrics-replays.ts --cleanup

# Actually delete and trigger uploader re-sync
npx tsx scripts/remetrics-replays.ts --cleanup --execute

# Cleanup all users
npx tsx scripts/remetrics-replays.ts --cleanup --all-users --execute
```

**Command Line Flags**:

| Flag | Description |
|------|-------------|
| `--execute` | Actually make changes (without this, it's a dry run) |
| `--cleanup` | Delete replays without blob_url instead of re-metrics |
| `--coach` | Process coach replays (from replays.json) |
| `--limit N` | Process only N replays per user/batch |
| `--user ID` | Process a specific user's replays |
| `--all-users` | Process ALL users in KV |
| `--replay-id ID` | Process only a specific replay |

---

#### Coach Fingerprint Storage Strategy

**Why Blob instead of JSON?**
- Coach fingerprints include detailed per-player data (~10-20KB per replay)
- Storing in `src/data/replays.json` would bloat the file for static rendering
- Blob storage allows lazy loading fingerprints only when needed

**Storage Location**:
```
Vercel Blob: coach-fingerprints/{replayId}.json
```

**File Format**:
```json
{
  "main": {
    "player_name": "Nicoract",
    "race": "terran",
    "economy": {
      "production_by_building": {...},
      "supply_block_periods": [...],
      ...
    },
    "tactical": {...},
    "micro": {...}
  },
  "all": {
    "Nicoract": {...},
    "LetaleX": {...}
  }
}
```

**Retrieval (Future API)**:
```typescript
// GET /api/coach-fingerprints/{replayId}
const fingerprints = await fetch(`/api/coach-fingerprints/${replayId}`);
```

---

#### Cleanup Mode Details

When you run cleanup with `--execute`, the script:
1. Finds all replays without `blob_url`
2. Deletes them from KV (replay data + index)
3. Removes their hashes from the manifest
4. **Increments `manifest_version`** to trigger uploader re-sync

The `manifest_version` is returned in the `/api/my-replays/check-hashes` response.
When uploaders detect `manifest_version > local_version`, they should:
1. Clear their local hash cache
2. Re-scan and upload all replays

This ensures deleted replays get re-uploaded (now with blob storage).

---

#### Hash Manifest Versioning

The hash manifest (`replay-hashes/{userId}.json` in Vercel Blob) now includes:

```typescript
interface HashManifest {
  discord_user_id: string;
  updated_at: string;
  hashes: Record<string, ReplayHash>;
  total_count: number;
  manifest_version: number;  // NEW: Incremented on cleanup
}
```

---

#### Uploader API Architecture (Optimized for Cost)

**Two Separate Endpoints**:
1. **`GET /api/my-replays/manifest-version`** - Lightweight, edge-cached version check
2. **`POST /api/my-replays/check-hashes`** - Full hash comparison (expensive)

**Why Separate?**
- Manifest version check is called frequently (every app start, every 5 min)
- Hash check is only needed when rebuilding local index or new replays detected
- Edge caching on version endpoint reduces Vercel compute by ~90%

**Implementation Checklist**:
- [ ] Create `/api/my-replays/manifest-version` endpoint (GET)
- [ ] Add Vercel Edge caching headers (60 second TTL)
- [ ] Update uploader to check manifest version on startup
- [ ] Only call check-hashes when version mismatch OR new local replays

---

#### API: GET /api/my-replays/manifest-version

```typescript
// src/app/api/my-replays/manifest-version/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { replayHashManifest } from '@/lib/replay-hash-manifest';

export const revalidate = 60; // Edge cache for 60 seconds

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const version = await replayHashManifest.getManifestVersion(session.user.id);

  return NextResponse.json(
    { manifest_version: version },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
```

**Response** (~50 bytes):
```json
{
  "manifest_version": 3
}
```

---

#### API: POST /api/my-replays/check-hashes

Only called when:
- Local manifest version < server manifest version
- New replay files detected locally that aren't in local index

**Response**:
```json
{
  "new_hashes": ["abc123", "def456"],
  "existing_count": 10,
  "total_submitted": 12,
  "manifest_version": 3
}
```

---

#### Uploader Integration (ladder-legends-uploader)

**Implementation Checklist**:
- [ ] Store `local_manifest_version` in config.json
- [ ] On app startup: `GET /api/my-replays/manifest-version`
- [ ] If `server_version > local_version`: clear local hash cache, set `needs_full_sync = true`
- [ ] On replay scan: check if new files exist that aren't in local index
- [ ] Only call `POST /api/my-replays/check-hashes` if:
  - `needs_full_sync = true`, OR
  - New local files detected
- [ ] After successful sync: update `local_manifest_version`

**Rust Implementation**:
```rust
// On app startup:
async fn check_manifest_version(&self) -> Result<bool> {
    let response: ManifestVersionResponse = self.client
        .get("/api/my-replays/manifest-version")
        .send()
        .await?
        .json()
        .await?;

    let local_version = self.config.manifest_version.unwrap_or(0);

    if response.manifest_version > local_version {
        info!(
            "Server manifest version {} > local {}, triggering full sync",
            response.manifest_version, local_version
        );
        self.clear_local_hash_cache().await?;
        return Ok(true); // Needs full sync
    }

    Ok(false) // No sync needed
}

// On replay folder scan:
async fn scan_replays(&self) -> Result<Vec<PathBuf>> {
    let local_files = self.scan_replay_folder().await?;
    let known_hashes = self.load_local_hash_index().await?;

    // Find files not in local index
    let mut new_files = Vec::new();
    for file in local_files {
        let hash = compute_hash(&file).await?;
        if !known_hashes.contains_key(&hash) {
            new_files.push(file);
        }
    }

    // Only call check-hashes if we have new files
    if !new_files.is_empty() || self.needs_full_sync {
        let hashes: Vec<String> = local_files
            .iter()
            .map(|f| compute_hash(f))
            .collect();
        let response = self.api.check_hashes(&hashes).await?;
        // response.new_hashes are the ones to upload
        // Update local manifest version
        self.config.manifest_version = Some(response.manifest_version);
    }

    Ok(new_files)
}
```

---

#### Cost Optimization Summary

| Endpoint | Frequency | Cache | Est. Cost |
|----------|-----------|-------|-----------|
| `GET /manifest-version` | On app start | Edge 24h | ~$0.001/user/month |
| `POST /check-hashes` | On new files | None | ~$0.05/sync |
| `POST /my-replays` | Per upload | None | ~$0.01/upload |

**Key Savings**:
- Without edge caching: ~288 serverless invocations/day/user
- With 24h edge caching: ~1 serverless invocation/day/user (99.7% reduction)

**Cache Invalidation**:
Manifest version cache rarely needs invalidation (only after bulk cleanup operations).
When needed:
1. **Automatic**: Redeploy triggers cache purge
2. **Manual**: Vercel Dashboard → Project Settings → Data Cache → Purge All
3. **Selective**: Deploy with modified timestamp in response to force refresh

---

#### Backup Strategy for Replay Blobs

**Current Storage**:
- User replays: Vercel Blob at `replays/{userId}/{replayId}/{filename}.SC2Replay`
- Hash manifests: Vercel Blob at `replay-hashes/{userId}.json`
- Coach replays: Vercel Blob URLs in `downloadUrl` field

**Recommended Backup Approach**:

1. **Vercel Blob has built-in redundancy** - data is replicated across regions
2. **For additional safety**, create a backup script:

```bash
# scripts/backup-replay-blobs.ts (future implementation)
# - Lists all blobs with prefix `replays/`
# - Downloads to S3 or local storage
# - Tracks last backup timestamp for incremental backups
```

3. **Coach replays** are already in git (src/data/replays.json)
   - Replay files are in Vercel Blob
   - Metadata and fingerprints are version-controlled

**Backup Priority**:
1. **HIGH**: User replay files (unique, irreplaceable if deleted from SC2)
2. **MEDIUM**: Hash manifests (can be rebuilt from KV if needed)
3. **LOW**: Coach replay files (can be re-obtained from coaches)

---

#### Troubleshooting

**"No blob URL (needs cleanup)"**
- This replay was uploaded before blob storage was added
- Run cleanup mode: `npx tsx scripts/remetrics-replays.ts --cleanup --execute`
- Uploaders will re-upload these replays automatically

**"No production data from sc2reader"**
- Make sure sc2reader is running with the latest code
- Restart: `pkill -f "python.*api" && cd ../sc2reader && python api/index.py`

**"Manifest version bumped but uploader didn't re-sync"**
- Check uploader is using latest code with manifest version check
- Verify `/api/my-replays/check-hashes` returns `manifest_version` field

**KV connection errors**
- Check `.env.local` has valid Upstash credentials
- The script maps `UPSTASH_REDIS_KV_REST_API_*` to `KV_REST_API_*` automatically

---

### Phase 1c: Coach Replay Blob Storage & Indexing

**Problem**: Coach replays in `src/data/replays.json` have metadata but lack:
1. Fingerprint data for benchmarking comparisons
2. Blob storage for the replay files (some may be external URLs)
3. A consistent indexing strategy for performance

**Solution Architecture**:

#### Coach Replay Storage Strategy

| Data Type | Storage Location | Purpose |
|-----------|------------------|---------|
| Metadata (title, map, players) | `src/data/replays.json` | Static rendering, SEO |
| Replay file | Vercel Blob `coach-replays/{replayId}.SC2Replay` | Download, re-analysis |
| Fingerprints | Vercel Blob `coach-fingerprints/{replayId}.json` | Benchmarking, comparison |
| Index | `src/data/coach-replay-index.json` OR KV | Fast list views |

#### Implementation Checklist

**Replay File Migration**:
- [ ] Audit existing coach replays for `downloadUrl` status
- [ ] Migrate external URLs to Vercel Blob
- [ ] Update `downloadUrl` to point to blob storage
- [ ] Add `blob_url` field for consistency with user replays

**Fingerprint Extraction**:
- [x] Create unified script to extract fingerprints from coach replays
- [x] Store fingerprints in Vercel Blob (not JSON) to avoid static build bloat
- [ ] Add fingerprint extraction to CMS upload flow

**Indexing Strategy**:
- [ ] Create `/api/coach-replays/index` endpoint
- [ ] Create `CoachReplayIndexEntry` type matching user replay index
- [ ] Generate index during build OR on-demand with caching
- [ ] Include benchmark-relevant fields: matchup, race, avg metrics

**Benchmarking Integration**:
- [ ] Create `/api/coach-fingerprints/{replayId}` endpoint
- [ ] Add "Compare to Coach Replay" feature in my-replays
- [ ] Cache fingerprints in IndexedDB for repeat comparisons

#### Coach Replay Index Entry Type

```typescript
interface CoachReplayIndexEntry {
  id: string;
  title: string;
  map: string;
  matchup: Matchup;
  player1_name: string;
  player1_race: Race;
  player2_name: string;
  player2_race: Race;
  duration: string;
  game_date: string;
  coach?: string;
  coachId?: string;
  categories?: string[];
  difficulty?: Difficulty;

  // Benchmark summary (from fingerprint)
  winner_race: Race;
  avg_supply_block_time?: number;
  avg_production_idle_time?: number;
  supply_score?: number;
  production_score?: number;

  // Storage references
  blob_url?: string;       // Replay file in blob
  fingerprint_url?: string; // Fingerprint JSON in blob
}
```

#### API Endpoints

```typescript
// List coach replays (lightweight index)
GET /api/coach-replays/index
  → { entries: CoachReplayIndexEntry[] }

// Get coach replay fingerprint for benchmarking
GET /api/coach-fingerprints/{replayId}
  → { main: ReplayFingerprint, all: Record<string, ReplayFingerprint> }

// Get full coach replay metadata + fingerprint
GET /api/coach-replays/{id}
  → { replay: Replay, fingerprint: CoachFingerprint }
```

---

### Phase 2: Implement Index-First Architecture (Priority: HIGH)

**Current Flow** (Bad):
```
Page Load → GET /api/my-replays → 1.5MB response → Render
```

**Proposed Flow** (Good):
```
Page Load → GET /api/my-replays/index → 20KB response → Render
          → User clicks replay → GET /api/my-replays/{id} → Full data
```

**Index already exists** at `/api/my-replays/index` with fields:
```typescript
interface ReplayIndexEntry {
  id: string;
  filename: string;
  uploaded_at: string;
  game_date: string;
  game_type: string;
  matchup: string;
  result: 'Win' | 'Loss';
  duration: number;
  map_name: string;
  opponent_name: string;
  supply_block_time: number | null;      // From total_supply_block_time
  production_idle_time: number | null;   // From production_by_building
  supply_score: number | null;
  production_score: number | null;
  detected_build: string | null;
}
```

**Changes needed in Academy**:

1. **Update my-replays page** to use index endpoint:
```typescript
// src/app/my-replays/page.tsx
const { data: index } = useSWR(`/api/my-replays/index`);
// Pass index entries to overview, not full replays
```

2. **Update overview component** to work with index entries:
```typescript
// Already partially done - toIndexEntry() converts UserReplayData
// Need to fetch index directly instead of converting
```

3. **Lazy load full replay on detail view**:
```typescript
// src/app/my-replays/[id]/page.tsx
const { data: replay } = useSWR(`/api/my-replays/${id}`);
```

---

### Phase 3: Server-Side Aggregation API (Priority: MEDIUM)

Create new endpoint for pre-computed stats:

```typescript
// GET /api/my-replays/stats?date_range=30&period=weekly

interface ReplayStatsResponse {
  summary: {
    total_games: number;
    wins: number;
    losses: number;
    avg_supply_block_time: number | null;
    avg_production_idle_time: number | null;
    avg_supply_score: number | null;
    avg_production_score: number | null;
  };
  by_matchup: Record<string, {
    games: number;
    wins: number;
    avg_supply_block_time: number | null;
    avg_production_idle_time: number | null;
  }>;
  time_series: Array<{
    period: string;  // "Nov 18", "Nov 25", etc.
    games: number;
    win_rate: number;
    avg_supply_block_time: number | null;
    avg_production_idle_time: number | null;
  }>;
}
```

**Benefits**:
- Response size: ~2-5KB instead of 1.5MB
- Client doesn't need to compute aggregations
- Can cache at edge (Vercel Edge Cache)
- Faster chart rendering

---

### Phase 4: IndexedDB Client Caching (Priority: HIGH)

**Goal**: Cache replay data locally to avoid redundant API calls.

#### Implementation Checklist

**Core IndexedDB Infrastructure**:
- [ ] Create `src/lib/replay-client-cache.ts` with IndexedDB wrapper
- [ ] Implement database initialization with version migrations
- [ ] Create object stores: `replay-index`, `full-replays`, `stats-cache`, `coach-fingerprints`
- [ ] Add error handling for IndexedDB quota exceeded

**Cache Layer Types**:
```
IndexedDB Cache Structure:
├── replay-index (userId → ReplayIndexEntry[])
│   └─ Stale after: 5 minutes or new upload
├── full-replays (replayId → UserReplayData)
│   └─ Stale after: Never (immutable once uploaded)
├── stats-cache (userId + dateRange → ReplayStatsResponse)
│   └─ Stale after: 15 minutes
└── coach-fingerprints (replayId → CoachFingerprint)
    └─ Stale after: 1 hour
```

**Data Fetching Strategy**:
- [ ] Index: Stale-while-revalidate (show cached, refresh in background)
- [ ] Full replays: Cache-first, never expires (replay data is immutable)
- [ ] Stats: Cache with 15-minute TTL
- [ ] Coach fingerprints: Cache with 1-hour TTL

**Cache Invalidation Triggers**:
- [ ] New replay upload → Clear index cache
- [ ] Replay deleted → Clear index cache
- [ ] Schema version bump → Clear ALL caches
- [ ] User clicks "Refresh" → Clear index + stats cache

**Implementation**:

```typescript
// src/lib/replay-client-cache.ts

interface CachedReplayData {
  version: number;
  last_updated: string;
  index: ReplayIndexEntry[];
  full_replays: Record<string, UserReplayData>;  // By ID
  stats?: ReplayStatsResponse;
  coach_fingerprints: Record<string, CoachFingerprint>;
}

// Staleness configuration
const CACHE_TTL = {
  INDEX: 5 * 60 * 1000,        // 5 minutes
  FULL_REPLAY: Infinity,        // Never stale (immutable)
  STATS: 15 * 60 * 1000,        // 15 minutes
  COACH_FINGERPRINT: 60 * 60 * 1000,  // 1 hour
};

class ReplayClientCache {
  private db: IDBDatabase;
  private readonly DB_NAME = 'ladder-legends-replays';
  private readonly VERSION = 1;

  // Object store names
  private readonly STORES = {
    INDEX: 'replay-index',
    REPLAYS: 'full-replays',
    STATS: 'stats-cache',
    COACH_FP: 'coach-fingerprints',
  };

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Create object stores
        if (!db.objectStoreNames.contains(this.STORES.INDEX)) {
          db.createObjectStore(this.STORES.INDEX, { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains(this.STORES.REPLAYS)) {
          db.createObjectStore(this.STORES.REPLAYS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.STORES.STATS)) {
          db.createObjectStore(this.STORES.STATS, { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains(this.STORES.COACH_FP)) {
          db.createObjectStore(this.STORES.COACH_FP, { keyPath: 'replayId' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getIndex(userId: string): Promise<ReplayIndexEntry[] | null> {
    const cached = await this.get(this.STORES.INDEX, userId);
    if (cached && !this.isStale(cached.last_updated, CACHE_TTL.INDEX)) {
      return cached.entries;
    }
    return null;
  }

  async getFullReplay(id: string): Promise<UserReplayData | null> {
    const cached = await this.get(this.STORES.REPLAYS, id);
    // Full replays never expire
    return cached?.data || null;
  }

  async getStats(userId: string, dateRange: number): Promise<ReplayStatsResponse | null> {
    const cacheKey = `${userId}:${dateRange}`;
    const cached = await this.get(this.STORES.STATS, cacheKey);
    if (cached && !this.isStale(cached.last_updated, CACHE_TTL.STATS)) {
      return cached.stats;
    }
    return null;
  }

  async getCoachFingerprint(replayId: string): Promise<CoachFingerprint | null> {
    const cached = await this.get(this.STORES.COACH_FP, replayId);
    if (cached && !this.isStale(cached.last_updated, CACHE_TTL.COACH_FINGERPRINT)) {
      return cached.fingerprint;
    }
    return null;
  }

  private isStale(lastUpdated: string, ttl: number): boolean {
    if (ttl === Infinity) return false;
    const age = Date.now() - new Date(lastUpdated).getTime();
    return age > ttl;
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.delete(this.STORES.INDEX, userId);
    // Clear all stats for this user
    // (requires iterating over stats store)
  }

  async invalidateAll(): Promise<void> {
    await this.clear(this.STORES.INDEX);
    await this.clear(this.STORES.STATS);
    // Keep full replays and coach fingerprints (expensive to refetch)
  }
}
```

**SWR Integration with Stale-While-Revalidate**:
```typescript
const fetcher = async (url: string) => {
  const cache = new ReplayClientCache();
  await cache.init();

  // Try cache first
  const cached = await cache.getIndex(userId);
  if (cached) {
    // Return cached immediately, but revalidate in background
    fetch(url).then(res => res.json()).then(data => {
      cache.setIndex(userId, data.entries);
    });
    return { entries: cached, fromCache: true };
  }

  // Fetch fresh
  const res = await fetch(url);
  const data = await res.json();
  await cache.setIndex(userId, data.entries);
  return { entries: data.entries, fromCache: false };
};
```

---

### Phase 5: Fix Double API Calls (Priority: MEDIUM)

**Investigation needed**:
1. Check if React Strict Mode is enabled in production
2. Check if multiple components are fetching independently
3. Add SWR/React Query for request deduplication

**Likely fix**:
```typescript
// Use SWR with deduplication
const { data } = useSWR(
  `/api/my-replays/index`,
  fetcher,
  { dedupingInterval: 60000 }  // Dedupe for 60 seconds
);
```

**Or lift data fetching**:
```typescript
// In layout or parent component
const replayContext = useReplayData();

// Children use context instead of fetching
const { index, fullReplays } = useReplayContext();
```

---

### Phase 6: Progressive Data Architecture (Priority: LOW)

**Future enhancement** for users with 100s of replays:

```
Initial Load (instant):
├─ GET /api/my-replays/stats (2KB)
│  └─ Renders: Three Pillars, Summary
│
Scroll to Charts:
├─ GET /api/my-replays/index?limit=50 (10KB)
│  └─ Renders: Performance Trends, Games Played
│
Scroll to Table:
├─ GET /api/my-replays/index?limit=20&offset=0 (4KB)
│  └─ Renders: First page of replay table
│
Click "Load More":
├─ GET /api/my-replays/index?limit=20&offset=20 (4KB)
│  └─ Appends: Next page of replay table
│
Click Replay:
├─ GET /api/my-replays/{id} (10-30KB)
│  └─ Renders: Full replay detail with build order
```

---

## Cache Invalidation Strategy

### When to Invalidate

| Event | Action |
|-------|--------|
| New replay uploaded | Clear user's index cache |
| Replay deleted | Clear user's index cache |
| sc2reader schema change | Clear ALL caches (version bump) |
| User requests refresh | Clear user's index cache |

### Implementation

```typescript
// In upload endpoint
await cache.invalidate(userId);

// In delete endpoint
await cache.invalidate(userId);

// Global invalidation (schema change)
await cache.invalidateAll();
```

---

## Test Coverage Plan

### Testing Checklist

All optimization phases require comprehensive test coverage before deployment.

#### Phase 1b: Re-Metrics Script Tests

**Unit Tests** (`scripts/__tests__/remetrics-replays.test.ts`):
- [ ] `processUserReplays()` - correctly fetches and updates KV entries
- [ ] `processCoachReplays()` - correctly reads JSON and stores to blob
- [ ] `saveCoachFingerprint()` - creates blob with correct path and format
- [ ] Cleanup mode correctly identifies replays without `blob_url`
- [ ] Manifest version increments on cleanup
- [ ] `--limit` flag respects batch size
- [ ] `--replay-id` flag processes single replay
- [ ] Dry run mode doesn't modify data

**Integration Tests** (requires test fixtures):
- [ ] End-to-end user replay re-metrics with mock KV
- [ ] End-to-end coach replay fingerprinting with mock Blob
- [ ] sc2reader API error handling (timeout, 500, invalid response)

---

#### Phase 1c: Coach Replay Tests

**Unit Tests** (`src/lib/__tests__/coach-replay-index.test.ts`):
- [ ] `CoachReplayIndexEntry` type matches schema
- [ ] Index generation from `replays.json`
- [ ] Fingerprint URL resolution

**API Route Tests** (`src/app/api/coach-replays/__tests__/`):
- [ ] `GET /api/coach-replays/index` returns correct structure
- [ ] `GET /api/coach-fingerprints/{id}` fetches from blob correctly
- [ ] 404 handling for missing fingerprints
- [ ] Auth requirements enforced

---

#### Phase 2: Index-First Architecture Tests

**Unit Tests** (`src/lib/__tests__/replay-index.test.ts`):
- [ ] `ReplayIndexEntry` type matches schema
- [ ] `toIndexEntry()` correctly transforms full replay data
- [ ] Index pagination (limit, offset)

**API Route Tests** (`src/app/api/my-replays/__tests__/`):
- [ ] `GET /api/my-replays/index` - returns entries array
- [ ] `GET /api/my-replays/index?limit=10&offset=20` - pagination works
- [ ] `GET /api/my-replays/{id}` - returns full replay data
- [ ] 404 handling for missing replays

**Component Tests** (`src/components/my-replays/__tests__/`):
- [ ] Overview component renders with index entries only
- [ ] Lazy loading triggers on replay click
- [ ] Loading states display correctly

---

#### Phase 3: Stats API Tests

**Unit Tests** (`src/lib/__tests__/replay-stats.test.ts`):
- [ ] Aggregation calculations are accurate
- [ ] `avg_supply_block_time` handles null values correctly
- [ ] `avg_production_idle_time` handles null values correctly
- [ ] Win rate calculation
- [ ] By-matchup grouping

**API Route Tests** (`src/app/api/my-replays/stats/__tests__/`):
- [ ] `GET /api/my-replays/stats` returns correct structure
- [ ] `?date_range=7` filters correctly
- [ ] `?date_range=30` filters correctly
- [ ] `?period=daily` aggregates by day
- [ ] `?period=weekly` aggregates by week

**Edge Cases**:
- [ ] No replays → empty response
- [ ] All nulls → appropriate handling (not NaN)
- [ ] Single replay → same as total

---

#### Phase 4: IndexedDB Caching Tests

**Unit Tests** (`src/lib/__tests__/replay-client-cache.test.ts`):
- [ ] Database initialization creates all stores
- [ ] `getIndex()` returns cached data
- [ ] `getIndex()` returns null when stale
- [ ] `getFullReplay()` returns cached data (never stale)
- [ ] `getStats()` respects TTL
- [ ] `getCoachFingerprint()` respects TTL
- [ ] `invalidateUser()` clears correct stores
- [ ] `invalidateAll()` clears index and stats only

**Mock IndexedDB** (use `fake-indexeddb` package):
```typescript
import 'fake-indexeddb/auto';

describe('ReplayClientCache', () => {
  let cache: ReplayClientCache;

  beforeEach(async () => {
    cache = new ReplayClientCache();
    await cache.init();
  });

  it('should return cached index when fresh', async () => {
    await cache.setIndex('user-123', mockEntries);
    const result = await cache.getIndex('user-123');
    expect(result).toEqual(mockEntries);
  });

  it('should return null when index is stale', async () => {
    // Set index with old timestamp
    await cache.setIndex('user-123', mockEntries, Date.now() - 10 * 60 * 1000);
    const result = await cache.getIndex('user-123');
    expect(result).toBeNull();
  });
});
```

---

#### Manifest Version API Tests

**API Route Tests** (`src/app/api/my-replays/manifest-version/__tests__/`):
- [ ] `GET /api/my-replays/manifest-version` returns version number
- [ ] Response includes correct Cache-Control headers
- [ ] Unauthorized users get 401
- [ ] New users get version 0 (or 1)

---

#### Uploader Integration Tests (Rust)

**Unit Tests** (`src-tauri/src/tests/`):
- [ ] `check_manifest_version()` parses response correctly
- [ ] `check_manifest_version()` detects version mismatch
- [ ] `clear_local_hash_cache()` removes correct files
- [ ] `scan_replays()` identifies new files correctly
- [ ] `check_hashes()` only called when needed

**Integration Tests**:
- [ ] Full sync flow after version mismatch
- [ ] Incremental upload flow for new files
- [ ] Error handling for API failures

---

#### End-to-End Tests (Playwright)

**My Replays Page**:
- [ ] Page loads with index data (not full data)
- [ ] Clicking replay loads detail view
- [ ] Filter/sort works on index data
- [ ] Charts render from index data

**Performance Tests**:
- [ ] Initial page load < 500ms (with index)
- [ ] Repeat visit < 100ms (with cache)
- [ ] Detail page load < 200ms (lazy load)

---

### Test Environment Setup

```bash
# Install test dependencies
npm install --save-dev fake-indexeddb msw @testing-library/react

# Run all tests
npm run test

# Run specific test suites
npm run test -- --testPathPattern="replay-client-cache"
npm run test -- --testPathPattern="remetrics"
npm run test -- --testPathPattern="manifest-version"

# Run with coverage
npm run test:coverage
```

### Test Coverage Goals

| Area | Current | Target |
|------|---------|--------|
| Re-metrics script | 0% | 90%+ |
| Coach replay index | 0% | 90%+ |
| Index API endpoints | 60% | 95%+ |
| Stats API endpoint | 0% | 95%+ |
| IndexedDB cache | 0% | 95%+ |
| Manifest version API | 0% | 95%+ |
| Uploader Rust code | 40% | 80%+ |

---

## Migration Plan

### Step 1: sc2reader Update (1-2 days)
1. Add production idle tracking to fingerprint output
2. Test with sample replays
3. Deploy to Vercel

### Step 2: Academy Index Migration (1 day)
1. Update my-replays page to use /index endpoint
2. Update overview component to accept index entries
3. Test with existing data

### Step 3: Client Cache (1 day)
1. Implement ReplayClientCache
2. Integrate with SWR fetcher
3. Add cache invalidation triggers

### Step 4: Fix Double Calls (0.5 day)
1. Add SWR deduplication
2. Lift data fetching if needed
3. Verify in production

### Step 5: User Data Refresh (1 day)
1. Add "Refresh Data" button for users
2. Document how to flush and re-upload
3. Consider background re-processing of old replays

---

## Estimated Impact

| Metric | Current | After Optimization |
|--------|---------|-------------------|
| Initial page load | 1.5MB | ~20KB (97% reduction) |
| Repeat visit | 1.5MB | 0KB (cached) |
| Vercel compute | 2x calls | 1x call |
| Time to interactive | ~3s | ~500ms |
| Mobile experience | Poor | Good |

---

## Files to Modify

### sc2reader
- `fingerprint.py` - Add production idle to output
- `api.py` - Ensure /metrics returns idle data

### Academy
- `src/app/my-replays/page.tsx` - Use index endpoint
- `src/components/my-replays/my-replays-overview.tsx` - Accept index entries
- `src/lib/replay-client-cache.ts` - NEW: IndexedDB cache
- `src/lib/replay-kv.ts` - Update createIndexEntry if needed
- `src/app/api/my-replays/stats/route.ts` - NEW: Stats endpoint
