export type EventType =
  | 'tournament'
  | 'coaching'
  | 'casting'
  | 'streaming'
  | 'replay-analysis'
  | 'arcade'
  | 'other';

export type EventStatus = 'upcoming' | 'past';

export interface RecurringConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 (Sunday-Saturday) - for weekly events
  dayOfMonth?: number; // 1-31 - for monthly events
  endDate?: string; // ISO date string - when to stop recurring
}

export interface Event {
  id: string;
  title: string;
  description: string; // Markdown content
  type: EventType;
  date: string; // ISO date string
  time: string; // HH:MM format (e.g., "18:00")
  timezone: string; // IANA timezone (e.g., "America/New_York")
  duration?: number; // Duration in minutes
  coach?: string; // Coach ID
  isFree: boolean;
  tags: string[];
  recurring?: RecurringConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Helper to determine if an event is upcoming or past
 * For recurring events, checks the next occurrence
 */
export function getEventStatus(event: Event): EventStatus {
  if (!event.recurring?.enabled) {
    // Non-recurring: check the original date
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    return eventDateTime > now ? 'upcoming' : 'past';
  }

  // Recurring: check if there's a next occurrence
  const nextOccurrence = getNextOccurrence(event);
  return nextOccurrence !== null ? 'upcoming' : 'past';
}

/**
 * Helper to format event date/time for display
 */
export function formatEventDateTime(event: Event): string {
  const eventDate = new Date(`${event.date}T${event.time}`);
  return eventDate.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone,
  });
}

/**
 * Helper to get next occurrence of a recurring event
 */
export function getNextOccurrence(event: Event): Date | null {
  if (!event.recurring?.enabled) {
    return new Date(`${event.date}T${event.time}`);
  }

  const now = new Date();
  const baseDate = new Date(`${event.date}T${event.time}`);

  // If event hasn't started yet, return the base date
  if (baseDate > now) {
    return baseDate;
  }

  const { frequency, dayOfWeek, dayOfMonth, endDate} = event.recurring;
  const endDateTime = endDate ? new Date(endDate) : null;

  const nextDate = new Date(baseDate);

  switch (frequency) {
    case 'daily':
      // Add days until we're in the future
      while (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;

    case 'weekly':
      if (dayOfWeek !== undefined) {
        // Find next occurrence of this day of week
        while (nextDate <= now || nextDate.getDay() !== dayOfWeek) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }
      break;

    case 'monthly':
      if (dayOfMonth !== undefined) {
        // Find next occurrence of this day of month
        while (nextDate <= now || nextDate.getDate() !== dayOfMonth) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }
      break;
  }

  // Check if we've passed the end date
  if (endDateTime && nextDate > endDateTime) {
    return null; // Event series has ended
  }

  return nextDate;
}
