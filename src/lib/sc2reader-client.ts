/**
 * SC2 Replay Analyzer API Client
 *
 * TypeScript client for interacting with the FastAPI that analyzes SC2 replay files.
 * Returns build orders, metadata, fingerprints, build detection, and comparisons.
 */

import type {
  ReplayFingerprint,
  BuildDetection,
  ComparisonResult,
  LearnedBuild,
} from './replay-types';

// API Response Types
export interface SC2ReplayMetadata {
  map_name: string;
  game_length: string;
  game_length_seconds: number | null;
  date: string | null;
  unix_timestamp: number | null;
  expansion: string | null;
  release_string: string | null;
  game_type: string | null;
  category: string | null;
  winner: string | null;
  loser: string | null;
  players: SC2ReplayPlayer[];
  num_players: number;
}

export interface SC2ReplayPlayer {
  name: string;
  race: string;  // "Terran" | "Zerg" | "Protoss"
  result: string;  // "Win" | "Loss"
  mmr: number | null;
  apm: number | null;
  highest_league: number | null;
  color: string | null;
}

export interface SC2BuildOrderEvent {
  time: string;  // seconds as string
  supply: number;
  event: 'unit_born' | 'building_started' | 'morph_complete' | 'upgrade';
  unit?: string;
  upgrade?: string;
}

export interface SC2AnalysisResponse {
  filename: string;
  metadata: SC2ReplayMetadata;
  build_orders: Record<string, SC2BuildOrderEvent[]>;
}

// API Error Types
export interface SC2ReplayAPIError {
  error: string;
  detail?: string;
}

/**
 * Configuration for the SC2 Replay Analyzer API
 */
export interface SC2ReplayAPIConfig {
  apiUrl: string;
  apiKey: string;
}

/**
 * Default configuration - reads from environment variables
 */
const defaultConfig: SC2ReplayAPIConfig = {
  apiUrl: process.env.SC2READER_API_URL || 'http://localhost:8000',
  apiKey: process.env.SC2READER_API_KEY || 'your-secret-key-change-this',
};

/**
 * Timeout duration for API calls (30 seconds)
 */
const API_TIMEOUT_MS = 30000;

/**
 * Helper to add timeout to promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Client for SC2 Replay Analyzer API
 */
export class SC2ReplayAPIClient {
  private config: SC2ReplayAPIConfig;

  constructor(config?: Partial<SC2ReplayAPIConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Analyze an SC2 replay file
   * @param file - The .SC2Replay file to analyze
   * @returns Promise with replay metadata and build orders
   */
  async analyzeReplay(file: File): Promise<SC2AnalysisResponse> {
    // Validate file extension
    if (!file.name.endsWith('.SC2Replay')) {
      throw new Error('Invalid file type. Only .SC2Replay files are allowed.');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.config.apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = errorData as SC2ReplayAPIError;

        if (response.status === 401) {
          throw new Error('Authentication failed. Invalid API key.');
        } else if (response.status === 422) {
          throw new Error(`Failed to parse replay file: ${error.detail || 'The replay may be corrupted'}`);
        } else if (response.status === 400) {
          throw new Error(error.error || 'Invalid request');
        } else {
          throw new Error(error.error || 'Failed to analyze replay');
        }
      }

      const data: SC2AnalysisResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to analyze replay. Please try again.');
    }
  }

  /**
   * Check if the API is healthy
   * @returns Promise<boolean>
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`);
      if (!response.ok) return false;

      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Extract comprehensive fingerprint from a replay
   * @param blob - The .SC2Replay file as a Blob
   * @param playerName - Optional player name to analyze
   * @param filename - Filename for the blob (defaults to 'replay.SC2Replay')
   * @returns Promise with replay fingerprint
   */
  async extractFingerprint(blob: Blob, playerName?: string, filename: string = 'replay.SC2Replay'): Promise<ReplayFingerprint> {
    if (!filename.endsWith('.SC2Replay')) {
      throw new Error('Invalid file type. Only .SC2Replay files are allowed.');
    }

    const formData = new FormData();
    // Provide filename explicitly for proper multipart encoding
    formData.append('file', blob, filename);
    if (playerName) {
      formData.append('player_name', playerName);
    }

    try {
      const response = await withTimeout(
        fetch(`${this.config.apiUrl}/fingerprint`, {
          method: 'POST',
          headers: {
            'X-API-Key': this.config.apiKey,
          },
          body: formData,
        }),
        API_TIMEOUT_MS,
        'Fingerprint extraction'
      );

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      return data.fingerprint;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Failed to extract fingerprint. Please try again.');
    }
  }

  /**
   * Detect build order from a replay
   * @param blob - The .SC2Replay file as a Blob
   * @param playerName - Optional player name to analyze
   * @param filename - Filename for the blob (defaults to 'replay.SC2Replay')
   * @returns Promise with build detection result
   */
  async detectBuild(blob: Blob, playerName?: string, filename: string = 'replay.SC2Replay'): Promise<BuildDetection | null> {
    if (!filename.endsWith('.SC2Replay')) {
      throw new Error('Invalid file type. Only .SC2Replay files are allowed.');
    }

    const formData = new FormData();
    formData.append('file', blob, filename);
    if (playerName) {
      formData.append('player_name', playerName);
    }

    try {
      const response = await withTimeout(
        fetch(`${this.config.apiUrl}/detect-build`, {
          method: 'POST',
          headers: {
            'X-API-Key': this.config.apiKey,
          },
          body: formData,
        }),
        API_TIMEOUT_MS,
        'Build detection'
      );

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      return data.detection;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Failed to detect build. Please try again.');
    }
  }

  /**
   * Compare replay execution to a learned build
   * @param blob - The .SC2Replay file as a Blob
   * @param buildId - ID of learned build to compare against
   * @param playerName - Optional player name to analyze
   * @param filename - Filename for the blob (defaults to 'replay.SC2Replay')
   * @returns Promise with comparison result
   */
  async compareReplay(
    blob: Blob,
    buildId: string,
    playerName?: string,
    filename: string = 'replay.SC2Replay'
  ): Promise<ComparisonResult> {
    if (!filename.endsWith('.SC2Replay')) {
      throw new Error('Invalid file type. Only .SC2Replay files are allowed.');
    }

    const formData = new FormData();
    formData.append('file', blob, filename);
    if (playerName) {
      formData.append('player_name', playerName);
    }

    try {
      const response = await withTimeout(
        fetch(
          `${this.config.apiUrl}/compare?build_id=${encodeURIComponent(buildId)}`,
          {
            method: 'POST',
            headers: {
              'X-API-Key': this.config.apiKey,
            },
            body: formData,
          }
        ),
        API_TIMEOUT_MS,
        'Build comparison'
      );

      if (!response.ok) {
        throw await this.handleError(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Failed to compare replay. Please try again.');
    }
  }

  /**
   * List all available learned builds
   * @returns Promise with list of learned builds
   */
  async listBuilds(): Promise<LearnedBuild[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/builds`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      return data.builds;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Failed to fetch builds. Please try again.');
    }
  }

  /**
   * Handle API errors consistently
   */
  private async handleError(response: Response): Promise<Error> {
    const errorData = await response.json().catch(() => ({}));
    const error = errorData as SC2ReplayAPIError;

    if (response.status === 401) {
      return new Error('Authentication failed. Invalid API key.');
    } else if (response.status === 422) {
      return new Error(`Failed to parse replay file: ${error.detail || 'The replay may be corrupted'}`);
    } else if (response.status === 400) {
      return new Error(error.error || error.detail || 'Invalid request');
    } else if (response.status === 404) {
      return new Error(error.detail || 'Resource not found');
    } else {
      return new Error(error.error || error.detail || 'An error occurred');
    }
  }
}

/**
 * Utility function to format time from seconds to MM:SS
 */
export function formatReplayTime(seconds: number | string): string {
  const secs = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
}

/**
 * Utility function to normalize race names from API format to app format
 */
export function normalizeRace(race: string): 'terran' | 'zerg' | 'protoss' {
  return race.toLowerCase() as 'terran' | 'zerg' | 'protoss';
}

/**
 * Utility function to determine matchup from two races
 */
export function determineMatchup(race1: string, race2: string): string {
  const r1 = race1.charAt(0).toUpperCase();
  const r2 = race2.charAt(0).toUpperCase();
  return `${r1}v${r2}`;
}

/**
 * Utility function to filter out unwanted build order events
 */
export function filterBuildOrderEvents(events: SC2BuildOrderEvent[]): SC2BuildOrderEvent[] {
  return events.filter(event => {
    // Get action description
    const action = event.event === 'upgrade'
      ? `Upgrade: ${event.upgrade || 'Unknown'}`
      : event.unit || 'Unknown';

    // Filter out Unknown and Spray events
    if (action === 'Unknown' || action.includes('Spray')) {
      return false;
    }

    return true;
  });
}

/**
 * Convert SC2 API build order events to app BuildOrderStep format
 */
export function convertToBuildOrderSteps(events: SC2BuildOrderEvent[]): Array<{
  supply: number;
  time: string;
  action: string;
  notes?: string;
}> {
  return filterBuildOrderEvents(events).map(event => ({
    supply: event.supply,
    time: formatReplayTime(event.time),
    action: event.event === 'upgrade'
      ? `Upgrade: ${event.upgrade || 'Unknown'}`
      : event.unit || 'Unknown',
    notes: undefined,
  }));
}
