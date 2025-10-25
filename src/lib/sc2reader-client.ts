/**
 * SC2 Replay Analyzer API Client
 *
 * TypeScript client for interacting with the Flask API that analyzes SC2 replay files.
 * Returns build orders and metadata extracted from replay files.
 */

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
  apiUrl: process.env.NEXT_PUBLIC_SC2READER_API_URL || 'http://localhost:8000',
  apiKey: process.env.SC2READER_API_KEY || 'your-secret-key-change-this',
};

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
