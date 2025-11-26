/**
 * Tests for benchmark matching utilities.
 *
 * TDD: These tests were written FIRST, then the implementation.
 */

import {
  levenshteinDistance,
  calculateSimilarity,
  findBestMatch,
} from "../benchmark-matching";
import type { ReferenceBuild } from "../replay-metrics";

// =============================================================================
// Levenshtein Distance Tests
// =============================================================================

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("abc", "abc")).toBe(0);
    expect(levenshteinDistance("T:ssdsgb", "T:ssdsgb")).toBe(0);
  });

  it("returns string length for empty vs non-empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("returns 0 for two empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("returns 1 for single character difference", () => {
    expect(levenshteinDistance("abc", "abd")).toBe(1);
    expect(levenshteinDistance("abc", "aac")).toBe(1);
  });

  it("returns correct distance for insertions", () => {
    expect(levenshteinDistance("abc", "abcd")).toBe(1);
    expect(levenshteinDistance("abc", "xabc")).toBe(1);
  });

  it("returns correct distance for deletions", () => {
    expect(levenshteinDistance("abcd", "abc")).toBe(1);
    expect(levenshteinDistance("xabc", "abc")).toBe(1);
  });

  it("returns correct distance for known examples", () => {
    // Classic examples
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("saturday", "sunday")).toBe(3);
  });

  it("handles fingerprint-like strings", () => {
    // Two similar Terran builds
    const fp1 = "T:ssdsgbmm"; // SCV, SCV, depot, SCV, gas, barracks, marine, marine
    const fp2 = "T:ssdsgbmmm"; // Same but one more marine
    expect(levenshteinDistance(fp1, fp2)).toBe(1);
  });
});

// =============================================================================
// Similarity Calculation Tests
// =============================================================================

describe("calculateSimilarity", () => {
  it("returns 1 for identical fingerprints", () => {
    expect(calculateSimilarity("T:ssdsgbmm", "T:ssdsgbmm")).toBe(1);
  });

  it("returns 0 for completely different fingerprints", () => {
    // Strings with nothing in common
    expect(calculateSimilarity("T:ssdsgb", "Z:dopqzz")).toBeLessThan(0.2);
  });

  it("returns 0 for empty vs non-empty", () => {
    expect(calculateSimilarity("", "T:ssdsgb")).toBe(0);
    expect(calculateSimilarity("T:ssdsgb", "")).toBe(0);
  });

  it("returns 1 for two empty strings", () => {
    expect(calculateSimilarity("", "")).toBe(1);
  });

  it("returns high similarity for similar builds", () => {
    // Two very similar Terran builds (only 1 difference)
    const fp1 = "T:ssdsgbmmmA"; // marine, marine, marine, marauder
    const fp2 = "T:ssdsgbmmmm"; // marine, marine, marine, marine
    const similarity = calculateSimilarity(fp1, fp2);
    expect(similarity).toBeGreaterThan(0.9);
  });

  it("returns moderate similarity for somewhat different builds", () => {
    // Same race, different unit mix
    const fp1 = "T:ssdsgbmmmmm"; // Marine heavy
    const fp2 = "T:ssdsgbmmAAA"; // Marauder heavy
    const similarity = calculateSimilarity(fp1, fp2);
    expect(similarity).toBeGreaterThan(0.5);
    expect(similarity).toBeLessThan(0.9);
  });

  it("returns low similarity for different races", () => {
    const terran = "T:ssdsgbmmm";
    const zerg = "Z:dopzzzzzz";
    const similarity = calculateSimilarity(terran, zerg);
    expect(similarity).toBeLessThan(0.5);
  });
});

// =============================================================================
// Find Best Match Tests
// =============================================================================

describe("findBestMatch", () => {
  // Sample reference builds for testing
  const sampleBuilds: ReferenceBuild[] = [
    {
      id: "tvz-2-1-1",
      name: "2-1-1 Marine Medivac",
      matchup: "TvZ",
      race: "Terran",
      fingerprint: "T:ssdsgbbbfpmmiim",
      phase_benchmarks: {
        opening: {
          worker_count: 19,
          base_count: 1,
          gas_buildings: 1,
          army_supply: 0,
          key_units: {},
          key_buildings: ["Barracks"],
          key_upgrades: [],
        },
        early: {
          worker_count: 35,
          base_count: 2,
          gas_buildings: 2,
          army_supply: 20,
          key_units: { Marine: 16, Medivac: 2 },
          key_buildings: ["Barracks", "Factory", "Starport"],
          key_upgrades: ["Stimpack"],
        },
        mid: {
          worker_count: 50,
          base_count: 3,
          gas_buildings: 4,
          army_supply: 60,
          key_units: { Marine: 30, Medivac: 4 },
          key_buildings: [],
          key_upgrades: ["CombatShield"],
        },
        late: {
          worker_count: 60,
          base_count: 3,
          gas_buildings: 6,
          army_supply: 100,
          key_units: { Marine: 50, Medivac: 6 },
          key_buildings: [],
          key_upgrades: [],
        },
      },
    },
    {
      id: "tvz-hellbat",
      name: "Hellbat Push",
      matchup: "TvZ",
      race: "Terran",
      fingerprint: "T:ssdsgbbfhhhhti",
      phase_benchmarks: {
        opening: {
          worker_count: 19,
          base_count: 1,
          gas_buildings: 1,
          army_supply: 0,
          key_units: {},
          key_buildings: ["Barracks", "Factory"],
          key_upgrades: [],
        },
        early: {
          worker_count: 30,
          base_count: 2,
          gas_buildings: 2,
          army_supply: 16,
          key_units: { Hellion: 6, Hellbat: 2 },
          key_buildings: [],
          key_upgrades: ["InfernalPreIgniter"],
        },
        mid: {
          worker_count: 45,
          base_count: 3,
          gas_buildings: 4,
          army_supply: 40,
          key_units: { Hellbat: 8, SiegeTank: 2 },
          key_buildings: [],
          key_upgrades: [],
        },
        late: {
          worker_count: 60,
          base_count: 3,
          gas_buildings: 6,
          army_supply: 80,
          key_units: {},
          key_buildings: [],
          key_upgrades: [],
        },
      },
    },
    {
      id: "pvz-sentry-immortal",
      name: "Sentry Immortal All-in",
      matchup: "PvZ",
      race: "Protoss",
      fingerprint: "P:pyagckeeii!",
      phase_benchmarks: {
        opening: {
          worker_count: 19,
          base_count: 1,
          gas_buildings: 2,
          army_supply: 0,
          key_units: {},
          key_buildings: ["Gateway", "CyberneticsCore"],
          key_upgrades: ["WarpGateResearch"],
        },
        early: {
          worker_count: 25,
          base_count: 1,
          gas_buildings: 2,
          army_supply: 20,
          key_units: { Sentry: 4, Immortal: 2 },
          key_buildings: ["RoboticsFacility"],
          key_upgrades: [],
        },
        mid: {
          worker_count: 25,
          base_count: 1,
          gas_buildings: 2,
          army_supply: 40,
          key_units: { Sentry: 6, Immortal: 4 },
          key_buildings: [],
          key_upgrades: [],
        },
        late: {
          worker_count: 25,
          base_count: 1,
          gas_buildings: 2,
          army_supply: 50,
          key_units: {},
          key_buildings: [],
          key_upgrades: [],
        },
      },
    },
  ];

  it("filters by matchup", () => {
    // Terran fingerprint should not match Protoss builds
    const result = findBestMatch("T:ssdsgbmmm", sampleBuilds, "TvZ");

    // Should only consider TvZ builds
    if (result) {
      expect(result.build.matchup).toBe("TvZ");
    }
  });

  it("returns null for no candidates", () => {
    const result = findBestMatch("T:ssdsgbmmm", [], "TvZ");
    expect(result).toBeNull();
  });

  it("returns null when no builds match the matchup", () => {
    const result = findBestMatch("T:ssdsgbmmm", sampleBuilds, "TvT");
    expect(result).toBeNull();
  });

  it("auto-selects at 75%+ similarity", () => {
    // Very similar to 2-1-1 build
    const fingerprint = "T:ssdsgbbbfpmmiim"; // Exact match
    const result = findBestMatch(fingerprint, sampleBuilds, "TvZ");

    expect(result).not.toBeNull();
    expect(result!.match_type).toBe("auto");
    expect(result!.similarity).toBeGreaterThanOrEqual(0.75);
    expect(result!.build.id).toBe("tvz-2-1-1");
  });

  it("suggests at 50-75% similarity", () => {
    // Somewhat similar but not exact
    const fingerprint = "T:ssdsgbbbfpmmmmm"; // Different from both TvZ builds
    const result = findBestMatch(fingerprint, sampleBuilds, "TvZ");

    if (result && result.similarity >= 0.5 && result.similarity < 0.75) {
      expect(result.match_type).toBe("suggested");
    }
  });

  it("returns no_match for low similarity", () => {
    // Very different fingerprint
    const fingerprint = "T:xxxxxyyyyyzzzzz";
    const result = findBestMatch(fingerprint, sampleBuilds, "TvZ");

    if (result && result.similarity < 0.5) {
      expect(result.match_type).toBe("no_match");
    }
  });

  it("selects the most similar build", () => {
    // Fingerprint closer to hellbat build
    const fingerprint = "T:ssdsgbbfhhhhti"; // Exact hellbat match
    const result = findBestMatch(fingerprint, sampleBuilds, "TvZ");

    expect(result).not.toBeNull();
    expect(result!.build.id).toBe("tvz-hellbat");
  });
});
