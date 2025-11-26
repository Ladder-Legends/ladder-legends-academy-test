# Active Task: Codebase Audit & Feature Completion

**Last Updated:** 2025-11-26
**Status:** In Progress

---

## Current Focus

### 1. Documentation Restructuring ✅ COMPLETE
- Created `docs/README.md` as central entry point
- Created `docs/architecture/storage.md` for data structures
- Created `docs/algorithms/production-metrics.md` for production pillar deep dive
- Created `docs/AUDIT-PLAN.md` for tracking audit progress

### 2. Code Audit (In Progress)
See [AUDIT-PLAN.md](./AUDIT-PLAN.md) for detailed tracking.

Priority areas:
- [ ] Duplicate code in my-replays components
- [ ] Remetrics script missing phases data merge
- [ ] Type safety issues
- [ ] Performance concerns

### 3. Feature Implementation (Pending)
- [ ] Add download button to my-replays list page
- [ ] Update remetrics script to merge phases data

---

## Quick Context

### Why This Audit?

48 hours of rapid development added:
- 16 new components in `src/components/my-replays/`
- New production metrics algorithm using phases data
- Multiple API route changes
- Type extensions in `replay-types.ts`

This audit ensures code quality before moving forward.

### Key Files to Review

| Area | Files | Concern |
|------|-------|---------|
| Production Metric | `three-pillars.tsx`, `route.ts` | Phases data flow |
| Duplicate Code | `remetrics-replays.ts`, `route.ts` | `buildFingerprints` function |
| Constants | `three-pillars.tsx`, `inspect-production.ts` | `SUPPLY_RATE_PER_BUILDING` |
| Types | `replay-types.ts` | Growing complexity |

### Known Issues

1. **Remetrics doesn't merge phases**: Existing replays won't show new production metric
2. **No download button**: Users can't download their replay files
3. **Duplicate constants**: `SUPPLY_RATE_PER_BUILDING` appears in multiple files

---

## Next Steps

1. Complete code audit (see AUDIT-PLAN.md)
2. Add download button to my-replays-table.tsx
3. Update remetrics script
4. Archive old plan files
5. Commit documentation changes

---

## Related Documents

- [AUDIT-PLAN.md](./AUDIT-PLAN.md) - Detailed audit checklist
- [architecture/storage.md](./architecture/storage.md) - Data structures
- [algorithms/production-metrics.md](./algorithms/production-metrics.md) - Production algorithm
- [../CLAUDE.md](../CLAUDE.md) - Main project instructions
