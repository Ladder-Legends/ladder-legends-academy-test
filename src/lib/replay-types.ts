/**
 * Type definitions for the Replay Tracking System
 */

// SC2Reader API Response Types
export interface ReplayFingerprint {
  matchup: string;
  race: string;
  metadata: {
    map_name: string;
    game_length_seconds: number;
    date: string | null;
    result: string; // "Win" | "Loss"
    opponent_race: string;
  };
  timings: Record<string, number | null>;
  sequences: {
    tech_sequence: string[];
    build_sequence: string[];
    upgrade_sequence: string[];
  };
  army_composition: Record<string, Record<string, number>>;
  economy: {
    worker_counts: Record<string, number>;
  };
  tactical: {
    moveouts: Array<{ time: number; unit_count: number }>;
    harass: Array<{ time: number; unit_count: number }>;
    engagements: Array<{ time: number; deaths: number }>;
  };
  micro: {
    selections_per_minute: number;
    control_groups: Record<string, number>;
    camera_movements_per_minute: number;
  };
  positioning: {
    average_building_distance: number;
    proxy_buildings: string[];
  };
  ratios: {
    gas_count: number;
    production_count: number;
    tech_count: number;
    expansions: number;
  };
}

export interface BuildDetection {
  build_id: string;
  build_name: string;
  confidence: number;
  distance: number;
}

export interface TimingComparison {
  target: number;
  actual: number;
  deviation: number;
  variance: number;
  status: "on_time" | "early" | "late";
}

export interface CompositionComparison {
  target: number;
  actual: number;
  difference: number;
}

export interface ComparisonResult {
  filename: string;
  build_name: string;
  build_id: string;
  matchup: string;
  execution_score: number;
  tier: "S" | "A" | "B" | "C" | "D";
  timing_comparison: Record<string, TimingComparison>;
  composition_comparison: Record<string, Record<string, CompositionComparison>>;
  replay_fingerprint: ReplayFingerprint;
}

export interface LearnedBuild {
  id: string;
  name: string;
  matchup: string;
  num_examples: number;
}

// KV Storage Types
export interface UserReplayData {
  id: string; // Unique replay ID
  discord_user_id: string;
  uploaded_at: string; // ISO timestamp
  filename: string;
  
  // Optional target build (if user selected one)
  target_build_id?: string;
  
  // Detection result
  detection: BuildDetection | null;
  
  // Comparison result (if target_build_id is set)
  comparison: ComparisonResult | null;
  
  // Full fingerprint
  fingerprint: ReplayFingerprint;
  
  // User notes
  notes?: string;
  tags?: string[];
}

export interface UserSettings {
  discord_user_id: string;
  default_race: "terran" | "protoss" | "zerg" | null;
  favorite_builds: string[]; // Array of build IDs
  created_at: string;
  updated_at: string;
}

export interface UserBuildAssignment {
  discord_user_id: string;
  matchup: string; // "TvP", "TvZ", etc.
  build_id: string;
  assigned_by: string; // Coach discord ID
  assigned_at: string;
  notes?: string;
}
