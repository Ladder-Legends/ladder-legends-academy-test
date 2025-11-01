'use client';

import { Event, getEventStatus } from '@/types/event';
import Link from 'next/link';
import { Lock, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EventDateDisplay } from './event-date-display';
import coachesData from '@/data/coaches.json';

interface EventsTableProps {
  events: Event[];
}

export function EventsTable({ events }: EventsTableProps) {
  const getEventTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      tournament: 'bg-red-500/10 text-red-500 border-red-500/20',
      coaching: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      casting: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      streaming: 'bg-green-500/10 text-green-500 border-green-500/20',
      'replay-analysis': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      arcade: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    };

    return (
      <Badge variant="outline" className={colors[type] || 'bg-muted'}>
        {type}
      </Badge>
    );
  };

  const getStatusBadge = (event: Event) => {
    const status = getEventStatus(event);
    return (
      <Badge variant={status === 'upcoming' ? 'default' : 'secondary'}>
        {status === 'upcoming' ? 'Upcoming' : 'Past'}
      </Badge>
    );
  };

  const getCoachName = (coachId?: string) => {
    if (!coachId) return '—';
    const coach = coachesData.find(c => c.id === coachId);
    return coach?.displayName || coachId;
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left px-6 py-4 text-sm font-semibold">Event</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Type</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Date & Time</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Duration</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Coach</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => (
            <tr
              key={event.id}
              className={`border-t border-border hover:bg-muted/30 transition-colors ${
                index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
              }`}
            >
              <td className="px-6 py-4">
                <Link
                  href={`/events/${event.id}`}
                  className="text-base font-medium hover:text-primary transition-colors block"
                >
                  {event.title}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {!event.isFree && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                  {event.recurring && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Repeat className="w-3 h-3" />
                      Recurring
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {getEventTypeBadge(event.type)}
              </td>
              <td className="px-6 py-4">
                <EventDateDisplay event={event} />
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  {event.duration} min
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  {event.coach ? getCoachName(event.coach) : '—'}
                </span>
              </td>
              <td className="px-6 py-4">
                {getStatusBadge(event)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
