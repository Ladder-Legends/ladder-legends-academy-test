/**
 * Type definitions for the Replay Tracking System
 */

// SC2Reader API Response Types
export interface ReplayPlayer {
  name: string;
  race: string;
  result: string; // "Win" | "Loss"
  team: number;
  is_observer: boolean;
  mmr?: number | null;
  apm?: number | null;
}

export interface ReplayFingerprint {
  matchup: string;
  race: string;
  player_name: string; // The player this fingerprint is for
  all_players: ReplayPlayer[]; // All players in the game
  metadata: {
    map: string;
    duration: number | null;
    result: string; // "Win" | "Loss"
    opponent_race: string;
    game_type: string | null; // "1v1", "2v2", "3v3", "4v4", "FFA"
    category: string | null; // "Ladder", "Custom", "Tournament", etc.
  };
  timings: Record<string, number | null>;
  sequences: {
    tech_sequence: Array<{ name: string; type: string }>;
    build_sequence: Array<{ name: string; type: string }>;
    upgrade_sequence: string[];
  };
  army_composition: Record<string, Record<string, number>>;
  production_timeline: Record<number, Record<string, number>>;
  economy: {
    workers_3min: number | null;
    workers_5min: number | null;
    workers_7min: number | null;
    expansion_count: number;
    avg_expansion_timing: number | null;
    'avg_mineral_float_5min+'?: number;
    'avg_gas_float_5min+'?: number;
    'max_mineral_float_5min+'?: number;
    'max_gas_float_5min+'?: number;
    supply_block_count?: number;
    total_supply_block_time?: number;
    supply_block_periods?: Array<{
      start: number;
      end: number;
      duration: number;
      severity?: 'minor' | 'warning' | 'problem';
    }>;
    supply_block_categorization?: {
      minor: Array<{ start: number; end: number; duration: number; severity: 'minor' }>;
      warning: Array<{ start: number; end: number; duration: number; severity: 'warning' }>;
      problem: Array<{ start: number; end: number; duration: number; severity: 'problem' }>;
      minor_count: number;
      warning_count: number;
      problem_count: number;
      minor_time: number;
      warning_time: number;
      problem_time: number;
    };
  };
  tactical: {
    moveout_times: number[];
    first_moveout: number | null;
    harass_count: number;
    engagement_count: number;
    first_engagement: number | null;
  };
  micro: {
    selection_count: number;
    avg_selections_per_min: number;
    control_groups_used: number;
    most_used_control_group: string | null;
    camera_movement_count: number;
    avg_camera_moves_per_min: number;
  };
  positioning: {
    proxy_buildings: number;
    avg_building_distance_from_main: number | null;
  };
  ratios: {
    gas_count: number;
    production_count: number;
    tech_count: number;
    reactor_count: number;
    techlab_count: number;
    expansions: number;
    gas_per_base: number;
    production_per_base: number;
  };
  // Timeline data for graphing (sampled every 10 seconds)
  supply_timeline?: Record<number, { current: number; max: number }>;
  resource_timeline?: Record<number, { minerals: number; gas: number }>;
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
  production_comparison: Record<string, Record<string, CompositionComparison>>;
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

  // Game type from uploader (1v1-ladder, 1v1-private, 2v2-ladder, etc.)
  game_type?: string;

  // Player name from uploader (user's SC2 player name in this replay)
  player_name?: string;

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
  confirmed_player_names: string[]; // Player names confirmed by user
  possible_player_names: Record<string, number>; // Player name -> count (appears 3+ times)
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
