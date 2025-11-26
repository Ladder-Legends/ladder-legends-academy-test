/**
 * Mock KV storage for local development
 * Uses in-memory storage (data lost on server restart)
 */
import type {
  UserReplayData,
  UserSettings,
  UserBuildAssignment,
  ReplayIndex,
  ReplayIndexEntry,
  ReferenceReplay,
  UserMatchupConfig,
} from './replay-types';

// In-memory storage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storage = new Map<string, any>();

// Key prefix constants
const KEYS = {
  userSettings: (userId: string) => `user:${userId}:settings`,
  userReplays: (userId: string) => `user:${userId}:replays`,
  userReplay: (userId: string, replayId: string) => `user:${userId}:replay:${replayId}`,
  userBuilds: (userId: string) => `user:${userId}:builds`,
  userReplayIndex: (userId: string) => `user:${userId}:replay_index`,
  // Reference replay keys
  userReferences: (userId: string) => `user:${userId}:references`,
  userReference: (userId: string, refId: string) => `user:${userId}:reference:${refId}`,
  userMatchupConfigs: (userId: string) => `user:${userId}:matchup_configs`,
} as const;

export async function getUserSettings(discordUserId: string): Promise<UserSettings | null> {
  try {
    return storage.get(KEYS.userSettings(discordUserId)) || null;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }
}

export async function updateUserSettings(settings: UserSettings): Promise<void> {
  try {
    settings.updated_at = new Date().toISOString();
    storage.set(KEYS.userSettings(settings.discord_user_id), settings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw new Error('Failed to update user settings');
  }
}

export async function createUserSettings(discordUserId: string): Promise<UserSettings> {
  const settings: UserSettings = {
    discord_user_id: discordUserId,
    default_race: null,
    favorite_builds: [],
    confirmed_player_names: [],
    possible_player_names: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await updateUserSettings(settings);
  return settings;
}

export async function getUserReplayIds(discordUserId: string): Promise<string[]> {
  try {
    return storage.get(KEYS.userReplays(discordUserId)) || [];
  } catch (error) {
    console.error('Error fetching user replay IDs:', error);
    return [];
  }
}

export async function getReplay(
  discordUserId: string,
  replayId: string
): Promise<UserReplayData | null> {
  try {
    return storage.get(KEYS.userReplay(discordUserId, replayId)) || null;
  } catch (error) {
    console.error('Error fetching replay:', error);
    return null;
  }
}

export async function getUserReplays(discordUserId: string): Promise<UserReplayData[]> {
  try {
    const replayIds = await getUserReplayIds(discordUserId);

    const replays = await Promise.all(
      replayIds.map((id) => getReplay(discordUserId, id))
    );

    return replays
      .filter((r): r is UserReplayData => r !== null)
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  } catch (error) {
    console.error('Error fetching user replays:', error);
    return [];
  }
}

export async function saveReplay(replay: UserReplayData): Promise<void> {
  try {
    console.log('💾 [MOCK KV] Saving replay to in-memory storage');

    // Save the replay data
    storage.set(KEYS.userReplay(replay.discord_user_id, replay.id), replay);

    // Add replay ID to user's replay list
    const replayIds = await getUserReplayIds(replay.discord_user_id);
    if (!replayIds.includes(replay.id)) {
      replayIds.push(replay.id);
      storage.set(KEYS.userReplays(replay.discord_user_id), replayIds);
    }

    console.log(`✅ [MOCK KV] Replay saved: ${replay.id}`);
  } catch (error) {
    console.error('Error saving replay:', error);
    throw new Error('Failed to save replay');
  }
}

export async function updateReplay(replay: UserReplayData): Promise<void> {
  try {
    storage.set(KEYS.userReplay(replay.discord_user_id, replay.id), replay);
  } catch (error) {
    console.error('Error updating replay:', error);
    throw new Error('Failed to update replay');
  }
}

export async function deleteReplay(discordUserId: string, replayId: string): Promise<void> {
  try {
    storage.delete(KEYS.userReplay(discordUserId, replayId));

    const replayIds = await getUserReplayIds(discordUserId);
    const updatedIds = replayIds.filter((id) => id !== replayId);
    storage.set(KEYS.userReplays(discordUserId), updatedIds);
  } catch (error) {
    console.error('Error deleting replay:', error);
    throw new Error('Failed to delete replay');
  }
}

export async function getUserBuildAssignments(
  discordUserId: string
): Promise<UserBuildAssignment[]> {
  try {
    return storage.get(KEYS.userBuilds(discordUserId)) || [];
  } catch (error) {
    console.error('Error fetching build assignments:', error);
    return [];
  }
}

export async function assignBuild(assignment: UserBuildAssignment): Promise<void> {
  try {
    const assignments = await getUserBuildAssignments(assignment.discord_user_id);
    const filtered = assignments.filter((a) => a.matchup !== assignment.matchup);
    filtered.push(assignment);
    storage.set(KEYS.userBuilds(assignment.discord_user_id), filtered);
  } catch (error) {
    console.error('Error assigning build:', error);
    throw new Error('Failed to assign build');
  }
}

export async function removeBuildAssignment(
  discordUserId: string,
  matchup: string
): Promise<void> {
  try {
    const assignments = await getUserBuildAssignments(discordUserId);
    const filtered = assignments.filter((a) => a.matchup !== matchup);
    storage.set(KEYS.userBuilds(discordUserId), filtered);
  } catch (error) {
    console.error('Error removing build assignment:', error);
    throw new Error('Failed to remove build assignment');
  }
}

export async function getUserReplayStats(discordUserId: string) {
  const replays = await getUserReplays(discordUserId);

  const totalReplays = replays.length;
  const byMatchup = replays.reduce((acc, r) => {
    const matchup = r.fingerprint.matchup;
    acc[matchup] = (acc[matchup] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byResult = replays.reduce((acc, r) => {
    const result = r.fingerprint.metadata.result;
    acc[result] = (acc[result] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgExecutionScore = replays
    .filter((r) => r.comparison !== null)
    .reduce((sum, r) => sum + (r.comparison!.execution_score || 0), 0) / totalReplays || 0;

  return {
    totalReplays,
    byMatchup,
    byResult,
    avgExecutionScore: Math.round(avgExecutionScore * 10) / 10,
  };
}

export async function clearUserReplays(discordUserId: string): Promise<number> {
  try {
    const replayIds = await getUserReplayIds(discordUserId);
    const count = replayIds.length;

    // Delete all replay data
    for (const replayId of replayIds) {
      storage.delete(KEYS.userReplay(discordUserId, replayId));
    }

    // Clear the replay IDs list
    storage.set(KEYS.userReplays(discordUserId), []);

    // Clear the replay index
    storage.delete(KEYS.userReplayIndex(discordUserId));

    console.log(`🗑️  [MOCK KV] Cleared ${count} replays for user ${discordUserId}`);
    return count;
  } catch (error) {
    console.error('Error clearing replays:', error);
    throw new Error('Failed to clear replays');
  }
}

// ============================================================================
// Replay Index Functions (Phase 10-12)
// ============================================================================

/**
 * Calculate supply score from fingerprint economy data
 */
function calculateSupplyScoreFromFingerprint(economy: UserReplayData['fingerprint']['economy']): number | null {
  const blockCount = economy.supply_block_count;
  const totalBlockTime = economy.total_supply_block_time;

  if (blockCount == null && totalBlockTime == null) return null;

  let score = 100;
  let penalty = 0;

  if (blockCount != null) penalty += blockCount * 10;
  if (totalBlockTime != null) penalty += totalBlockTime * 2;

  // Early block penalty
  if (economy.supply_block_periods?.length) {
    for (const block of economy.supply_block_periods) {
      if (block.start < 300) {
        penalty += (block.duration || 0) * 1;
      }
    }
  }

  score = Math.max(0, score - penalty);
  return Math.min(100, score);
}

/**
 * Calculate production score from fingerprint economy data
 */
function calculateProductionScoreFromFingerprint(
  economy: UserReplayData['fingerprint']['economy'],
  comparisonScore: number | null
): number | null {
  // Use comparison execution_score if available (most accurate)
  if (comparisonScore != null) {
    return comparisonScore;
  }

  // Otherwise calculate from production_by_building idle times
  if (economy.production_by_building) {
    const totalIdle = Object.values(economy.production_by_building)
      .reduce((sum, b) => sum + (b.idle_seconds || 0), 0);

    // Scoring formula from sc2reader: First 15s free, 15-60s = 0.5pt/s, >60s = 1pt/s
    let penalty = 0;
    if (totalIdle <= 15) {
      penalty = 0;
    } else if (totalIdle <= 60) {
      penalty = (totalIdle - 15) * 0.5;
    } else {
      penalty = 22.5 + (totalIdle - 60) * 1.0;
    }

    return Math.max(0, Math.round(100 - penalty));
  }

  return null;
}

/**
 * Calculate total production idle time from fingerprint
 */
function calculateProductionIdleTime(economy: UserReplayData['fingerprint']['economy']): number | null {
  if (!economy.production_by_building) return null;

  const totalIdle = Object.values(economy.production_by_building)
    .reduce((sum, b) => sum + (b.idle_seconds || 0), 0);

  return totalIdle;
}

/**
 * Create a lightweight index entry from full replay data
 */
export function createIndexEntry(replay: UserReplayData): ReplayIndexEntry {
  const fingerprint = replay.fingerprint;
  const metadata = fingerprint.metadata;
  const economy = fingerprint.economy;

  // Find opponent name
  let opponentName = '';
  if (fingerprint.all_players) {
    const playerName = replay.suggested_player || replay.player_name || fingerprint.player_name;
    const playerData = fingerprint.all_players.find(p => p.name === playerName);
    if (playerData) {
      const opponent = fingerprint.all_players.find(
        p => !p.is_observer && p.team !== playerData.team
      );
      opponentName = opponent?.name || '';
    }
  }

  // Calculate pillar scores
  const supplyScore = calculateSupplyScoreFromFingerprint(economy);
  const productionScore = calculateProductionScoreFromFingerprint(
    economy,
    replay.comparison?.execution_score ?? null
  );

  // Get time-based metrics
  const supplyBlockTime = economy.total_supply_block_time ?? null;
  const productionIdleTime = calculateProductionIdleTime(economy);

  return {
    id: replay.id,
    filename: replay.filename,
    uploaded_at: replay.uploaded_at,
    game_date: metadata.game_date,

    // Game info
    game_type: replay.game_type || metadata.game_type || '1v1',
    matchup: fingerprint.matchup,
    result: metadata.result as 'Win' | 'Loss',
    duration: metadata.duration || 0,
    map_name: metadata.map,
    opponent_name: opponentName,

    // Reference comparison (null until implemented)
    reference_id: null,
    reference_alias: null,
    comparison_score: replay.comparison?.execution_score || null,

    // Pillar scores (0-100)
    production_score: productionScore,
    supply_score: supplyScore,
    vision_score: null,

    // Time-based metrics (seconds)
    supply_block_time: supplyBlockTime,
    production_idle_time: productionIdleTime,

    // Build detection
    detected_build: replay.detection?.build_name || null,
    detection_confidence: replay.detection?.confidence || null,
  };
}

/**
 * Get the replay index for a user
 */
export async function getReplayIndex(discordUserId: string): Promise<ReplayIndex | null> {
  try {
    return storage.get(KEYS.userReplayIndex(discordUserId)) || null;
  } catch (error) {
    console.error('Error fetching replay index:', error);
    return null;
  }
}

/**
 * Update the entire replay index
 */
export async function updateReplayIndex(discordUserId: string, index: ReplayIndex): Promise<void> {
  try {
    storage.set(KEYS.userReplayIndex(discordUserId), index);
  } catch (error) {
    console.error('Error updating replay index:', error);
    throw new Error('Failed to update replay index');
  }
}

/**
 * Add a replay to the index
 */
export async function addToReplayIndex(
  discordUserId: string,
  entry: ReplayIndexEntry
): Promise<void> {
  try {
    let index = await getReplayIndex(discordUserId);

    if (!index) {
      index = {
        version: 1,
        last_updated: new Date().toISOString(),
        replay_count: 0,
        entries: [],
      };
    }

    const existingIdx = index.entries.findIndex(e => e.id === entry.id);
    if (existingIdx >= 0) {
      index.entries[existingIdx] = entry;
    } else {
      index.entries.unshift(entry);
      index.replay_count++;
    }

    index.version++;
    index.last_updated = new Date().toISOString();

    await updateReplayIndex(discordUserId, index);
  } catch (error) {
    console.error('Error adding to replay index:', error);
    throw new Error('Failed to add to replay index');
  }
}

/**
 * Remove a replay from the index
 */
export async function removeFromReplayIndex(
  discordUserId: string,
  replayId: string
): Promise<void> {
  try {
    const index = await getReplayIndex(discordUserId);
    if (!index) return;

    const initialCount = index.entries.length;
    index.entries = index.entries.filter(e => e.id !== replayId);

    if (index.entries.length < initialCount) {
      index.replay_count = index.entries.length;
      index.version++;
      index.last_updated = new Date().toISOString();
      await updateReplayIndex(discordUserId, index);
    }
  } catch (error) {
    console.error('Error removing from replay index:', error);
    throw new Error('Failed to remove from replay index');
  }
}

/**
 * Rebuild the replay index from all replays
 */
export async function rebuildReplayIndex(discordUserId: string): Promise<ReplayIndex> {
  console.log(`🔄 [MOCK KV] Rebuilding replay index for user ${discordUserId}`);

  try {
    const replays = await getUserReplays(discordUserId);
    const entries: ReplayIndexEntry[] = replays.map(replay => createIndexEntry(replay));

    entries.sort((a, b) => {
      const dateA = a.game_date ? new Date(a.game_date).getTime() : new Date(a.uploaded_at).getTime();
      const dateB = b.game_date ? new Date(b.game_date).getTime() : new Date(b.uploaded_at).getTime();
      return dateB - dateA;
    });

    const index: ReplayIndex = {
      version: Date.now(),
      last_updated: new Date().toISOString(),
      replay_count: entries.length,
      entries,
    };

    await updateReplayIndex(discordUserId, index);
    console.log(`✅ [MOCK KV] Index rebuilt: ${entries.length} entries`);

    return index;
  } catch (error) {
    console.error('Error rebuilding replay index:', error);
    throw new Error('Failed to rebuild replay index');
  }
}

/**
 * Validate the replay index against actual replay data
 */
export async function validateReplayIndex(discordUserId: string): Promise<boolean> {
  try {
    const index = await getReplayIndex(discordUserId);
    if (!index) return true;

    const replayIds = await getUserReplayIds(discordUserId);

    if (replayIds.length !== index.replay_count) {
      console.warn(`Index mismatch: ${replayIds.length} replays, ${index.replay_count} in index`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating replay index:', error);
    return false;
  }
}

// =============================================================================
// Reference Replay Functions
// =============================================================================

/**
 * Get all reference replays for a user
 */
export async function getUserReferences(discordUserId: string): Promise<ReferenceReplay[]> {
  try {
    const refIds = storage.get(KEYS.userReferences(discordUserId)) as Set<string> | undefined;
    if (!refIds || refIds.size === 0) return [];

    const references: ReferenceReplay[] = [];
    for (const refId of refIds) {
      const ref = storage.get(KEYS.userReference(discordUserId, refId)) as ReferenceReplay | undefined;
      if (ref) references.push(ref);
    }

    return references;
  } catch (error) {
    console.error('Error fetching user references:', error);
    return [];
  }
}

/**
 * Get a specific reference replay
 */
export async function getReference(
  discordUserId: string,
  referenceId: string
): Promise<ReferenceReplay | null> {
  try {
    return storage.get(KEYS.userReference(discordUserId, referenceId)) || null;
  } catch (error) {
    console.error('Error fetching reference:', error);
    return null;
  }
}

/**
 * Get reference replays for a specific matchup
 */
export async function getReferencesForMatchup(
  discordUserId: string,
  matchup: string
): Promise<ReferenceReplay[]> {
  const allRefs = await getUserReferences(discordUserId);
  return allRefs.filter(ref => ref.matchup === matchup);
}

/**
 * Save a reference replay
 */
export async function saveReference(reference: ReferenceReplay): Promise<void> {
  try {
    reference.created_at = reference.created_at || new Date().toISOString();
    reference.updated_at = new Date().toISOString();

    // Save the reference data
    storage.set(KEYS.userReference(reference.user_id, reference.id), reference);

    // Add to user's reference set
    let refIds = storage.get(KEYS.userReferences(reference.user_id)) as Set<string> | undefined;
    if (!refIds) {
      refIds = new Set<string>();
    }
    refIds.add(reference.id);
    storage.set(KEYS.userReferences(reference.user_id), refIds);

    console.log(`✅ [MOCK KV] Reference saved: ${reference.id} (${reference.alias})`);
  } catch (error) {
    console.error('Error saving reference:', error);
    throw new Error('Failed to save reference replay');
  }
}

/**
 * Delete a reference replay
 */
export async function deleteReference(
  discordUserId: string,
  referenceId: string
): Promise<void> {
  try {
    // Delete the reference data
    storage.delete(KEYS.userReference(discordUserId, referenceId));

    // Remove from user's reference set
    const refIds = storage.get(KEYS.userReferences(discordUserId)) as Set<string> | undefined;
    if (refIds) {
      refIds.delete(referenceId);
      storage.set(KEYS.userReferences(discordUserId), refIds);
    }

    console.log(`🗑️ [MOCK KV] Reference deleted: ${referenceId}`);
  } catch (error) {
    console.error('Error deleting reference:', error);
    throw new Error('Failed to delete reference replay');
  }
}

/**
 * Get user's matchup configurations
 */
export async function getUserMatchupConfigs(
  discordUserId: string
): Promise<UserMatchupConfig[]> {
  try {
    const configs = storage.get(KEYS.userMatchupConfigs(discordUserId)) as UserMatchupConfig[] | undefined;
    return configs || [];
  } catch (error) {
    console.error('Error fetching matchup configs:', error);
    return [];
  }
}

/**
 * Get the default reference for a specific matchup
 */
export async function getDefaultReferenceForMatchup(
  discordUserId: string,
  matchup: string
): Promise<ReferenceReplay | null> {
  try {
    const configs = await getUserMatchupConfigs(discordUserId);
    const config = configs.find(c => c.matchup === matchup);

    if (!config?.default_reference_id) return null;

    return await getReference(discordUserId, config.default_reference_id);
  } catch (error) {
    console.error('Error fetching default reference:', error);
    return null;
  }
}

/**
 * Set the default reference for a matchup
 */
export async function setDefaultReferenceForMatchup(
  discordUserId: string,
  matchup: string,
  referenceId: string | null
): Promise<void> {
  try {
    const configs = await getUserMatchupConfigs(discordUserId);
    const existingIndex = configs.findIndex(c => c.matchup === matchup);

    if (existingIndex >= 0) {
      configs[existingIndex].default_reference_id = referenceId;
    } else {
      configs.push({
        user_id: discordUserId,
        matchup,
        default_reference_id: referenceId,
      });
    }

    storage.set(KEYS.userMatchupConfigs(discordUserId), configs);
    console.log(`✅ [MOCK KV] Default reference set for ${matchup}: ${referenceId}`);
  } catch (error) {
    console.error('Error setting default reference:', error);
    throw new Error('Failed to set default reference');
  }
}
