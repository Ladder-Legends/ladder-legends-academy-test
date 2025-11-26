/**
 * Shared Fingerprint Schema Validation
 *
 * This module provides:
 * 1. Schema version constant
 * 2. Validation functions using the JSON Schema
 * 3. Factory function for creating mock fingerprints (useful in tests)
 *
 * The JSON Schema in replay-fingerprint.schema.json is the single source of truth
 * shared between TypeScript (Academy) and Python (sc2reader).
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ReplayFingerprint } from '@/lib/replay-types';
import schema from './replay-fingerprint.schema.json';

// Schema version - increment when making breaking changes
export const SCHEMA_VERSION = '1.0.0';

// Create validator
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

/**
 * Validate a fingerprint against the JSON Schema.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
export function validateFingerprint(fingerprint: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const valid = validate(fingerprint);
  if (valid) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: validate.errors?.map((e) => `${e.instancePath} ${e.message}`) ?? [],
  };
}

/**
 * Check if a fingerprint has a compatible schema version.
 * Allows for minor version differences (1.0.x) but warns on major changes.
 */
export function checkSchemaVersion(fingerprint: { _schema_version?: string }): {
  compatible: boolean;
  message?: string;
} {
  const version = fingerprint._schema_version;
  if (!version) {
    return {
      compatible: true,
      message: 'No schema version specified, assuming compatible',
    };
  }

  const [major, minor] = version.split('.').map(Number);
  const [expectedMajor, expectedMinor] = SCHEMA_VERSION.split('.').map(Number);

  if (major !== expectedMajor) {
    return {
      compatible: false,
      message: `Incompatible schema version: ${version} (expected ${SCHEMA_VERSION})`,
    };
  }

  if (minor > expectedMinor) {
    return {
      compatible: true,
      message: `Newer minor version ${version}, some fields may be unknown`,
    };
  }

  return { compatible: true };
}

/**
 * Create a complete mock fingerprint with all required fields.
 * Useful for tests to ensure type completeness.
 */
export function createMockFingerprint(
  overrides: Partial<ReplayFingerprint> = {}
): ReplayFingerprint {
  const base: ReplayFingerprint = {
    matchup: 'TvP',
    race: 'Terran',
    player_name: 'TestPlayer',
    all_players: [
      {
        name: 'TestPlayer',
        race: 'Terran',
        result: 'Win',
        team: 1,
        is_observer: false,
        mmr: null,
        apm: 100,
      },
      {
        name: 'Opponent',
        race: 'Protoss',
        result: 'Loss',
        team: 2,
        is_observer: false,
        mmr: null,
        apm: 100,
      },
    ],
    metadata: {
      map: 'Test Map',
      duration: 600,
      result: 'Win',
      opponent_race: 'Protoss',
      game_type: '1v1',
      category: 'Ladder',
      game_date: new Date().toISOString(),
    },
    timings: {},
    sequences: {
      tech_sequence: [],
      build_sequence: [],
      upgrade_sequence: [],
    },
    army_composition: {},
    production_timeline: {},
    economy: {
      workers_3min: 12,
      workers_5min: 29,
      workers_7min: 48,
      expansion_count: 2,
      avg_expansion_timing: 180,
    },
    tactical: {
      moveout_times: [],
      first_moveout: null,
      harass_count: 0,
      engagement_count: 0,
      first_engagement: null,
    },
    micro: {
      selection_count: 0,
      avg_selections_per_min: 0,
      control_groups_used: 0,
      most_used_control_group: null,
      camera_movement_count: 0,
      avg_camera_moves_per_min: 0,
    },
    positioning: {
      proxy_buildings: 0,
      avg_building_distance_from_main: null,
    },
    ratios: {
      gas_count: 2,
      production_count: 4,
      tech_count: 1,
      reactor_count: 1,
      techlab_count: 1,
      expansions: 2,
      gas_per_base: 1,
      production_per_base: 2,
    },
  };

  // Deep merge overrides
  return deepMerge(base, overrides) as ReplayFingerprint;
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        (target[key] || {}) as Record<string, unknown>,
        source[key] as Record<string, unknown>
      ) as T[typeof key];
    } else if (source[key] !== undefined) {
      result[key] = source[key] as T[typeof key];
    }
  }
  return result;
}

/**
 * Get the JSON Schema for external use (e.g., Python validation)
 */
export function getSchema(): typeof schema {
  return schema;
}
