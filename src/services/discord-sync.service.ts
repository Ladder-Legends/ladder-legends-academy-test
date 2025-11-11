/**
 * Discord Event Sync Service
 *
 * Provides bi-directional sync between local events and Discord scheduled events.
 * Can be used by API routes or CLI scripts.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export interface LocalEvent {
  id: string;
  title: string;
  description?: string;
  type: 'tournament' | 'coaching' | 'arcade' | 'other';
  date: string;
  time: string;
  timezone: string;
  duration: number;
  coach?: string;
  videoIds: string[];
  isFree: boolean;
  tags: string[];
  recurring?: {
    enabled: boolean;
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number;
    endDate?: string;
  };
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DiscordEvent {
  id: string;
  guild_id: string;
  name: string;
  description: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  channel_id: string | null;
  creator_id: string;
  status: number;
  entity_type: number;
  recurrence_rule: {
    start: string;
    end: string | null;
    frequency: number; // 2 = weekly, 3 = monthly
    interval: number;
    by_weekday: number[] | null;
    by_month_day: number[] | null;
    count: number | null;
  } | null;
}

export interface EventConflict {
  type: 'missing_local' | 'missing_discord' | 'mismatch';
  localEvent?: LocalEvent;
  discordEvent?: DiscordEvent;
  differences?: string[];
}

export interface SyncResult {
  success: boolean;
  conflicts: EventConflict[];
  message: string;
  errors?: string[];
}

/**
 * Fetches Discord scheduled events from API
 */
export async function fetchDiscordEvents(botToken: string, guildId: string): Promise<DiscordEvent[]> {
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events`,
    {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord events: ${response.status}`);
  }

  return await response.json();
}

/**
 * Converts Discord event format to local format
 */
export function transformDiscordToLocal(event: DiscordEvent): LocalEvent {
  const startTime = new Date(event.scheduled_start_time);
  const endTime = event.scheduled_end_time ? new Date(event.scheduled_end_time) : null;
  const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : 120;

  const text = (event.name + ' ' + (event.description || '')).toLowerCase();

  // Detect event type
  let type: 'tournament' | 'coaching' | 'arcade' | 'other' = 'other';
  if (text.includes('tournament')) type = 'tournament';
  else if (text.includes('coaching') || text.includes('workshop') || text.includes('lesson') || text.includes('replay analysis') || text.includes('micro monday')) type = 'coaching';
  else if (text.includes('team game') || text.includes('arcade') || text.includes('casual') || text.includes('inhouse')) type = 'arcade';

  // Extract tags
  const tags = new Set<string>();
  if (text.includes('replay analysis')) tags.add('replay analysis');
  if (text.includes('coaching')) tags.add('coaching');
  if (text.includes('ladder')) tags.add('ladder');
  if (text.includes('gameplay')) tags.add('gameplay');
  if (text.includes('commentary')) tags.add('commentary');
  if (text.includes('team games') || text.includes('team game')) tags.add('team games');
  if (text.includes('casual')) tags.add('casual');
  if (text.includes('micro')) tags.add('micro');
  if (text.includes('competition')) tags.add('competition');

  // Detect coach
  let coach: string | undefined;
  const coaches = ['hino', 'nico', 'groovy', 'gamerrichy', 'krystianer', 'eon'];
  for (const c of coaches) {
    if (text.includes(c)) {
      coach = c;
      break;
    }
  }

  // Convert Discord recurrence_rule to our format
  let recurring: LocalEvent['recurring'] | undefined;
  if (event.recurrence_rule) {
    const freq = event.recurrence_rule.frequency === 2 ? 'weekly' : 'monthly';
    const dayOfWeek = event.recurrence_rule.by_weekday?.[0];
    recurring = {
      enabled: true,
      frequency: freq as 'weekly' | 'monthly',
      ...(dayOfWeek !== undefined && { dayOfWeek }),
      ...(event.recurrence_rule.end && { endDate: event.recurrence_rule.end }),
    };
  }

  // Auto-generate description if missing
  let description = event.description || '';
  if (!description && text.includes('replay analysis')) {
    description = 'Join Groovy for live analysis of subscriber replays. Submit your games for professional feedback!';
  } else if (!description && text.includes('ladder grind')) {
    description = 'Watch high-level ladder gameplay and learn advanced strategies.';
  } else if (!description && text.includes('team game')) {
    description = 'Join us for casual team games and inhouse matches! All skill levels welcome.';
  } else if (!description && text.includes('ladder commentary')) {
    description = `Watch ${coach || 'our coach'} climb the ladder with live commentary and analysis.`;
  }

  // Auto-categorize
  const categories: string[] = ['misc'];
  if (text.includes('micro')) categories[0] = 'mechanics.micro';
  else if (text.includes('ladder')) categories[0] = 'analysis.ladder-games';
  else if (text.includes('casual')) categories[0] = 'misc.casual';

  return {
    id: event.id,
    title: event.name,
    description,
    type,
    date: startTime.toISOString().split('T')[0],
    time: startTime.toTimeString().split(' ')[0].slice(0, 5),
    timezone: 'America/New_York',
    duration,
    ...(coach && { coach }),
    videoIds: [],
    isFree: false,
    tags: Array.from(tags),
    ...(recurring && { recurring }),
    categories,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Converts local event format to Discord API format
 */
export function transformLocalToDiscord(event: LocalEvent): Record<string, unknown> {
  // Parse date and time
  const dateTime = new Date(`${event.date}T${event.time}`);

  // Calculate end time based on duration
  const endTime = new Date(dateTime.getTime() + event.duration * 60000);

  // Build recurrence rule if recurring
  let recurrence_rule = null;
  if (event.recurring?.enabled) {
    recurrence_rule = {
      start: dateTime.toISOString(),
      end: event.recurring.endDate ? new Date(event.recurring.endDate).toISOString() : null,
      frequency: event.recurring.frequency === 'weekly' ? 2 : 3,
      interval: 1,
      by_weekday: event.recurring.dayOfWeek !== undefined ? [event.recurring.dayOfWeek] : null,
      by_month_day: null,
      count: null,
    };
  }

  return {
    name: event.title,
    description: event.description || '',
    scheduled_start_time: dateTime.toISOString(),
    scheduled_end_time: endTime.toISOString(),
    entity_type: 2, // EXTERNAL - most common for voice channel events
    privacy_level: 2, // GUILD_ONLY
    recurrence_rule,
  };
}

/**
 * Creates a new Discord scheduled event via API
 */
export async function createDiscordEvent(botToken: string, guildId: string, event: LocalEvent): Promise<DiscordEvent> {
  const payload = transformLocalToDiscord(event);

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Discord event: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Updates an existing Discord scheduled event via API
 */
export async function updateDiscordEvent(botToken: string, guildId: string, eventId: string, event: LocalEvent): Promise<DiscordEvent> {
  const payload = transformLocalToDiscord(event);

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update Discord event: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Deletes a Discord scheduled event via API
 */
export async function deleteDiscordEvent(botToken: string, guildId: string, eventId: string): Promise<void> {
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete Discord event: ${response.status} - ${errorText}`);
  }
}

/**
 * Detects conflicts between local and Discord events
 */
export function detectConflicts(localEvents: LocalEvent[], discordEvents: DiscordEvent[]): EventConflict[] {
  const conflicts: EventConflict[] = [];
  const localById = new Map(localEvents.map(e => [e.id, e]));
  const discordById = new Map(discordEvents.map(e => [e.id, e]));

  // Find events in Discord but not in local
  for (const discordEvent of discordEvents) {
    if (!localById.has(discordEvent.id)) {
      conflicts.push({
        type: 'missing_local',
        discordEvent,
      });
    }
  }

  // Find events in local but not in Discord
  for (const localEvent of localEvents) {
    if (!discordById.has(localEvent.id)) {
      conflicts.push({
        type: 'missing_discord',
        localEvent,
      });
    }
  }

  // Find mismatches (same ID but different data)
  for (const [id, localEvent] of localById) {
    const discordEvent = discordById.get(id);
    if (!discordEvent) continue;

    const differences: string[] = [];

    // Check title
    if (localEvent.title !== discordEvent.name) {
      differences.push(`Title: "${localEvent.title}" vs "${discordEvent.name}"`);
    }

    // Check description
    const discordDesc = discordEvent.description || '';
    if (localEvent.description !== discordDesc) {
      differences.push(`Description differs`);
    }

    // Check date/time
    const discordDate = new Date(discordEvent.scheduled_start_time);
    const localDateTime = `${localEvent.date}T${localEvent.time}`;
    const discordDateTime = discordDate.toISOString().slice(0, 16).replace('T', ' at ');
    if (localDateTime !== discordDate.toISOString().slice(0, 16)) {
      differences.push(`Date/Time: ${localDateTime} vs ${discordDateTime}`);
    }

    // Check recurring pattern
    const hasLocalRecurring = localEvent.recurring?.enabled;
    const hasDiscordRecurring = !!discordEvent.recurrence_rule;
    if (hasLocalRecurring !== hasDiscordRecurring) {
      differences.push(`Recurring: ${hasLocalRecurring ? 'yes' : 'no'} vs ${hasDiscordRecurring ? 'yes' : 'no'}`);
    } else if (hasLocalRecurring && hasDiscordRecurring && discordEvent.recurrence_rule) {
      // Check dayOfWeek if both are weekly
      const localDay = localEvent.recurring?.dayOfWeek;
      const discordDay = discordEvent.recurrence_rule.by_weekday?.[0];
      if (localDay !== discordDay) {
        differences.push(`Day of week: ${localDay} vs ${discordDay}`);
      }
    }

    if (differences.length > 0) {
      conflicts.push({
        type: 'mismatch',
        localEvent,
        discordEvent,
        differences,
      });
    }
  }

  return conflicts;
}

/**
 * Reads local events from events.json
 */
export function readLocalEvents(eventsFilePath?: string): LocalEvent[] {
  const path = eventsFilePath || join(process.cwd(), 'src', 'data', 'events.json');
  const fileContent = readFileSync(path, 'utf-8');
  return JSON.parse(fileContent) as LocalEvent[];
}

/**
 * Writes local events to events.json
 */
export function writeLocalEvents(events: LocalEvent[], eventsFilePath?: string): void {
  const path = eventsFilePath || join(process.cwd(), 'src', 'data', 'events.json');
  writeFileSync(path, JSON.stringify(events, null, 2) + '\n');
}

/**
 * Auto-sync: Import all Discord events that don't exist locally
 */
export async function autoSync(botToken: string, guildId: string): Promise<SyncResult> {
  try {
    const discordEvents = await fetchDiscordEvents(botToken, guildId);
    const localEvents = readLocalEvents();
    const conflicts = detectConflicts(localEvents, discordEvents);

    const missingLocal = conflicts.filter(c => c.type === 'missing_local');

    if (missingLocal.length === 0) {
      return {
        success: true,
        conflicts: [],
        message: 'No new events to import from Discord',
      };
    }

    // Import all missing events
    const newEvents = missingLocal.map(c => transformDiscordToLocal(c.discordEvent!));
    const updatedEvents = [...localEvents, ...newEvents];
    writeLocalEvents(updatedEvents);

    return {
      success: true,
      conflicts: missingLocal,
      message: `Imported ${missingLocal.length} event(s) from Discord`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      conflicts: [],
      message: 'Failed to sync events',
      errors: [message],
    };
  }
}
