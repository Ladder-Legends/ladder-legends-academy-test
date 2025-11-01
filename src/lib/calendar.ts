import { Event } from '@/types/event';

export function generateGoogleCalendarUrl(event: Event): string {
  // Combine date and time to create full datetime string
  let startDate = new Date(`${event.date}T${event.time}`);

  // For weekly recurring events, adjust start date to match the specified day of week
  if (event.recurring?.enabled && event.recurring.frequency === 'weekly' && event.recurring.dayOfWeek !== undefined) {
    const currentDay = startDate.getDay();
    const targetDay = event.recurring.dayOfWeek;

    // Calculate days to add/subtract to get to the target day
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd < 0) {
      daysToAdd += 7; // Move to next week if target day already passed
    }

    startDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  // Calculate end time based on duration or default to 1 hour
  const durationMs = event.duration ? event.duration * 60 * 1000 : 60 * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const params: Record<string, string> = {
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: event.description || '',
    location: 'Online',
  };

  // Add recurrence rule if event is recurring
  if (event.recurring?.enabled) {
    const recur = generateGoogleRecurrenceRule(event);
    if (recur) {
      params.recur = recur;
    }
  }

  return `https://calendar.google.com/calendar/render?${new URLSearchParams(params).toString()}`;
}

function generateGoogleRecurrenceRule(event: Event): string | null {
  if (!event.recurring?.enabled) return null;

  const parts: string[] = ['RRULE:'];

  switch (event.recurring.frequency) {
    case 'daily':
      parts.push('FREQ=DAILY');
      break;
    case 'weekly':
      parts.push('FREQ=WEEKLY');
      if (event.recurring.dayOfWeek !== undefined) {
        const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        parts.push(`;BYDAY=${days[event.recurring.dayOfWeek]}`);
      }
      break;
    case 'monthly':
      parts.push('FREQ=MONTHLY');
      if (event.recurring.dayOfMonth !== undefined) {
        parts.push(`;BYMONTHDAY=${event.recurring.dayOfMonth}`);
      }
      break;
    default:
      return null;
  }

  // Add end date if specified
  if (event.recurring.endDate) {
    const endDate = new Date(event.recurring.endDate);
    const formatted = endDate.toISOString().replace(/-|:|\.\d+/g, '').split('T')[0];
    parts.push(`;UNTIL=${formatted}`);
  }

  return parts.join('');
}

export function generateICalFile(event: Event): string {
  // Combine date and time to create full datetime string
  let startDate = new Date(`${event.date}T${event.time}`);

  // For weekly recurring events, adjust start date to match the specified day of week
  if (event.recurring?.enabled && event.recurring.frequency === 'weekly' && event.recurring.dayOfWeek !== undefined) {
    const currentDay = startDate.getDay();
    const targetDay = event.recurring.dayOfWeek;

    // Calculate days to add/subtract to get to the target day
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd < 0) {
      daysToAdd += 7; // Move to next week if target day already passed
    }

    startDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  // Calculate end time based on duration or default to 1 hour
  const durationMs = event.duration ? event.duration * 60 * 1000 : 60 * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ladder Legends Academy//Event//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@ladderlegendsacademy.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:Online`,
  ];

  // Add recurrence rule if event is recurring
  if (event.recurring?.enabled) {
    const rrule = generateICalRecurrenceRule(event);
    if (rrule) {
      lines.push(rrule);
    }
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

function generateICalRecurrenceRule(event: Event): string | null {
  if (!event.recurring?.enabled) return null;

  const parts: string[] = ['RRULE:'];

  switch (event.recurring.frequency) {
    case 'daily':
      parts.push('FREQ=DAILY');
      break;
    case 'weekly':
      parts.push('FREQ=WEEKLY');
      if (event.recurring.dayOfWeek !== undefined) {
        const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        parts.push(`;BYDAY=${days[event.recurring.dayOfWeek]}`);
      }
      break;
    case 'monthly':
      parts.push('FREQ=MONTHLY');
      if (event.recurring.dayOfMonth !== undefined) {
        parts.push(`;BYMONTHDAY=${event.recurring.dayOfMonth}`);
      }
      break;
    default:
      return null;
  }

  // Add end date if specified
  if (event.recurring.endDate) {
    const endDate = new Date(event.recurring.endDate);
    const formatted = endDate.toISOString().replace(/-|:|\.\d+/g, '');
    parts.push(`;UNTIL=${formatted}`);
  }

  return parts.join('');
}

export function downloadICalFile(event: Event): void {
  const ical = generateICalFile(event);
  const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
