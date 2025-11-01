import { Event } from '@/types/event';

export function generateGoogleCalendarUrl(event: Event): string {
  // Combine date and time to create full datetime string
  const startDate = new Date(`${event.date}T${event.time}`);

  // Calculate end time based on duration or default to 1 hour
  const durationMs = event.duration ? event.duration * 60 * 1000 : 60 * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: event.description || '',
    location: 'Online',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateICalFile(event: Event): string {
  // Combine date and time to create full datetime string
  const startDate = new Date(`${event.date}T${event.time}`);

  // Calculate end time based on duration or default to 1 hour
  const durationMs = event.duration ? event.duration * 60 * 1000 : 60 * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const ical = [
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
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return ical;
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
