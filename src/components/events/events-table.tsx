'use client';

import { Event, getEventStatus } from '@/types/event';
import Link from 'next/link';
import { Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventDateDisplay } from './event-date-display';
import { AddToCalendarButton } from './add-to-calendar-button';
import { SortableTable, ColumnConfig } from '@/components/ui/sortable-table';
import { PremiumBadge } from '@/components/shared/premium-badge';
import { AdminActions } from '@/components/shared/admin-actions';
import { coaches as coachesData } from '@/lib/data';

interface EventsTableProps {
  events: Event[];
  hasSubscriberRole?: boolean;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
}

export function EventsTable({ events, hasSubscriberRole = false, onEdit, onDelete }: EventsTableProps) {
  const getEventTypeBadge = (type: string) => {
    // Using theme colors instead of type-specific colors
    return (
      <Badge variant="outline" className="bg-muted text-foreground border-border">
        {type}
      </Badge>
    );
  };

  const getStatusBadge = (event: Event) => {
    const status = getEventStatus(event);
    return (
      <Badge variant="outline" className="bg-muted text-foreground border-border">
        {status === 'upcoming' ? 'Upcoming' : 'Past'}
      </Badge>
    );
  };

  const getCoachName = (coachId?: string) => {
    if (!coachId) return '—';
    const coach = coachesData.find(c => c.id === coachId);
    return coach?.displayName || coachId;
  };

  const columns: ColumnConfig<Event>[] = [
    {
      id: 'title',
      label: 'Event',
      sortable: true,
      getValue: (event) => event.title.toLowerCase(),
      render: (event) => (
        <div>
          <Link
            href={`/events/${event.id}`}
            className="text-base font-medium hover:text-primary transition-colors block"
          >
            {event.title}
          </Link>
          <div className="flex items-center gap-2 mt-1.5">
            <PremiumBadge isFree={event.isFree} hasSubscriberRole={hasSubscriberRole} className="mt-0" />
            {event.recurring && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Repeat className="w-3 h-3" />
                Recurring
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      label: 'Type',
      sortable: true,
      getValue: (event) => event.type.toLowerCase(),
      render: (event) => getEventTypeBadge(event.type),
    },
    {
      id: 'date',
      label: 'Date',
      sortable: true,
      getValue: (event) => new Date(event.date),
      render: (event) => (
        <span className="text-sm text-muted-foreground">
          <EventDateDisplay event={event} part="date" />
        </span>
      ),
      headerClassName: 'min-w-[120px]',
    },
    {
      id: 'day',
      label: 'Day',
      sortable: false,
      render: (event) => (
        <span className="text-sm text-muted-foreground">
          <EventDateDisplay event={event} part="day" />
        </span>
      ),
    },
    {
      id: 'time',
      label: 'Time',
      sortable: false,
      render: (event) => (
        <span className="text-sm text-muted-foreground">
          <EventDateDisplay event={event} part="time" />
        </span>
      ),
    },
    {
      id: 'duration',
      label: 'Duration',
      sortable: true,
      getValue: (event) => event.duration || 0,
      render: (event) => (
        <span className="text-sm text-muted-foreground">
          {event.duration} min
        </span>
      ),
    },
    {
      id: 'coach',
      label: 'Coach',
      sortable: true,
      getValue: (event) => (event.coach ? getCoachName(event.coach).toLowerCase() : ''),
      render: (event) => (
        <span className="text-sm text-muted-foreground">
          {event.coach ? getCoachName(event.coach) : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      sortFn: (a, b, direction) => {
        const statusA = getEventStatus(a);
        const statusB = getEventStatus(b);
        // Upcoming before Past
        const comparison = statusA === statusB ? 0 : statusA === 'upcoming' ? -1 : 1;
        return direction === 'asc' ? comparison : -comparison;
      },
      render: (event) => getStatusBadge(event),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      render: (event) => (
        <div className="flex items-center gap-2">
          <AddToCalendarButton
            event={event}
            isPremium={!event.isFree}
            hasSubscriberRole={hasSubscriberRole}
          />
          <Link href={`/events/${event.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              View
            </Button>
          </Link>
          <AdminActions item={event} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ),
    },
  ];

  return (
    <SortableTable
      items={events}
      columns={columns}
      getRowKey={(event) => event.id}
      minWidth="800px"
    />
  );
}
