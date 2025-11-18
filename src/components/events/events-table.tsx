'use client';

import { Event, getEventStatus } from '@/types/event';
import Link from 'next/link';
import { Lock, Repeat, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventDateDisplay } from './event-date-display';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AddToCalendarButton } from './add-to-calendar-button';
import { SortableTable, ColumnConfig } from '@/components/ui/sortable-table';
import coachesData from '@/data/coaches.json';

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
        <>
          <Link
            href={`/events/${event.id}`}
            className="text-base font-medium hover:text-primary transition-colors block"
          >
            {event.title}
          </Link>
          <div className="flex items-center gap-2 mt-1.5">
            {!event.isFree && !hasSubscriberRole && (
              <span className="bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium whitespace-nowrap flex-shrink-0">
                <Lock className="w-2.5 h-2.5" />
                Premium
              </span>
            )}
            {event.recurring && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Repeat className="w-3 h-3" />
                Recurring
              </span>
            )}
          </div>
        </>
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
          <PermissionGate require="coaches">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(event);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(event);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </PermissionGate>
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
