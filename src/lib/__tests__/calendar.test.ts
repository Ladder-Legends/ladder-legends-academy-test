/**
 * Tests for calendar utilities
 */

import {
  generateGoogleCalendarUrl,
  generateICalFile,
} from '../calendar';
import type { Event } from '@/types/event';

describe('generateGoogleCalendarUrl', () => {
  it('should generate URL for non-recurring event', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Event Description',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const url = generateGoogleCalendarUrl(event);

    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Test+Event');
    expect(url).toContain('details=Event+Description');
    expect(url).toContain('location=Online');
    expect(url).toContain('dates=');
  });

  it('should generate URL with custom duration', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Event Description',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'coaching',
      duration: 120, // 2 hours
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const url = generateGoogleCalendarUrl(event);

    expect(url).toContain('https://calendar.google.com/calendar/render?');
    // URL should include dates parameter with start and end times 2 hours apart
    expect(url).toContain('dates=');
  });

  it('should generate URL for daily recurring event', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Daily Stream',
      description: 'Daily coaching stream',
      date: '2024-06-15',
      time: '18:00',
      timezone: 'America/New_York',
      type: 'streaming',
      tags: [],
      videoIds: [],
      isFree: true,
      recurring: {
        enabled: true,
        frequency: 'daily',
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const url = generateGoogleCalendarUrl(event);

    expect(url).toContain('recur=RRULE%3AFREQ%3DDAILY');
  });

  it('should generate URL for weekly recurring event', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Weekly Tournament',
      description: 'Weekly tournament',
      date: '2024-06-15',
      time: '18:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      recurring: {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 2, // Tuesday
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const url = generateGoogleCalendarUrl(event);

    expect(url).toContain('recur=RRULE%3AFREQ%3DWEEKLY');
    expect(url).toContain('BYDAY%3DTU');
  });

  it('should generate URL for monthly recurring event', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Monthly Masterclass',
      description: 'Monthly masterclass',
      date: '2024-06-15',
      time: '18:00',
      timezone: 'America/New_York',
      type: 'coaching',
      tags: [],
      videoIds: [],
      isFree: false,
      recurring: {
        enabled: true,
        frequency: 'monthly',
        dayOfMonth: 15,
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const url = generateGoogleCalendarUrl(event);

    expect(url).toContain('recur=RRULE%3AFREQ%3DMONTHLY');
    expect(url).toContain('BYMONTHDAY%3D15');
  });

  it('should generate URL with end date for recurring event', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Limited Series',
      description: 'Limited coaching series',
      date: '2024-06-15',
      time: '18:00',
      timezone: 'America/New_York',
      type: 'coaching',
      tags: [],
      videoIds: [],
      isFree: false,
      recurring: {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 2,
        endDate: '2024-12-31',
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const url = generateGoogleCalendarUrl(event);

    expect(url).toContain('UNTIL%3D');
  });

  it('should handle events with special characters in title', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test & Event: Special "Characters"',
      description: 'Description with <html> tags',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const url = generateGoogleCalendarUrl(event);

    // URL encoding should handle special characters
    expect(url).toContain('text=');
    expect(url).toContain('details=');
  });

  it('should handle events with empty description', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: '',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const url = generateGoogleCalendarUrl(event);

    expect(url).toContain('details=');
    expect(url).toContain('https://calendar.google.com/calendar/render?');
  });
});

describe('generateICalFile', () => {
  it('should generate valid iCal file for non-recurring event', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Event Description',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('VERSION:2.0');
    expect(ical).toContain('PRODID:-//Ladder Legends Academy//Event//EN');
    expect(ical).toContain('BEGIN:VEVENT');
    expect(ical).toContain('UID:event-1@ladderlegendsacademy.com');
    expect(ical).toContain('SUMMARY:Test Event');
    expect(ical).toContain('DESCRIPTION:Event Description');
    expect(ical).toContain('LOCATION:Online');
    expect(ical).toContain('END:VEVENT');
    expect(ical).toContain('END:VCALENDAR');
  });

  it('should generate iCal with custom duration', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Event Description',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'coaching',
      duration: 90, // 1.5 hours
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('DTSTART:');
    expect(ical).toContain('DTEND:');
    // Start and end should be 90 minutes apart
  });

  it('should generate iCal with daily recurrence', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Daily Stream',
      description: 'Daily coaching stream',
      date: '2024-06-15',
      time: '18:00',
      timezone: 'America/New_York',
      type: 'streaming',
      tags: [],
      videoIds: [],
      isFree: true,
      recurring: {
        enabled: true,
        frequency: 'daily',
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('RRULE:FREQ=DAILY');
  });

  it('should generate iCal with weekly recurrence', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Weekly Tournament',
      description: 'Weekly tournament',
      date: '2024-06-15',
      time: '18:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      recurring: {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 3, // Wednesday
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('RRULE:FREQ=WEEKLY');
    expect(ical).toContain('BYDAY=WE');
  });

  it('should generate iCal with monthly recurrence', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Monthly Masterclass',
      description: 'Monthly masterclass',
      date: '2024-06-15',
      time: '18:00',
      timezone: 'America/New_York',
      type: 'coaching',
      tags: [],
      videoIds: [],
      isFree: false,
      recurring: {
        enabled: true,
        frequency: 'monthly',
        dayOfMonth: 20,
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('RRULE:FREQ=MONTHLY');
    expect(ical).toContain('BYMONTHDAY=20');
  });

  it('should generate iCal with end date for recurring event', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Limited Series',
      description: 'Limited coaching series',
      date: '2024-06-15',
      time: '18:00',
      timezone: 'America/New_York',
      type: 'coaching',
      tags: [],
      videoIds: [],
      isFree: false,
      recurring: {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 2,
        endDate: '2024-12-31',
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('UNTIL=');
  });

  it('should escape newlines in description', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Line 1\nLine 2\nLine 3',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('DESCRIPTION:Line 1\\nLine 2\\nLine 3');
  });

  it('should use correct line endings (CRLF)', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Event Description',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    // iCal spec requires CRLF (\r\n) line endings
    expect(ical).toContain('\r\n');
  });

  it('should handle events with empty description', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: '',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('DESCRIPTION:');
    expect(ical).toContain('BEGIN:VCALENDAR');
  });

  it('should include DTSTAMP field', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Test Event',
      description: 'Event Description',
      date: '2024-06-15',
      time: '14:00',
      timezone: 'America/New_York',
      type: 'tournament',
      tags: [],
      videoIds: [],
      isFree: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const ical = generateICalFile(event);

    expect(ical).toContain('DTSTAMP:');
  });
});
