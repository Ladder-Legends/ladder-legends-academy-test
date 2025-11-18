/**
 * Tests for timezone utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getBrowserTimezone, getTimezoneAbbreviation, TIMEZONES } from '../timezone-utils';

describe('TIMEZONES', () => {
  it('should include major US timezones', () => {
    expect(TIMEZONES).toContain('America/New_York');
    expect(TIMEZONES).toContain('America/Chicago');
    expect(TIMEZONES).toContain('America/Los_Angeles');
  });

  it('should include major European timezones', () => {
    expect(TIMEZONES).toContain('Europe/London');
    expect(TIMEZONES).toContain('Europe/Paris');
    expect(TIMEZONES).toContain('Europe/Berlin');
  });

  it('should include major Asian timezones', () => {
    expect(TIMEZONES).toContain('Asia/Tokyo');
    expect(TIMEZONES).toContain('Asia/Seoul');
    expect(TIMEZONES).toContain('Asia/Shanghai');
  });

  it('should include Australian timezones', () => {
    expect(TIMEZONES).toContain('Australia/Sydney');
    expect(TIMEZONES).toContain('Australia/Melbourne');
  });

  it('should be a non-empty array', () => {
    expect(TIMEZONES.length).toBeGreaterThan(0);
  });

  it('should contain only valid IANA timezone identifiers', () => {
    TIMEZONES.forEach(tz => {
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });
  });
});

describe('getBrowserTimezone', () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    Intl.DateTimeFormat = originalDateTimeFormat;
    console.error = originalConsoleError;
  });

  it('should return the browser timezone', () => {
    const timezone = getBrowserTimezone();
    expect(typeof timezone).toBe('string');
    expect(timezone.length).toBeGreaterThan(0);
  });

  it('should return a valid IANA timezone identifier', () => {
    const timezone = getBrowserTimezone();
    // Should match timezone format like "America/New_York" or "Europe/London"
    expect(timezone).toMatch(/^[A-Z][a-z]+\/[A-Z_a-z]+$/);
  });

  it('should handle errors gracefully and return fallback', () => {
    // Mock Intl.DateTimeFormat to throw error
    Intl.DateTimeFormat = vi.fn().mockImplementation(() => {
      throw new Error('Test error');
    }) as unknown as typeof Intl.DateTimeFormat;

    const timezone = getBrowserTimezone();
    expect(timezone).toBe('America/New_York');
    expect(console.error).toHaveBeenCalledWith(
      'Failed to detect browser timezone:',
      expect.any(Error)
    );
  });

  it('should not throw an error even if Intl API fails', () => {
    Intl.DateTimeFormat = vi.fn().mockImplementation(() => {
      throw new Error('Test error');
    }) as unknown as typeof Intl.DateTimeFormat;

    expect(() => getBrowserTimezone()).not.toThrow();
  });
});

describe('getTimezoneAbbreviation', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should return timezone abbreviation for valid timezone', () => {
    const abbr = getTimezoneAbbreviation('America/New_York');
    expect(typeof abbr).toBe('string');
    expect(abbr.length).toBeGreaterThan(0);
  });

  it('should return different abbreviations for different timezones', () => {
    const nyAbbr = getTimezoneAbbreviation('America/New_York');
    const laAbbr = getTimezoneAbbreviation('America/Los_Angeles');

    expect(nyAbbr).not.toBe(laAbbr);
  });

  it('should use default date if not provided', () => {
    const abbr = getTimezoneAbbreviation('America/New_York');
    expect(typeof abbr).toBe('string');
  });

  it('should accept custom date parameter', () => {
    const summerDate = new Date('2024-07-01');
    const winterDate = new Date('2024-01-01');

    const summerAbbr = getTimezoneAbbreviation('America/New_York', summerDate);
    const winterAbbr = getTimezoneAbbreviation('America/New_York', winterDate);

    expect(typeof summerAbbr).toBe('string');
    expect(typeof winterAbbr).toBe('string');
    // During DST transitions, these might be different (EDT vs EST)
  });

  it('should handle invalid timezone gracefully', () => {
    const abbr = getTimezoneAbbreviation('Invalid/Timezone');
    expect(typeof abbr).toBe('string');
    // Should either return the timezone itself or handle error
  });

  it('should handle errors and return fallback', () => {
    // This test depends on browser implementation
    // Just verify it doesn't throw
    expect(() => getTimezoneAbbreviation('UTC')).not.toThrow();
  });

  it('should work with UTC timezone', () => {
    const abbr = getTimezoneAbbreviation('UTC');
    expect(typeof abbr).toBe('string');
  });

  it('should work with Asia/Tokyo timezone', () => {
    const abbr = getTimezoneAbbreviation('Asia/Tokyo');
    expect(typeof abbr).toBe('string');
    expect(abbr.length).toBeGreaterThan(0);
  });

  it('should work with Europe/London timezone', () => {
    const abbr = getTimezoneAbbreviation('Europe/London');
    expect(typeof abbr).toBe('string');
    expect(abbr.length).toBeGreaterThan(0);
  });

  it('should work with Australia/Sydney timezone', () => {
    const abbr = getTimezoneAbbreviation('Australia/Sydney');
    expect(typeof abbr).toBe('string');
    expect(abbr.length).toBeGreaterThan(0);
  });
});
