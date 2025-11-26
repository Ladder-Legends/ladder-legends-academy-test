/**
 * Tests for fingerprint version detection and migration
 */
import { describe, it, expect } from 'vitest';
import {
  detectFingerprintVersion,
  normalizeFingerprint,
  needsMigration,
  safeGet,
  hasField,
  CURRENT_SCHEMA_VERSION,
  type ReplayFingerprintV0,
} from '../fingerprint-versions';
import { createMockFingerprint } from '../fingerprint-validation';

describe('Fingerprint Version Detection', () => {
  it('detects v1 fingerprint with explicit version', () => {
    const fingerprint = createMockFingerprint();
    // @ts-expect-error - adding version field
    fingerprint._schema_version = '1.0.0';
    expect(detectFingerprintVersion(fingerprint)).toBe('1.0.0');
  });

  it('detects v1 fingerprint from structure (no explicit version)', () => {
    const fingerprint = createMockFingerprint();
    expect(detectFingerprintVersion(fingerprint)).toBe('1.0.0');
  });

  it('detects v0 (legacy) fingerprint', () => {
    const legacyFingerprint: ReplayFingerprintV0 = {
      matchup: 'TvP',
      race: 'Terran',
      metadata: {
        map: 'Test Map',
        duration: 600,
        result: 'Win',
      },
      // Missing: all_players, tactical, micro, positioning, ratios
    };
    expect(detectFingerprintVersion(legacyFingerprint)).toBe('0.0.0');
  });

  it('detects v0 for null/undefined', () => {
    expect(detectFingerprintVersion(null)).toBe('0.0.0');
    expect(detectFingerprintVersion(undefined)).toBe('0.0.0');
  });

  it('detects v0 for non-object', () => {
    expect(detectFingerprintVersion('string')).toBe('0.0.0');
    expect(detectFingerprintVersion(123)).toBe('0.0.0');
  });
});

describe('Migration Detection', () => {
  it('returns false for current version', () => {
    const fingerprint = createMockFingerprint();
    expect(needsMigration(fingerprint)).toBe(false);
  });

  it('returns true for legacy fingerprint', () => {
    const legacyFingerprint: ReplayFingerprintV0 = {
      matchup: 'TvP',
      race: 'Terran',
      metadata: {
        map: 'Test Map',
        duration: 600,
        result: 'Win',
      },
    };
    expect(needsMigration(legacyFingerprint)).toBe(true);
  });
});

describe('Fingerprint Normalization', () => {
  it('normalizes v1 fingerprint (no changes)', () => {
    const fingerprint = createMockFingerprint();
    const normalized = normalizeFingerprint(fingerprint);

    expect(normalized._schema_version).toBe('1.0.0');
    expect(normalized.matchup).toBe('TvP');
    expect(normalized.race).toBe('Terran');
  });

  it('normalizes v0 fingerprint to v1 with defaults', () => {
    const legacyFingerprint: ReplayFingerprintV0 = {
      matchup: 'ZvP',
      race: 'Zerg',
      metadata: {
        map: 'Legacy Map',
        duration: 450,
        result: 'Loss',
      },
    };

    const normalized = normalizeFingerprint(legacyFingerprint);

    expect(normalized._schema_version).toBe('1.0.0');
    expect(normalized.matchup).toBe('ZvP');
    expect(normalized.race).toBe('Zerg');

    // Check defaults
    expect(normalized.player_name).toBe('Unknown');
    expect(normalized.all_players).toEqual([]);
    expect(normalized.metadata.opponent_race).toBe('Unknown');
    expect(normalized.timings).toEqual({});
    expect(normalized.sequences.tech_sequence).toEqual([]);
    expect(normalized.tactical.harass_count).toBe(0);
    expect(normalized.micro.selection_count).toBe(0);
    expect(normalized.positioning.proxy_buildings).toBe(0);
    expect(normalized.ratios.gas_per_base).toBe(0);
  });

  it('preserves existing v0 data during normalization', () => {
    const legacyFingerprint: ReplayFingerprintV0 = {
      matchup: 'TvT',
      race: 'Terran',
      player_name: 'LegacyPlayer',
      metadata: {
        map: 'Old Map',
        duration: 300,
        result: 'Win',
        opponent_race: 'Terran',
      },
      economy: {
        workers_3min: 10,
        workers_5min: 25,
        supply_block_count: 2,
      },
    };

    const normalized = normalizeFingerprint(legacyFingerprint);

    expect(normalized.player_name).toBe('LegacyPlayer');
    expect(normalized.metadata.opponent_race).toBe('Terran');
    expect(normalized.economy.workers_3min).toBe(10);
    expect(normalized.economy.workers_5min).toBe(25);
    expect(normalized.economy.supply_block_count).toBe(2);
  });

  it('handles partial economy data', () => {
    const legacyFingerprint: ReplayFingerprintV0 = {
      matchup: 'TvP',
      race: 'Terran',
      metadata: {
        map: 'Test',
        duration: 600,
        result: 'Win',
      },
      economy: {
        workers_3min: 15,
        // Missing workers_5min, workers_7min
      },
    };

    const normalized = normalizeFingerprint(legacyFingerprint);

    expect(normalized.economy.workers_3min).toBe(15);
    expect(normalized.economy.workers_5min).toBeNull();
    expect(normalized.economy.workers_7min).toBeNull();
    expect(normalized.economy.expansion_count).toBe(0);
  });
});

describe('Safe Field Access', () => {
  it('gets nested field value', () => {
    const fingerprint = createMockFingerprint();
    expect(safeGet<string>(fingerprint, 'metadata.map')).toBe('Test Map');
    expect(safeGet<number>(fingerprint, 'economy.workers_3min')).toBe(12);
  });

  it('returns undefined for missing field', () => {
    const fingerprint = createMockFingerprint();
    expect(safeGet(fingerprint, 'nonexistent.field')).toBeUndefined();
  });

  it('returns undefined for null intermediate', () => {
    const legacyFingerprint: ReplayFingerprintV0 = {
      matchup: 'TvP',
      race: 'Terran',
      metadata: {
        map: 'Test',
        duration: 600,
        result: 'Win',
      },
      // economy is undefined
    };
    expect(safeGet(legacyFingerprint, 'economy.workers_3min')).toBeUndefined();
  });
});

describe('Field Existence Check', () => {
  it('returns true for existing field', () => {
    const fingerprint = createMockFingerprint();
    expect(hasField(fingerprint, 'matchup')).toBe(true);
    expect(hasField(fingerprint, 'economy.workers_3min')).toBe(true);
  });

  it('returns false for missing field', () => {
    const legacyFingerprint: ReplayFingerprintV0 = {
      matchup: 'TvP',
      race: 'Terran',
      metadata: {
        map: 'Test',
        duration: 600,
        result: 'Win',
      },
    };
    expect(hasField(legacyFingerprint, 'tactical')).toBe(false);
    expect(hasField(legacyFingerprint, 'ratios.gas_per_base')).toBe(false);
  });
});

describe('Schema Version Constant', () => {
  it('exports current schema version', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe('1.0.0');
  });
});
