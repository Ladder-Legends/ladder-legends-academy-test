/**
 * Versioned Fingerprint Schema Support
 *
 * This module provides:
 * 1. Version detection for fingerprints
 * 2. Union types that support multiple schema versions
 * 3. Normalization functions to upgrade old data
 *
 * ADDING A NEW VERSION:
 * 1. Create a new interface (ReplayFingerprintV2, etc.)
 * 2. Add it to the VersionedFingerprint union type
 * 3. Update detectFingerprintVersion() to detect the new version
 * 4. Update normalizeFingerprint() to handle migrations
 */

import type { ReplayFingerprint } from '@/lib/replay-types';

// Current schema version
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Schema version type - semver format "major.minor.patch"
 */
export type SchemaVersion = '0.0.0' | '1.0.0';

/**
 * Version 0 (Legacy): Pre-schema fingerprints
 * These are fingerprints created before we introduced versioning.
 * May be missing fields that are now required.
 */
export interface ReplayFingerprintV0 {
  _schema_version?: never; // No version field
  matchup: string;
  race: string;
  player_name?: string;
  all_players?: Array<{
    name: string;
    race: string;
    result: string;
    team: number;
    is_observer?: boolean;
    mmr?: number | null;
    apm?: number | null;
  }>;
  metadata: {
    map: string;
    duration: number | null;
    result: string;
    opponent_race?: string;
    game_type?: string | null;
    category?: string | null;
    game_date?: string | null;
  };
  timings?: Record<string, number | null>;
  sequences?: {
    tech_sequence?: Array<string | { name: string; type: string }>;
    build_sequence?: Array<{ name: string; type: string }>;
    upgrade_sequence?: string[];
  };
  army_composition?: Record<string, Record<string, number>>;
  production_timeline?: Record<number, Record<string, number>>;
  economy?: {
    workers_3min?: number | null;
    workers_5min?: number | null;
    workers_7min?: number | null;
    expansion_count?: number;
    avg_expansion_timing?: number | null;
    supply_block_count?: number;
    total_supply_block_time?: number;
  };
  tactical?: {
    moveout_times?: number[];
    first_moveout?: number | null;
    harass_count?: number;
    engagement_count?: number;
    first_engagement?: number | null;
  };
  micro?: {
    selection_count?: number;
    avg_selections_per_min?: number;
    control_groups_used?: number;
    most_used_control_group?: string | null;
    camera_movement_count?: number;
    avg_camera_moves_per_min?: number;
  };
  positioning?: {
    proxy_buildings?: number;
    avg_building_distance_from_main?: number | null;
  };
  ratios?: {
    gas_count?: number;
    production_count?: number;
    tech_count?: number;
    reactor_count?: number;
    techlab_count?: number;
    expansions?: number;
    gas_per_base?: number;
    production_per_base?: number;
  };
}

/**
 * Version 1: Current schema (fully typed)
 * This is the ReplayFingerprint type from replay-types.ts with version field
 */
export interface ReplayFingerprintV1 extends ReplayFingerprint {
  _schema_version?: '1.0.0';
}

/**
 * Union type for all supported fingerprint versions.
 * Use this when accepting fingerprints from storage/API responses.
 */
export type VersionedFingerprint = ReplayFingerprintV0 | ReplayFingerprintV1;

/**
 * Detect the schema version of a fingerprint.
 */
export function detectFingerprintVersion(fingerprint: unknown): SchemaVersion {
  if (!fingerprint || typeof fingerprint !== 'object') {
    return '0.0.0';
  }

  const fp = fingerprint as Record<string, unknown>;

  // Explicit version field
  if (fp._schema_version === '1.0.0') {
    return '1.0.0';
  }

  // Check for v1 required fields to detect implicit v1
  const hasV1RequiredFields =
    'all_players' in fp &&
    'tactical' in fp &&
    'micro' in fp &&
    'positioning' in fp &&
    'ratios' in fp &&
    fp.ratios &&
    typeof fp.ratios === 'object' &&
    'gas_per_base' in (fp.ratios as Record<string, unknown>);

  if (hasV1RequiredFields) {
    return '1.0.0';
  }

  // Default to legacy
  return '0.0.0';
}

/**
 * Check if a fingerprint needs migration.
 */
export function needsMigration(fingerprint: VersionedFingerprint): boolean {
  const version = detectFingerprintVersion(fingerprint);
  return version !== CURRENT_SCHEMA_VERSION;
}

/**
 * Normalize a fingerprint to the current schema version.
 * This does NOT modify the original - returns a new object.
 *
 * Use this when you need to work with a fingerprint but want
 * type safety with all required fields.
 */
export function normalizeFingerprint(
  fingerprint: VersionedFingerprint
): ReplayFingerprintV1 {
  const version = detectFingerprintVersion(fingerprint);

  if (version === '1.0.0') {
    // Already v1, just return with version tag
    return {
      ...fingerprint,
      _schema_version: '1.0.0',
    } as ReplayFingerprintV1;
  }

  // Migrate from v0 to v1
  const v0 = fingerprint as ReplayFingerprintV0;

  return {
    _schema_version: '1.0.0',
    matchup: v0.matchup,
    race: v0.race,
    player_name: v0.player_name || 'Unknown',
    all_players: (v0.all_players || []).map((p) => ({
      ...p,
      is_observer: p.is_observer ?? false,
    })),
    metadata: {
      map: v0.metadata.map,
      duration: v0.metadata.duration,
      result: v0.metadata.result,
      opponent_race: v0.metadata.opponent_race || 'Unknown',
      game_type: v0.metadata.game_type ?? null,
      category: v0.metadata.category ?? null,
      game_date: v0.metadata.game_date ?? null,
    },
    timings: v0.timings || {},
    sequences: {
      tech_sequence: (v0.sequences?.tech_sequence || []) as Array<{ name: string; type: string }>,
      build_sequence: v0.sequences?.build_sequence || [],
      upgrade_sequence: v0.sequences?.upgrade_sequence || [],
    },
    army_composition: v0.army_composition || {},
    production_timeline: v0.production_timeline || {},
    economy: {
      workers_3min: v0.economy?.workers_3min ?? null,
      workers_5min: v0.economy?.workers_5min ?? null,
      workers_7min: v0.economy?.workers_7min ?? null,
      expansion_count: v0.economy?.expansion_count || 0,
      avg_expansion_timing: v0.economy?.avg_expansion_timing ?? null,
      supply_block_count: v0.economy?.supply_block_count,
      total_supply_block_time: v0.economy?.total_supply_block_time,
    },
    tactical: {
      moveout_times: v0.tactical?.moveout_times || [],
      first_moveout: v0.tactical?.first_moveout ?? null,
      harass_count: v0.tactical?.harass_count || 0,
      engagement_count: v0.tactical?.engagement_count || 0,
      first_engagement: v0.tactical?.first_engagement ?? null,
    },
    micro: {
      selection_count: v0.micro?.selection_count || 0,
      avg_selections_per_min: v0.micro?.avg_selections_per_min || 0,
      control_groups_used: v0.micro?.control_groups_used || 0,
      most_used_control_group: v0.micro?.most_used_control_group ?? null,
      camera_movement_count: v0.micro?.camera_movement_count || 0,
      avg_camera_moves_per_min: v0.micro?.avg_camera_moves_per_min || 0,
    },
    positioning: {
      proxy_buildings: v0.positioning?.proxy_buildings || 0,
      avg_building_distance_from_main:
        v0.positioning?.avg_building_distance_from_main ?? null,
    },
    ratios: {
      gas_count: v0.ratios?.gas_count || 0,
      production_count: v0.ratios?.production_count || 0,
      tech_count: v0.ratios?.tech_count || 0,
      reactor_count: v0.ratios?.reactor_count || 0,
      techlab_count: v0.ratios?.techlab_count || 0,
      expansions: v0.ratios?.expansions || 0,
      gas_per_base: v0.ratios?.gas_per_base || 0,
      production_per_base: v0.ratios?.production_per_base || 0,
    },
  };
}

/**
 * Safely extract a value from a versioned fingerprint.
 * Returns undefined if the field doesn't exist in the version.
 */
export function safeGet<T>(
  fingerprint: VersionedFingerprint,
  path: string
): T | undefined {
  const parts = path.split('.');
  let current: unknown = fingerprint;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as T | undefined;
}

/**
 * Check if a fingerprint has a specific field.
 * Useful for conditional rendering in UI.
 */
export function hasField(
  fingerprint: VersionedFingerprint,
  path: string
): boolean {
  return safeGet(fingerprint, path) !== undefined;
}
