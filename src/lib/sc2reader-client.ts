/**
 * SC2 Replay Analyzer API Client
 *
 * TypeScript client for interacting with the sc2reader FastAPI service.
 * Primary method is extractMetrics() which returns comprehensive analysis data.
 */

import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import type {
  BuildDetection,
  ComparisonResult,
  LearnedBuild,
  MetricsResponse,
  SinglePlayerMetricsResponse,
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
   * Extract comprehensive metrics from a replay (UNIFIED ENDPOINT)
   *
   * This is the preferred method for getting all replay analysis data.
   * Returns production, supply, resource metrics AND fingerprint data (timings, sequences, tactical, etc.)
   *
   * @param blob - The .SC2Replay file as a Blob
   * @param playerName - Optional player name to analyze (returns single player if specified)
   * @param filename - Filename for the blob (defaults to 'replay.SC2Replay')
   * @returns Promise with comprehensive metrics for all players (or single player if playerName specified)
   */
  async extractMetrics(
    blob: Blob,
    playerName?: string,
    filename: string = 'replay.SC2Replay'
  ): Promise<MetricsResponse | SinglePlayerMetricsResponse> {
    if (!filename.endsWith('.SC2Replay')) {
      throw new Error('Invalid file type. Only .SC2Replay files are allowed.');
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
      contentType: 'application/octet-stream',
    });
    if (playerName) {
      formData.append('player_name', playerName);
    }

    try {
      const response = await withTimeout(
        axios.post(`${this.config.apiUrl}/metrics`, formData, {
          headers: {
            ...formData.getHeaders(),
            'X-API-Key': this.config.apiKey,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
        API_TIMEOUT_MS,
        'Metrics extraction'
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw await this.handleAxiosError(error);
      }
      if (error instanceof Error) throw error;
      throw new Error('Failed to extract metrics. Please try again.');
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

    // Convert Blob to Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use form-data package (works properly with Next.js)
    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
      contentType: 'application/octet-stream',
    });
    if (playerName) {
      formData.append('player_name', playerName);
    }

    try {
      const response = await withTimeout(
        axios.post(`${this.config.apiUrl}/detect-build`, formData, {
          headers: {
            ...formData.getHeaders(),
            'X-API-Key': this.config.apiKey,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
        API_TIMEOUT_MS,
        'Build detection'
      );

      return response.data.detection;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw await this.handleAxiosError(error);
      }
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

    // Convert Blob to Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use form-data package (works properly with Next.js)
    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
      contentType: 'application/octet-stream',
    });
    if (playerName) {
      formData.append('player_name', playerName);
    }

    try {
      const response = await withTimeout(
        axios.post(
          `${this.config.apiUrl}/compare?build_id=${encodeURIComponent(buildId)}`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'X-API-Key': this.config.apiKey,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }
        ),
        API_TIMEOUT_MS,
        'Build comparison'
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw await this.handleAxiosError(error);
      }
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
   * Handle API errors consistently (legacy fetch-based method, kept for backward compatibility)
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

  /**
   * Handle Axios API errors consistently
   */
  private async handleAxiosError(error: AxiosError): Promise<Error> {
    const errorData = error.response?.data as SC2ReplayAPIError | undefined;

    if (error.response?.status === 401) {
      return new Error('Authentication failed. Invalid API key.');
    } else if (error.response?.status === 422) {
      return new Error(`Failed to parse replay file: ${errorData?.detail || 'The replay may be corrupted'}`);
    } else if (error.response?.status === 400) {
      return new Error(errorData?.error || errorData?.detail || 'Invalid request');
    } else if (error.response?.status === 404) {
      return new Error(errorData?.detail || 'Resource not found');
    } else {
      return new Error(errorData?.error || errorData?.detail || error.message || 'An error occurred');
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
