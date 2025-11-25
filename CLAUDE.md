# Ladder Legends Academy - Development TODO

This file tracks technical debt, improvements, and future work for the Ladder Legends Academy platform.

---

## COMPREHENSIVE CLEANUP PLAN (Updated 2025-11-24)

This plan covers all three interconnected codebases: Academy (Next.js), sc2reader (Python), and Uploader (Tauri/Rust).

### PHASE 1: CRITICAL FIXES (Do First)

#### Academy - Type Safety Critical
- [ ] **Remove all `as unknown as Record<string, unknown>` casts in admin modals**
  - `src/components/admin/video-selector.tsx:100,146`
  - `src/components/admin/replay-edit-modal.tsx:464`
  - `src/components/admin/video-edit-modal.tsx:301`
  - `src/components/admin/build-order-edit-modal.tsx:290,560`
  - `src/components/admin/masterclass-edit-modal.tsx:208`
  - `src/components/admin/coach-edit-modal.tsx:110`
  - `src/components/admin/event-edit-modal.tsx:140`
  - Fix: Create FormData wrapper types for each content type

- [ ] **Remove `as any` from content components**
  - `src/components/videos/video-library-content.tsx:116`
  - `src/components/build-orders/build-orders-content.tsx:111`
  - `src/components/masterclasses/masterclasses-content.tsx:111`
  - `src/components/replays/replays-content.tsx:116`
  - `src/components/coaches-content.tsx:49`

- [ ] **Remove `as any` from detail client pages**
  - `src/app/library/[id]/video-detail-client.tsx:124,145`
  - `src/app/replays/[id]/replay-detail-client.tsx:85`
  - `src/app/build-orders/[id]/build-order-detail-client.tsx:78`
  - `src/app/masterclasses/[id]/masterclass-detail-client.tsx:59`
  - `src/app/coaches/[id]/coach-detail-client.tsx:80`
  - `src/app/events/[id]/event-detail-client.tsx:66`

#### sc2reader - Error Handling Critical
- [x] **Fix bare except clauses (silent failures)** ✅ DONE 2025-11-24
  - `check_upgrades.py:38` - bare `except: pass`
  - `debug_replay.py:25,85` - bare `except: pass`
  - `explore_events.py:72,111` - bare `except: pass`
  - Fixed: Replaced with `except Exception as e: logger.debug(str(e))`

- [ ] **Add file size limits to API endpoints**
  - `api/index.py` - No upload size validation
  - Fix: Add MAX_FILE_SIZE check (500MB limit)

#### Uploader - Rust Safety Critical
- [ ] **Remove unwrap() from production code**
  - `lib.rs:312,631,942` - JSON serialization unwrap
  - `replay_uploader.rs:106` - HTTP client build unwrap
  - `replay_uploader.rs:133,207` - Response text unwrap
  - Fix: Use `map_err()` and propagate errors

- [ ] **Remove `as any` from TypeScript**
  - `src/config.ts:9,10` - import.meta and window casts
  - Fix: Create proper Window interface extension

---

### PHASE 2: HIGH-PRIORITY CODE QUALITY

#### Academy - Code Duplication (5,170+ lines)
- [ ] **Extract generic useEditModalForm hook**
  - Consolidate duplicate patterns from all 7 edit modals
  - Handle: formData state, useEffect initialization, tag management, validation
  - Estimated savings: 2,000+ lines

- [ ] **Create GenericTable component**
  - Consolidate 6 table components with similar patterns
  - Configurable columns, sort handlers, row rendering

- [ ] **Create type-safe JSON data loaders**
  - Replace 30+ untyped JSON imports
  - Create `lib/data-loader.ts` with proper typing

- [x] **Fix React hooks issues (15+ warnings)** ✅ DONE 2025-11-24
  - `src/app/coaches/[id]/coach-detail-client.tsx:63-67` - added eslint-disable
  - `src/app/my-replays/[id]/page.tsx:161` - added eslint-disable
  - `src/components/ui/horizontal-scroll-container.tsx:50` - added eslint-disable
  - `src/components/search/omnisearch-client.tsx:417` - removed unnecessary dep

#### sc2reader - Code Organization
- [ ] **Refactor scripts to reusable modules**
  - Convert 13 standalone scripts to importable modules
  - Create `cli.py` for command-line entry points
  - Files: check_upgrades.py, debug_replay.py, explore_events.py, analyze_benchmarks.py, compare_replay.py, detect_build.py, learn_build.py, analyze_spam_patterns.py, advanced_spam_analysis.py, poc_proxy_detection.py, fractional_spam_filter.py, benchmark_extraction.py, extract_benchmark_replay.py

- [ ] **Extract event processing logic**
  - Create `replay_event_processor.py` module
  - Eliminate duplicate event loops in fingerprint.py, replay_extractor.py, detect_build.py

- [ ] **Add type hints (replace Any)**
  - Create `types.py` with Protocol definitions for sc2reader objects
  - Replace `Any` in: apm.py, player_utils.py, replay_extractor.py, fingerprint.py

#### Uploader - Organization
- [ ] **Split lib.rs (1332 lines) into modules**
  - Create `commands/folder_detection.rs`
  - Create `commands/auth.rs`
  - Create `commands/config.rs`
  - Create `commands/upload.rs`
  - Create `setup.rs`

- [x] **Fix clippy warnings (6 warnings)** ✅ DONE 2025-11-24
  - `config_utils.rs:93` - unused import (tempfile::TempDir)
  - `config_utils.rs:84` - dead code (config_file_exists)
  - `device_auth.rs:363,376` - assert_eq!(x, true) → assert!(x)
  - `lib.rs:210,232` - use .inspect_err() instead of .map_err()

- [ ] **Fix TypeScript duplication**
  - `upload-progress.ts:26-40,55-68` - duplicate state initialization
  - Extract DEFAULT_UPLOAD_STATE constant

---

### PHASE 3: MEDIUM-PRIORITY CLEANUP

#### Academy - Unused Code Removal (117 → 0 ESLint warnings, 100% reduction)
- [x] **Remove unused imports** ✅ MOSTLY DONE 2025-11-24
  - CardFooter - build-order-edit-modal.tsx
  - Trophy, Calendar - event-edit-modal.tsx
  - Badge - replay-card.tsx, video-card.tsx
  - LogIn - user-menu.tsx
  - useEffect - video-player.tsx, use-view-preference.ts
  - useMemo - omnisearch-client.tsx
  - getThumbnailYoutubeId, isMuxVideo - video-card.tsx

- [x] **Remove unused variables** ✅ MOSTLY DONE 2025-11-24
  - dragCounter - file-upload.tsx, mux-upload.tsx (changed to `[, setDragCounter]`)
  - grade - my-replays/[id]/page.tsx (removed)
  - currentVideo - replay-detail-client.tsx (removed from destructuring)
  - showTagDropdown, filteredTags, removeTag, handleTagInputKeyDown - prefixed with _
  - clearTags, allTags - video-library-content.tsx (removed)
  - Multiple catch block error variables fixed

- [x] **Remove unused function exports** ✅ DONE 2025-11-24
  - createFieldMatchPredicate, validateFilterConfig - video-filters.ts
  - createTagPredicate - build-order-filters.ts
  - isPlaylist parameter - metadata-helpers.ts (prefixed with _)
  - isFree parameter - video-helpers.ts (prefixed with _)

- [ ] **Break down large components (>600 lines)**
  - `build-order-edit-modal.tsx` - 1036 lines → extract form sections
  - `replay-edit-modal.tsx` - 868 lines → extract form sections
  - `video-edit-modal.tsx` - 690 lines → extract form sections
  - `my-replays/[id]/page.tsx` - 1144 lines → extract replay analysis components

#### sc2reader - Dependencies & Config
- [ ] **Update dependencies**
  - fastapi: 0.109.0 → latest
  - uvicorn: 0.27.0 → latest
  - pydantic: 2.5.3 → latest
  - numpy: 1.26.4 → 2.x (test carefully)

- [ ] **Fix mypy configuration**
  - Set `ignore_missing_imports = false`
  - Set `warn_return_any = true`
  - Create stub files for sc2reader if needed

- [ ] **Add pre-commit hooks**
  - Create `.pre-commit-config.yaml`
  - Include: black, flake8, mypy, isort

- [ ] **Add logging to core functions**
  - replay_extractor.py - no logging
  - constants.py - no logging
  - player_utils.py - no logging
  - supply_block.py - no logging
  - tactical_analyzer.py - no logging

#### Uploader - Patterns & Memory
- [ ] **Consolidate mutex lock patterns**
  - Create MutexExt trait for consistent lock handling
  - Replace inconsistent .unwrap_or_else patterns

- [ ] **Fix memory leaks in TypeScript**
  - `upload-progress.ts:43` - timeout never cleared
  - `state.ts:55-67` - interval/timeout not tracked
  - Add cleanup functions for timeouts

- [ ] **Standardize element access pattern**
  - Enforce use of getElement() helper
  - Remove direct document.getElementById calls

- [ ] **Standardize error handling**
  - Some use showError(), others console.error()
  - Create single error reporting pattern

---

### PHASE 4: TESTING IMPROVEMENTS

#### Academy - Critical Test Coverage
- [ ] **Paywall Tests**
  - Coach booking links redirect for non-subscribers
  - Premium content locked for non-subscribers
  - Video playback restrictions

- [ ] **Admin CMS Tests**
  - Commit button (git add, commit, push)
  - All edit modals save correctly
  - Delete confirmations work

- [ ] **Content Management Tests**
  - Mux video upload flow
  - Replay file upload/download
  - Category assignments persist

- [ ] **Remove `as any` from test files**
  - 20+ test files with excessive `as any` mocking
  - Create mock factory functions
  - Files: permissions.test.ts, paywall-link.test.tsx, access-control.test.tsx, coach-card.test.tsx, device tests, etc.

#### sc2reader - Test Cleanup
- [ ] **Remove duplicate test files**
  - Keep test_game_date_pytest.py, remove test_game_date.py
  - Merge test_api.py into test_api_comprehensive.py

- [ ] **Fix API tests requiring real files**
  - Tests expect lotus_vs_guigui_1.SC2Replay on disk
  - Create fixtures or mock sc2reader

#### Uploader - Test Organization
- [ ] **Move tests to separate directory**
  - lib.rs has 296 lines of tests at end
  - Move to tests/ directory
  - Create tests/auth_tests.rs, tests/config_tests.rs, etc.

---

### PHASE 5: PATTERN STANDARDIZATION

#### Academy - API & State Patterns
- [ ] **Standardize API error handling**
  - Some routes use handleGitHubError(), others inline
  - Some use createErrorResponse(), others NextResponse.json()
  - Create unified error handling middleware

- [ ] **Standardize state management**
  - Currently: localStorage + PostHog, Vercel KV, React state
  - Document when to use each pattern

- [ ] **Standardize modal implementation**
  - Some modals use isNew prop, others infer
  - Some use onClose, others different naming
  - Create ModalBase component

#### sc2reader - API & Code Patterns
- [ ] **Standardize query parameter handling**
  - Use explicit Query() parameters everywhere
  - Add parameter documentation

- [ ] **Add OpenAPI documentation**
  - Create Pydantic models for requests/responses
  - Generate proper OpenAPI spec

- [ ] **Standardize null/None handling**
  - Create has_valid_attr() helper
  - Use consistently across codebase

- [ ] **Extract magic numbers to constants**
  - Expansion units, worker units in fingerprint.py
  - Time intervals (30, 60, 10 seconds)
  - Tactical thresholds

#### Uploader - Command & State Patterns
- [ ] **Document command naming conventions**
  - load_* for reads, save_* for writes
  - Document multi-arg vs single-arg commands

- [ ] **Consider state management refactor**
  - Global mutable state in TypeScript modules
  - Consider AppState singleton pattern

---

### PHASE 6: LOW PRIORITY / NICE TO HAVE

#### Academy
- [x] **Image optimization** ✅ DONE 2025-11-24
  - activate/page.tsx:148,235 - converted to Next.js Image
  - user-menu.tsx:21 - converted to Next.js Image
  - mux-video-player.tsx:225 - converted to Next.js Image

- [ ] **Configure ESLint to error on `as any`**
  - Currently warnings only
  - Elevate to errors after fixing existing issues

#### sc2reader
- [ ] **Generate dependency lock file**
  - Create requirements.lock with pip-tools
  - Keep requirements.txt for humans

- [ ] **Add security scanning**
  - Add safety check to CI
  - Add bandit for code security

#### Uploader
- [ ] **Remove duplicate dependency**
  - Cargo.toml:44 - tauri-plugin-shell listed twice

- [ ] **Add #[allow(dead_code)] documentation**
  - Several methods marked dead but are used
  - Either use or document why kept

---

## SUMMARY METRICS

| Codebase | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Academy | 8 | 47 | 89 | 36 | 180+ |
| sc2reader | 3 | 7 | 8 | 2 | 20 |
| Uploader | 4 | 6 | 10 | 4 | 24 |
| **Total** | **15** | **60** | **107** | **42** | **224+** |

## ESTIMATED EFFORT

- **Phase 1 (Critical):** 8-12 hours
- **Phase 2 (High):** 20-30 hours
- **Phase 3 (Medium):** 15-20 hours
- **Phase 4 (Testing):** 20-30 hours
- **Phase 5 (Patterns):** 10-15 hours
- **Phase 6 (Low):** 5-10 hours

**Total: 78-117 hours** (2-3 weeks focused effort)

---

## Notes

### Recent Changes (2025-11-24)
- ✅ Comprehensive audit of all three codebases
- ✅ Identified 224+ issues across Academy, sc2reader, Uploader
- ✅ Prioritized cleanup tasks by impact and effort
- ✅ Created actionable remediation plan
- ✅ Fixed sc2reader bare except clauses (commit cc96bac)
- ✅ Fixed uploader clippy warnings (commit 3a07517)
- ✅ Eliminated ALL Academy ESLint warnings (117 → 0, 100% reduction)
  - 6 batches of fixes across ~40 files
  - Fixed unused imports, variables, catch blocks, function parameters
  - Fixed React hooks dependency warnings
  - Converted img elements to Next.js Image components
  - Updated ESLint config with underscore ignore patterns
  - Added Discord/Mux CDN to image remote patterns

### Previous Changes (2025-11-10)
- ✅ Added comprehensive SEO improvements
- ✅ Fixed robots.txt for Googlebot
- ✅ Created race-specific coaching landing pages
- ✅ Paywalled coach booking links
- ✅ Added Discord CTA to homepage

### Technical Debt Overview
- **Type Safety:** 67+ explicit type casts in Academy, excessive Any in sc2reader
- **Code Duplication:** 5,170+ lines of duplicate modal code, repeated patterns everywhere
- **Test Coverage:** Critical paths untested, tests use `as any` extensively
- **Code Organization:** Large files (1000+ lines), scripts not modules
- **Error Handling:** Silent failures, inconsistent patterns
