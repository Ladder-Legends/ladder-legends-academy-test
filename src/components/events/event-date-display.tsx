'use client';

import { useEffect, useState } from 'react';
import { Event, formatEventDateTime, getNextOccurrence } from '@/types/event';

interface EventDateDisplayProps {
  event: Event;
  className?: string;
  part?: 'date' | 'day' | 'time' | 'full';
}

interface DateParts {
  date: string;
  day: string;
  time: string;
  full: string;
}

/**
 * Client component that displays the appropriate date for an event.
 * For recurring events, calculates and shows the next occurrence.
 * For non-recurring events, shows the event date.
 *
 * @param part - Which part of the date to display:
 *   - 'date': Just the date (e.g., "Nov 10, 2025")
 *   - 'day': Just the day of week (e.g., "Mon")
 *   - 'time': Just the time (e.g., "4:00 PM")
 *   - 'full': Full date and time (default)
 */
export function EventDateDisplay({ event, className = '', part = 'full' }: EventDateDisplayProps) {
  const [dateParts, setDateParts] = useState<DateParts>({
    date: '',
    day: '',
    time: '',
    full: '',
  });

  useEffect(() => {
    let targetDate: Date;
    let isEnded = false;

    if (!event.recurring?.enabled) {
      // Non-recurring: show the event date as-is
      const eventDateTime = new Date(`${event.date}T${event.time}`);
      targetDate = eventDateTime;
    } else {
      // Recurring: calculate next occurrence
      const nextOccurrence = getNextOccurrence(event);

      if (nextOccurrence === null) {
        // No more occurrences (past end date)
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        targetDate = eventDateTime;
        isEnded = true;
      } else {
        targetDate = nextOccurrence;
      }
    }

    // Format each part separately
    const dateStr = targetDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: event.timezone || 'America/New_York',
    });

    const dayStr = targetDate.toLocaleString('en-US', {
      weekday: 'short',
      timeZone: event.timezone || 'America/New_York',
    });

    const timeStr = targetDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: event.timezone || 'America/New_York',
    });

    const fullStr = targetDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: event.timezone || 'America/New_York',
    }) + (isEnded ? ' (series ended)' : '');

    setDateParts({
      date: dateStr + (isEnded && part === 'date' ? ' (ended)' : ''),
      day: dayStr,
      time: timeStr,
      full: fullStr,
    });
  }, [event, part]);

  // Show loading state or placeholder during SSR
  if (!dateParts[part]) {
    return <span className={className}>-</span>;
  }

  return <span className={className}>{dateParts[part]}</span>;
}
