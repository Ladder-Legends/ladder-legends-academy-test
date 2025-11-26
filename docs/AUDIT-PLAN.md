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

### CRITICAL: Remetrics Script Missing Phases Merge

**Issue:** `scripts/remetrics-replays.ts` `buildFingerprints()` function does NOT merge `phases` data.

**Impact:** Existing replays re-processed by remetrics won't get the new army supply/min metric.

**Location:** `scripts/remetrics-replays.ts:146-190`

**Current code merges:**
- ✅ `production_by_building`
- ✅ `supply_block_events` → `supply_block_periods`
- ❌ `phases` (MISSING!)

**route.ts has this (lines 279-286):**
```typescript
if (playerData.phases && fp.economy) {
  fp.economy = {
    ...fp.economy,
    phases: playerData.phases as ReplayFingerprint['economy']['phases'],
  };
}
```

**Fix:** Add the same block to remetrics buildFingerprints()

---

### MEDIUM: Duplicate Constants

**Issue:** `SUPPLY_RATE_PER_BUILDING` defined in two places.

**Locations:**
- `src/components/my-replays/three-pillars.tsx:15`
- `scripts/inspect-production.ts:9`

**Fix:** Extract to `src/lib/constants/production.ts`

---

### LOW: Type Safety in Tests

**Issue:** 20+ `as any` casts in test files (acceptable for mocking)

**Production code:** Only 1 cast in `metrics-trends-chart.tsx:142` - minor

---

### LOW: Large Files

Files over 500 lines (consider splitting):
- `my-replays-content.tsx`: 531 lines
- `metrics-trends-chart.tsx`: 531 lines

---

## Next Actions

1. [ ] **FIX CRITICAL:** Add phases merge to remetrics script
2. [ ] **FEATURE:** Add download button to my-replays-table.tsx
3. [ ] **CLEANUP:** Extract SUPPLY_RATE_PER_BUILDING to shared constants
4. [ ] **DOCS:** Update CLAUDE.md to reference new docs structure

---

## Notes

### Files Modified in Last 48 Hours (High Priority for Audit)
Based on git history, focus on:
- `src/components/my-replays/*.tsx`
- `src/app/api/my-replays/route.ts`
- `src/lib/replay-types.ts`
- `src/lib/replay-time-series.ts`
- `scripts/remetrics-replays.ts`
