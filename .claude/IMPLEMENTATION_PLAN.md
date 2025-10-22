# CMS + Paywall + Premium Styling Implementation Plan

## Overview
Adding a content management system (CMS) for coaches/owners to edit content, implementing a paywall for non-subscribers, and adding premium background styling.

## Phase 1: Authentication & Authorization Setup

### 1.1 Create role-based permission utilities (`src/lib/permissions.ts`)
- `isOwner()`, `isCoach()`, `isSubscriber()` helpers
- Permission levels:
  - `"owners"` - Owner role only
  - `"coaches | owners"` - Coaches and Owners can edit content
  - `"coaches | subscribers | owners"` - All authenticated users with subscriber access

### 1.2 Create `<PermissionGate>` component
- Wraps admin UI elements (Edit/Add buttons)
- Checks user roles from session
- Only renders children if user has required permissions

## Phase 2: Paywall Implementation

### 2.1 Update middleware (`middleware.ts`)
- Allow unauthenticated access to browse pages:
  - `/` (homepage)
  - `/library` (VOD library)
  - `/build-orders` (build orders list)
  - `/replays` (replays list)
  - `/masterclasses` (masterclasses list)
  - `/coaches` (coaches page)
- Block detail pages for non-subscribers → redirect to `/subscribe`
- Keep `/subscribe` page public

### 2.2 Create subscribe/paywall page (`/app/subscribe/page.tsx`)
- Full marketing page with feature list
- Red/orange branded design matching site
- Feature bullets:
  - 1-on-1 Coaching Bookings
  - Coach Diaries & Strategy Insights
  - Replay Reviews & Feedback
  - Exclusive VOD Library
  - Private Race-Specific Chatrooms (Zerg / Protoss / Terran)
  - GM-Only Lounges & Coach Q&A
  - Tournament Entry & Role-Based Shoutouts
- CTA button linking to Whop: https://whop.com/ladder-legends/

### 2.3 Update content links
- Wrap content links in `<PaywallLink>` component
- For non-subscribers: navigate to `/subscribe` instead of content
- For subscribers: navigate normally
- Handle both Next.js Links and YouTube external links

## Phase 3: Premium Background Styling

### 3.1 Add subtle background effects (layered approach)
- Radial gradients from corners (red/orange, very low opacity ~3-5%)
- Fine grain texture noise overlay for depth
- Subtle SVG wave pattern overlay
- All effects composited in `layout.tsx` with low opacity
- Keep design professional and not distracting

## Phase 4: CMS Backend Architecture

### 4.1 localStorage-based pending changes
- Save form edits to localStorage as user types (debounced)
- Show "Uncommitted Changes" banner when localStorage has pending data
- Changes persist across browser sessions until committed
- localStorage keys: `admin-pending-{contentType}-{id}`

### 4.2 Set up Cloudflare R2 for replay files
- Configure R2 bucket for `.SC2Replay` files
- Add R2 credentials to env vars:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
- Create upload helper utility (`src/lib/r2-upload.ts`)
- Store file URLs in JSON data

### 4.3 Create GitHub commit API route
**Route:** `/api/admin/commit` (POST)

**Request payload:**
```typescript
{
  contentType: 'build-orders' | 'replays' | 'masterclasses' | 'videos' | 'coaches',
  operation: 'create' | 'update' | 'delete',
  data: { /* content object */ }
}
```

**Process:**
1. Verify user has appropriate permissions (coaches | owners for most, owners for coaches)
2. Read current JSON file from GitHub
3. Apply changes (create/update/delete)
4. Commit to GitHub with message: `"Admin update by [username]: [operation] [contentType]"`
5. Trigger Vercel deploy webhook
6. Return success/error to client

**No Vercel Blob Storage needed!** Everything goes directly to GitHub.

## Phase 5: CMS Frontend (Admin Pages)

### 5.1 Create admin layout (`/app/admin/layout.tsx`)
- Requires "coaches | owners" role
- Shared admin navigation sidebar
- Shows "Uncommitted Changes" banner when localStorage has pending data
- Admin navigation links:
  - Build Orders
  - Replays
  - Masterclasses
  - Videos
  - Coaches (owner only)

### 5.2 Create form pages with localStorage integration

**Build Orders:**
- `/app/admin/build-orders/new` - Create new
- `/app/admin/build-orders/[id]/edit` - Edit existing
- Fields: name, race, vsRace, type, difficulty, coach, description (rich text), steps (array), tags, videoId

**Replays:**
- `/app/admin/replays/new` - Create new with file upload
- `/app/admin/replays/[id]/edit` - Edit existing
- Fields: title, matchup, map, duration, gameDate, player1, player2, coach, tags, downloadUrl (from R2), coachingVideoId

**Masterclasses:**
- `/app/admin/masterclasses/new` - Create new
- `/app/admin/masterclasses/[id]/edit` - Edit existing
- Fields: title, coach, coachId, race, difficulty, description (rich text), episodes (array), totalDuration, tags

**Videos:**
- `/app/admin/videos/new` - Create new
- `/app/admin/videos/[id]/edit` - Edit existing
- Fields: title, youtubeId, coach, description, tags, publishedAt, threadName

**Coaches:**
- `/app/admin/coaches/new` - Create new (owner only)
- `/app/admin/coaches/[id]/edit` - Edit existing (owner only)
- Fields: name, id, specialty, bio, bookingUrl, discordUsername

### 5.3 Form behavior
- Auto-save to localStorage as user types (debounced 500ms)
- "Commit Changes" button appears when localStorage has pending data
- On commit:
  1. POST to `/api/admin/commit` with data
  2. Clear localStorage on success
  3. Show success toast
  4. Redirect to list page
- Pre-fill form from localStorage if pending data exists (with warning banner)

### 5.4 Add Edit/Add buttons to existing pages
- Wrapped in `<PermissionGate>`
- "Add New" button at top of list pages
- "Edit" button on detail pages and in table rows
- Links to admin form routes

## Phase 6: Rich Editors & Forms

### 6.1 Install form libraries
```bash
npm install react-hook-form @hookform/resolvers zod
npm install @tiptap/react @tiptap/starter-kit  # Rich text editor
npm install sonner  # Toast notifications
```

### 6.2 Create reusable form components
- `<RichTextEditor>` component (Tiptap-based)
- `<FileUpload>` for replay files (R2 upload)
- `<CommitButton>` component with loading state
- Form field components matching site design
- Auto-save hook (`useAutoSave`)

## Technical Architecture

### Data Flow
1. **Browse pages**: Public, statically generated from JSON in git
2. **Detail pages**: Require subscriber role, redirect to `/subscribe` if not authenticated
3. **Admin forms**: Save changes to localStorage, "Commit" button triggers GitHub commit
4. **GitHub commit**: API route commits JSON changes, triggers Vercel rebuild
5. **Deploy**: Site rebuilds with new static content from JSON

### Role Permissions
- **Owners** (`1386739785283928124`): Full access to everything including coach management
- **Coaches** (`1387372036665643188`): Can edit build orders, replays, masterclasses, videos
- **Subscribers** (`1387076312878813337`): Can view all content
- **Non-subscribers**: Can browse lists but not view detail pages

### Storage
- **Content data**: JSON files in git repository
- **Replay files**: Cloudflare R2 bucket
- **Pending edits**: Browser localStorage
- **No Vercel Blob**: Simpler, cheaper, git-native

## Implementation Order

1. ✅ Save this plan to `.claude/IMPLEMENTATION_PLAN.md`
2. Phase 1: Auth & Permissions
3. Phase 3: Premium background styling (quick visual win)
4. Phase 2: Paywall implementation
5. Phase 4: GitHub commit API
6. Phase 5 & 6: CMS forms (iterative, one content type at a time)

## Future Enhancements (Not in MVP)
- SC2 replay parser integration (https://github.com/ggtracker/sc2reader)
- Automated replay analysis
- Image upload for coach photos
- Bulk edit operations
- Content preview before commit
- Rollback/version history UI
