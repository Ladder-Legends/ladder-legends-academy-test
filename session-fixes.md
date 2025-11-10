# Session Fixes Log

This file tracks all fixes made during this session. DO NOT COMMIT.

## Fixes Applied:

### 1. Font Updates
**Files Modified:**
- `src/app/layout.tsx`
- `src/app/globals.css`

**Changes:**
- Replaced Geist Sans with **Lexend** (Regular 400 & Bold 700) as the primary font for headings and main content
- Set **Arial** (Regular & Bold) as the secondary font for body text, paragraphs, list items, and table content
- Updated CSS custom properties to use `--font-lexend` for primary font
- Added `font-family: var(--font-secondary)` for paragraphs, spans, lists, and table elements

**Reasoning:** User requested Lexend for headings/titles and Arial for reading text to improve readability and brand consistency.

---

### 2. Color Scheme Updates
**Files Modified:**
- `src/app/globals.css`

**Changes:**
- Updated all black-ish colors from `#0d0d0d` to `#2a2a28`
- Updated all red-ish colors from `#e63f31` to `#e52322` (primary, accent, destructive, chart-1)
- Updated grey/border colors from `#e0e0e0`/`#e2e2e2` to `#dadada`
- Lightened dark mode foreground from `#f2f2f2` to `#f5f5f5` for better contrast
- Updated dark mode border color to `#dadada` for consistency

**Color Variables Updated:**
- `--color-foreground`: #2a2a28 (light) / #f5f5f5 (dark)
- `--color-primary`: #e52322
- `--color-accent`: #e52322
- `--color-destructive`: #e52322
- `--color-border`: #d0d0d0 (light) / #2d2d2d (dark) - subtle off-shade of background
- `--color-secondary`: #dadada
- `--color-input`: #dadada
- `--color-chart-1`: #e52322

**Reasoning:** Provides consistent brand colors across the entire site, improves visual hierarchy, and ensures better readability in dark mode.

---

### 3. Removed Gradient Text Effects from Headings
**Files Modified:**
- `src/app/globals.css`

**Changes:**
- Removed gradient background with text-fill-color from all h1-h6 elements
- Changed to simple `color: var(--color-foreground)` for clean, readable headings
- Removed dark mode gradient variations
- Removed gradient from card titles specifically

**Reasoning:** Gradients were causing text cutoff issues when combined with line-clamp, especially on card titles. Clean solid colors provide better readability and eliminate rendering issues.

---

### 4. Fixed Title Cutoff Issues
**Files Modified:**
- `src/app/globals.css`

**Changes:**
- Increased heading line-height from 1.2 to 1.3
- Removed problematic gradient text effects that were causing descenders to be cut off
- Ensured card titles render properly with line-clamp-2

**Reasoning:** The combination of gradient text fill, webkit-background-clip, and line-clamp was causing text cutoff. Removing gradients and adjusting line-height ensures all titles display properly.

---

### 5. Fixed "Watch Video" Link 404 Errors for Build Orders
**Files Modified:**
- `src/lib/video-helpers.ts`
- `src/app/build-orders/[id]/build-order-detail-client.tsx`
- `src/components/build-orders/build-orders-table.tsx`
- `src/components/replays/replays-table.tsx`
- `src/app/free/build-orders/[id]/page.tsx`
- `src/app/free/replays/[id]/page.tsx`
- `src/app/replays/[id]/replay-detail-client.tsx`

**Changes:**
- Enhanced `getContentVideoUrl()` function to accept an optional `allVideos` parameter
- Implemented intelligent video URL resolution with two strategies:
  1. First, search for a playlist that contains any of the content's videoIds
  2. If no playlist found, search for standalone videos matching the videoIds
- Updated all callers to pass the videos array for validation
- Returns `undefined` if no valid video/playlist is found (preventing 404s)

**Problem Fixed:**
Build orders (like "Basic 2-1-1") referenced videoIds that either:
- Didn't exist as standalone videos in videos.json
- Were part of a playlist but the link went to the wrong video ID
- Resulted in 404 errors when clicking "Watch Video Tutorial (2 videos)"

**Reasoning:** Build orders can reference multiple videos that may be part of playlists or standalone. The smart lookup ensures users are directed to valid playlist or video pages instead of 404ing.

---

### 6. Scrollbar Styling
**Files Modified:**
- `src/app/globals.css`

**Changes:**
- Added custom scrollbar styling using webkit scrollbar pseudo-elements
- Scrollbar track uses background color with border
- Scrollbar thumb uses `#dadada` with hover state
- Different styling for light and dark modes

**Reasoning:** Provides consistent visual design for scrollbars that matches the site's color scheme and improves overall polish.

---

### 7. App Bar and Sidebar Colors
**Files Modified:**
- `src/app/globals.css`

**Changes:**
- Updated `--color-muted-foreground` in dark mode from `#999999` to `#dadada` for better visibility
- This makes inactive nav links more readable while maintaining visual hierarchy
- Removed border from scrollbar track
- Ensured scrollbar thumb uses `#dadada` in both light and dark modes

**Reasoning:** The grey nav links were too dark in dark mode, making navigation harder to read. Using #dadada (#218 in the color scheme) provides better contrast and readability while still distinguishing inactive from active links.

---

### 8. Added VideoIds Validation to CMS Modals
**Files Modified:**
- `src/components/admin/masterclass-edit-modal.tsx`
- `src/components/admin/build-order-edit-modal.tsx`
- `src/components/admin/replay-edit-modal.tsx`
- `src/components/admin/video-edit-modal.tsx`

**Changes:**

**Masterclass Modal:**
- Added validation to ensure at least one video is added before saving
- Added validation that all videoIds reference existing videos in videos.json
- Prevents empty masterclasses from being created (which would break the UI)

**Build Order Modal:**
- Added imports for videosJson and Video type
- Added `useMergedContent` to validate against both static and pending videos
- Added validation for videoIds (when present) to ensure they reference existing videos
- Prevents broken video references in build orders

**Replay Modal:**
- Added imports for videosJson and Video type
- Added `useMergedContent` to validate against both static and pending videos
- Added validation for videoIds (when present) to ensure they reference existing videos
- Prevents broken video references in replays

**Video Modal (Playlists):**
- Changed unsafe non-null assertion (`videoIds!`) to safe default (`videoIds || []`)
- Added validation for playlist videos to ensure all videoIds reference existing videos
- Added `useMergedContent` to check against both static and pending videos
- Prevents circular references and broken playlist entries

**Problem Fixed:**
- CMS allowed saving content with invalid/non-existent video references
- Build orders, replays, and masterclasses could reference videos that didn't exist
- Playlist videos could have broken videoIds arrays
- No validation prevented stale or incorrect data from being committed

**Reasoning:** Data integrity is critical. Without validation, users could accidentally save broken references that would cause runtime errors when the content is displayed. The validation provides immediate feedback and prevents bad data from entering the system.

---

## Summary

All requested changes have been implemented:
✅ Primary font: Lexend Regular/Bold
✅ Secondary font: Arial Regular/Bold
✅ Black colors: #2a2a28
✅ Red colors: #e52322
✅ Grey/border colors: #dadada
✅ Fixed title cutoff issues (removed gradients, adjusted line-height)
✅ Fixed watch link 404s (smart video/playlist lookup)
✅ Lightened dark mode text (#f5f5f5)
✅ App bar colors updated (via CSS variables)
✅ Scrollbar styling added
✅ Added videoIds validation to all CMS modals (prevents broken references)

The site now has a consistent visual identity with proper typography, accurate brand colors, all video links working correctly, and robust data validation in the CMS.

---

### 9. Consistent Card Grid Layout
**Files Modified:**
- `src/components/videos/video-grid.tsx`

**Changes:**
- Updated video grid from `lg:grid-cols-3` to `lg:grid-cols-3 xl:grid-cols-4`
- Now matches the build orders and replays grid layout
- Videos now fit 4 per row on extra-large screens instead of only 3

**Reasoning:** Consistency across all content types improves the user experience. The video cards were unnecessarily large, showing only 3 per row when there was room for 4, making the layout inconsistent with other pages.
