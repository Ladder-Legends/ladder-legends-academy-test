# Ladder Legends Academy Documentation

> **Single source of truth** for understanding the Ladder Legends platform

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [ACTIVE-TASK.md](./ACTIVE-TASK.md) | Current work in progress |
| [Architecture Overview](./architecture/overview.md) | System design and data flow |
| [Storage Guide](./architecture/storage.md) | Blob, KV, and data structures |
| [Production Metrics](./algorithms/production-metrics.md) | Army supply/min calculation |
| [Audit Plan](./AUDIT-PLAN.md) | Ongoing code quality audit |

---

## System Overview

Ladder Legends Academy is a StarCraft 2 coaching platform comprising:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LADDER LEGENDS ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐  │
│   │   Academy       │     │   Uploader      │     │   Bot       │  │
│   │   (Next.js)     │◄───►│   (Tauri/Rust)  │     │   (Discord) │  │
│   └────────┬────────┘     └────────┬────────┘     └─────────────┘  │
│            │                       │                                │
│            ▼                       ▼                                │
│   ┌─────────────────────────────────────────┐                      │
│   │            sc2reader (Python)           │                      │
│   │         Replay Analysis API             │                      │
│   └─────────────────────────────────────────┘                      │
│                                                                     │
│   Storage:                                                          │
│   ├── Vercel KV (Redis) - User replay metadata                     │
│   ├── Vercel Blob - Replay files, hash manifests, fingerprints     │
│   └── JSON files - CMS content (videos, coaches, etc.)             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
ladder-legends-academy/          # Main Next.js application
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── my-replays/          # User replay tracking feature
│   │   └── api/                 # API routes
│   ├── components/
│   │   └── my-replays/          # Replay analysis UI components
│   ├── lib/                     # Shared utilities
│   │   ├── replay-types.ts      # TypeScript type definitions
│   │   ├── replay-kv.ts         # KV storage operations
│   │   └── sc2reader-client.ts  # API client for sc2reader
│   └── data/                    # CMS JSON data files
├── scripts/                     # CLI utilities
│   └── remetrics-replays.ts     # Batch re-process replays
└── docs/                        # This documentation

sc2reader/                       # Python replay analysis API
├── api/index.py                 # FastAPI endpoints
├── src/sc2analysis/             # Analysis modules
│   ├── processor.py             # Main replay processor
│   ├── models/phase.py          # Phase snapshot model
│   └── trackers/phase_tracker.py # Phase tracking logic
└── fingerprint.py               # Build fingerprinting

ladder-legends-uploader/         # Desktop upload app
├── src-tauri/src/               # Rust backend
└── src/                         # React frontend
```

---

## Key Concepts

### 1. Replay Fingerprinting

Every SC2 replay is processed to extract a "fingerprint" containing:

- **Timings**: When key buildings/upgrades completed
- **Sequences**: Order of tech and unit production
- **Economy**: Worker counts, supply blocks, resource banks
- **Phases**: Snapshots at opening/early/mid/late game phases
- **Production**: Per-building production metrics

### 2. Game Phases

Games are divided into 4 phases (times in Faster speed):

| Phase | Time Range | Description |
|-------|------------|-------------|
| Opening | 0:00 - 2:00 | Initial build setup |
| Early | 2:00 - 5:00 | Tech choices, first units |
| Mid | 5:00 - 7:00 | Army production ramp |
| Late | 7:00 - 10:00 | Macro focus |

### 3. Production Metrics (Army Supply/Min)

The "Production" pillar shows production efficiency:

```
Efficiency = (Actual Supply/Min) / (Theoretical Max) × 100%

Where:
- Actual Supply/Min = total_army_supply_produced / game_duration_min
- Theoretical Max = Σ (production_building_count × supply_rate_per_building)
```

Supply rates per building type:
- Barracks: 2.4 supply/min (Marine-based)
- Factory: 4.0 supply/min (Hellion-based)
- Gateway: 3.2 supply/min (Zealot-based)
- WarpGate: 4.3 supply/min (faster Zealot)
- Hatchery: 6.0 supply/min (with inject)

### 4. Supply Management

The "Supply" pillar tracks supply blocks:

```
Score = 100 - (total_block_time / game_duration × 100)
```

---

## Data Flow

### Upload Flow

```
SC2 Replay File
       │
       ▼
┌──────────────────┐
│  Uploader App    │ ──► Extracts game_type, player_name
└────────┬─────────┘
         │ POST /api/my-replays
         ▼
┌──────────────────┐
│  Academy API     │ ──► Validates auth, checks subscriber role
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  sc2reader       │ ──► /metrics endpoint
│  (Python API)    │     Returns: phases, production_by_building,
└────────┬─────────┘              supply_block_events, fingerprint
         │
         ▼
┌──────────────────┐
│  Storage         │
│  ├─ KV (metadata)│
│  ├─ Blob (file)  │
│  └─ Hash manifest│
└──────────────────┘
```

### Analysis Flow

```
my-replays page loads
         │
         ▼
GET /api/my-replays/index ──► Returns lightweight index entries
         │
         ▼
Filter/sort client-side
         │
         ▼ (user clicks replay)
GET /api/my-replays?id=xxx ──► Returns full replay data with fingerprint
         │
         ▼
Three Pillars Component ──► Calculates production/supply scores from:
                            - fingerprint.economy.phases
                            - fingerprint.economy.total_supply_block_time
```

---

## Environment Variables

See [CLAUDE.md](../CLAUDE.md) for complete list. Key ones:

```bash
# Authentication
AUTH_SECRET=...
AUTH_DISCORD_ID=...
AUTH_DISCORD_SECRET=...

# SC2Reader API
SC2READER_API_URL=http://localhost:8000
SC2READER_API_KEY=...

# Storage
KV_REST_API_URL=...        # or UPSTASH_REDIS_KV_REST_API_URL
BLOB_READ_WRITE_TOKEN=...
```

---

## Development Commands

```bash
# Start dev servers (run in separate terminals)
cd ladder-legends-academy && npm run dev
cd sc2reader && python api/index.py

# Run tests
npm run test
npm run test:watch

# Re-process replays
npx tsx scripts/remetrics-replays.ts --all-users --execute

# Flush user data (for testing)
npx tsx scripts/flush-user-replays.ts <discord_id> --execute
```

---

## Feature Documentation

| Feature | Status | Documentation |
|---------|--------|---------------|
| Video Library | Complete | See CLAUDE.md |
| Replay Analysis | Complete | [algorithms/production-metrics.md](./algorithms/production-metrics.md) |
| Three Pillars | Complete | [algorithms/production-metrics.md](./algorithms/production-metrics.md) |
| Reference Builds | In Progress | - |
| Download Button | TODO | - |

---

## Contributing

1. Read the [Architecture Overview](./architecture/overview.md)
2. Check [ACTIVE-TASK.md](./ACTIVE-TASK.md) for current work
3. Follow patterns in existing code
4. Update documentation when changing behavior

---

## Archive

Old plan files moved to `docs/archive/`:
- PHASE-10-12-PLAN.md
- MY-REPLAYS-OPTIMIZATION-PLAN.md
