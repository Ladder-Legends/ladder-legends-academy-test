# Playlist System Architecture

**Last Updated:** 2025-11-02
**Status:** Planning Phase

## Table of Contents
1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Design Decisions](#design-decisions)
4. [Type Definitions](#type-definitions)
5. [Component Architecture](#component-architecture)
6. [Data Flow](#data-flow)
7. [Migration Plan](#migration-plan)
8. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Goals
- Standardize video selection/upload across all content types
- Support playlists (multiple videos) for all content types
- Maintain videos as standalone, searchable entities in `videos.json`
- Prevent metadata pollution (content-specific metadata shouldn't override video metadata)
- Provide clean UX for editing videos within playlist context

### Scope
**Content Types Receiving Playlist Support:**
- ✅ VOD Library (already has limited playlist support)
- 🆕 Masterclasses
- 🆕 Events
- 🆕 Build Orders
- 🆕 Replays

---

## Current State Analysis

### Existing VideoSelector Component
**Location:** `src/components/admin/video-selector.tsx`

**Current Capabilities:**
- ✅ Choose existing video from `videos.json` (with search)
- ✅ Upload new Mux video (creates entry in `videos.json`)
- ✅ Add new YouTube video (creates entry in `videos.json`)
- ✅ `suggestedTitle` prop to auto-populate title when uploading
- ❌ **No playlist support** (single selection only)
- ❌ **No edit button** for modifying selected video

### Current Usage Patterns

#### 1. Masterclass Edit Modal
```typescript
<VideoSelector
  selectedVideoId={formData.videoId}
  onVideoSelect={(videoId) => setFormData({ ...formData, videoId })}
  label="Video *"
  suggestedTitle={formData.title}
/>
```
**Problem:** When saving, it UPDATES the linked video's metadata (title, tags, race), which affects the video everywhere it's used. This violates the principle that videos are standalone.

#### 2. Build Order Edit Modal
```typescript
<VideoSelector
  selectedVideoId={formData.videoId}
  onVideoSelect={(videoId) => setFormData({ ...formData, videoId })}
  label="Video"
  suggestedTitle={formData.name}
/>
```
**Same problem:** Auto-updates video metadata on save.

#### 3. Replay Edit Modal
```typescript
<VideoSelector
  selectedVideoId={formData.videoId}
  onVideoSelect={(videoId) => setFormData({ ...formData, videoId })}
  label="Video"
  suggestedTitle={formData.title}
/>
```
**Same problem:** Auto-updates video metadata on save.

#### 4. Event Edit Modal
**Currently:** No video support at all.

#### 5. Video Edit Modal (VOD Library)
**Directly edits videos in `videos.json`.**
- Has YouTube playlist support via `youtubeIds[]` array
- Can add/remove YouTube video IDs manually
- No concept of linking to existing videos (it IS the video)

### Key Issues to Resolve

1. **Metadata Pollution:** Content-specific metadata (e.g., masterclass title) shouldn't automatically override video metadata
2. **No Editing from Playlist:** Can't edit a video's details when viewing it in a playlist context
3. **Inconsistent Playlist Support:** Only VOD library has playlists, implemented differently than needed
4. **Video Reuse Complexity:** When a video is used in multiple places, changes affect all uses unexpectedly

---

## Design Decisions

### ✅ Decision 1: All Videos in `videos.json`
**Rationale:** Single source of truth, searchable in VOD library, prevents duplication.

**Implications:**
- Every video (Mux or YouTube) goes into `videos.json`
- Videos are standalone entities with their own metadata
- Content items (masterclasses, events, etc.) reference videos by ID

---

### ✅ Decision 2: Simple Playlist Arrays
**Format:** `videoIds: ["vid1", "vid2", "vid3"]`

**Rationale:**
- Clean and simple
- No playlist-specific metadata overrides
- Easy to reorder
- Videos maintain their own metadata

**Rejected Alternative:** `[{id, title, order}]` - Too complex, violates single source of truth

---

### ✅ Decision 3: No Playlist-Specific Metadata Overrides
**When adding video to playlist:**
- If choosing existing video → Reuse its title and all metadata as-is
- If uploading new video → Set title during upload, then done

**To change video details:** Use "Edit" button to open `VideoEditModal`, which edits the video in `videos.json` (affects all uses)

**Rationale:**
- Videos are standalone entities
- Prevents metadata fragmentation
- Changes to video propagate everywhere (expected behavior)
- Clear separation of concerns: playlist = list of video IDs, videos = entities with metadata

---

### ✅ Decision 4: No Deprecated Code
**Always use `videoIds: string[]`** (never keep deprecated/legacy code):
- All content types use `videoIds` array exclusively
- Empty array (`[]`) means no videos
- Single video is `['videoId']` (array with one element)
- Playlists are `['vid1', 'vid2', 'vid3']` (array with multiple elements)
- **NO** `videoId?` field - deprecated code is always removed immediately

---

### ✅ Decision 5: Standardized Add Video Workflow

**Quick Workflow (Minimal):**
1. Click "Add Video to Playlist" (or "Select Video" for single)
2. Choose "Select Existing" OR "Upload New"
3. **If Selecting Existing:**
   - Search/browse existing videos
   - Select → Added with existing title/metadata
4. **If Uploading New:**
   - Set title (required)
   - Choose Mux upload OR YouTube ID
   - Upload/add → Creates video in `videos.json` → Added to playlist

**Edit Later:** Use "Edit" button on playlist entry to open full `VideoEditModal`

---

## Type Definitions

### Updated Content Type Interfaces

```typescript
// src/types/masterclass.ts
export interface Masterclass {
  id: string;
  title: string;
  description: string;
  coach: string;
  coachId: string;
  race: Race;

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  replayIds?: string[];
  duration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  isFree?: boolean;
}

// src/types/event.ts
export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: string;
  time: string;
  timezone: string;
  duration?: number;
  coach?: string;

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  isFree: boolean;
  tags: string[];
  recurring?: RecurringConfig;
  createdAt: string;
  updatedAt: string;
}

// src/types/build-order.ts
export interface BuildOrder {
  id: string;
  name: string;
  race: Race;
  vsRace: VsRace;
  type: BuildType;
  difficulty: Difficulty;
  coach: string;
  coachId: string;
  description: string;

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  replayId?: string;
  steps: BuildOrderStep[];
  tags: string[];
  patch?: string;
  updatedAt: string;
  isFree?: boolean;
}

// src/types/replay.ts
export interface Replay {
  id: string;
  title: string;
  map: string;
  matchup: Matchup;
  player1: ReplayPlayer;
  player2: ReplayPlayer;
  duration: string;
  gameDate: string;
  uploadDate: string;
  downloadUrl?: string;

  // Video support - array of video IDs from videos.json (empty array = no videos)
  videoIds: string[];

  coach?: string;
  coachId?: string;
  tags: string[];
  patch?: string;
  notes?: string;
  isFree?: boolean;
}
```

### Helper Functions

```typescript
// src/lib/video-helpers.ts

interface VideoReference {
  videoIds: string[];
}

/**
 * Get video IDs from content item
 */
export function getVideoIds(content: VideoReference): string[] {
  return content.videoIds || [];
}

/**
 * Check if content has multiple videos (is a playlist)
 */
export function isPlaylist(content: VideoReference): boolean {
  return content.videoIds.length > 1;
}

/**
 * Check if content has any videos
 */
export function hasVideos(content: VideoReference): boolean {
  return content.videoIds.length > 0;
}

/**
 * Get the first video ID (useful for thumbnails, etc.)
 */
export function getFirstVideoId(content: VideoReference): string | undefined {
  return content.videoIds.length > 0 ? content.videoIds[0] : undefined;
}
```

---

## Component Architecture

### Enhanced VideoSelector Component

**File:** `src/components/admin/video-selector.tsx`

#### Props Interface

```typescript
interface VideoSelectorProps {
  // Mode
  mode?: 'single' | 'playlist';

  // Single mode (current behavior, enhanced with edit)
  selectedVideoId?: string;
  onVideoSelect?: (videoId: string | undefined) => void;

  // Playlist mode (new)
  selectedVideoIds?: string[];
  onVideoIdsChange?: (videoIds: string[]) => void;

  // Common
  label?: string;
  suggestedTitle?: string;  // Pre-fill upload form
  className?: string;
  allowReorder?: boolean;   // Enable drag-to-reorder (playlist mode only)
}
```

#### UI Mockups

##### Single Mode
```
┌─────────────────────────────────────────────────────────┐
│ Video *                                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎬 Advanced ZvT Macro Guide                         │ │
│ │    Coach: Hino                                      │ │
│ │    [✎ Edit Video]  [× Remove]                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

When no video selected:
```
┌─────────────────────────────────────────────────────────┐
│ Video *                                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Search existing videos...]                            │
│                                                         │
│ [+ Upload New Video]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

##### Playlist Mode
```
┌─────────────────────────────────────────────────────────┐
│ Videos (Playlist)                              [+ Add]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 1. ⋮⋮ Part 1: Opening Strategy                     │ │
│ │       Coach: Hino    [✎ Edit] [×]                  │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 2. ⋮⋮ Part 2: Mid Game Transitions                 │ │
│ │       Coach: Hino    [✎ Edit] [×]                  │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 3. ⋮⋮ Part 3: Late Game Compositions               │ │
│ │       Coach: Hino    [✎ Edit] [×]                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Add Video Modal

When clicking "[+ Upload New Video]" or "[+ Add]" in playlist mode:

```
┌─────────────────────────────────────────────────────────┐
│ Add Video                                         [× ]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Choose an option:                                       │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📚 Select Existing Video                            │ │
│ │                                                     │ │
│ │ [Search videos...]                                 │ │
│ │                                                     │ │
│ │ Results:                                           │ │
│ │ • Advanced Macro Guide - Hino                      │ │
│ │ • ZvT All-ins - Richy                              │ │
│ │ • ...                                              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ➕ Upload New Video                                 │ │
│ │                                                     │ │
│ │ Title: [Part 4: Advanced Techniques]              │ │
│ │                                                     │ │
│ │ Source: [Mux] [YouTube]                            │ │
│ │                                                     │ │
│ │ [Upload file...] or [Enter YouTube ID...]          │ │
│ │                                                     │ │
│ │ [Create & Add to Playlist]                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Edit Button Behavior

**When clicking [✎ Edit]:**
- Opens `VideoEditModal` with the video
- Modal shows full video editing interface
- Changes save to `videos.json` (affects ALL content using this video)
- Warning shown: "Changes will affect all content using this video"

---

### VideoEditModal Updates

**File:** `src/components/admin/video-edit-modal.tsx`

**No major changes needed** - this component already handles full video editing.

**Optional Enhancement:**
- Add warning banner when editing a video that's used in multiple places
- Show list of content items using this video

---

## Data Flow

### Scenario 1: Creating New Masterclass with New Video

1. User opens "New Masterclass" modal
2. User fills in masterclass metadata (title, description, etc.)
3. User clicks VideoSelector's "[+ Upload New Video]"
4. User uploads Mux video with title "Advanced ZvT Guide"
5. VideoSelector:
   - Creates new video in `videos.json` via `addChange()`
   - Returns video ID to masterclass form
6. User saves masterclass
7. Masterclass saved with `videoIds: [newVideoId]`

**Result:**
- `videos.json` has new video entry
- `masterclasses.json` has new masterclass with `videoIds` array
- Video is searchable in VOD library

---

### Scenario 2: Creating Masterclass Playlist from Existing Videos

1. User opens "New Masterclass" modal (with `mode="playlist"`)
2. User fills in masterclass metadata
3. User clicks "[+ Add]" in VideoSelector (playlist mode)
4. User searches and selects existing video "Part 1: Basics"
5. VideoSelector adds video ID to `videoIds` array
6. User repeats for "Part 2: Advanced" and "Part 3: Pro Tips"
7. User saves masterclass

**Result:**
- No new videos created
- `masterclasses.json` has masterclass with `videoIds: ["vid1", "vid2", "vid3"]`
- All videos already exist in `videos.json`

---

### Scenario 3: Editing Video from Playlist

1. User opens existing masterclass with 3-video playlist
2. User clicks [✎ Edit] on second video
3. VideoEditModal opens showing video details
4. User changes video title, adds tags, updates description
5. User saves
6. Changes written to `videos.json`
7. **Automatic effect:** All masterclasses, replays, build orders using this video now show updated info

---

### Scenario 4: Removing Video from Playlist

1. User opens masterclass with playlist
2. User clicks [×] on a video
3. Video removed from `videoIds` array
4. Video still exists in `videos.json` (not deleted)
5. Video still searchable in VOD library
6. Video still referenced by other content if applicable

---

## Migration Plan

### Phase 1: Type Updates ✅
- [x] Update all content type interfaces to include `videoIds?: string[]`
- [x] Keep `videoId?: string` for backward compatibility
- [x] Create helper functions (`getVideoIds`, `isPlaylist`, `hasVideos`)

### Phase 2: VideoSelector Enhancement 🔄
- [ ] Add `mode` prop ('single' | 'playlist')
- [ ] Add playlist state management (`videoIds` array)
- [ ] Add "Edit" button for single mode
- [ ] Build playlist UI with drag-to-reorder
- [ ] Build "Add Video" modal for playlist mode
- [ ] Update to call `VideoEditModal` when Edit clicked

### Phase 3: Remove Metadata Pollution 🔄
- [ ] Remove auto-update logic from Masterclass edit modal
- [ ] Remove auto-update logic from BuildOrder edit modal
- [ ] Remove auto-update logic from Replay edit modal
- [ ] Videos should ONLY be edited via VideoEditModal

### Phase 4: Update Content Edit Modals 🔄
- [ ] Masterclass: Switch to playlist mode, default `mode="playlist"`
- [ ] Event: Add VideoSelector with `mode="playlist"`
- [ ] BuildOrder: Support both single and playlist (user choice or default playlist)
- [ ] Replay: Support both single and playlist
- [ ] VOD Library: Keep as-is (already edits videos directly)

### Phase 5: Update Detail Pages 🔄
- [ ] Masterclass detail page: Handle playlists
- [ ] Event detail page: Handle playlists
- [ ] BuildOrder detail page: Handle playlists
- [ ] Replay detail page: Handle playlists
- [ ] Video player components: Support playlist navigation

### Phase 6: Data Migration 🔄
- [ ] Script to convert existing `videoId` to `videoIds` format in data files
- [ ] Verify no data loss
- [ ] Update seed data

### Phase 7: Testing & Polish 🔄
- [ ] Test all CRUD operations for each content type
- [ ] Test video reuse across content types
- [ ] Test playlist reordering
- [ ] Test edit propagation (changing video affects all uses)
- [ ] Update documentation

---

## Implementation Checklist

### VideoSelector Component
- [ ] Add `mode` prop and conditional rendering
- [ ] Implement playlist state (array of video IDs)
- [ ] Add "Edit" button that opens VideoEditModal
- [ ] Build drag-to-reorder for playlist mode (use dnd-kit or similar)
- [ ] Create "Add Video" sub-modal/dropdown
  - [ ] "Select Existing" search interface
  - [ ] "Upload New" with title + Mux/YouTube choice
- [ ] Handle remove from playlist (doesn't delete video)
- [ ] Display selected video(s) with metadata preview

### Type Definitions
- [ ] Update `Masterclass` interface
- [ ] Update `Event` interface
- [ ] Update `BuildOrder` interface
- [ ] Update `Replay` interface
- [ ] Create helper functions in `src/lib/video-helpers.ts`

### Edit Modals
- [ ] **Masterclass Edit Modal:**
  - [ ] Switch VideoSelector to `mode="playlist"`
  - [ ] Remove auto-update video metadata logic
  - [ ] Handle `videoIds` array
- [ ] **Event Edit Modal:**
  - [ ] Add VideoSelector with `mode="playlist"`
  - [ ] Handle `videoIds` array
- [ ] **BuildOrder Edit Modal:**
  - [ ] Add mode toggle or default to playlist
  - [ ] Remove auto-update video metadata logic
  - [ ] Handle `videoIds` array
- [ ] **Replay Edit Modal:**
  - [ ] Add mode toggle or default to single
  - [ ] Remove auto-update video metadata logic
  - [ ] Handle `videoIds` array

### Detail Pages
- [ ] Masterclass detail: Playlist player
- [ ] Event detail: Playlist player
- [ ] BuildOrder detail: Playlist player
- [ ] Replay detail: Playlist player

### Video Player Components
- [ ] Update to handle playlist navigation
- [ ] Previous/Next video buttons
- [ ] Playlist sidebar showing all videos
- [ ] Current video indicator

### Data Migration
- [ ] Write migration script for existing data
- [ ] Test on copy of production data
- [ ] Execute migration

---

## Open Questions

### Q1: Should we allow mixing video sources in playlists?
**Example:** Playlist with 2 Mux videos + 1 YouTube video

**Decision:** ✅ Yes - VideoSelector already supports both, no reason to restrict

---

### Q2: Default mode for VideoSelector?
**Options:**
- Always require explicit `mode` prop
- Default to `mode="single"`
- Infer from props (`selectedVideoIds` present = playlist mode)

**Decision:** ⏳ TBD - Lean toward explicit prop for clarity

---

### Q3: Should Events support playlists by default?
**Consideration:** Events might be single-stream broadcasts (one video), or multi-part tournaments (playlist)

**Decision:** ✅ Support both - Let user choose or default to single with option to switch

---

### Q4: What happens to orphaned videos?
**Scenario:** Video exists in `videos.json` but isn't referenced by any content

**Options:**
- Leave them (searchable in VOD library)
- Flag them in admin UI for cleanup
- Auto-delete after N days

**Decision:** ✅ Leave them - They're still valid VOD library content

---

### Q5: Should we show a warning when editing a shared video?
**Example:** Video is used by 3 masterclasses and 2 replays

**Decision:** ✅ Yes - Show banner in VideoEditModal: "This video is used in 5 places. Changes will affect all of them. [View References]"

---

## Future Enhancements

### v2.0: Advanced Playlist Features
- [ ] Playlist sections/chapters (grouping videos)
- [ ] Playlist-level notes per video (without overriding video metadata)
- [ ] Auto-playlist generation (e.g., "All videos tagged 'ZvT' by Hino")
- [ ] Playlist templates

### v2.1: Better Video Management
- [ ] Bulk video operations (tag multiple videos at once)
- [ ] Video usage report (show where each video is used)
- [ ] Orphaned video cleanup tool
- [ ] Video analytics (views, completion rate per content type)

### v2.2: Smart Metadata
- [ ] Auto-tag videos based on content type (e.g., auto-add 'masterclass' tag)
- [ ] Suggested videos based on content metadata
- [ ] Duplicate detection (same Mux/YouTube ID)

---

## Notes

- **Playlist order matters:** Use array index as order (0-indexed)
- **Reordering:** Drag-to-reorder updates array order in `videoIds`
- **Thumbnail:** Content items can have their own thumbnail (separate from video thumbnail)
- **Duration:** Content items can have their own duration field (for display, separate from video)
- **Performance:** Consider lazy-loading video metadata when displaying playlists with 10+ videos

---

## References

- Current VideoSelector: `src/components/admin/video-selector.tsx`
- Current VideoEditModal: `src/components/admin/video-edit-modal.tsx`
- Video type: `src/types/video.ts`
- Content types: `src/types/{masterclass,event,build-order,replay}.ts`
