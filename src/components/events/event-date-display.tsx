'use client';

import { useEffect, useState } from 'react';
import { Event, formatEventDateTime, getNextOccurrence } from '@/types/event';

interface EventDateDisplayProps {
  event: Event;
  className?: string;
}

/**
 * Client component that displays the appropriate date for an event.
 * For recurring events, calculates and shows the next occurrence.
 * For non-recurring events, shows the event date.
 */
export function EventDateDisplay({ event, className = '' }: EventDateDisplayProps) {
  const [displayDate, setDisplayDate] = useState<string>('');

  useEffect(() => {
    if (!event.recurring?.enabled) {
      // Non-recurring: show the event date as-is
      setDisplayDate(formatEventDateTime(event));
      return;
    }

    // Recurring: calculate next occurrence
    const nextOccurrence = getNextOccurrence(event);

    if (nextOccurrence === null) {
      // No more occurrences (past end date)
      // Show the original date with "(ended)" indicator
      setDisplayDate(`${formatEventDateTime(event)} (series ended)`);
      return;
    }

    // Format the next occurrence date
    const nextDate = nextOccurrence.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: event.timezone,
    });

    setDisplayDate(nextDate);
  }, [event]);

  // Show loading state or placeholder during SSR
  if (!displayDate) {
    return <span className={className}>Loading...</span>;
  }

  return <span className={className}>{displayDate}</span>;
}
