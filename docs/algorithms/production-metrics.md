# Production Metrics Algorithm

This document explains the "Production" pillar calculation in the Three Pillars system.

---

## Overview

The Production pillar measures **how efficiently you use your production buildings**. It compares actual army supply produced per minute against the theoretical maximum your buildings could produce.

```
Production Efficiency = (Actual Supply/Min) / (Theoretical Max) × 100%
```

---

## Data Sources

### From sc2reader `/metrics` Endpoint

The Python `ReplayProcessor` tracks events throughout the game and creates **phase snapshots** at key time boundaries:

```python
# src/sc2analysis/trackers/phase_tracker.py

class PhaseTracker:
    def on_unit_born(self, unit_type: str, time: float):
        # Track army supply produced
        supply_cost = UNIT_SUPPLY.get(unit_type, 0)
        self._total_army_supply += int(supply_cost)

    def on_building_complete(self, building_type: str, time: float):
        # Track production buildings
        if building_type in RACE_PRODUCTION_BUILDINGS[race]:
            self._production_buildings[building_type] += 1

    def finalize(self, game_end: float) -> Dict[str, PhaseSnapshot]:
        # Generate snapshots for each phase
```

### Phase Boundaries

| Phase | Normal Speed (seconds) | Faster Display |
|-------|------------------------|----------------|
| Opening | 0 - 168 | 0:00 - 2:00 |
| Early | 168 - 420 | 2:00 - 5:00 |
| Mid | 420 - 588 | 5:00 - 7:00 |
| Late | 588 - 840 | 7:00 - 10:00 |

Note: sc2reader reports times in Normal speed. To convert to Faster: `faster = normal / 1.4`

### PhaseSnapshot Fields Used

```typescript
// From fingerprint.economy.phases[phaseName]
{
  total_army_supply_produced: number;  // Cumulative supply at phase end
  production_buildings: {              // Building counts at phase end
    "Barracks": 3,
    "Factory": 1,
    // etc.
  }
}
```

---

## Calculation

### Step 1: Get Latest Phase Data

```typescript
// src/components/my-replays/three-pillars.tsx

function calculateProductionScore(replay: UserReplayData): ProductionMetrics | null {
  const phases = replay.fingerprint?.economy?.phases;

  // Get the latest phase with data
  const latestPhase = phases.late || phases.mid || phases.early || phases.opening;
}
```

### Step 2: Calculate Actual Supply/Min

```typescript
const totalArmySupply = latestPhase.total_army_supply_produced || 0;
const durationMin = duration / 60;
const supplyPerMin = totalArmySupply / durationMin;
```

**Example**: 120 supply produced in 10 minutes = **12 supply/min**

### Step 3: Calculate Theoretical Max

```typescript
const SUPPLY_RATE_PER_BUILDING: Record<string, number> = {
  // Terran
  'Barracks': 2.4,      // Marine: 1 supply / 25s = 2.4/min
  'Factory': 4.0,       // Hellion: 2 supply / 30s = 4.0/min
  'Starport': 2.9,      // Viking: 2 supply / 42s = 2.9/min

  // Protoss
  'Gateway': 3.2,       // Zealot: 2 supply / 38s = 3.2/min
  'WarpGate': 4.3,      // Zealot warp: 2 supply / 28s = 4.3/min
  'RoboticsFacility': 4.4, // Immortal: 4 supply / 55s = 4.4/min
  'Stargate': 3.4,      // Phoenix: 2 supply / 35s = 3.4/min

  // Zerg
  'Hatchery': 6.0,      // With queen inject, ~6 supply/min per hatch
  'Lair': 6.0,
  'Hive': 6.0,
};

let theoreticalMax = 0;
for (const [building, count] of Object.entries(prodBuildings)) {
  const rate = SUPPLY_RATE_PER_BUILDING[building] || 0;
  theoreticalMax += count * rate;
}
```

**Example**: 3 Barracks + 1 Factory = (3 × 2.4) + (1 × 4.0) = **11.2 supply/min theoretical**

### Step 4: Calculate Efficiency

```typescript
const efficiency = Math.min(100, (supplyPerMin / theoreticalMax) * 100);
```

**Example**: 12 actual / 11.2 theoretical = **107%** → clamped to **100%**

---

## Supply Rate Derivation

Supply rates are based on the **fastest common unit** for each building:

### Terran

| Building | Unit | Supply | Build Time | Supply/Min |
|----------|------|--------|------------|------------|
| Barracks | Marine | 1 | 25s | 2.4 |
| Factory | Hellion | 2 | 30s | 4.0 |
| Starport | Viking | 2 | 42s | 2.9 |

### Protoss

| Building | Unit | Supply | Build Time | Supply/Min |
|----------|------|--------|------------|------------|
| Gateway | Zealot | 2 | 38s | 3.2 |
| WarpGate | Zealot | 2 | 28s | 4.3 |
| RoboticsFacility | Immortal | 4 | 55s | 4.4 |
| Stargate | Phoenix | 2 | 35s | 3.4 |

### Zerg

| Building | Notes | Supply/Min |
|----------|-------|------------|
| Hatchery/Lair/Hive | With inject, ~6 larvae/cycle | 6.0 |

Zerg is harder to calculate precisely due to inject cycles, but 6.0 supply/min per hatch is a reasonable approximation.

---

## Fallback Calculation

For replays without phases data (older uploads), we fall back to the legacy idle time calculation:

```typescript
// OLD METHOD - deprecated but kept for compatibility
const productionByBuilding = replay.fingerprint?.economy?.production_by_building;
let totalIdleTime = 0;
for (const building of Object.values(productionByBuilding)) {
  totalIdleTime += building.idle_seconds || 0;
}
const idlePercent = (totalIdleTime / duration) * 100;
const score = Math.max(0, Math.min(100, 100 - idlePercent));
```

**Problem with old method**: Idle time is **summed across buildings**, so 3 Barracks all idle for 1 minute = 3 minutes "idle", which doesn't make sense as a percentage of game time.

---

## UI Display

### Tooltip Content

```tsx
<ProductionTooltipContent
  avgScore={productionMetrics?.avgScore ?? null}       // e.g., "85%"
  avgSupplyPerMin={productionMetrics?.avgSupplyPerMin} // e.g., "10.2 supply/min"
  totalArmySupply={productionMetrics?.totalArmySupply} // e.g., "842 total supply"
  totalGameTime={totalGameTime}                        // e.g., "45m played"
  gameCount={gameCount}                                // e.g., "across 5 games"
/>
```

### Aggregation Across Games

```typescript
function aggregateProductionMetrics(replays: UserReplayData[]): AggregatedProductionMetrics {
  const metrics = replays
    .map(r => calculateProductionScore(r))
    .filter((m): m is ProductionMetrics => m !== null);

  return {
    avgScore: metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length,
    avgSupplyPerMin: metrics.reduce((sum, m) => sum + m.supplyPerMin, 0) / metrics.length,
    totalArmySupply: metrics.reduce((sum, m) => sum + m.totalArmySupply, 0),
    gameCount: metrics.length,
  };
}
```

---

## Known Limitations

### 1. End-of-Game Buildings Only

The theoretical max is calculated from buildings at the **latest phase**, not averaged over the game. A player who builds 5 Barracks at 9 minutes will show lower efficiency than one who had them from minute 3.

**Future improvement**: Calculate time-weighted building counts.

### 2. Addons Not Counted

Reactors (double production) and Tech Labs (unlock units) aren't factored into supply rates.

**Future improvement**: Track addon completions and adjust rates.

### 3. WarpGate vs Gateway

WarpGate has different production characteristics but appears as a separate building type. Some replays may show both Gateway and WarpGate counts depending on when the game ended.

### 4. Zerg Larvae System

Zerg production is fundamentally different (larvae-based). The 6.0 supply/min estimate assumes good inject cycles but doesn't account for missed injects.

**Future improvement**: Use `inject_efficiency` to adjust Zerg theoretical max.

---

## Code Locations

| Component | File | Function |
|-----------|------|----------|
| Phase tracking | `sc2reader/src/sc2analysis/trackers/phase_tracker.py` | `PhaseTracker` |
| Phase snapshot | `sc2reader/src/sc2analysis/models/phase.py` | `PhaseSnapshot` |
| Supply constants | `sc2reader/src/sc2analysis/constants.py` | `UNIT_SUPPLY` |
| API endpoint | `sc2reader/api/index.py` | `/metrics` |
| Academy merge | `ladder-legends-academy/src/app/api/my-replays/route.ts` | Line 281-286 |
| UI calculation | `ladder-legends-academy/src/components/my-replays/three-pillars.tsx` | `calculateProductionScore` |

---

## Testing

Test file: `src/components/my-replays/__tests__/three-pillars.test.tsx`

Key test cases:
- Replay with phases data → shows army supply/min
- Replay without phases data → falls back to idle time
- Multiple replays → correctly aggregates
- Observer games → filtered out
