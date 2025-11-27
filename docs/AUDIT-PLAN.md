# Codebase Audit & Documentation Restructuring Plan

**Created:** 2025-11-26
**Status:** In Progress

---

## Overview

This document tracks a comprehensive audit of the Ladder Legends Academy codebase following 48 hours of rapid feature development in:
- `my-replays` components and pages
- `sc2reader` Python API
- `ladder-legends-uploader` Tauri app

The goals are:
1. Audit for code quality issues (duplication, maintainability, performance, type safety, security)
2. Consolidate scattered documentation into a single source of truth
3. Document architectural decisions and data flow
4. Implement missing features (download button)

---

## Phase 1: Documentation Restructuring

### Current State (Problems)
- 18+ markdown files scattered across root and various directories
- Multiple overlapping plan files (`PHASE-10-12-PLAN.md`, `MY-REPLAYS-OPTIMIZATION-PLAN.md`, etc.)
- No single entry point for understanding the system
- Architecture decisions not documented
- Data structures and algorithms not documented

### Target Structure
```
docs/
├── README.md                    # Entry point - links to everything
├── ACTIVE-TASK.md              # Current work in progress
├── architecture/
│   ├── overview.md             # System architecture overview
│   ├── data-flow.md            # How data flows through the system
│   └── storage.md              # Blob, KV, file storage decisions
├── features/
│   ├── my-replays.md           # My Replays feature documentation
│   ├── replay-analysis.md      # How replay analysis works
│   └── video-library.md        # Video/Mux integration
├── algorithms/
│   ├── production-metrics.md   # Army supply/min calculation
│   ├── supply-metrics.md       # Supply block tracking
│   └── phase-tracking.md       # Game phase detection
└── api/
    ├── sc2reader.md            # sc2reader API documentation
    └── routes.md               # Next.js API routes
```

### Tasks
- [ ] Create `docs/README.md` as central entry point
- [ ] Create `docs/architecture/overview.md`
- [ ] Create `docs/architecture/storage.md` (Blob structure, KV keys, etc.)
- [ ] Create `docs/algorithms/production-metrics.md` (ultrathink on phases/supply)
- [ ] Consolidate/archive old plan files
- [ ] Update CLAUDE.md to reference new docs structure

---

## Phase 2: Codebase Audit

### 2.1 Duplicate Code Detection
Files to audit:
- [ ] `src/components/my-replays/` - 16 components, ~140KB total
- [ ] `src/lib/replay-*.ts` - Multiple replay-related libs
- [ ] `scripts/remetrics-replays.ts` vs route handlers

Specific concerns:
- [ ] `buildFingerprints()` in remetrics-replays.ts duplicates route.ts logic
- [ ] SUPPLY_RATE_PER_BUILDING constants duplicated in three-pillars.tsx and inspect-production.ts
- [ ] Multiple places merge fingerprint data with same pattern

### 2.2 Maintainability Concerns
- [ ] Large files (>500 lines) that should be split
- [ ] Complex functions with high cyclomatic complexity
- [ ] Missing error handling
- [ ] Inconsistent patterns

### 2.3 Performance Concerns
- [ ] N+1 queries in replay loading
- [ ] Missing memoization in charts
- [ ] Large data transfers
- [ ] Client-side vs server-side computation balance

### 2.4 Type Safety Issues
- [ ] `as` casts that could fail
- [ ] Optional chaining that hides bugs
- [ ] Any types in lib code
- [ ] Missing validation at boundaries

### 2.5 Security Issues
- [ ] API authentication consistency
- [ ] Input validation
- [ ] Error message information leakage
- [ ] Blob URL exposure

### 2.6 Architectural Issues
- [ ] Responsibilities not clearly separated
- [ ] Coupling between components
- [ ] State management patterns
- [ ] Error propagation

---

## Phase 3: Feature Implementation

### 3.1 Download Button on My Replays List
- [ ] Add download icon/button to replay row in table
- [ ] Handle missing blob_url gracefully
- [ ] Consider download via API route vs direct blob URL

### 3.2 Remetrics Script Update
- [ ] Add phases data merging (total_army_supply_produced, production_buildings)
- [ ] Document when to use which flags
- [ ] Add progress logging improvements

---

## Phase 4: Understanding Phases & Supply Data

### Questions to Answer (Ultrathink)
1. What is `phases` data and where does it come from?
2. How is `total_army_supply_produced` calculated in sc2reader?
3. How do `production_buildings` counts work (snapshot vs cumulative)?
4. What's the relationship between phases and the Three Pillars metrics?
5. Are we correctly storing and retrieving this data?
6. What's missing in the remetrics script?

### Data Flow to Document
```
SC2 Replay File
    ↓
sc2reader /metrics endpoint
    ↓ (phases, production_by_building, supply_block_events)
/api/my-replays route.ts
    ↓ (merges into fingerprint)
Vercel KV (full replay data)
    ↓
Three Pillars Component
    ↓ (calculates army supply/min)
UI Display
```

---

## Progress Tracking

### Completed
- [x] Initial file discovery and structure analysis
- [x] Created this audit plan
- [x] Created `docs/README.md` entry point
- [x] Created `docs/architecture/storage.md`
- [x] Created `docs/algorithms/production-metrics.md`
- [x] Created `docs/ACTIVE-TASK.md`
- [x] Deep dive on phases/supply data (ultrathink) - COMPLETE
- [x] Moved old plan files to `docs/archive/`

### In Progress
- [x] Code audit for duplicates - FINDINGS BELOW

### Blocked
- None

---

## Audit Findings (2025-11-26)

### Summary

| Severity | Count | Categories |
|----------|-------|------------|
| CRITICAL | 5 | Security, Type Safety, Performance |
| HIGH | 4 | Security, Reliability, Maintainability |
| MEDIUM | 8 | Performance, Type Safety, Code Quality |
| LOW | 4 | Code Quality, UX |
| **Total** | **21** | |

---

### CRITICAL Issues

#### 1. ✅ FIXED: Remetrics Script Missing Phases Merge
**Location:** `scripts/remetrics-replays.ts:146-190`
**Status:** Fixed in commit 5747358

---

#### 2. Authorization Bypass - Missing Ownership Checks
**Location:** `src/app/api/my-replays/route.ts:167, 388, 429`

**Issue:** GET/PATCH/DELETE endpoints don't verify replay ownership:
- GET (line 167): Any authenticated user can fetch other users' replays
- PATCH (line 388): Updates replays without ownership verification
- DELETE (line 429): Only validates user exists, not replay ownership

**Risk:** Users can read, modify, or delete other users' replay data.

**Fix:** Add ownership check before returning/modifying data:
```typescript
if (replay.discord_user_id !== session.user.discordId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

#### 3. Missing File Size Validation
**Location:** `src/app/api/my-replays/route.ts:225-236`

**Issue:** No file size check before processing upload. User could upload 10GB file.

**Risk:** Memory exhaustion, resource denial.

**Fix:** Add size check:
```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json({ error: 'File too large' }, { status: 413 });
}
```

---

#### 4. Unsafe Type Casts Without Validation
**Location:** `src/app/api/my-replays/route.ts:249, 284`

**Issue:** `as` casts assume sc2reader returns expected structure without runtime validation.

**Risk:** Silent failures if sc2reader response changes.

**Fix:** Add Zod schema validation before casting.

---

#### 5. Error Message Information Leakage
**Location:** `src/app/api/my-replays/route.ts:370-373`

**Issue:** Raw error messages exposed to client, revealing system details.

**Fix:** Map errors to generic user-facing messages, log details server-side only.

---

### HIGH Issues

#### 6. N+1 Query Pattern in Replay Loading
**Location:** `src/lib/replay-kv.ts:105-122`

**Issue:** `getUserReplays()` does 1 + N KV reads (1 for list, N for each replay).
- 100 replays = 101 operations = ~$0.10 per fetch

**Fix:** Use `getReplayIndex()` for list views, lazy load full data.

---

#### 7. Inconsistent Error Handling in Rollback
**Location:** `src/app/api/my-replays/route.ts:107-141`

**Issue:** Rollback errors are swallowed. If rollback fails, client sees "success" but data is inconsistent.

**Fix:** Collect rollback errors and return error response if any fail.

---

#### 8. Duplicate Player Detection Logic
**Location:** `src/components/my-replays/my-replays-table.tsx:105-168`

**Issue:** ~50 lines of player/opponent lookup logic duplicated 4+ times across components.

**Fix:** Extract to `src/lib/replay-player-detection.ts`.

---

#### 9. N+1 Query in Reference Loading
**Location:** `src/lib/replay-kv.ts:614-631`

**Issue:** Same N+1 pattern as replays. 10 references = 11 KV operations.

**Fix:** Batch operations or cache reference metadata.

---

### MEDIUM Issues

#### 10. Large Component (531 lines)
**Location:** `src/components/my-replays/my-replays-content.tsx`

**Issue:** 11 useMemo calls, 5 state variables, mixed responsibilities.

**Fix:** Extract `useReplayFilters()`, `useReplayStats()` hooks.

---

#### 11. Missing Memoization for Player Lookups
**Location:** `src/components/my-replays/my-replays-table.tsx:105-134`

**Issue:** Linear search O(n*m) runs on every row render.

**Fix:** Use `useMemo` with Map for O(1) lookups.

---

#### 12. Missing Null Safety Checks
**Location:** `src/lib/replay-kv.ts:364-452`

**Issue:** Destructures `replay.fingerprint` without null check.

**Fix:** Add upfront validation or optional chaining.

---

#### 13. Session Type Casting
**Location:** `src/lib/api-auth.ts:115-117`

**Issue:** Creates incomplete Session object and casts as Session.

**Fix:** Change `checkPermission` to accept roles directly.

---

#### 14. Index Rebuild on Every Entry
**Location:** `src/lib/replay-kv.ts:483-520`

**Issue:** Every upload increments index version, forcing full re-read.

**Fix:** Use atomic increment, only bump on bulk operations.

---

#### 15. Synchronous DOM Manipulation
**Location:** `src/components/my-replays/my-replays-table.tsx:315-325`

**Issue:** Download handler uses DOM manipulation with non-null assertion.

**Fix:** Add error handling, use `link.remove()`.

---

#### 16. Optional Chaining Hiding Logic Errors
**Location:** `src/components/my-replays/my-replays-content.tsx:43-55`

**Issue:** Role check could fail silently if undefined.

**Fix:** Explicit null checks with logging.

---

#### 17. Duplicate Constants
**Location:** `three-pillars.tsx:15`, `inspect-production.ts:9`

**Issue:** `SUPPLY_RATE_PER_BUILDING` defined twice.

**Fix:** Extract to `src/lib/constants/production.ts`.

---

### LOW Issues

#### 18. Race Condition in Concurrent Uploads
**Location:** `src/lib/replay-kv.ts:127-142`

**Issue:** Two concurrent uploads could lose one due to last-write-wins.

**Fix:** Use atomic operations or document serial requirement.

---

#### 19. Browser Locale-Dependent Dates
**Location:** `src/components/my-replays/my-replays-table.tsx:71-74`

**Issue:** Hardcoded 'en-US' despite user locale.

**Fix:** Use consistent date formatting library.

---

#### 20. Unused getRaceColor Function
**Location:** `src/components/my-replays/my-replays-table.tsx:26-29`

**Issue:** Always returns same value, ignores parameter.

**Fix:** Implement or remove.

---

#### 21. Analytics Infrastructure Leakage
**Location:** `src/app/api/my-replays/route.ts:45-50`

**Issue:** Console logs reveal dev vs prod environment.

**Fix:** Use structured logging, hide in production.

---

## Priority Remediation Plan

### Phase 1: Security (Do Today)
- [ ] Add ownership checks to GET/PATCH/DELETE endpoints
- [ ] Add file size validation to upload
- [ ] Replace error message exposure with generic messages
- [ ] Add Zod validation for sc2reader responses

### Phase 2: Performance (This Week)
- [ ] Replace N+1 query patterns with index-based loading
- [ ] Implement incremental index updates
- [ ] Add memoization for player lookups

### Phase 3: Maintainability (This Sprint)
- [ ] Extract duplicate player detection logic to shared lib
- [ ] Extract filter/stats hooks from my-replays-content
- [ ] Fix rollback error handling
- [ ] Add null safety checks

### Phase 4: Cleanup (When Time Permits)
- [ ] Extract SUPPLY_RATE constants
- [ ] Fix date formatting consistency
- [ ] Remove/implement getRaceColor
- [ ] Address remaining LOW issues

---

## Next Actions

1. [x] **FIXED:** Add phases merge to remetrics script
2. [x] **VERIFIED:** Download button exists in my-replays-table.tsx
3. [ ] **SECURITY:** Fix authorization bypass (ownership checks)
4. [ ] **SECURITY:** Add file size validation
5. [ ] **CLEANUP:** Extract SUPPLY_RATE_PER_BUILDING to shared constants

---

## Deep Audit Findings (2025-11-26 Extended)

### Overview Dashboard Audit

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 22 | **Inconsistent calculation logic** - Three Pillars uses phases data, metrics-scoring uses idle time | CRITICAL | `three-pillars.tsx:42`, `metrics-scoring.ts:256` |
| 23 | **Double-counting idle time** - Overlapping building idle periods counted multiple times | CRITICAL | `metrics-scoring.ts:189-192` |
| 24 | **Missing opponent null check** - `opponents[0].race` without bounds check | CRITICAL | `my-replays-overview.tsx:204` |
| 25 | **Non-deterministic race selection** - Tie-breaking unstable in sort | CRITICAL | `my-replays-overview.tsx:174` |
| 26 | **Stale closure in useCallback** - `replayIds` derived from `filteredReplays` causes double-load | CRITICAL | `metrics-trends-chart.tsx:274` |
| 27 | **Expensive O(n*m) aggregation** - No memoization of player lookups | HIGH | `my-replays-overview.tsx:177-249` |
| 28 | **Double observer filtering** - Same filter runs in overview and ThreePillars | MEDIUM | `three-pillars.tsx:295`, `overview.tsx:136` |
| 29 | **Cache key doesn't include build filter** - Stale data when changing builds | MEDIUM | `metrics-trends-chart.tsx:243-254` |
| 30 | **ReplayIndexEntry ignored** - Recalculates scores instead of using index | MEDIUM | `my-replays-overview.tsx:226-237` |
| 31 | **Undocumented player name precedence** - 3 fallback sources | MEDIUM | `my-replays-overview.tsx:181-192` |

---

### Caching & Data Fetching Audit

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 32 | **No cache invalidation on delete/upload** - IndexedDB keeps stale data | CRITICAL | `my-replays-content.tsx:140-157` |
| 33 | **Cache key mismatch** - Matchup in key but validation uses filtered IDs | HIGH | `replay-cache.ts:139-146` |
| 34 | **Lost updates in concurrent renders** - No request ID, last write wins | HIGH | `metrics-trends-chart.tsx:232-274` |
| 35 | **IndexedDB transaction leaks** - No abort logic if Promise hangs | HIGH | `replay-cache.ts:116-130` |
| 36 | **Global DB instance never closed** - Memory leak on logout | MEDIUM | `replay-cache.ts:53-111` |
| 37 | **No TTL on index cache** - Could be months stale | MEDIUM | `replay-cache.ts:36-41` |
| 38 | **No schema validation on cache** - Old cached entries missing new fields | MEDIUM | `replay-cache.ts:193-225` |
| 39 | **Concurrent cache writes race** - Two periods computed simultaneously | MEDIUM | `replay-cache.ts:357-360` |
| 40 | **No abort in async computation** - Memory leak on navigation | MEDIUM | `replay-time-series.ts:376-401` |
| 41 | **Stale preferences with fresh data** - localStorage filter on new replays | MEDIUM | `use-chart-preferences.ts` |

---

### Index & Storage Audit

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 42 | **TOCTOU in addToReplayIndex** - Concurrent uploads lose entries | HIGH | `replay-kv.ts:483-520` |
| 43 | **TOCTOU in hash manifest** - Same race condition pattern | HIGH | `replay-hash-manifest.ts:95-119` |
| 44 | **Index validation only checks count** - Doesn't verify entries match | HIGH | `replay-kv.ts:588-605` |
| 45 | **Index scores often null** - Missing fields force full data fetch | MEDIUM | `replay-kv.ts:364-412` |
| 46 | **Metrics fields not fully stored** - Coaching metrics lost after upload | MEDIUM | `route.ts:318-343` |
| 47 | **Three successive fp.economy overwrites** - Inefficient merge pattern | MEDIUM | `route.ts:260-286` |
| 48 | **getUserReplayStats fetches all full replays** - Should use index | MEDIUM | `replay-kv.ts:229-255` |
| 49 | **No computed_at in index entries** - Can't detect stale scores | MEDIUM | `replay-types.ts:428-466` |
| 50 | **Reference queries use N+1 pattern** - 11 KV calls for 10 refs | LOW | `replay-kv.ts:614-630` |

---

### Replay Detail Page Audit

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 51 | **Non-null assertions on duration** - `duration!` can be null | CRITICAL | `[id]/page.tsx:855,865,873` |
| 52 | **Missing economy null check** - Crashes if fingerprint lacks economy | CRITICAL | `[id]/page.tsx:41-133` |
| 53 | **Unsafe .map() on undefined** - No guard on supply_block_periods | CRITICAL | `[id]/page.tsx:872,1019` |
| 54 | **supply_block_periods.end doesn't exist** - Type mismatch with actual data | HIGH | `[id]/page.tsx:884-885` |
| 55 | **Benchmark value inconsistency** - Different worker benchmarks in 3 places | HIGH | `[id]/page.tsx:71-91` vs `622-632` vs `752-775` |
| 56 | **Full replay list fetched for single ID** - Should use direct endpoint | HIGH | `[id]/page.tsx:184` |
| 57 | **Inline calculations not memoized** - Lines 585-720 recalc every render | MEDIUM | `[id]/page.tsx:585-720` |
| 58 | **Inconsistent null handling patterns** - Mix of `!== null`, `|| 0`, `!== undefined` | MEDIUM | Various |
| 59 | **No error boundary** - IIFE calculation errors crash page | MEDIUM | `[id]/page.tsx` |
| 60 | **Duplicate supply block severity logic** - 3 separate implementations | MEDIUM | `calculateTopIssues`, `SupplyBreakdown`, `page.tsx:876` |

---

## Updated Summary

| Area | CRITICAL | HIGH | MEDIUM | LOW | Total |
|------|----------|------|--------|-----|-------|
| API Route Security | 4 | 4 | 8 | 4 | 20 |
| Overview Dashboard | 5 | 1 | 4 | 0 | 10 |
| Caching/Data Fetching | 1 | 3 | 6 | 0 | 10 |
| Index/Storage | 0 | 3 | 6 | 1 | 10 |
| Detail Page | 3 | 3 | 4 | 0 | 10 |
| **TOTAL** | **13** | **14** | **28** | **5** | **60** |

---

## Revised Priority Remediation Plan

### Phase 1: Critical Security & Data Integrity (Immediate)
- [ ] Add ownership checks to GET/PATCH/DELETE endpoints (#2)
- [ ] Add file size validation (#3)
- [ ] Fix TOCTOU race conditions in index updates (#42, #43)
- [ ] Add cache invalidation on replay delete/upload (#32)
- [ ] Add null guards for duration and economy (#51, #52, #53)

### Phase 2: Calculation Consistency (This Week)
- [ ] Consolidate score calculation logic (Three Pillars vs metrics-scoring) (#22)
- [ ] Fix double-counting idle time calculation (#23)
- [ ] Standardize benchmark values across components (#55)
- [ ] Fix supply_block_periods.end type mismatch (#54)

### Phase 3: Performance & Caching (This Sprint)
- [ ] Fix cache key to not include matchup in key (#33)
- [ ] Add request ID to prevent race conditions (#34)
- [ ] Memoize expensive calculations in detail page (#57)
- [ ] Use index for stats queries instead of full data (#48)
- [ ] Close IndexedDB on logout (#36)

### Phase 4: Code Quality (Ongoing)
- [ ] Extract duplicate player detection logic
- [ ] Extract duplicate supply block severity logic (#60)
- [ ] Add error boundaries to detail page (#59)
- [ ] Document player name precedence (#31)
- [ ] Add computed_at to index entries (#49)

---

## Notes

### Files Modified in Last 48 Hours (High Priority for Audit)
Based on git history, focus on:
- `src/components/my-replays/*.tsx`
- `src/app/api/my-replays/route.ts`
- `src/lib/replay-types.ts`
- `src/lib/replay-time-series.ts`
- `scripts/remetrics-replays.ts`
