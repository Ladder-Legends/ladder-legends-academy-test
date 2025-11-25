/**
 * Comprehensive list of IANA timezones covering major regions worldwide
 */
export const TIMEZONES = [
  // North America
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Adak',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',

  // South America
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Santiago',
  'America/Lima',
  'America/Bogota',
  'America/Caracas',

  // Europe
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Stockholm',
  'Europe/Copenhagen',
  'Europe/Oslo',
  'Europe/Helsinki',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',

  // Asia
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Taipei',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Manila',

  // Australia & Pacific
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Pacific/Auckland',
  'Pacific/Fiji',

  // Africa
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
] as const;

export type Timezone = typeof TIMEZONES[number];

/**
 * Get the user's browser timezone using Intl API
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect browser timezone:', error);
    return 'America/New_York'; // Fallback
  }
}

/**
 * Get timezone abbreviation for a given timezone at a specific date
 * @param timezone IANA timezone identifier
 * @param date Date to get abbreviation for (accounts for DST)
 * @returns Timezone abbreviation (e.g., "PST", "EST")
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');

    return tzPart?.value || timezone;
  } catch (error) {
    console.error('Failed to get timezone abbreviation:', error);
    return timezone;
  }
}

/**
 * Convert an event date/time from event timezone to user timezone
 * @param eventDate ISO date string (YYYY-MM-DD)
 * @param eventTime Time string (HH:MM)
 * @param eventTimezone Event's IANA timezone
 * @param userTimezone User's IANA timezone
 * @returns Object with converted date, time, and timezone abbreviation
 */
export function convertEventTime(
  eventDate: string,
  eventTime: string,
  eventTimezone: string,
  userTimezone: string
): {
  date: string;
  time: string;
  abbreviation: string;
  dayOfWeek: string;
} {
  try {
    // Parse event date and time
    const [year, month, day] = eventDate.split('-').map(Number);
    const [hours, minutes] = eventTime.split(':').map(Number);

    const userFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'long',
    });

    // Create a proper date object accounting for timezone
    // We need to create a UTC timestamp that represents the event time in its local timezone
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Get the offset of the event timezone at this date
    const eventOffsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: eventTimezone,
      timeZoneName: 'longOffset',
    });
    const eventOffsetParts = eventOffsetFormatter.formatToParts(utcDate);
    const eventOffsetStr = eventOffsetParts.find(p => p.type === 'timeZoneName')?.value || 'GMT';
    const eventOffsetMatch = eventOffsetStr.match(/GMT([+-]\d{1,2}):?(\d{2})?/);
    let eventOffsetMinutes = 0;
    if (eventOffsetMatch) {
      const sign = eventOffsetMatch[1].startsWith('-') ? -1 : 1;
      const offsetHours = Math.abs(parseInt(eventOffsetMatch[1]));
      const offsetMins = parseInt(eventOffsetMatch[2] || '0');
      eventOffsetMinutes = sign * (offsetHours * 60 + offsetMins);
    }

    // Adjust UTC date to account for event timezone offset
    const adjustedDate = new Date(utcDate.getTime() - eventOffsetMinutes * 60 * 1000);

    // Format in user timezone
    const userParts = userFormatter.formatToParts(adjustedDate);

    const getPartValue = (type: string) => userParts.find(p => p.type === type)?.value || '';

    const convertedDate = `${getPartValue('year')}-${getPartValue('month')}-${getPartValue('day')}`;
    const convertedTime = `${getPartValue('hour')}:${getPartValue('minute')}`;
    const dayOfWeek = getPartValue('weekday');
    const abbreviation = getTimezoneAbbreviation(userTimezone, adjustedDate);

    return {
      date: convertedDate,
      time: convertedTime,
      abbreviation,
      dayOfWeek,
    };
  } catch (error) {
    console.error('Failed to convert event time:', error);
    // Return original values on error
    return {
      date: eventDate,
      time: eventTime,
      abbreviation: getTimezoneAbbreviation(userTimezone),
      dayOfWeek: new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long' }),
    };
  }
}

/**
 * Format time for display (e.g., "14:30" -> "2:30 PM")
 * @param time24h Time string in 24-hour format (HH:MM)
 * @returns Formatted time string in 12-hour format
 */
export function formatTimeForDisplay(time24h: string): string {
  try {
    const [hours, minutes] = time24h.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time24h;
  }
}

/**
 * Get display name for timezone
 * @param timezone IANA timezone identifier
 * @returns Human-readable timezone name
 */
export function getTimezoneDisplayName(timezone: string): string {
  const cityName = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
  const abbreviation = getTimezoneAbbreviation(timezone);
  return `${cityName} (${abbreviation})`;
}

/**
 * Check if a timezone is valid
 * @param timezone IANA timezone identifier
 * @returns True if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
