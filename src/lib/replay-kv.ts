/**
 * Vercel KV client for Replay Tracking System
 * Manages user replay data, settings, and build assignments
 */
import { kv } from '@vercel/kv';
import type {
  UserReplayData,
  UserSettings,
  UserBuildAssignment,
} from './replay-types';

// Key prefix constants
const KEYS = {
  userSettings: (userId: string) => `user:${userId}:settings`,
  userReplays: (userId: string) => `user:${userId}:replays`,
  userReplay: (userId: string, replayId: string) => `user:${userId}:replay:${replayId}`,
  userBuilds: (userId: string) => `user:${userId}:builds`,
} as const;

/**
 * Get user settings from KV
 */
export async function getUserSettings(discordUserId: string): Promise<UserSettings | null> {
  try {
    const settings = await kv.get<UserSettings>(KEYS.userSettings(discordUserId));
    return settings;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }
}

/**
 * Update user settings in KV
 */
export async function updateUserSettings(settings: UserSettings): Promise<void> {
  try {
    settings.updated_at = new Date().toISOString();
    await kv.set(KEYS.userSettings(settings.discord_user_id), settings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw new Error('Failed to update user settings');
  }
}

/**
 * Create default user settings
 */
export async function createUserSettings(discordUserId: string): Promise<UserSettings> {
  const settings: UserSettings = {
    discord_user_id: discordUserId,
    default_race: null,
    favorite_builds: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await updateUserSettings(settings);
  return settings;
}

/**
 * Get all replay IDs for a user
 */
export async function getUserReplayIds(discordUserId: string): Promise<string[]> {
  try {
    const replayIds = await kv.get<string[]>(KEYS.userReplays(discordUserId));
    return replayIds || [];
  } catch (error) {
    console.error('Error fetching user replay IDs:', error);
    return [];
  }
}

/**
 * Get a specific replay by ID
 */
export async function getReplay(
  discordUserId: string,
  replayId: string
): Promise<UserReplayData | null> {
  try {
    const replay = await kv.get<UserReplayData>(KEYS.userReplay(discordUserId, replayId));
    return replay;
  } catch (error) {
    console.error('Error fetching replay:', error);
    return null;
  }
}

/**
 * Get all replays for a user
 */
export async function getUserReplays(discordUserId: string): Promise<UserReplayData[]> {
  try {
    const replayIds = await getUserReplayIds(discordUserId);

    // Fetch all replays in parallel
    const replays = await Promise.all(
      replayIds.map((id) => getReplay(discordUserId, id))
    );

    // Filter out nulls and sort by upload date (newest first)
    return replays
      .filter((r): r is UserReplayData => r !== null)
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  } catch (error) {
    console.error('Error fetching user replays:', error);
    return [];
  }
}

/**
 * Save a new replay
 */
export async function saveReplay(replay: UserReplayData): Promise<void> {
  try {
    // Save the replay data
    await kv.set(KEYS.userReplay(replay.discord_user_id, replay.id), replay);

    // Add replay ID to user's replay list
    const replayIds = await getUserReplayIds(replay.discord_user_id);
    if (!replayIds.includes(replay.id)) {
      replayIds.push(replay.id);
      await kv.set(KEYS.userReplays(replay.discord_user_id), replayIds);
    }
  } catch (error) {
    console.error('Error saving replay:', error);
    throw new Error('Failed to save replay');
  }
}

/**
 * Update an existing replay
 */
export async function updateReplay(replay: UserReplayData): Promise<void> {
  try {
    await kv.set(KEYS.userReplay(replay.discord_user_id, replay.id), replay);
  } catch (error) {
    console.error('Error updating replay:', error);
    throw new Error('Failed to update replay');
  }
}

/**
 * Delete a replay
 */
export async function deleteReplay(discordUserId: string, replayId: string): Promise<void> {
  try {
    // Delete the replay data
    await kv.del(KEYS.userReplay(discordUserId, replayId));

    // Remove from user's replay list
    const replayIds = await getUserReplayIds(discordUserId);
    const updatedIds = replayIds.filter((id) => id !== replayId);
    await kv.set(KEYS.userReplays(discordUserId), updatedIds);
  } catch (error) {
    console.error('Error deleting replay:', error);
    throw new Error('Failed to delete replay');
  }
}

/**
 * Get build assignments for a user
 */
export async function getUserBuildAssignments(
  discordUserId: string
): Promise<UserBuildAssignment[]> {
  try {
    const assignments = await kv.get<UserBuildAssignment[]>(KEYS.userBuilds(discordUserId));
    return assignments || [];
  } catch (error) {
    console.error('Error fetching build assignments:', error);
    return [];
  }
}

/**
 * Assign a build to a user (coach only)
 */
export async function assignBuild(assignment: UserBuildAssignment): Promise<void> {
  try {
    const assignments = await getUserBuildAssignments(assignment.discord_user_id);

    // Remove existing assignment for this matchup
    const filtered = assignments.filter((a) => a.matchup !== assignment.matchup);

    // Add new assignment
    filtered.push(assignment);

    await kv.set(KEYS.userBuilds(assignment.discord_user_id), filtered);
  } catch (error) {
    console.error('Error assigning build:', error);
    throw new Error('Failed to assign build');
  }
}

/**
 * Remove a build assignment
 */
export async function removeBuildAssignment(
  discordUserId: string,
  matchup: string
): Promise<void> {
  try {
    const assignments = await getUserBuildAssignments(discordUserId);
    const filtered = assignments.filter((a) => a.matchup !== matchup);
    await kv.set(KEYS.userBuilds(discordUserId), filtered);
  } catch (error) {
    console.error('Error removing build assignment:', error);
    throw new Error('Failed to remove build assignment');
  }
}

/**
 * Get replay statistics for a user
 */
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

/**
 * Clear all replays for a user (for testing/reset)
 */
export async function clearUserReplays(discordUserId: string): Promise<number> {
  try {
    const replayIds = await getUserReplayIds(discordUserId);
    const count = replayIds.length;

    // Delete all replay data
    for (const replayId of replayIds) {
      await kv.del(KEYS.userReplay(discordUserId, replayId));
    }

    // Clear the replay IDs list
    await kv.set(KEYS.userReplays(discordUserId), []);

    console.log(`🗑️  Cleared ${count} replays for user ${discordUserId}`);
    return count;
  } catch (error) {
    console.error('Error clearing replays:', error);
    throw new Error('Failed to clear replays');
  }
}
