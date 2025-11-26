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
Existing replays need to be re-uploaded to get this data.

**UI graceful handling** (also completed):
- Three Pillars shows "Based on execution" when score exists but no time data
- Performance Trends hides NaN values with `Number.isFinite()` checks
- Toggle buttons now use `bg-primary text-primary-foreground` for visibility

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

**Implementation**:

```typescript
// src/lib/replay-client-cache.ts

interface CachedReplayData {
  version: number;
  last_updated: string;
  index: ReplayIndexEntry[];
  full_replays: Record<string, UserReplayData>;  // By ID
}

class ReplayClientCache {
  private db: IDBDatabase;
  private readonly DB_NAME = 'ladder-legends-replays';
  private readonly STORE_NAME = 'replay-cache';

  async getIndex(userId: string): Promise<ReplayIndexEntry[] | null> {
    // Check IndexedDB first
    const cached = await this.get(userId);
    if (cached && !this.isStale(cached)) {
      return cached.index;
    }
    return null;
  }

  async setIndex(userId: string, index: ReplayIndexEntry[]): Promise<void> {
    await this.set(userId, {
      version: 1,
      last_updated: new Date().toISOString(),
      index,
      full_replays: {}
    });
  }

  async getFullReplay(id: string): Promise<UserReplayData | null> {
    // Check local cache first
  }

  async setFullReplay(id: string, replay: UserReplayData): Promise<void> {
    // Cache full replay for instant access later
  }

  isStale(cached: CachedReplayData): boolean {
    // Stale after 5 minutes, or if version mismatch
    const age = Date.now() - new Date(cached.last_updated).getTime();
    return age > 5 * 60 * 1000;
  }

  async invalidate(userId: string): Promise<void> {
    // Called after new replay upload
  }
}
```

**Usage in SWR**:
```typescript
const fetcher = async (url: string) => {
  const cache = new ReplayClientCache();

  // Try cache first
  const cached = await cache.getIndex(userId);
  if (cached) {
    // Return cached, but revalidate in background
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
