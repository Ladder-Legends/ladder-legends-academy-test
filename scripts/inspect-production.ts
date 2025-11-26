/* eslint-disable @typescript-eslint/no-explicit-any */
import { kv } from '@vercel/kv';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supply rate constants: supply per minute per building type
// Based on fastest common unit for each building
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

  // Zerg (Hatchery-based, approximate)
  'Hatchery': 6.0,      // With queen inject, ~6 supply/min per hatch
  'Lair': 6.0,
  'Hive': 6.0,
};

async function inspect() {
  const userId = '161384451518103552';
  const replayIds = await kv.get<string[]>(`user:${userId}:replays`) || [];

  console.log('Found', replayIds.length, 'replays');

  // Get first replay with production/phases data
  for (const id of replayIds.slice(0, 10)) {
    const replay = await kv.get<any>(`user:${userId}:replay:${id}`);
    const duration = replay?.fingerprint?.metadata?.duration || 0;
    const prod = replay?.fingerprint?.economy?.production_by_building;

    if (!duration) continue;

    console.log('\n=== Replay:', replay.filename, '===');
    console.log('Duration:', duration, 'seconds (', Math.round(duration/60), 'min)');

    // Check for phases data (from player_fingerprints or direct)
    const playerName = replay.player_name || replay.suggested_player || replay.fingerprint?.player_name;
    const playerAnalysis = replay.player_fingerprints?.[playerName];

    if (playerAnalysis?.phases) {
      console.log('\n--- Phase Data ---');
      const phases = playerAnalysis.phases;
      for (const [phaseName, snapshot] of Object.entries(phases as Record<string, any>)) {
        console.log(`  ${phaseName}:`);
        console.log(`    army_supply: ${snapshot.total_army_supply_produced}`);
        console.log(`    production_buildings:`, snapshot.production_buildings);
      }

      // Calculate army supply per minute
      const latestPhase = phases.late || phases.mid || phases.early || phases.opening;
      if (latestPhase) {
        const totalArmySupply = latestPhase.total_army_supply_produced || 0;
        const durationMin = duration / 60;
        const supplyPerMin = totalArmySupply / durationMin;
        console.log(`\n  Total Army Supply: ${totalArmySupply}`);
        console.log(`  Supply/Min: ${supplyPerMin.toFixed(1)}`);

        // Calculate theoretical max from production buildings
        const prodBuildings = latestPhase.production_buildings || {};
        let theoreticalMax = 0;
        for (const [building, count] of Object.entries(prodBuildings as Record<string, number>)) {
          const rate = SUPPLY_RATE_PER_BUILDING[building] || 0;
          theoreticalMax += (count as number) * rate;
        }
        console.log(`  Theoretical Max (end-game buildings): ${theoreticalMax.toFixed(1)} supply/min`);

        if (theoreticalMax > 0) {
          const efficiency = (supplyPerMin / theoreticalMax) * 100;
          console.log(`  Production Efficiency: ${efficiency.toFixed(1)}%`);
        }
      }
    } else {
      console.log('  No phases data found');
    }

    if (prod) {
      console.log('\n--- Old Production Data (for comparison) ---');
      let totalIdle = 0;
      for (const [building, data] of Object.entries(prod as Record<string, any>)) {
        console.log('  ', building + ':', data.idle_seconds + 's idle,', data.units_produced, 'units');
        totalIdle += data.idle_seconds || 0;
      }
      console.log('Total idle (summed):', totalIdle, 's (', Math.round(totalIdle/60), 'min)');
      console.log('Idle/Duration ratio:', (totalIdle/duration*100).toFixed(1) + '%');
    }

    // Only show first replay with data
    if (prod || replay.player_fingerprints) break;
  }
}

inspect().catch(console.error);
