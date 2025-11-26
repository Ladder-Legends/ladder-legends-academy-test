/**
 * Shared utilities for coach resolution and display.
 * Used across tables, filters, and CMS components.
 */

import { coaches as coachesData } from '@/lib/data';
import type { Coach } from '@/types/coach';

/**
 * Resolve a coach from various identifiers (coachId, coach name, battleTag).
 * Returns the coach object if found, null otherwise.
 */
export function resolveCoach(coachId?: string, coachName?: string): Coach | null {
  // Try coachId first (links to coach.id)
  if (coachId) {
    const coach = coachesData.find(c => c.id === coachId);
    if (coach) return coach;
  }

  // Try coach name (may be coach.name, coach.id, or a battletag)
  if (coachName) {
    // Check if it matches a coach name or id
    const coachByName = coachesData.find(c =>
      c.name.toLowerCase() === coachName.toLowerCase() ||
      c.id.toLowerCase() === coachName.toLowerCase()
    );
    if (coachByName) return coachByName;

    // Check if it matches a battletag
    const coachByTag = coachesData.find(c =>
      c.battleTags?.some(tag => tag.toLowerCase() === coachName.toLowerCase())
    );
    if (coachByTag) return coachByTag;
  }

  return null;
}

/**
 * Get the coach ID from various identifiers.
 * Returns null if no coach found.
 */
export function getCoachId(coachId?: string, coachName?: string): string | null {
  const coach = resolveCoach(coachId, coachName);
  return coach?.id ?? null;
}

/**
 * Get the display name for a coach from various identifiers.
 * Returns the raw coachName if no coach found, or '—' if neither provided.
 */
export function getCoachDisplayName(coachId?: string, coachName?: string): string {
  const coach = resolveCoach(coachId, coachName);
  if (coach) return coach.displayName;
  if (coachName) return coachName; // Return raw value as fallback
  return '—';
}

/**
 * Get active coaches for filter/select options.
 * Returns coaches that are active (isActive !== false).
 */
export function getActiveCoaches(): Coach[] {
  return coachesData.filter(c => c.isActive !== false);
}

/**
 * Get coach options for select/filter components.
 * Returns array of { id, label } for active coaches.
 */
export function getCoachFilterOptions(): Array<{ id: string; label: string }> {
  return getActiveCoaches().map(c => ({
    id: c.id,
    label: c.displayName,
  }));
}

/**
 * Get coach options for form selects (includes empty option).
 */
export function getCoachSelectOptions(): Array<{ value: string; label: string }> {
  return [
    { value: '', label: '-- No Coach --' },
    ...getActiveCoaches().map(c => ({
      value: c.name,  // Use name for backwards compatibility with existing data
      label: `${c.displayName} (${c.race})`,
    })),
  ];
}

/**
 * Try to match a session user to a coach.
 * Matches by Discord ID, Discord username, or display name.
 * Returns the coach if found, null otherwise.
 */
export function getCoachForUser(
  discordId?: string,
  discordUsername?: string
): Coach | null {
  const activeCoaches = getActiveCoaches();

  // Try matching by Discord ID first (most reliable)
  if (discordId) {
    const coach = activeCoaches.find(c => c.discordId === discordId);
    if (coach) return coach;
  }

  // Try matching by Discord username
  if (discordUsername) {
    const usernameLower = discordUsername.toLowerCase();
    const coach = activeCoaches.find(c =>
      c.discordUsername?.toLowerCase() === usernameLower ||
      c.displayName.toLowerCase() === usernameLower ||
      c.name.toLowerCase() === usernameLower
    );
    if (coach) return coach;
  }

  return null;
}

/**
 * Get the default coach name for new content based on the logged-in user.
 * Returns the coach name if the user is a coach, empty string otherwise.
 */
export function getDefaultCoachForSession(
  discordId?: string,
  discordUsername?: string
): string {
  const coach = getCoachForUser(discordId, discordUsername);
  return coach?.name ?? '';
}
