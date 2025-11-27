# Test Environment Setup Guide

This document describes how to set up a test/demo version of Ladder Legends Academy for whitebox testing.

## Data Files Status

Premium content has been purged from this test repo:

| Data File | Original | Test Version | Notes |
|-----------|----------|--------------|-------|
| videos.json | 101 | 14 | Free videos only |
| masterclasses.json | 3 | 0 | All premium, removed |
| events.json | 5 | 0 | All premium, removed |
| build-orders.json | 12 | 3 | First 3 marked as free |
| replays.json | 32 | 5 | First 5 kept for testing |
| coaches.json | 7 | 7 | Public info, kept as-is |

---

## Third-Party Integrations

### 1. Discord OAuth (REQUIRED for login)

**Environment Variables:**
- `AUTH_DISCORD_ID` - Discord Application Client ID
- `AUTH_DISCORD_SECRET` - Discord Application Client Secret
- `AUTH_URL` - Callback URL (e.g., `http://localhost:3000`)

**Setup Steps:**
1. Create a new Discord application at https://discord.com/developers/applications
2. Go to OAuth2 > General
3. Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
4. Copy Client ID and Client Secret
5. Enable the `identify`, `email`, and `guilds` scopes

**Mocking Strategy:**
- For CI/automated testing, use the existing role emulation system (see #9 below)
- For manual testing, create a test Discord server with test roles

---

### 2. Discord Bot (OPTIONAL - only for Discord sync features)

**Environment Variables:**
- `DISCORD_BOT_TOKEN` - Bot token
- `DISCORD_GUILD_ID` - Server ID

**Setup Steps:**
1. Create a bot in your Discord application (Bot tab)
2. Enable Server Members Intent and Message Content Intent
3. Generate and copy the bot token
4. Invite bot to your test Discord server with appropriate permissions

**Mocking Strategy:**
- Can be disabled entirely for testing - only used for:
  - Admin Discord sync feature
  - Downloading replays from Discord (script only)
- Set empty string to disable features gracefully

---

### 3. Discord Roles (for role-based access)

**Environment Variables:**
- `ALLOWED_ROLE_IDS` - Comma-separated list of role IDs

**Role Hierarchy:**
1. Owner - Full admin access
2. Moderator - Admin access
3. Coach - Content management
4. Subscriber - Premium content access

**Setup Steps for Test Server:**
1. Create a test Discord server
2. Create roles matching the hierarchy above
3. Copy role IDs (enable Developer Mode, right-click role)
4. Update `ALLOWED_ROLE_IDS` with new role IDs

**Mocking Strategy:**
- Use the role emulation system (see #9) to bypass Discord entirely

---

### 4. Mux Video (OPTIONAL - only for video playback)

**Environment Variables:**
- `MUX_API_KEY` - Mux Token ID
- `MUX_SECRET` - Mux Token Secret
- `MUX_SIGNING_KEY_ID` - For signed playback URLs
- `MUX_SIGNING_KEY_PRIVATE_KEY` - Base64-encoded private key
- `MUX_VIDEO_QUALITY` - `basic` (free tier) or `plus`

**Setup Steps:**
1. Create free Mux account at https://mux.com
2. Go to Settings > API Access Tokens
3. Create a new token with Video permissions
4. For signed playback, create a signing key in Settings > Signing Keys

**Mocking Strategy:**
- Videos in test repo are YouTube-based (free content), so Mux is optional
- For full testing, use Mux free tier (10 videos, 100GB/month)
- Leave empty to disable Mux features gracefully

---

### 5. Vercel Blob Storage (OPTIONAL - only for replay uploads)

**Environment Variables:**
- `BLOB_READ_WRITE_TOKEN` - Auto-provided by Vercel

**Setup Steps:**
1. Create a new Vercel project
2. Go to Project Settings > Storage
3. Create a new Blob Store
4. Link to your project

**Mocking Strategy:**
- Only used for storing replay files uploaded via CMS
- Can be disabled - replay URLs in test data point to existing blobs
- For local testing, replay upload will fail gracefully

---

### 6. Vercel KV / Upstash Redis (OPTIONAL - only for user replays)

**Environment Variables:**
- `KV_REST_API_URL` - Upstash Redis URL
- `KV_REST_API_TOKEN` - API token

**Used For:**
- User replay storage (My Replays feature)
- Device auth codes (desktop uploader)
- User settings

**Setup Steps:**
1. Create a free Upstash account at https://upstash.com
2. Create a new Redis database
3. Copy REST API URL and token

**Mocking Strategy:**
- Can be disabled entirely - My Replays feature will show empty state
- For testing My Replays, create free Upstash instance
- Alternatively, mock the KV operations in tests

---

### 7. GitHub PAT (REQUIRED for CMS commits)

**Environment Variables:**
- `GITHUB_TOKEN` - Personal Access Token
- `GITHUB_REPO_OWNER` - `Ladder-Legends`
- `GITHUB_REPO_NAME` - `ladder-legends-academy-test`

**Setup Steps:**
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Create a fine-grained token with:
   - Repository access: `ladder-legends-academy-test`
   - Permissions: Contents (read/write)
3. Copy the token

**Mocking Strategy:**
- Required for CMS "Commit Changes" functionality
- For read-only testing, can be left empty (commit button will fail)
- For CI testing, use GitHub Actions token

---

### 8. PostHog Analytics (OPTIONAL)

**Environment Variables:**
- `NEXT_PUBLIC_POSTHOG_KEY` - Project API key
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host (e.g., `https://eu.i.posthog.com`)

**Setup Steps:**
1. Create free PostHog account at https://posthog.com
2. Create a new project
3. Copy the project API key

**Mocking Strategy:**
- Leave empty to disable analytics completely
- No impact on functionality

---

### 9. Role Emulation System (BUILT-IN - USE THIS!)

**Environment Variables:**
- `HARDCODED_USER_ID` - Discord user ID to emulate
- `HARDCODED_ROLE` - Role ID to assign
- `HARDCODED_USER_IS_SUBSCRIBER` - `true` or `false`
- `NEXT_PUBLIC_EMULATE_ROLE` - Client-side role override (`owner`, `coach`, `subscriber`)

**How It Works:**
- When `HARDCODED_USER_ID` matches the logged-in user's Discord ID:
  - Bypasses Discord role check
  - Assigns the specified role
  - Sets subscriber status

**Testing Different Permission Levels:**
```bash
# Test as Owner (full admin)
HARDCODED_ROLE=1386739785283928124
HARDCODED_USER_IS_SUBSCRIBER=true
NEXT_PUBLIC_EMULATE_ROLE=owner

# Test as Coach
HARDCODED_ROLE=1387372036665643188
HARDCODED_USER_IS_SUBSCRIBER=true
NEXT_PUBLIC_EMULATE_ROLE=coach

# Test as Subscriber (premium content only)
HARDCODED_ROLE=1387076312878813337
HARDCODED_USER_IS_SUBSCRIBER=true
NEXT_PUBLIC_EMULATE_ROLE=subscriber

# Test as non-subscriber (limited access)
HARDCODED_ROLE=
HARDCODED_USER_IS_SUBSCRIBER=false
NEXT_PUBLIC_EMULATE_ROLE=
```

---

### 10. SC2Reader API (OPTIONAL - only for replay analysis)

**Environment Variables:**
- `SC2READER_API_URL` - API endpoint (e.g., `http://localhost:8000`)
- `SC2READER_API_KEY` - Shared API secret

**Setup Steps:**
1. Clone sc2reader repo
2. Run locally: `python api.py`
3. Or use production endpoint with valid API key

**Mocking Strategy:**
- Only needed for replay analysis features
- Disable by leaving empty - analysis will fail gracefully
- For CI, mock the API responses in tests

---

## Minimal Test Setup (Quick Start)

For basic testing with minimal setup:

```bash
# .env.local
AUTH_SECRET=your-random-secret-string-here

# Discord OAuth (create test app)
AUTH_DISCORD_ID=your-test-app-id
AUTH_DISCORD_SECRET=your-test-app-secret
AUTH_URL=http://localhost:3000

# Role emulation (bypass Discord roles)
HARDCODED_USER_ID=your-discord-user-id
HARDCODED_ROLE=1386739785283928124
HARDCODED_USER_IS_SUBSCRIBER=true
NEXT_PUBLIC_EMULATE_ROLE=owner

# GitHub (for CMS commits)
GITHUB_TOKEN=your-github-pat
GITHUB_REPO_OWNER=Ladder-Legends
GITHUB_REPO_NAME=ladder-legends-academy-test

# Everything else can be left empty for basic testing
```

---

## CI/CD Testing Setup

For automated testing without external services:

1. Use role emulation to bypass Discord auth
2. Mock Mux responses in tests (already done in vitest.setup.ts)
3. Mock KV/Blob operations in tests
4. Skip GitHub commits in CI (or use GitHub Actions token)
5. Disable PostHog in CI environment

---

## Production vs Test Environment

| Feature | Production | Test |
|---------|------------|------|
| Discord OAuth | Real server | Test server or emulation |
| Discord Roles | Real roles | Test roles or emulation |
| Mux Videos | 100+ videos | 14 free videos |
| Vercel Blob | Production blobs | Separate blob store |
| Vercel KV | Production KV | Separate Upstash instance |
| GitHub Commits | Main repo | Test repo |
| Analytics | PostHog | Disabled |
| SC2Reader | Production API | Local or mock |
