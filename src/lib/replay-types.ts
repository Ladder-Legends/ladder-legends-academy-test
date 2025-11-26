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
    game_date: string | null; // ISO 8601 date string when the game was played
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
    // Production breakdown by building type (future: from enhanced sc2reader)
    production_by_building?: Record<string, {
      count: number;
      idle_seconds: number;
      production_cycles?: number;
      first_completed?: number;
    }>;
    // Supply at checkpoints (time in seconds -> supply)
    supply_at_checkpoints?: Record<string, number>;
    // Macro ability efficiency (Terran)
    mule_count?: number;
    mule_possible?: number;
    mule_efficiency?: number;
    calldown_supply_count?: number;
    // Macro ability efficiency (Zerg)
    inject_efficiency?: number;
    // Macro ability efficiency (Protoss)
    chrono_efficiency?: number;
    // Phase data for army supply tracking
    phases?: Record<string, {
      phase: string;
      end_time: number;
      worker_count: number;
      base_count: number;
      gas_buildings: number;
      total_army_supply_produced: number;
      units_produced: Record<string, number>;
      production_buildings: Record<string, number>;
      tech_buildings: string[];
      upgrades_completed: string[];
      upgrades_in_progress: string[];
      supply_blocks_in_phase: number;
      supply_block_time_in_phase: number;
    }>;
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

  // Replay file URL in Vercel Blob (for download)
  blob_url?: string;

  // Game type from uploader (1v1-ladder, 1v1-private, 2v2-ladder, etc.)
  game_type?: string;

  // Region from folder path (NA, EU, KR, CN)
  region?: string;

  // Player name from uploader (user's SC2 player name in this replay)
  player_name?: string;

  // Optional target build (if user selected one)
  target_build_id?: string;

  // Detection result
  detection: BuildDetection | null;

  // Comparison result (if target_build_id is set)
  comparison: ComparisonResult | null;

  // Full fingerprints for ALL players (new structure)
  player_fingerprints?: Record<string, ReplayFingerprint>;

  // Suggested player (who we think is the uploader)
  suggested_player?: string | null;

  // Legacy: Single player fingerprint (for backwards compatibility)
  fingerprint: ReplayFingerprint;

  // Shared game metadata
  game_metadata?: {
    map: string;
    duration: number | null;
    game_date: string | null;
    game_type: string | null;
    category: string | null;
    patch: string | null;
    winner: string | null;
    loser: string | null;
  };

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

// ============================================================================
// NEW: Unified Metrics Response Types (from /metrics endpoint)
// ============================================================================

/**
 * Player fingerprint data embedded in metrics response.
 * Contains timings, sequences, tactical, micro, positioning analysis.
 */
export interface PlayerFingerprintData {
  matchup: string;
  timings: Record<string, number | null>;
  sequences: {
    tech_sequence: string[];
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
    supply_block_count?: number;
    total_supply_block_time?: number;
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
  supply_timeline?: Record<number, { current: number; max: number }>;
  resource_timeline?: Record<number, { minerals: number; gas: number }>;
}

/**
 * Build order event in the timeline.
 */
export interface BuildOrderEvent {
  time: number;
  supply: number;
  item: string;
  type: "unit" | "building" | "upgrade";
}

/**
 * Player metrics from the /metrics endpoint.
 * Combines coaching metrics with fingerprint analysis data.
 */
export interface PlayerMetrics {
  pid: number;
  name: string;
  race: string;
  result: string; // "Win" | "Loss"

  // Build order fingerprint (character-encoded string like "T:sbbb...")
  build_fingerprint: string;

  // Production metrics
  production_score: number | null;
  production_idle_total: number | null;
  production_idle_percent: number | null;

  // Supply metrics
  supply_score: number | null;
  supply_block_total: number | null;
  supply_block_count: number | null;
  supply_block_percent: number | null;

  // Resource metrics
  avg_mineral_float: number | null;
  avg_gas_float: number | null;

  // Zerg-specific inject metrics (null for non-Zerg)
  inject_idle_total: number | null;
  inject_efficiency: number | null;
  inject_count: number | null;

  // Build order timeline
  build_order: BuildOrderEvent[];

  // Game phases
  phases: Record<string, unknown>;

  // Full fingerprint analysis data (includes timings, sequences, tactical, etc.)
  // Uses ReplayFingerprint for compatibility with existing storage format
  fingerprint?: ReplayFingerprint;

  // Enhanced metrics from sc2reader processor (Phase 10-12)
  // These are used to populate fingerprint.economy for storage
  supply_block_events?: SupplyBlockEvent[];
  production_by_building?: Record<string, {
    count: number;
    idle_seconds: number;
  }>;
  building_timings?: Record<string, number | null>;
  supply_at_checkpoints?: Record<string, number>;
  workers_at_checkpoints?: Record<string, number>;
}

/**
 * Game metadata from replay.
 */
export interface GameMetadata {
  game_date: string | null;
  game_type: string | null;
  category: string | null;
  patch: string | null;
}

/**
 * Response from the unified /metrics endpoint.
 * Contains everything needed for replay analysis.
 */
export interface MetricsResponse {
  filename: string;
  map_name: string;
  duration: number;
  game_metadata: GameMetadata;
  all_players: ReplayPlayer[]; // All players with MMR/APM
  suggested_player: string | null; // Hint for UI
  players: Record<string, PlayerMetrics>; // pid -> metrics
}

/**
 * Response when requesting a single player from /metrics.
 */
export interface SinglePlayerMetricsResponse {
  filename: string;
  map_name: string;
  duration: number;
  game_metadata: GameMetadata;
  all_players: ReplayPlayer[];
  player: PlayerMetrics;
}

// ============================================================================
// Phase 10-12: Replay Index & Reference System Types
// ============================================================================

/**
 * Lightweight replay entry for list view (stored in replay index).
 * Much smaller than full UserReplayData for performance.
 *
 * Design Goals:
 * - Per-user (discord login) storage via KV key: user:{userId}:replay-index
 * - Per-player breakdown: player_name tracks which gamer tag was used
 * - Nemesis tracking: opponent_name + result enables "who do I lose to most"
 * - Time-series charting: game_date + metrics for trends
 * - Lightweight: ~600 bytes per entry vs ~10KB for full replay data
 */
export interface ReplayIndexEntry {
  id: string;
  filename: string;
  uploaded_at: string;
  game_date: string | null;

  // Player info (for multi-account users)
  player_name: string;           // User's gamer tag in this game (e.g., "Lotus")
  player_race: string;           // Race played (e.g., "Terran") - for "my games as Terran" filter

  // Game info (for filtering/display)
  game_type: string;             // "1v1-ladder", "2v2-ladder", etc.
  matchup: string;               // "TvZ" - canonical format
  result: 'Win' | 'Loss';
  duration: number;              // seconds
  map_name: string;

  // Opponent info (for nemesis tracking)
  opponent_name: string;         // Primary opponent's name
  opponent_race: string;         // Primary opponent's race (e.g., "Zerg")

  // Reference comparison (if assigned)
  reference_id: string | null;
  reference_alias: string | null;
  comparison_score: number | null;

  // Pillar scores (for sorting/aggregation) - 0-100 scores
  production_score: number | null;
  supply_score: number | null;
  vision_score: number | null;   // null until implemented

  // Time-based metrics (in seconds) - for charting trends
  supply_block_time: number | null;      // Total seconds supply blocked
  production_idle_time: number | null;   // Total seconds production buildings idle

  // Build detection
  detected_build: string | null;
  detection_confidence: number | null;
}

/**
 * Replay index with version tracking for synchronization.
 */
export interface ReplayIndex {
  version: number;           // Increment on every change
  last_updated: string;      // ISO timestamp
  replay_count: number;      // Quick integrity check
  entries: ReplayIndexEntry[];
}

/**
 * Nemesis summary - opponent you lose to most often.
 * Calculated client-side from ReplayIndexEntry[].
 */
export interface NemesisSummary {
  opponent_name: string;
  opponent_race: string;
  games_played: number;
  losses: number;
  wins: number;
  loss_rate: number;         // 0-100%
  // Breakdown by your race (for multi-race players)
  by_your_race?: Record<string, { games: number; losses: number; loss_rate: number }>;
}

/**
 * Aggregated stats for a specific matchup.
 * Calculated client-side from ReplayIndexEntry[].
 */
export interface MatchupStats {
  matchup: string;           // "TvZ", "TvP", etc.
  games: number;
  wins: number;
  losses: number;
  win_rate: number;          // 0-100%
  avg_supply_block_time: number | null;
  avg_production_idle_time: number | null;
  avg_duration: number;
}

/**
 * Per-player (gamer tag) stats summary.
 * Enables multi-account users to see stats broken down by which name they used.
 */
export interface PlayerStatsSummary {
  player_name: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number;
  primary_race: string;      // Most frequently played race
  matchups: MatchupStats[];
  nemesis: NemesisSummary | null;
}

/**
 * Reference replay/build that user compares against.
 */
export interface ReferenceReplay {
  id: string;                    // UUID
  user_id: string;               // Discord user ID (owner)
  alias: string;                 // User-friendly name
  matchup: string;               // "TvZ", "TvP", "TvT", "ZvT", etc.
  source_type: 'uploaded_replay' | 'my_replay' | 'site_build_order' | 'site_replay';
  source_id: string;             // ID of source (blob URL, replay ID, or build order ID)

  // Cached data for comparison (extracted from source)
  fingerprint: ReplayFingerprint;
  build_order: BuildOrderEvent[];
  key_timings: Record<string, number>;  // e.g., { "first_expansion": 120, "factory": 180 }

  created_at: string;
  updated_at: string;
}

/**
 * Per-matchup configuration for a user.
 */
export interface UserMatchupConfig {
  user_id: string;
  matchup: string;               // "TvZ", "TvP", "TvT"
  default_reference_id: string | null;  // Which reference to auto-compare
}

/**
 * Comparison result stored per replay when compared to a reference.
 */
export interface ReferenceComparison {
  reference_id: string;
  reference_alias: string;
  overall_match: number;         // 0-100%
  timing_deviations: Array<{
    event: string;
    target_time: number;
    actual_time: number;
    deviation_seconds: number;
    is_acceptable: boolean;      // Within threshold
  }>;
  pillar_scores: {
    production: number;          // How close to reference production
    supply: number;              // How close to reference supply
  };
}

/**
 * Game phase for phase-based scoring (using timestamp ranges, not names).
 */
export interface GamePhase {
  name: string;           // "Opening", "Early", "Mid", "Late", "Endgame"
  start_seconds: number;
  end_seconds: number;
}

/**
 * Standard game phases for phase-based scoring.
 */
export const GAME_PHASES: GamePhase[] = [
  { name: "Opening", start_seconds: 0, end_seconds: 180 },      // 0:00 - 3:00
  { name: "Early", start_seconds: 180, end_seconds: 360 },      // 3:00 - 6:00
  { name: "Mid", start_seconds: 360, end_seconds: 600 },        // 6:00 - 10:00
  { name: "Late", start_seconds: 600, end_seconds: 900 },       // 10:00 - 15:00
  { name: "Endgame", start_seconds: 900, end_seconds: Infinity } // 15:00+
];

/**
 * Per-phase score breakdown.
 */
export interface PhaseScore {
  phase: GamePhase;
  worker_score: number;      // Worker count vs benchmark
  supply_score: number;      // Supply vs benchmark
  timing_score: number;      // Building/unit timings vs benchmark
  army_comp_score: number;   // Army composition similarity
  overall: number;           // Weighted average
}

/**
 * Detailed comparison data structure for reference comparisons.
 */
export interface DetailedComparison {
  reference_id: string;
  reference_alias: string;
  reference_player: string;  // Which player from reference replay

  // Overall scores
  overall_match: number;     // 0-100%

  // Per-phase breakdown
  phase_scores: PhaseScore[];

  // Timing comparisons
  building_timings: Array<{
    building: string;        // "First Factory", "Natural", etc.
    reference_time: number;
    actual_time: number | null;
    deviation: number;
    status: 'on_time' | 'early' | 'late' | 'very_late' | 'missing';
  }>;

  // Production timeline (per minute)
  production_timeline: Array<{
    minute: number;
    units: Array<{
      unit: string;
      actual: number;
      benchmark: number;
      diff: number;
    }>;
  }>;

  // Worker checkpoints
  worker_checkpoints: Array<{
    time_seconds: number;
    actual: number;
    benchmark: number;
    diff: number;
  }>;

  // Supply checkpoints
  supply_checkpoints: Array<{
    time_seconds: number;
    actual: number;
    benchmark: number;
    diff: number;
  }>;

  // Army composition at key moments
  army_snapshots: Array<{
    time_seconds: number;
    actual: Record<string, number>;    // unit -> count
    benchmark: Record<string, number>;
  }>;
}

/**
 * Build detection result using Levenshtein distance on fingerprints.
 */
export interface BuildDetectionResult {
  detected_reference_id: string | null;
  detected_alias: string | null;
  confidence: number;              // 0-100%
  distance: number;                // Levenshtein distance
  can_be_overridden: boolean;      // Always true - user can change/remove
}

/**
 * Reference player selection result.
 */
export interface ReferencePlayerSelection {
  source_type: 'site_replay' | 'site_build_order' | 'uploaded' | 'my_replay';
  auto_selected: boolean;
  player_name: string;
  selection_reason: string;
}

// ============================================================================
// Phase 10-12: Enhanced sc2reader Metrics Types
// ============================================================================

/**
 * Per-building production breakdown from sc2reader.
 */
export interface BuildingProductionMetrics {
  count: number;
  idle_seconds: number;
  production_cycles: number;
  first_completed: number;  // timestamp in seconds
}

/**
 * Supply block event from sc2reader.
 */
export interface SupplyBlockEvent {
  time: number;      // timestamp in seconds
  duration: number;  // seconds
  supply: number;    // supply level when blocked
  cap?: number;      // supply cap when blocked (optional for backwards compat)
}

/**
 * Enhanced player metrics from sc2reader /metrics endpoint.
 * Extends PlayerMetrics with additional production and supply details.
 */
export interface EnhancedPlayerMetrics extends PlayerMetrics {
  // Per-building production breakdown
  production_by_building: Record<string, BuildingProductionMetrics>;

  // Key building timings (seconds)
  building_timings: Record<string, number | null>;

  // Worker counts at checkpoints (time_seconds -> count)
  workers_at_checkpoints: Record<number, number>;

  // Supply at checkpoints (time_seconds -> supply)
  supply_at_checkpoints: Record<number, number>;

  // Supply block events with timestamps
  supply_block_events: SupplyBlockEvent[];

  // Army composition at key moments (time_seconds -> unit -> count)
  army_at_checkpoints: Record<number, Record<string, number>>;

  // Cumulative production per minute (minute -> unit -> count)
  production_by_minute: Record<number, Record<string, number>>;

  // Macro ability tracking (Terran)
  mule_count?: number;
  mule_possible?: number;
  mule_efficiency?: number;
  calldown_supply_count?: number;

  // Macro ability tracking (Protoss)
  chrono_count?: number;
  chrono_possible?: number;
  chrono_efficiency?: number;

  // Upgrade timings (upgrade_name -> timestamp)
  upgrade_timings: Record<string, number>;
}
