/**
 * Mock KV storage for local development
 * Uses in-memory storage (data lost on server restart)
 */
import type {
  UserReplayData,
  UserSettings,
  UserBuildAssignment,
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

    console.log(`🗑️  [MOCK KV] Cleared ${count} replays for user ${discordUserId}`);
    return count;
  } catch (error) {
    console.error('Error clearing replays:', error);
    throw new Error('Failed to clear replays');
  }
}
