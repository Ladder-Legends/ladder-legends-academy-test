/**
 * Benchmark matching utilities for SC2 build order fingerprints.
 *
 * Uses Levenshtein distance to match player build orders to reference builds.
 */

import type { ReferenceBuild, BuildMatchResult } from "./replay-metrics";

// =============================================================================
// Levenshtein Distance
// =============================================================================

/**
 * Calculate the Levenshtein distance between two strings.
 *
 * This is the minimum number of single-character edits (insertions,
 * deletions, or substitutions) required to change one string into the other.
 *
 * @param a First string
 * @param b Second string
 * @returns The edit distance between the strings
 */
export function levenshteinDistance(a: string, b: string): number {
  // Handle edge cases
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Create a matrix to store distances
  // dp[i][j] = distance between a[0..i-1] and b[0..j-1]
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

// =============================================================================
// Similarity Calculation
// =============================================================================

/**
 * Calculate the similarity between two fingerprints.
 *
 * Returns a value between 0 and 1, where:
 * - 1 = identical fingerprints
 * - 0 = completely different (or one is empty)
 *
 * Uses normalized Levenshtein distance: 1 - (distance / maxLength)
 *
 * @param a First fingerprint
 * @param b Second fingerprint
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(a: string, b: string): number {
  // Handle edge cases
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) {
    // If both empty, they're identical
    if (a.length === 0 && b.length === 0) return 1;
    // If one is empty, no similarity
    return 0;
  }

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  // Normalized similarity: 1 - (distance / maxLength)
  return 1 - distance / maxLength;
}

// =============================================================================
// Best Match Finding
// =============================================================================

/**
 * Similarity thresholds for matching.
 */
const AUTO_MATCH_THRESHOLD = 0.75; // 75%+ = auto-select
const SUGGEST_THRESHOLD = 0.5; // 50-75% = suggest

/**
 * Find the best matching reference build for a fingerprint.
 *
 * @param fingerprint The player's build fingerprint
 * @param benchmarks Array of reference builds to compare against
 * @param matchup The matchup to filter by (e.g., "TvZ", "PvT")
 * @returns The best match result, or null if no candidates
 */
export function findBestMatch(
  fingerprint: string,
  benchmarks: ReferenceBuild[],
  matchup: string
): BuildMatchResult | null {
  // Filter benchmarks by matchup
  const candidates = benchmarks.filter((b) => b.matchup === matchup);

  if (candidates.length === 0) {
    return null;
  }

  // Calculate similarity for each candidate
  let bestMatch: BuildMatchResult | null = null;
  let bestSimilarity = -1;

  for (const build of candidates) {
    const similarity = calculateSimilarity(fingerprint, build.fingerprint);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = {
        build,
        similarity,
        match_type:
          similarity >= AUTO_MATCH_THRESHOLD
            ? "auto"
            : similarity >= SUGGEST_THRESHOLD
              ? "suggested"
              : "no_match",
      };
    }
  }

  return bestMatch;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract the race prefix from a fingerprint.
 * @param fingerprint Build fingerprint (e.g., "T:ssdsgb")
 * @returns Race initial ("T", "P", "Z") or null
 */
export function extractRace(
  fingerprint: string
): "T" | "P" | "Z" | null {
  if (fingerprint.startsWith("T:")) return "T";
  if (fingerprint.startsWith("P:")) return "P";
  if (fingerprint.startsWith("Z:")) return "Z";
  return null;
}

/**
 * Get the full race name from a fingerprint prefix.
 */
export function getRaceFromFingerprint(
  fingerprint: string
): "Terran" | "Protoss" | "Zerg" | null {
  const prefix = extractRace(fingerprint);
  switch (prefix) {
    case "T":
      return "Terran";
    case "P":
      return "Protoss";
    case "Z":
      return "Zerg";
    default:
      return null;
  }
}

/**
 * Check if two fingerprints are from the same race.
 */
export function sameRace(fp1: string, fp2: string): boolean {
  return extractRace(fp1) === extractRace(fp2);
}
