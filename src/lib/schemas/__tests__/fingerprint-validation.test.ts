/**
 * Tests for fingerprint schema validation
 */
import { describe, it, expect } from 'vitest';
import {
  validateFingerprint,
  createMockFingerprint,
  checkSchemaVersion,
  SCHEMA_VERSION,
} from '../fingerprint-validation';

describe('Fingerprint Schema Validation', () => {
  describe('validateFingerprint', () => {
    it('validates a complete mock fingerprint', () => {
      const fingerprint = createMockFingerprint();
      const result = validateFingerprint(fingerprint);
      expect(result.valid).toBe(true);
    });

    it('validates with custom overrides', () => {
      const fingerprint = createMockFingerprint({
        matchup: 'ZvT',
        race: 'Zerg',
        player_name: 'CustomPlayer',
      });
      const result = validateFingerprint(fingerprint);
      expect(result.valid).toBe(true);
      expect(fingerprint.matchup).toBe('ZvT');
    });

    it('fails on invalid matchup format', () => {
      const fingerprint = createMockFingerprint();
      // @ts-expect-error - intentionally testing invalid data
      fingerprint.matchup = 'InvalidMatchup';
      const result = validateFingerprint(fingerprint);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('matchup'))).toBe(true);
    });

    it('fails on missing required field', () => {
      const fingerprint = createMockFingerprint();
      // @ts-expect-error - intentionally testing invalid data
      delete fingerprint.economy;
      const result = validateFingerprint(fingerprint);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('economy'))).toBe(true);
    });

    it('fails on invalid race value', () => {
      const fingerprint = createMockFingerprint();
      // @ts-expect-error - intentionally testing invalid data
      fingerprint.race = 'InvalidRace';
      const result = validateFingerprint(fingerprint);
      expect(result.valid).toBe(false);
    });

    it('validates economy with supply block data', () => {
      const fingerprint = createMockFingerprint({
        economy: {
          workers_3min: 12,
          workers_5min: 29,
          workers_7min: 48,
          expansion_count: 2,
          avg_expansion_timing: 180,
          supply_block_count: 3,
          total_supply_block_time: 15,
          supply_block_periods: [
            { start: 120, end: 125, duration: 5, severity: 'minor' },
            { start: 200, end: 210, duration: 10, severity: 'warning' },
          ],
        },
      });
      const result = validateFingerprint(fingerprint);
      expect(result.valid).toBe(true);
    });

    it('validates all_players array', () => {
      const fingerprint = createMockFingerprint({
        all_players: [
          {
            name: 'Player1',
            race: 'Terran',
            result: 'Win',
            team: 1,
            is_observer: false,
            mmr: 5000,
            apm: 150,
          },
          {
            name: 'Player2',
            race: 'Protoss',
            result: 'Loss',
            team: 2,
            is_observer: false,
            mmr: 4800,
            apm: 120,
          },
        ],
      });
      const result = validateFingerprint(fingerprint);
      expect(result.valid).toBe(true);
    });
  });

  describe('createMockFingerprint', () => {
    it('creates a valid fingerprint with defaults', () => {
      const fingerprint = createMockFingerprint();

      expect(fingerprint.matchup).toBe('TvP');
      expect(fingerprint.race).toBe('Terran');
      expect(fingerprint.player_name).toBe('TestPlayer');
      expect(fingerprint.all_players).toHaveLength(2);
      expect(fingerprint.economy.workers_3min).toBe(12);
      expect(fingerprint.ratios.gas_per_base).toBe(1);
    });

    it('deep merges nested objects', () => {
      const fingerprint = createMockFingerprint({
        economy: {
          workers_3min: 15,
          workers_5min: 29,
          workers_7min: 48,
          expansion_count: 3,
          avg_expansion_timing: 160,
        },
      });

      expect(fingerprint.economy.workers_3min).toBe(15);
      expect(fingerprint.economy.expansion_count).toBe(3);
    });

    it('preserves array overrides', () => {
      const fingerprint = createMockFingerprint({
        tactical: {
          moveout_times: [180, 300, 420],
          first_moveout: 180,
          harass_count: 2,
          engagement_count: 5,
          first_engagement: 240,
        },
      });

      expect(fingerprint.tactical.moveout_times).toEqual([180, 300, 420]);
      expect(fingerprint.tactical.first_moveout).toBe(180);
    });
  });

  describe('checkSchemaVersion', () => {
    it('returns compatible for matching version', () => {
      const result = checkSchemaVersion({ _schema_version: SCHEMA_VERSION });
      expect(result.compatible).toBe(true);
    });

    it('returns compatible for missing version', () => {
      const result = checkSchemaVersion({});
      expect(result.compatible).toBe(true);
      expect(result.message).toContain('No schema version');
    });

    it('returns incompatible for major version mismatch', () => {
      const result = checkSchemaVersion({ _schema_version: '2.0.0' });
      expect(result.compatible).toBe(false);
      expect(result.message).toContain('Incompatible');
    });

    it('returns compatible with warning for newer minor version', () => {
      const result = checkSchemaVersion({ _schema_version: '1.1.0' });
      expect(result.compatible).toBe(true);
      expect(result.message).toContain('Newer minor version');
    });
  });

  describe('Schema version constant', () => {
    it('exports the correct schema version', () => {
      expect(SCHEMA_VERSION).toBe('1.0.0');
    });
  });
});
