# Ladder Legends Academy - Development TODO

This file tracks technical debt, improvements, and future work for the Ladder Legends Academy platform.

## High Priority

### Code Quality & Type Safety

- [ ] **Remove all type casts (`as any`, `as unknown`, etc.)**
  - [ ] `src/app/coaching/[race]/page.tsx` - Lines 108, 115, 121, 127 (coach/video/replay/buildOrder filtering)
  - [ ] `src/app/coaches/[id]/page.tsx` - Line 36 (video filtering cast)
  - [ ] Review all other files for explicit `any` usage
  - [ ] Configure ESLint to block `@typescript-eslint/no-explicit-any` as error instead of warning
  - [ ] Create proper type definitions for:
    - Coach data with proper race union type
    - Video data with proper type safety
    - Replay data structure
    - Build order data structure
    - Events data structure
  - [ ] Update JSON imports to use proper TypeScript types
  - [ ] Add Zod schemas for runtime validation of JSON data

### Testing & Quality Assurance

- [ ] **Set up testing framework**
  - [ ] Install and configure Jest + React Testing Library
  - [ ] Install and configure Playwright for E2E tests
  - [ ] Set up test coverage reporting (aim for >80% coverage)

- [ ] **Critical Feature Tests**
  - [ ] **Paywall Tests**
    - [ ] Coach booking links redirect to /subscribe for non-subscribers
    - [ ] Coach booking links open externally for subscribers
    - [ ] Premium content is hidden/locked for non-subscribers
    - [ ] Video playback is restricted properly
  - [ ] **Admin Functionality Tests**
    - [ ] Commit button works correctly (git add, commit, push)
    - [ ] Video edit modal saves changes correctly
    - [ ] Replay edit modal saves changes correctly
    - [ ] Build order edit modal saves changes correctly
    - [ ] Event edit modal saves changes correctly
    - [ ] Coach edit functionality (if exists)
    - [ ] Delete confirmations work and actually delete
  - [ ] **Content Management Tests**
    - [ ] Mux video upload flow works end-to-end
    - [ ] Replay file upload and download works
    - [ ] Category assignments save correctly
    - [ ] Metadata updates persist correctly
  - [ ] **Navigation & Routing Tests**
    - [ ] All navigation dropdown links work
    - [ ] Race-specific coaching pages load correctly
    - [ ] Individual coach pages load and show correct content
    - [ ] Video detail pages work with and without ?v= param
    - [ ] 404 pages show for invalid IDs
  - [ ] **Filtering Tests**
    - [ ] Active filters display correctly
    - [ ] URL params sync with filter state
    - [ ] Clear filters works
    - [ ] Individual filter removal works
    - [ ] Race filter works on coaching pages
    - [ ] Coach filter works from URL params
  - [ ] **Authentication Tests**
    - [ ] Login flow works correctly
    - [ ] Session persistence works
    - [ ] Subscriber role detection works
    - [ ] Protected routes redirect properly

- [ ] **Integration Tests**
  - [ ] Discord auth integration
  - [ ] Mux video playback
  - [ ] Replay download endpoints
  - [ ] NextAuth session management

- [ ] **Performance Tests**
  - [ ] Lighthouse CI for performance monitoring
  - [ ] Bundle size analysis and optimization
  - [ ] Image optimization verification
  - [ ] Core Web Vitals monitoring

## Medium Priority

### Code Cleanup

- [ ] **Remove unused imports and variables**
  - Review all ESLint warnings (currently 46 warnings)
  - [ ] `ErrorCodes` in commit route
  - [ ] `description` in mux upload route
  - [ ] `PaywallLink` in multiple files
  - [ ] `currentVideo` in detail pages
  - [ ] `isEditModalOpen`, `videoToEdit` in coach detail client
  - [ ] Badge imports in card components
  - [ ] Unused filter helper functions
  - [ ] Clean up all unused variables systematically

- [ ] **React Hooks Cleanup**
  - [ ] Fix missing dependencies in useEffect/useMemo hooks
  - [ ] Remove unnecessary dependencies from hooks
  - [ ] Review exhaustive-deps warnings

- [ ] **Component Refactoring**
  - [ ] Extract reusable coach video counting logic
  - [ ] Consolidate duplicate filter logic
  - [ ] Create shared types file for common interfaces
  - [ ] Standardize error handling patterns

### SEO & Marketing

- [ ] **Create custom OpenGraph image** (1200x630px)
  - Design branded image with "Master StarCraft 2 | Grandmaster Coaching"
  - Save as `/public/og-image.png`
  - Update root layout to use this image
  - Consider creating race-specific OG images for coaching pages

- [ ] **Submit to search engines**
  - [ ] Google Search Console setup and sitemap submission
  - [ ] Bing Webmaster Tools setup
  - [ ] Monitor indexing status

- [ ] **Add structured data**
  - [ ] BreadcrumbList schema for better navigation display
  - [ ] FAQPage schema (create FAQ page first)
  - [ ] Review/Rating schema when testimonials are available

- [ ] **Content additions**
  - [ ] Create blog section for regular content updates
  - [ ] Add FAQ page with common questions
  - [ ] Add testimonials/reviews section

### UI/UX Improvements

- [ ] **Image Optimization**
  - [ ] Add proper alt text to all video thumbnails
  - [ ] Add proper alt text to coach avatars (when added)
  - [ ] Optimize image loading with blur placeholders
  - [ ] Add loading="lazy" to below-the-fold images

- [ ] **Accessibility**
  - [ ] Run accessibility audit with axe DevTools
  - [ ] Ensure all interactive elements are keyboard accessible
  - [ ] Add proper ARIA labels where needed
  - [ ] Test with screen readers

- [ ] **Mobile Optimization**
  - [ ] Test all pages on various mobile devices
  - [ ] Optimize touch targets (minimum 44x44px)
  - [ ] Test navigation dropdowns on mobile
  - [ ] Verify video player works on mobile

## Low Priority

### Features & Enhancements

- [ ] **Video Player Enhancements**
  - [ ] Add playback speed controls
  - [ ] Add keyboard shortcuts
  - [ ] Add picture-in-picture support
  - [ ] Add chapter markers for long videos

- [ ] **Filter Enhancements**
  - [ ] Add filter presets ("Beginner Terran", "Advanced Zerg", etc.)
  - [ ] Add "Save Filter" functionality for logged-in users
  - [ ] Add filter count badges
  - [ ] Add "Recently Viewed" section

- [ ] **Social Features**
  - [ ] Add share buttons on content pages
  - [ ] Add "Copy Link" functionality
  - [ ] Track popular content
  - [ ] Add "Trending" section

- [ ] **Analytics**
  - [ ] Set up custom PostHog events
  - [ ] Track video watch time
  - [ ] Track popular search terms
  - [ ] Track conversion funnels

### Infrastructure

- [ ] **Monitoring**
  - [ ] Set up error tracking (Sentry)
  - [ ] Set up uptime monitoring
  - [ ] Set up performance monitoring
  - [ ] Create alerting for critical issues

- [ ] **CI/CD**
  - [ ] Add automated testing to GitHub Actions
  - [ ] Add automated deployment checks
  - [ ] Add bundle size monitoring
  - [ ] Add visual regression testing

- [ ] **Documentation**
  - [ ] Document component architecture
  - [ ] Document data flow and state management
  - [ ] Document deployment process
  - [ ] Create contributing guide

## Notes

### Recent Changes (2025-11-10)
- ✅ Added comprehensive SEO improvements (sitemap, metadata, structured data)
- ✅ Fixed robots.txt to allow Googlebot to crawl static assets
- ✅ Created race-specific coaching landing pages (Terran, Zerg, Protoss, Random)
- ✅ Added event pages to sitemap
- ✅ Paywalled coach booking links
- ✅ Removed specialties display from coach pages
- ✅ Added Discord CTA to homepage

### Known Issues
- Type safety: Multiple `as any` casts need to be removed
- ESLint warnings: 46 warnings need to be addressed
- No test coverage: Critical features untested
- Missing types for JSON data imports

### Technical Debt
- Consider migrating from JSON files to a proper database (Postgres/Supabase)
- Consider adding Redis for caching
- Consider adding search functionality (Algolia/MeiliSearch)
- Consider adding user profiles and progress tracking
