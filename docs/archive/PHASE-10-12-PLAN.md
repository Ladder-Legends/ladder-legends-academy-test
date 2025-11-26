# Phase 10-12: My Replays UI Enhancement Plan

## Overview

This document outlines the plan for enhancing the My Replays experience with:
1. **Three Pillars of Improvement**: Vision, Production, Supply
2. **Reference Replay System**: Upload/select benchmarks per matchup with aliases
3. **Detailed Drill-down Metrics**: Per-building breakdowns, timing analysis
4. **Performance Optimizations**: Replay index, lazy loading, caching

---

## The Three Pillars Framework

### Pillar 1: Vision (TODO - Future Phase)
- Creep spread percentage (Zerg)
- Scan usage efficiency (Terran)
- Observer/Revelation coverage (Protoss)
- Map vision percentage over time

### Pillar 2: Production
**What we measure:**
- Idle time per production building (Barracks, Factory, Starport, Gateway, etc.)
- Macro ability efficiency:
  - Terran: MULE drops, Calldown Supply
  - Zerg: Inject efficiency (already have)
  - Protoss: Chrono Boost usage
- Total production cycles vs potential

**Display format:**
```
Production: 78%
├─ 12s avg idle per game
├─ Barracks: 8s idle (3 instances)
├─ Factory: 12s idle (2 instances)
├─ Starport: 4s idle (1 instance)
└─ MULEs: 85% efficiency
```

### Pillar 3: Supply
**What we measure:**
- Supply block count
- Total time blocked (seconds)
- Supply block events with timestamps
- Supply at checkpoints (3:00, 5:00, 7:00, 10:00, 15:00)

**Display format:**
```
Supply: 85%
├─ 2.4 blocks per game avg
├─ 8s avg time blocked
├─ Block events:
│   ├─ 3:42 - 5s at 46 supply
│   └─ 7:15 - 3s at 98 supply
└─ Checkpoints: 42 → 68 → 92 → 142
```

---

## Reference Replay System

### Terminology
- **Reference Replay**: A benchmark replay/build that you compare your games against
- **Alias**: User-friendly name (e.g., "My 2-1-1 Marine Tank" instead of "Tokamak LE (32).SC2Replay")

### User Stories
1. As a player, I want to upload a replay of my "ideal" execution to compare future games against
2. As a player, I want to select a build order from the site as my reference for a matchup
3. As a player, I want to give my reference builds memorable aliases
4. As a player, I want to see which reference build my games are being compared to
5. As a player, I want per-matchup breakdown of my performance against each reference

### Data Model

```typescript
// Reference replay/build that user compares against
interface ReferenceReplay {
  id: string;                    // UUID
  user_id: string;               // Discord user ID (owner)
  alias: string;                 // User-friendly name
  matchup: string;               // "TvZ", "TvP", "TvT", "ZvT", etc.
  source_type: 'uploaded_replay' | 'my_replay' | 'site_build_order' | 'site_replay';
  source_id: string;             // ID of source (blob URL, replay ID, or build order ID)

  // Cached data for comparison (extracted from source)
  fingerprint: ReplayFingerprint;
  build_order: BuildOrderEvent[];
  key_timings: Record<string, number>;  // e.g., { "first_expansion": 120, "factory": 180 }

  created_at: string;
  updated_at: string;
}

// Per-matchup configuration
interface UserMatchupConfig {
  user_id: string;
  matchup: string;               // "TvZ", "TvP", "TvT"
  default_reference_id: string | null;  // Which reference to auto-compare
}

// Comparison result (stored per replay)
interface ReferenceComparison {
  reference_id: string;
  reference_alias: string;
  overall_match: number;         // 0-100%
  timing_deviations: Array<{
    event: string;
    target_time: number;
    actual_time: number;
    deviation_seconds: number;
    is_acceptable: boolean;      // Within threshold
  }>;
  pillar_scores: {
    production: number;          // How close to reference production
    supply: number;              // How close to reference supply
  };
}
```

### Storage Strategy

```
Vercel KV Keys:
├─ user:{id}:replay_index          → ReplayIndexEntry[] (lightweight list)
├─ user:{id}:replays:{replay_id}   → UserReplayData (full data, fetched on detail view)
├─ user:{id}:references            → ReferenceReplay[]
├─ user:{id}:matchup_config        → UserMatchupConfig[]
└─ user:{id}:settings              → UserSettings (existing)

Vercel Blob:
├─ user-replays/{user_id}/{replay_id}/  → .SC2Replay files
├─ reference-replays/{user_id}/{ref_id}/ → Uploaded reference .SC2Replay files
└─ hash-manifests/{user_id}.json         → Hash deduplication (existing)
```

### Replay Index (Performance Optimization)

Instead of fetching all full replay data for the list view:

```typescript
interface ReplayIndexEntry {
  id: string;
  filename: string;
  uploaded_at: string;
  game_date: string | null;

  // Game info (for filtering/display)
  game_type: string;             // "1v1-ladder", "2v2-ladder", etc.
  matchup: string;               // "TvZ"
  result: 'Win' | 'Loss';
  duration: number;              // seconds
  map_name: string;
  opponent_name: string;

  // Reference comparison (if assigned)
  reference_id: string | null;
  reference_alias: string | null;
  comparison_score: number | null;

  // Pillar scores (for sorting/aggregation)
  production_score: number | null;
  supply_score: number | null;
  vision_score: number | null;   // null until implemented

  // Build detection
  detected_build: string | null;
  detection_confidence: number | null;
}
```

**Benefits:**
- List view loads in single KV read (~5-10KB vs 300KB+)
- Filtering/sorting happens client-side on lightweight data
- Full data fetched only when drilling into detail view
- Aggregations (win rate, avg scores) computed from index

---

## Scoring System

### Production Score (0-100)

**Formula:**
```
base_score = 100
penalty = 0

for each building_type:
  idle_seconds = total_idle_time[building_type]

  # First 10s: light penalty
  penalty += min(idle_seconds, 10) * 1

  # 10-30s: medium penalty
  if idle_seconds > 10:
    penalty += min(idle_seconds - 10, 20) * 2

  # 30s+: heavy penalty
  if idle_seconds > 30:
    penalty += (idle_seconds - 30) * 3

# Macro ability efficiency (race-specific)
if race == "Terran":
  penalty += (100 - mule_efficiency) * 0.2
elif race == "Zerg":
  penalty += (100 - inject_efficiency) * 0.3
elif race == "Protoss":
  penalty += (100 - chrono_efficiency) * 0.2

production_score = max(0, base_score - penalty)
```

### Supply Score (0-100)

**Formula:**
```
base_score = 100
penalty = 0

for each block_event:
  duration = block_event.duration
  game_time = block_event.time

  # Base penalty per block
  penalty += 10

  # Duration penalty
  penalty += duration * 2

  # Early game multiplier (blocks before 5:00 are worse)
  if game_time < 300:  # 5 minutes
    penalty *= 1.5

supply_score = max(0, base_score - penalty)
```

### Tooltip Display

**Production Tooltip:**
```
┌────────────────────────────────────────────┐
│ Production Efficiency: 78%                 │
│                                            │
│ Building Breakdown:                        │
│ ├─ Barracks (×2): 18s idle                │
│ ├─ Factory: 12s idle                       │
│ └─ Starport: 6s idle                       │
│                                            │
│ MULE Efficiency: 85%                       │
│ (12 of 14 possible MULEs used)            │
│                                            │
│ Scoring:                                   │
│ • 0-10s idle: -1 per second               │
│ • 10-30s idle: -2 per second              │
│ • 30s+ idle: -3 per second                │
│ • Macro ability: up to -20 points         │
└────────────────────────────────────────────┘
```

**Supply Tooltip:**
```
┌────────────────────────────────────────────┐
│ Supply Management: 65%                     │
│                                            │
│ Blocked 3 times for 18 seconds total       │
│                                            │
│ Events:                                    │
│ ├─ 3:42 — 5s at 46/46 supply              │
│ ├─ 5:18 — 8s at 62/62 supply              │
│ └─ 8:45 — 5s at 98/100 supply             │
│                                            │
│ Supply Checkpoints:                        │
│ ├─ 3:00 — 42 supply                       │
│ ├─ 5:00 — 68 supply                       │
│ ├─ 7:00 — 92 supply                       │
│ └─ 10:00 — 142 supply                     │
│                                            │
│ Scoring:                                   │
│ • Each block: -10 points                  │
│ • Per second blocked: -2 points           │
│ • Early block (<5min): 1.5× penalty       │
└────────────────────────────────────────────┘
```

---

## UI Components

### Overview Dashboard (Revised)

```
┌─────────────────────────────────────────────────────────────────┐
│ My Replays                                    [Overview] [List] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ THE THREE PILLARS                                               │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│ │ 👁️ Vision     │ │ ⚙️ Production  │ │ 📊 Supply     │          │
│ │               │ │               │ │               │          │
│ │     --        │ │     78%       │ │     85%       │          │
│ │  Coming Soon  │ │ 12s avg idle  │ │ 2.4 blocks    │          │
│ │               │ │     [?]       │ │ 8s avg  [?]   │          │
│ └───────────────┘ └───────────────┘ └───────────────┘          │
│                                                                 │
│ SUMMARY                                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│ │  40.0%  │ │   30    │ │   TvP   │ │  82.3%  │               │
│ │Win Rate │ │ Games   │ │Most Plyd│ │Execution│               │
│ │12W - 17L│ │ tracked │ │16 games │ │ Average │               │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ MATCHUP BREAKDOWN                                               │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Matchup │ Games │ Win% │ Prod │ Supply │ Reference Build  │  │
│ ├─────────┼───────┼──────┼──────┼────────┼─────────────────┤  │
│ │ TvP     │  16   │ 50%  │ 82%  │  88%   │ 2-1-1 Marine ▾  │  │
│ │ TvZ     │  10   │ 40%  │ 75%  │  82%   │ Hellbat Push ▾  │  │
│ │ TvT     │   4   │ 25%  │ 71%  │  78%   │ (none) ▾        │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ REFERENCE BUILDS                              [+ Add Reference] │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Alias              │ Matchup │ Source │ Games │ Avg Score │  │
│ ├────────────────────┼─────────┼────────┼───────┼───────────┤  │
│ │ 2-1-1 Marine Tank  │ TvP     │ Replay │   8   │    78%    │  │
│ │ Hellbat Push       │ TvZ     │ Build  │   6   │    72%    │  │
│ │ [Edit] [Delete]    │         │        │       │           │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ INSIGHTS (Data-Driven)                                          │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ • Your TvT win rate is 25% below your average             │  │
│ │ • Supply blocks cost you ~15s per game — focus on depots  │  │
│ │ • Your 3rd CC timing is 45s late vs your 2-1-1 reference  │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Replay Detail Page

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to My Replays                                            │
│                                                                 │
│ Lotus vs Marstom                                                │
│ Tourmaline LE • TvT • Loss • 11:36                             │
│ November 24, 2025 at 1:06 AM                                   │
│                                                                 │
│ Reference: (none assigned)  [Assign Reference ▾]               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ THE THREE PILLARS                                               │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│ │ 👁️ Vision     │ │ ⚙️ Production  │ │ 📊 Supply     │          │
│ │     --        │ │     72%       │ │     65%       │          │
│ └───────────────┘ └───────────────┘ └───────────────┘          │
│                                                                 │
│ ▼ PRODUCTION DETAILS                                            │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Building         │ Idle Time │ Idle % │ Timeline          │  │
│ ├──────────────────┼───────────┼────────┼───────────────────┤  │
│ │ Barracks (×2)    │    18s    │  8.2%  │ ████░░░░░░        │  │
│ │ Factory          │    12s    │  5.4%  │ ██░░░░░░░░        │  │
│ │ Starport         │     6s    │  2.7%  │ █░░░░░░░░░        │  │
│ ├──────────────────┼───────────┼────────┼───────────────────┤  │
│ │ Total            │    36s    │  5.4%  │                   │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ │ MULE Usage: 12 of 14 possible (85%)                       │  │
│                                                                 │
│ ▼ SUPPLY DETAILS                                                │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Blocked 3 times for 18 seconds total                      │  │
│ │                                                           │  │
│ │ Time     │ Duration │ At Supply │ Notes                   │  │
│ ├──────────┼──────────┼───────────┼─────────────────────────┤  │
│ │ 3:42     │    5s    │   46/46   │ Before 2nd depot        │  │
│ │ 5:18     │    8s    │   62/62   │ During push prep        │  │
│ │ 8:45     │    5s    │  98/100   │ Late depot              │  │
│ │                                                           │  │
│ │ Supply at Checkpoints:                                    │  │
│ │ 3:00 ────●──── 5:00 ────●──── 7:00 ────●──── 10:00       │  │
│ │  42            68            92           (game ended)    │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ▼ RESOURCE MANAGEMENT                                           │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Average Float: 412 minerals, 189 gas                      │  │
│ │ Peak Bank: 1,842 minerals at 8:30 (during engagement)     │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ▼ BUILD ORDER                                                   │
│ [Existing build order table with supply tracking]              │
│                                                                 │
│ ▼ COMPARISON TO REFERENCE (if assigned)                         │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Overall Match: 72%                                        │  │
│ │                                                           │  │
│ │ Event           │ Target │ Yours  │ Deviation            │  │
│ ├─────────────────┼────────┼────────┼──────────────────────┤  │
│ │ CC              │  1:40  │  1:42  │ ✓ +2s               │  │
│ │ Factory         │  3:00  │  3:18  │ ⚠️ +18s              │  │
│ │ Starport        │  4:30  │  4:45  │ ⚠️ +15s              │  │
│ │ First push      │  5:30  │  6:15  │ ❌ +45s              │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Add Reference Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Add Reference Build                                        [×]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Give it a name *                                                │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ My Standard TvZ Mech                                      │  │
│ └───────────────────────────────────────────────────────────┘  │
│ This is how it will appear in filters and comparisons          │
│                                                                 │
│ Matchup *                                                       │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ TvZ                                                    ▾  │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ Source *                                                        │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ○ Upload a replay file                                    │  │
│ │   Drag & drop or click to select a .SC2Replay file       │  │
│ │   ┌───────────────────────────────────────────────────┐  │  │
│ │   │              Drop replay here                     │  │  │
│ │   │           or click to browse                      │  │  │
│ │   └───────────────────────────────────────────────────┘  │  │
│ │                                                           │  │
│ │ ○ Select from my uploaded replays                         │  │
│ │   ┌─────────────────────────────────────────────────▾─┐  │  │
│ │   │ Search replays...                                 │  │  │
│ │   └───────────────────────────────────────────────────┘  │  │
│ │                                                           │  │
│ │ ○ Select from site build orders                           │  │
│ │   ┌─────────────────────────────────────────────────▾─┐  │  │
│ │   │ Search build orders...                            │  │  │
│ │   └───────────────────────────────────────────────────┘  │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ☐ Set as default reference for TvZ                             │
│   (New TvZ replays will auto-compare to this)                  │
│                                                                 │
│                                                                 │
│                                  [Cancel]  [Add Reference]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Phase 10: Data Model & APIs

**Week 1: Replay Index System**

1. Create `ReplayIndexEntry` type
2. Create index on replay upload:
   ```typescript
   // In POST /api/my-replays
   // After storing full replay data...
   await updateReplayIndex(userId, newIndexEntry);
   ```
3. API: `GET /api/my-replays/index`
   - Returns lightweight index array
   - Supports query params: `matchup`, `result`, `reference_id`
4. Update existing replay upload to populate index
5. Migration: Generate index for existing replays

**Week 2: Reference Replay System**

1. Create types: `ReferenceReplay`, `UserMatchupConfig`, `ReferenceComparison`
2. APIs:
   - `GET /api/my-references` - List user's references
   - `POST /api/my-references` - Create new reference
   - `PUT /api/my-references/:id` - Update reference (alias, default)
   - `DELETE /api/my-references/:id` - Delete reference
   - `GET /api/my-matchup-config` - Get per-matchup settings
   - `PUT /api/my-matchup-config/:matchup` - Set default reference
3. Reference upload:
   - Store replay file in Blob
   - Extract fingerprint via sc2reader
   - Store reference with cached fingerprint

**Week 3: Enhanced Metrics from sc2reader**

Update sc2reader `/metrics` endpoint to return:

```python
# New fields in player metrics
{
  # Existing fields...

  # Production breakdown (NEW)
  "production_by_building": {
    "Barracks": {"count": 2, "idle_seconds": 18, "production_cycles": 12},
    "Factory": {"count": 1, "idle_seconds": 12, "production_cycles": 6},
    "Starport": {"count": 1, "idle_seconds": 6, "production_cycles": 4}
  },

  # Macro abilities (NEW for Terran/Protoss, existing for Zerg)
  "mule_count": 12,
  "mule_possible": 14,
  "mule_efficiency": 85.7,
  "calldown_supply_count": 2,

  # Supply details (NEW)
  "supply_at_checkpoints": {
    "180": 42,   # 3:00
    "300": 68,   # 5:00
    "420": 92,   # 7:00
    "600": 142   # 10:00
  },
  "supply_block_events": [
    {"time": 222, "duration": 5, "supply": 46},
    {"time": 318, "duration": 8, "supply": 62},
    {"time": 525, "duration": 5, "supply": 98}
  ]
}
```

### Phase 11: Overview Dashboard UI

**Week 4: Three Pillars Components**

1. Create `PillarCard` component:
   ```typescript
   interface PillarCardProps {
     title: string;
     icon: React.ReactNode;
     score: number | null;
     subtitle: string;
     tooltipContent: React.ReactNode;
     disabled?: boolean;  // For Vision "Coming Soon"
   }
   ```

2. Create `ProductionTooltip` component with breakdown
3. Create `SupplyTooltip` component with events list
4. Create `ThreePillars` container component

**Week 5: Matchup & Reference Tables**

1. Create `MatchupBreakdownTable` component:
   - Aggregate stats from replay index
   - Dropdown to assign reference per matchup
   - Click row to filter list view

2. Create `ReferenceBuildTable` component:
   - List user's references
   - Edit/delete actions
   - Show usage stats

3. Create `AddReferenceModal` component:
   - Alias input
   - Matchup selector
   - Source selection (upload, my replay, site build)
   - Default checkbox

**Week 6: Data-Driven Insights**

1. Create `InsightsEngine` utility:
   ```typescript
   function generateInsights(index: ReplayIndexEntry[]): Insight[] {
     const insights: Insight[] = [];

     // Win rate comparison
     const matchupWinRates = calculateMatchupWinRates(index);
     const avgWinRate = calculateOverallWinRate(index);
     for (const [matchup, rate] of Object.entries(matchupWinRates)) {
       if (rate < avgWinRate - 15) {
         insights.push({
           type: 'matchup_weakness',
           message: `Your ${matchup} win rate is ${avgWinRate - rate}% below average`,
           priority: 'high'
         });
       }
     }

     // Supply block analysis
     const avgSupplyBlocks = calculateAvgSupplyBlocks(index);
     if (avgSupplyBlocks > 2) {
       insights.push({
         type: 'supply_improvement',
         message: `Supply blocks cost you ~${avgBlockTime}s per game`,
         priority: 'medium'
       });
     }

     // Timing analysis vs reference
     // ...

     return insights.slice(0, 3);  // Top 3 insights
   }
   ```

2. Create `InsightsCard` component to display

### Phase 12: Replay Detail Page

**Week 7: Detail Page Structure**

1. Create route: `/my-replays/[id]/page.tsx`
2. Fetch full replay data on page load
3. Create `ReplayDetailHeader` component
4. Create `AssignReferenceDropdown` component

**Week 8: Production & Supply Breakdowns**

1. Create `ProductionBreakdown` collapsible section:
   - Per-building table
   - Idle time visualization (progress bars)
   - Macro ability efficiency

2. Create `SupplyBreakdown` collapsible section:
   - Block events table
   - Supply timeline visualization (checkpoints)

3. Create `ResourceManagement` section (stretch goal)

**Week 9: Build Comparison**

1. Create `BuildComparison` component:
   - Side-by-side timing table
   - Deviation highlighting (✓/⚠️/❌)
   - Overall match percentage

2. Integrate with reference selection
3. Show comparison only when reference assigned

---

## Performance Considerations

### Vercel KV Optimization

**Problem:** Fetching 30+ full replays for list view is slow and expensive.

**Solution:** Replay Index

```typescript
// Before: Multiple KV reads
const replays = await Promise.all(
  replayIds.map(id => kv.get(`user:${userId}:replays:${id}`))
);

// After: Single KV read
const index = await kv.get<ReplayIndexEntry[]>(`user:${userId}:replay_index`);
// Full data only on detail view
const replay = await kv.get<UserReplayData>(`user:${userId}:replays:${id}`);
```

**Estimated Sizes:**
- Full replay data: ~10KB each → 30 replays = 300KB
- Index entry: ~500 bytes each → 30 replays = 15KB
- 95% reduction in list view data transfer

### Browser Performance

1. **Memoization:**
   ```typescript
   const aggregatedStats = useMemo(() =>
     calculateAggregates(replayIndex),
     [replayIndex]
   );
   ```

2. **Virtual scrolling** for list view (if >50 replays)

3. **Lazy loading** of detail components

4. **IndexedDB caching** of replay index client-side

### Compute Limits

**Vercel Serverless:**
- Hobby: 10s timeout
- Pro: 60s timeout

**Mitigations:**
- Index updates are incremental (single entry)
- Aggregations happen client-side
- Heavy sc2reader processing is separate service
- Background jobs for migrations

---

## Migration Plan

### Existing Data Migration

1. **Non-breaking:** All new fields are optional
2. **Index generation:** Background script to create index for existing replays
3. **Gradual rollout:** Feature flag for new UI while testing

### Migration Script

```typescript
async function migrateToIndex(userId: string) {
  // Get all replay IDs
  const keys = await kv.keys(`user:${userId}:replays:*`);

  const index: ReplayIndexEntry[] = [];

  for (const key of keys) {
    const replay = await kv.get<UserReplayData>(key);
    if (replay) {
      index.push(createIndexEntry(replay));
    }
  }

  await kv.set(`user:${userId}:replay_index`, index);
}
```

---

## API Endpoints Summary

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/my-replays/index` | Get lightweight replay index |
| GET | `/api/my-references` | List user's reference builds |
| POST | `/api/my-references` | Create new reference |
| PUT | `/api/my-references/:id` | Update reference |
| DELETE | `/api/my-references/:id` | Delete reference |
| GET | `/api/my-matchup-config` | Get matchup configurations |
| PUT | `/api/my-matchup-config/:matchup` | Set default reference for matchup |

### Updated Endpoints

| Method | Path | Changes |
|--------|------|---------|
| POST | `/api/my-replays` | Also updates replay index |
| DELETE | `/api/my-replays/:id` | Also updates replay index |

---

## Open Questions

1. **Vision metrics:** What data do we need from sc2reader?
   - Creep spread % at intervals?
   - Scan count and timing?
   - Observer/revelation coverage?

2. **Reference sharing:** Should users be able to share references?
   - Public reference builds?
   - Coach-assigned references?

3. **Historical tracking:** Do we want to track score trends over time?
   - Weekly/monthly aggregates?
   - Progress charts?

4. **Notification system:** Alert when new replay auto-compared?

---

## Timeline Estimate

| Phase | Weeks | Focus |
|-------|-------|-------|
| 10 | 1-3 | Data model, APIs, sc2reader updates |
| 11 | 4-6 | Overview dashboard, Three Pillars |
| 12 | 7-9 | Detail page, comparisons |

**Total: ~9 weeks** for full implementation

Can parallelize some work:
- Backend APIs (Phase 10) + UI components (Phase 11) can overlap
- sc2reader updates can happen independently

---

## Comparison Framework (Enhanced)

### Existing Comparison UI

Based on current implementation, we already display:

1. **Timing Comparison**
   - First Gas: `0:27 / 0:43` with deviation `-17` (early)
   - First Factory: `1:33 / 2:22` with deviation `-50` (early)
   - First Starport: `2:20 / 3:07` with deviation `-48` (early)
   - Highlighting: Red/pink background for significant deviations

2. **Production Timeline (Cumulative)**
   - Minute-by-minute breakdown
   - Per unit: `actual / benchmark (±diff)`
   - Example: `SCV 48 / 63 (-15)` meaning 15 behind benchmark

3. **All Building Timings**
   - Grid of timing cards
   - First Gas, First Barracks, First Factory, etc.
   - Natural, Third, Fourth expansion timings
   - Upgrade completion times

4. **Upgrades Researched**
   - Tags showing completed upgrades

### Phase-Based Scoring (NEW)

Break the game into timestamp-based phases (avoiding controversial names):

```typescript
interface GamePhase {
  name: string;           // "0:00 - 3:00", "3:00 - 6:00", etc.
  start_seconds: number;
  end_seconds: number;
}

const GAME_PHASES: GamePhase[] = [
  { name: "Opening", start_seconds: 0, end_seconds: 180 },      // 0:00 - 3:00
  { name: "Early", start_seconds: 180, end_seconds: 360 },      // 3:00 - 6:00
  { name: "Mid", start_seconds: 360, end_seconds: 600 },        // 6:00 - 10:00
  { name: "Late", start_seconds: 600, end_seconds: 900 },       // 10:00 - 15:00
  { name: "Endgame", start_seconds: 900, end_seconds: Infinity } // 15:00+
];

interface PhaseScore {
  phase: GamePhase;
  worker_score: number;      // Worker count vs benchmark
  supply_score: number;      // Supply vs benchmark
  timing_score: number;      // Building/unit timings vs benchmark
  army_comp_score: number;   // Army composition similarity
  overall: number;           // Weighted average
}
```

### Comparison Data Structure

```typescript
interface DetailedComparison {
  reference_id: string;
  reference_alias: string;
  reference_player: string;  // Which player from reference replay

  // Overall scores
  overall_match: number;     // 0-100%

  // Per-phase breakdown
  phase_scores: PhaseScore[];

  // Timing comparisons
  building_timings: Array<{
    building: string;        // "First Factory", "Natural", etc.
    reference_time: number;
    actual_time: number | null;
    deviation: number;
    status: 'on_time' | 'early' | 'late' | 'very_late' | 'missing';
  }>;

  // Production timeline (per minute)
  production_timeline: Array<{
    minute: number;
    units: Array<{
      unit: string;
      actual: number;
      benchmark: number;
      diff: number;
    }>;
  }>;

  // Worker checkpoints
  worker_checkpoints: Array<{
    time_seconds: number;
    actual: number;
    benchmark: number;
    diff: number;
  }>;

  // Supply checkpoints
  supply_checkpoints: Array<{
    time_seconds: number;
    actual: number;
    benchmark: number;
    diff: number;
  }>;

  // Army composition at key moments
  army_snapshots: Array<{
    time_seconds: number;
    actual: Record<string, number>;    // unit -> count
    benchmark: Record<string, number>;
  }>;
}
```

### Build Detection Using Fingerprints

Instead of complex build detection, use **Levenshtein distance** on build sequences:

```typescript
interface BuildDetectionResult {
  detected_reference_id: string | null;
  detected_alias: string | null;
  confidence: number;              // 0-100%
  distance: number;                // Levenshtein distance
  can_be_overridden: boolean;      // Always true - user can change/remove
}

function detectBuild(
  replayFingerprint: ReplayFingerprint,
  userReferences: ReferenceReplay[]
): BuildDetectionResult {
  let bestMatch: ReferenceReplay | null = null;
  let bestDistance = Infinity;

  for (const ref of userReferences) {
    if (ref.matchup !== replayFingerprint.matchup) continue;

    // Compare build sequences
    const distance = levenshteinDistance(
      replayFingerprint.sequences.build_sequence,
      ref.fingerprint.sequences.build_sequence
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = ref;
    }
  }

  // Calculate confidence based on distance
  // Lower distance = higher confidence
  const maxLength = Math.max(
    replayFingerprint.sequences.build_sequence.length,
    bestMatch?.fingerprint.sequences.build_sequence.length || 1
  );
  const confidence = Math.max(0, 100 - (bestDistance / maxLength * 100));

  return {
    detected_reference_id: bestMatch?.id || null,
    detected_alias: bestMatch?.alias || null,
    confidence,
    distance: bestDistance,
    can_be_overridden: true
  };
}
```

### Reference Player Selection Logic

```typescript
interface ReferencePlayerSelection {
  source_type: 'site_replay' | 'site_build_order' | 'uploaded' | 'my_replay';
  auto_selected: boolean;
  player_name: string;
  selection_reason: string;
}

function selectReferencePlayer(
  source: ReferenceSource
): ReferencePlayerSelection {
  switch (source.type) {
    case 'site_replay':
      // Use coach's battle tag if available
      const coach = getCoachForReplay(source.replay_id);
      if (coach?.battle_tag) {
        // Find player matching coach's battle tag
        const player = source.players.find(p =>
          p.name.includes(coach.battle_tag)
        );
        if (player) {
          return {
            source_type: 'site_replay',
            auto_selected: true,
            player_name: player.name,
            selection_reason: `Auto-selected based on coach's battle tag: ${coach.battle_tag}`
          };
        }
      }
      // Fall through to user selection
      return {
        source_type: 'site_replay',
        auto_selected: false,
        player_name: '',  // User must select
        selection_reason: 'Please select which player to use as reference'
      };

    case 'site_build_order':
      // Build orders don't have players - use the build order data directly
      return {
        source_type: 'site_build_order',
        auto_selected: true,
        player_name: 'build_order',
        selection_reason: 'Using build order timings'
      };

    case 'my_replay':
      // Auto-select based on user's confirmed player names
      const userSettings = getUserSettings(source.user_id);
      const matchingPlayer = source.players.find(p =>
        userSettings.confirmed_player_names.includes(p.name)
      );
      if (matchingPlayer) {
        return {
          source_type: 'my_replay',
          auto_selected: true,
          player_name: matchingPlayer.name,
          selection_reason: `Auto-selected your player: ${matchingPlayer.name}`
        };
      }
      // Fall through to user selection
      return {
        source_type: 'my_replay',
        auto_selected: false,
        player_name: '',
        selection_reason: 'Please select which player to use as reference'
      };

    case 'uploaded':
      // User must always select for uploaded replays
      return {
        source_type: 'uploaded',
        auto_selected: false,
        player_name: '',
        selection_reason: 'Please select which player to use as reference'
      };
  }
}
```

### Recalculation Flow

When user changes reference build:

```typescript
async function onReferenceChanged(
  replayId: string,
  newReferenceId: string | null
): Promise<void> {
  if (!newReferenceId) {
    // User removed reference - clear comparison data
    await updateReplayComparison(replayId, null);
    return;
  }

  // 1. Check if we have reference metrics cached
  const reference = await getReference(newReferenceId);

  // 2. If reference fingerprint is already cached, compute client-side
  if (reference.fingerprint) {
    const replay = await getReplay(replayId);
    const comparison = computeComparison(replay.fingerprint, reference.fingerprint);
    await updateReplayComparison(replayId, comparison);
    return;
  }

  // 3. Otherwise, need to fetch/extract reference metrics first
  const referenceMetrics = await extractReferenceMetrics(reference);
  await updateReferenceCache(newReferenceId, referenceMetrics);

  // 4. Then compute comparison
  const replay = await getReplay(replayId);
  const comparison = computeComparison(replay.fingerprint, referenceMetrics);
  await updateReplayComparison(replayId, comparison);
}
```

---

## Index Synchronization Strategy

### The Problem

We have multiple data stores that must stay in sync:
- **Vercel KV**: Replay index, full replay data, references, settings
- **Vercel Blob**: Replay files, hash manifest

If index gets out of sync with actual data, users see inconsistent state.

### Synchronization Approach

#### 1. Atomic Operations

Always update index and data together:

```typescript
async function uploadReplay(userId: string, replay: UserReplayData): Promise<void> {
  // Use a transaction-like pattern
  try {
    // 1. Store full replay data
    await kv.set(`user:${userId}:replays:${replay.id}`, replay);

    // 2. Update index atomically
    const index = await kv.get<ReplayIndexEntry[]>(`user:${userId}:replay_index`) || [];
    const newEntry = createIndexEntry(replay);
    index.push(newEntry);
    await kv.set(`user:${userId}:replay_index`, index);

  } catch (error) {
    // If index update fails, we have orphaned data
    // Log for manual cleanup, but don't fail the upload
    console.error('Index update failed, scheduling rebuild', error);
    await scheduleIndexRebuild(userId);
    throw error;
  }
}
```

#### 2. Version Tracking

Track index version to detect staleness:

```typescript
interface ReplayIndex {
  version: number;           // Increment on every change
  last_updated: string;      // ISO timestamp
  replay_count: number;      // Quick integrity check
  entries: ReplayIndexEntry[];
}

async function validateIndex(userId: string): Promise<boolean> {
  const index = await kv.get<ReplayIndex>(`user:${userId}:replay_index`);
  if (!index) return true;  // No index yet

  // Count actual replays
  const keys = await kv.keys(`user:${userId}:replays:*`);

  if (keys.length !== index.replay_count) {
    console.warn(`Index mismatch: ${keys.length} replays, ${index.replay_count} in index`);
    return false;
  }

  return true;
}
```

#### 3. Background Rebuild

If index corruption detected, rebuild in background:

```typescript
async function rebuildIndex(userId: string): Promise<void> {
  console.log(`Rebuilding index for user ${userId}`);

  // 1. Get all replay keys
  const keys = await kv.keys(`user:${userId}:replays:*`);

  // 2. Fetch all replays (in batches to avoid timeout)
  const entries: ReplayIndexEntry[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const replays = await Promise.all(
      batch.map(key => kv.get<UserReplayData>(key))
    );

    for (const replay of replays) {
      if (replay) {
        entries.push(createIndexEntry(replay));
      }
    }
  }

  // 3. Sort by upload date (newest first)
  entries.sort((a, b) =>
    new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  );

  // 4. Store rebuilt index
  const newIndex: ReplayIndex = {
    version: Date.now(),
    last_updated: new Date().toISOString(),
    replay_count: entries.length,
    entries
  };

  await kv.set(`user:${userId}:replay_index`, newIndex);
  console.log(`Index rebuilt: ${entries.length} entries`);
}
```

#### 4. Periodic Validation

On each page load, quick validation:

```typescript
// In the my-replays page loader
async function loadReplays(userId: string) {
  const index = await kv.get<ReplayIndex>(`user:${userId}:replay_index`);

  // Quick staleness check (compare age)
  if (index && isIndexStale(index)) {
    // Trigger background rebuild, but return current data
    void rebuildIndex(userId).catch(console.error);
  }

  return index?.entries || [];
}

function isIndexStale(index: ReplayIndex): boolean {
  const age = Date.now() - new Date(index.last_updated).getTime();
  const ONE_HOUR = 60 * 60 * 1000;

  // Consider stale if > 1 hour old and we've detected issues before
  return age > ONE_HOUR && hasKnownIssues(index);
}
```

#### 5. Manual Rebuild Trigger

Allow users to force rebuild if they see issues:

```typescript
// API: POST /api/my-replays/rebuild-index
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await rebuildIndex(session.user.id);

  return NextResponse.json({ success: true });
}
```

---

## Data Requirements from sc2reader

### Currently Available (from /metrics)

```python
# Per player
{
  "name": "Lotus",
  "race": "Terran",
  "result": "Win",
  "production_score": 78,
  "production_idle_total": 36,
  "production_idle_percent": 5.4,
  "supply_score": 85,
  "supply_block_total": 18,
  "supply_block_count": 3,
  "avg_mineral_float": 412,
  "avg_gas_float": 189,
  "build_order": [...],
  "fingerprint": {...}
}
```

### Needed for Comparison (NEW)

```python
# Enhanced player metrics
{
  # ... existing fields ...

  # Per-building production breakdown
  "production_by_building": {
    "Barracks": {
      "count": 2,
      "idle_seconds": 18,
      "production_cycles": 12,
      "first_completed": 45        # timestamp
    },
    "Factory": {
      "count": 1,
      "idle_seconds": 12,
      "production_cycles": 6,
      "first_completed": 93
    },
    "Starport": {
      "count": 1,
      "idle_seconds": 6,
      "production_cycles": 4,
      "first_completed": 140
    }
  },

  # Key building timings (seconds)
  "building_timings": {
    "first_gas": 27,
    "second_gas": 126,
    "first_barracks": 45,
    "first_factory": 93,
    "first_starport": 140,
    "first_armory": 498,
    "natural": 442,
    "third": 606,
    "fourth": null               # didn't happen
  },

  # Worker counts at checkpoints
  "workers_at_checkpoints": {
    "60": 16,    # 1:00
    "120": 22,   # 2:00
    "180": 28,   # 3:00
    "240": 34,   # 4:00
    "300": 42,   # 5:00
    "360": 48,   # 6:00
    "420": 54,   # 7:00
    "480": 58,   # 8:00
    "540": 62,   # 9:00
    "600": 65    # 10:00
  },

  # Supply at checkpoints
  "supply_at_checkpoints": {
    "180": 42,
    "300": 68,
    "420": 92,
    "600": 142
  },

  # Supply block events (with timestamps)
  "supply_block_events": [
    {"time": 222, "duration": 5, "supply": 46},
    {"time": 318, "duration": 8, "supply": 62}
  ],

  # Army composition at key moments
  "army_at_checkpoints": {
    "180": {"Marine": 6, "SCV": 28},
    "300": {"Marine": 12, "Hellion": 4, "SCV": 42, "SiegeTank": 2},
    "420": {"Marine": 18, "SiegeTank": 4, "Medivac": 2, "SCV": 54},
    "600": {"Marine": 30, "SiegeTank": 8, "Medivac": 4, "Thor": 2, "SCV": 65}
  },

  # Cumulative production per minute (for timeline)
  "production_by_minute": {
    "1": {"SCV": 4},
    "2": {"SCV": 7, "Marine": 1, "Reaper": 0},
    "3": {"SCV": 10, "Marine": 3, "Reaper": 0},
    "4": {"SCV": 14, "Marine": 6, "Reaper": 0, "Cyclone": 1},
    "5": {"SCV": 17, "Marine": 7, "Banshee": 2, "SiegeTank": 1}
    # ... continues
  },

  # Macro ability tracking (Terran)
  "mule_count": 12,
  "mule_possible": 14,
  "mule_efficiency": 85.7,
  "calldown_supply_count": 2,

  # Upgrade timings
  "upgrade_timings": {
    "BansheeCloak": 308,
    "TerranVehicleWeaponsLevel1": 612,
    "TerranVehicleAndShipArmorsLevel1": 618
  }
}
```

---

## Updated Detail Page UI (Based on Screenshots)

### Tab Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│   [Overview]   [Vision]   [Production]   [Supply]               │
│                (disabled)  (active)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Production Tab Content

```
┌─────────────────────────────────────────────────────────────────┐
│ TIMING COMPARISON                                               │
│ How your timings compare to the target build                    │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ⊗ First Gas                          0:27 / 0:43    -17    ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ⊗ First Factory          [RED BG]    1:33 / 2:22    -50    ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ⊗ First Starport                     2:20 / 3:07    -48    ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ PRODUCTION TIMELINE (Cumulative)                                │
│ Total units produced minute-by-minute vs benchmark              │
│                                                                 │
│ Minute 1                                                        │
│ ┌────────────┐                                                 │
│ │ SCV    4/4 │                                                 │
│ └────────────┘                                                 │
│                                                                 │
│ Minute 2                                                        │
│ ┌────────────┐ ┌────────────┐ ┌────────────────┐              │
│ │Reaper 0/1  │ │ SCV    7/7 │ │ Marine  1/0    │              │
│ │      (-1)  │ │            │ │        (+1)    │              │
│ └────────────┘ └────────────┘ └────────────────┘              │
│                                                                 │
│ Minute 3                                                        │
│ ┌────────────┐ ┌────────────┐ ┌────────────────┐              │
│ │SCV  10/12  │ │Reaper 0/1  │ │ Marine  3/2    │              │
│ │      (-2)  │ │      (-1)  │ │        (+1)    │              │
│ └────────────┘ └────────────┘ └────────────────┘              │
│                                                                 │
│ ... continues through game duration ...                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ UPGRADES RESEARCHED                                             │
│ Tech progression during the game                                │
│                                                                 │
│ [BansheeCloak] [TerranVehicleWeaponsLevel1] [TerranVehicle...]  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ALL BUILDING TIMINGS                                            │
│ Complete timing breakdown for all buildings                     │
│                                                                 │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│ │ First Gas  │ │First Rax   │ │First Fact  │                  │
│ │   0:27     │ │   0:45     │ │   1:33     │                  │
│ └────────────┘ └────────────┘ └────────────┘                  │
│                                                                 │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│ │ Second Gas │ │First Star  │ │BansheeCloak│                  │
│ │   2:06     │ │   2:20     │ │   5:08     │                  │
│ └────────────┘ └────────────┘ └────────────┘                  │
│                                                                 │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│ │ Natural    │ │First Armory│ │   Third    │                  │
│ │   7:22     │ │   8:18     │ │  10:06     │                  │
│ └────────────┘ └────────────┘ └────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deviation Highlighting

Color coding for timing deviations:
- **Green** (✓): Within 10 seconds of target
- **Yellow** (⚠️): 10-30 seconds off
- **Orange**: 30-60 seconds off
- **Red** (❌): >60 seconds off or missing

Positive vs Negative:
- Negative numbers (early) shown in **green** text: `-17`
- Positive numbers (late) shown in **red** text: `+30`
- On-time shown in **gray**: `±0`

---

## Implementation Checklist

### Phase 10: Data Model & APIs

#### 10.1 Replay Index System
- [ ] Create `ReplayIndexEntry` type in `src/lib/replay-types.ts`
- [ ] Create `ReplayIndex` wrapper type with version/count tracking
- [ ] Create `createIndexEntry()` helper function
- [ ] Add `GET /api/my-replays/index` endpoint
- [ ] Modify `POST /api/my-replays` to update index on upload
- [ ] Modify `DELETE /api/my-replays/[id]` to update index on delete
- [ ] Add `POST /api/my-replays/rebuild-index` endpoint for manual rebuild
- [ ] Create migration script for existing users
- [ ] Add index validation on page load
- [ ] Add background rebuild trigger when corruption detected

#### 10.2 Reference Replay System
- [ ] Create `ReferenceReplay` type
- [ ] Create `UserMatchupConfig` type
- [ ] Create `ReferenceComparison` type
- [ ] Add `GET /api/my-references` endpoint
- [ ] Add `POST /api/my-references` endpoint
- [ ] Add `PUT /api/my-references/[id]` endpoint
- [ ] Add `DELETE /api/my-references/[id]` endpoint
- [ ] Add `GET /api/my-matchup-config` endpoint
- [ ] Add `PUT /api/my-matchup-config/[matchup]` endpoint
- [ ] Implement reference player auto-selection logic
- [ ] Handle reference upload (store in Blob, extract fingerprint)
- [ ] Handle "select from my replays" source
- [ ] Handle "select from site build orders" source
- [ ] Handle "select from site replays" source (use coach battle tag)

#### 10.3 Enhanced sc2reader Metrics
- [ ] Add `production_by_building` to /metrics response
- [ ] Add `building_timings` (first_gas, first_barracks, etc.)
- [ ] Add `workers_at_checkpoints` (every minute up to 10:00)
- [ ] Add `supply_at_checkpoints` (3:00, 5:00, 7:00, 10:00)
- [ ] Add `supply_block_events` array with timestamps
- [ ] Add `army_at_checkpoints` (composition snapshots)
- [ ] Add `production_by_minute` (cumulative unit counts)
- [ ] Add `mule_count`, `mule_possible`, `mule_efficiency` (Terran)
- [ ] Add `calldown_supply_count` (Terran)
- [ ] Add `chrono_count`, `chrono_efficiency` (Protoss) - if not exists
- [ ] Add `upgrade_timings` with timestamps
- [ ] Update TypeScript types to match new response shape
- [ ] Add tests for new metrics extraction

#### 10.4 Build Detection Refactor
- [ ] Implement Levenshtein distance function for build sequences
- [ ] Create `detectBuild()` function comparing to user's references
- [ ] Add confidence calculation based on distance
- [ ] Update UI to show detected reference alias (not hardcoded build names)
- [ ] Fix "NaN% confidence" bug in current display
- [ ] Add "Change" and "Remove" actions for detected build
- [ ] Make detection optional (show "No reference" state)

### Phase 11: Overview Dashboard UI

#### 11.1 Three Pillars Components
- [ ] Create `PillarCard` component with score, subtitle, tooltip
- [ ] Create `VisionPillar` (disabled state, "Coming Soon")
- [ ] Create `ProductionPillar` with idle time breakdown
- [ ] Create `SupplyPillar` with block count/time
- [ ] Create `ProductionTooltip` with per-building breakdown
- [ ] Create `SupplyTooltip` with block events and checkpoints
- [ ] Create `ThreePillars` container component
- [ ] Add responsive layout for mobile

#### 11.2 Summary Stats Row
- [ ] Update Win Rate card calculation from index
- [ ] Update Total Games card from index
- [ ] Update Most Played matchup from index
- [ ] Update Avg Execution from index (weighted by pillar scores)

#### 11.3 Matchup Breakdown Table
- [ ] Create `MatchupBreakdownTable` component
- [ ] Calculate per-matchup stats from index (games, win%, prod, supply)
- [ ] Add reference build dropdown per matchup row
- [ ] Link to filter list view by matchup on row click
- [ ] Show visual indicators for weak matchups

#### 11.4 Reference Builds Table
- [ ] Create `ReferenceBuildTable` component
- [ ] List user's references with alias, matchup, source, usage stats
- [ ] Add Edit action (opens modal to change alias/default)
- [ ] Add Delete action with confirmation
- [ ] Show "Games" count and "Avg Score" against each reference

#### 11.5 Add Reference Modal
- [ ] Create `AddReferenceModal` component
- [ ] Alias input field
- [ ] Matchup dropdown
- [ ] Source selection (radio buttons):
  - [ ] Upload a replay file (with dropzone)
  - [ ] Select from my uploaded replays (searchable dropdown)
  - [ ] Select from site build orders (searchable dropdown)
  - [ ] Select from site replays (searchable dropdown, future)
- [ ] Reference player selection (if needed for source)
- [ ] "Set as default for matchup" checkbox
- [ ] Form validation and error handling
- [ ] Loading state during fingerprint extraction

#### 11.6 Data-Driven Insights
- [ ] Create `InsightsEngine` utility function
- [ ] Detect matchup weaknesses (win rate below average)
- [ ] Detect supply block patterns
- [ ] Detect timing deviations vs reference
- [ ] Create `InsightsCard` component
- [ ] Show top 3 actionable insights

### Phase 12: Replay Detail Page

#### 12.1 Detail Page Structure
- [ ] Create/update `/my-replays/[id]/page.tsx` route
- [ ] Fetch full replay data from KV on page load
- [ ] Create `ReplayDetailHeader` component (map, matchup, result, date)
- [ ] Create `AssignReferenceDropdown` component
- [ ] Add "Recalculate" button when reference changes

#### 12.2 Tab Navigation
- [ ] Create tab component: Overview | Vision | Production | Supply
- [ ] Vision tab: disabled with "Coming Soon" state
- [ ] Persist active tab in URL or local state
- [ ] Mobile-friendly tab navigation

#### 12.3 Overview Tab
- [ ] Show Three Pillars summary (scores only)
- [ ] Show key stats (duration, APM, MMR if available)
- [ ] Show reference comparison summary (if assigned)
- [ ] Quick links to other tabs

#### 12.4 Production Tab
- [ ] Create `TimingComparison` section
  - [ ] List building timings vs reference
  - [ ] Color-coded deviation badges
  - [ ] Red/pink background for significant deviations
- [ ] Create `ProductionTimeline` section
  - [ ] Minute-by-minute unit breakdown
  - [ ] Cumulative counts vs benchmark
  - [ ] Diff highlighting (+N green, -N red)
- [ ] Create `UpgradesResearched` section (tags)
- [ ] Create `AllBuildingTimings` grid
- [ ] Create per-building idle time breakdown table

#### 12.5 Supply Tab
- [ ] Show supply score with breakdown
- [ ] Create `SupplyBlockEvents` table
  - [ ] Time, duration, supply level columns
  - [ ] Notes/context if available
- [ ] Create `SupplyCheckpoints` visualization
  - [ ] Timeline with checkpoints at 3:00, 5:00, 7:00, 10:00
  - [ ] Actual vs benchmark at each checkpoint
- [ ] Show total time blocked
- [ ] Show worker counts at checkpoints

#### 12.6 Comparison Components
- [ ] Create `DetailedComparison` component
- [ ] Phase-based scoring breakdown (Opening, Early, Mid, Late)
- [ ] Per-phase metrics (workers, supply, timings, army comp)
- [ ] Overall match percentage
- [ ] Side-by-side timing table

#### 12.7 Build Order Section
- [ ] Keep existing build order table
- [ ] Add comparison column when reference assigned
- [ ] Highlight timing deviations inline

### Phase 13: Polish & Performance (Future)

#### 13.1 Performance Optimizations
- [ ] Implement IndexedDB caching for replay index
- [ ] Add virtual scrolling for list view (>50 replays)
- [ ] Lazy load detail page sections
- [ ] Memoize expensive calculations
- [ ] Add loading skeletons

#### 13.2 Error Handling
- [ ] Handle KV/Blob errors gracefully
- [ ] Show user-friendly error messages
- [ ] Add retry logic for failed API calls
- [ ] Log errors for debugging

#### 13.3 Mobile Responsiveness
- [ ] Test all components on mobile
- [ ] Adjust layouts for small screens
- [ ] Touch-friendly interactions

---

## Priority Order

**Immediate (This Week):**
1. [ ] Fix "NaN% confidence" bug
2. [ ] Create ReplayIndexEntry types
3. [ ] Implement replay index API

**Short Term (Next 2 Weeks):**
4. [ ] Update sc2reader with enhanced metrics
5. [ ] Create Three Pillars UI components
6. [ ] Implement reference replay system

**Medium Term (Weeks 3-4):**
7. [ ] Build comparison framework
8. [ ] Create detail page tabs
9. [ ] Implement production/supply breakdowns

**Ongoing:**
10. [ ] Add tests for new functionality
11. [ ] Performance optimization
12. [ ] User feedback and iteration

---

## Related Documentation

- **Main Project CLAUDE.md**: `/Users/chadfurman/projects/ladder-legends-academy/CLAUDE.md`
- **sc2reader API**: `/Users/chadfurman/projects/sc2reader/api/index.py`
- **Replay Types**: `/Users/chadfurman/projects/ladder-legends-academy/src/lib/replay-types.ts`
- **My Replays Page**: `/Users/chadfurman/projects/ladder-legends-academy/src/app/my-replays/`
