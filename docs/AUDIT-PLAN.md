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

## Notes

### Files Modified in Last 48 Hours (High Priority for Audit)
Based on git history, focus on:
- `src/components/my-replays/*.tsx`
- `src/app/api/my-replays/route.ts`
- `src/lib/replay-types.ts`
- `src/lib/replay-time-series.ts`
- `scripts/remetrics-replays.ts`
