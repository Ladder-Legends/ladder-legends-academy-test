# 🏥 Developer Health Report

Generated: 2025-11-11T19:24:33.097Z

---

## 📊 Test Coverage Summary

### Unit Tests
- **Total Tests**: 0
- **Passing**: 0
- **Coverage**: 0.00%

### Integration Tests
- **Total Files**: 0

### E2E Tests
- **Total Files**: 0
- ⚠️ **No E2E tests found**

---

## 🛣️  API Routes

| Route | Methods | Auth | Tests | File |
|-------|---------|------|----------|------|
| `/api/admin/checkup` | GET, POST | 👑 Owner | ❌ | `src/app/api/admin/checkup/route.ts` |
| `/api/admin/commit` | POST | 👑 Owner | ❌ | `src/app/api/admin/commit/route.ts` |
| `/api/admin/discord-sync` | POST | 👑 Owner | ❌ | `src/app/api/admin/discord-sync/route.ts` |
| `/api/analyze-replay` | POST | 🔒 Auth | ❌ | `src/app/api/analyze-replay/route.ts` |
| `/api/auth/[...nextauth]` |  | 🌍 Public | ❌ | `src/app/api/auth/[...nextauth]/route.ts` |
| `/api/delete-replay` | POST | 🔒 Auth | ❌ | `src/app/api/delete-replay/route.ts` |
| `/api/mux/playback` | GET, POST | 🔒 Auth | ❌ | `src/app/api/mux/playback/route.ts` |
| `/api/mux/upload` | GET, POST | 🔒 Auth | ❌ | `src/app/api/mux/upload/route.ts` |
| `/api/mux/webhook` | POST | 🌍 Public | ❌ | `src/app/api/mux/webhook/route.ts` |
| `/api/replay-download` | GET | 🔒 Auth | ❌ | `src/app/api/replay-download/route.ts` |
| `/api/upload-replay` | POST | 🔒 Auth | ❌ | `src/app/api/upload-replay/route.ts` |
| `/api/user-preferences` | GET, PUT | 🔒 Auth | ❌ | `src/app/api/user-preferences/route.ts` |

### ⚠️  Routes Missing Tests

- `/api/admin/checkup` (GET, POST) - owner
- `/api/admin/commit` (POST) - owner
- `/api/admin/discord-sync` (POST) - owner
- `/api/analyze-replay` (POST) - authenticated
- `/api/auth/[...nextauth]` () - public
- `/api/delete-replay` (POST) - authenticated
- `/api/mux/playback` (GET, POST) - authenticated
- `/api/mux/upload` (GET, POST) - authenticated
- `/api/mux/webhook` (POST) - public
- `/api/replay-download` (GET) - authenticated
- `/api/upload-replay` (POST) - authenticated
- `/api/user-preferences` (GET, PUT) - authenticated

---

## 🎨 UX Features

### Download

Found 8 instance(s):

- ❌ `src/app/build-orders/[id]/build-order-detail-client.tsx`
- ❌ `src/app/free/build-orders/[id]/page.tsx`
- ❌ `src/app/free/replays/[id]/page.tsx`
- ❌ `src/app/replays/[id]/replay-detail-client.tsx`
- ❌ `src/components/admin/replay-edit-modal.tsx`
- ❌ `src/components/auth/__tests__/paywall-link.test.tsx`
- ❌ `src/components/auth/paywall-link.tsx`
- ❌ `src/components/replays/replays-table.tsx`

### Filter

Found 13 instance(s):

- ❌ `src/components/build-orders/build-orders-content.tsx`
- ❌ `src/components/masterclasses/masterclasses-content.tsx`
- ❌ `src/components/replays/replays-content.tsx`
- ❌ `src/components/shared/active-filters.tsx`
- ❌ `src/components/ui/filterable-content-layout.tsx`
- ❌ `src/components/videos/video-library-content.tsx`
- ❌ `src/hooks/use-url-state.ts`
- ❌ `src/lib/filtering/configs/video-filters.ts`
- ❌ `src/lib/filtering/filter-engine.ts`
- ❌ `src/lib/filtering/hooks/use-content-filtering.ts`
- ... and 3 more

### Form

Found 1 instance(s):

- ❌ `src/app/login/page.tsx`

### Modal

Found 20 instance(s):

- ❌ `src/app/build-orders/[id]/build-order-detail-client.tsx`
- ❌ `src/app/coaches/[id]/coach-detail-client.tsx`
- ❌ `src/app/events/[id]/event-detail-client.tsx`
- ❌ `src/app/library/[id]/video-detail-client.tsx`
- ❌ `src/app/masterclasses/[id]/masterclass-detail-client.tsx`
- ❌ `src/app/replays/[id]/replay-detail-client.tsx`
- ❌ `src/components/admin/build-order-edit-modal.tsx`
- ❌ `src/components/admin/coach-edit-modal.tsx`
- ❌ `src/components/admin/event-edit-modal.tsx`
- ❌ `src/components/admin/masterclass-edit-modal.tsx`
- ... and 10 more

### Paywall

Found 17 instance(s):

- ❌ `src/app/build-orders/[id]/build-order-detail-client.tsx`
- ❌ `src/app/free/build-orders/[id]/page.tsx`
- ❌ `src/app/free/masterclasses/[id]/page.tsx`
- ❌ `src/app/free/replays/[id]/page.tsx`
- ❌ `src/components/auth/__tests__/paywall-link.test.tsx`
- ❌ `src/components/auth/paywall-link.tsx`
- ❌ `src/components/build-orders/build-orders-table.tsx`
- ❌ `src/components/coaches/__tests__/coach-card.test.tsx`
- ❌ `src/components/events/event-card.tsx`
- ❌ `src/components/masterclasses/masterclass-card.tsx`
- ... and 7 more

### Upload

Found 7 instance(s):

- ❌ `src/components/admin/build-order-edit-modal.tsx`
- ❌ `src/components/admin/file-upload.tsx`
- ❌ `src/components/admin/mux-upload.tsx`
- ❌ `src/components/admin/replay-edit-modal.tsx`
- ❌ `src/components/admin/video-edit-modal.tsx`
- ❌ `src/components/admin/video-selector-enhanced.tsx`
- ❌ `src/components/admin/video-selector.tsx`

### Video player

Found 10 instance(s):

- ❌ `src/app/api/mux/playback/route.ts`
- ❌ `src/app/api/mux/upload/route.ts`
- ❌ `src/app/build-orders/[id]/build-order-detail-client.tsx`
- ❌ `src/app/free/masterclasses/[id]/page.tsx`
- ❌ `src/app/library/[id]/video-detail-client.tsx`
- ❌ `src/app/masterclasses/[id]/masterclass-detail-client.tsx`
- ❌ `src/app/replays/[id]/replay-detail-client.tsx`
- ❌ `src/components/videos/mux-video-player.tsx`
- ❌ `src/components/videos/video-player.tsx`
- ❌ `src/utils/clear-mux-cache.ts`

### ⚠️  Features Missing E2E Tests

**Total**: 76 features need E2E coverage

---

## 💡 Recommendations

- 🎯 **Improve unit test coverage** (currently 0.00%, target: 80%)
- 🎯 **Add E2E tests** (Playwright recommended)
- 🎯 **Add tests for 12 API route(s)**
- 🎯 **Add E2E tests for 76 UX feature(s)**
