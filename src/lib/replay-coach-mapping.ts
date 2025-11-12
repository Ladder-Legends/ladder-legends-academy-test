/**
 * Utility functions for mapping replays to coaches based on battle tags
 */

import type { Replay } from '@/types/replay';
import type { Coach } from '@/types/coach';
import coachesData from '@/data/coaches.json';

const coaches = coachesData as Coach[];

/**
 * Get the coach ID for a replay based on battle tag matching
 * @param replay The replay to check
 * @returns The coach ID if a match is found, undefined otherwise
 */
export function getCoachIdFromReplay(replay: Replay): string | undefined {
  const player1Name = replay.player1?.name || '';
  const player2Name = replay.player2?.name || '';

  // Find a coach whose battle tags match either player
  const matchingCoach = coaches.find(coach => {
    if (!coach.battleTags || coach.battleTags.length === 0) {
      return false;
    }

    return coach.battleTags.some(tag =>
      player1Name.toLowerCase() === tag.toLowerCase() ||
      player2Name.toLowerCase() === tag.toLowerCase()
    );
  });

  return matchingCoach?.id;
}

/**
 * Get the coach display name for a replay based on battle tag matching
 * @param replay The replay to check
 * @returns The coach display name if a match is found, undefined otherwise
 */
export function getCoachNameFromReplay(replay: Replay): string | undefined {
  const coachId = getCoachIdFromReplay(replay);
  if (!coachId) return undefined;

  const coach = coaches.find(c => c.id === coachId);
  return coach?.displayName;
}

/**
 * Check if a replay belongs to a specific coach based on battle tags
 * @param replay The replay to check
 * @param coachId The coach ID to check against
 * @returns true if the replay belongs to the coach, false otherwise
 */
export function doesReplayBelongToCoach(replay: Replay, coachId: string): boolean {
  const coach = coaches.find(c => c.id === coachId);
  if (!coach || !coach.battleTags || coach.battleTags.length === 0) {
    return false;
  }

  const player1Name = replay.player1?.name || '';
  const player2Name = replay.player2?.name || '';

  return coach.battleTags.some(tag =>
    player1Name.toLowerCase() === tag.toLowerCase() ||
    player2Name.toLowerCase() === tag.toLowerCase()
  );
}

/**
 * Get all replays for a specific coach based on battle tags
 * @param replays Array of replays to filter
 * @param coachId The coach ID to filter by
 * @returns Filtered array of replays
 */
export function getReplaysByCoach(replays: Replay[], coachId: string): Replay[] {
  return replays.filter(replay => doesReplayBelongToCoach(replay, coachId));
}
