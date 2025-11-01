'use client';

import { useState, useMemo, useCallback } from 'react';
import { FilterSidebar, MobileFilterButton, type FilterSection } from '@/components/shared/filter-sidebar';
import eventsData from '@/data/events.json';
import { Event, getEventStatus } from '@/types/event';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { Plus, Lock, Repeat } from 'lucide-react';
import { EventEditModal } from '@/components/admin/event-edit-modal';
import { useState as useStateAlias } from 'react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import coachesData from '@/data/coaches.json';
import { EventDateDisplay } from './event-date-display';

const allEvents = eventsData as Event[];

export function EventsContent() {
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [editingEvent, setEditingEvent] = useStateAlias<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useStateAlias(false);
  const [isNewEvent, setIsNewEvent] = useStateAlias(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);

  const handleItemToggle = (sectionId: string, itemId: string) => {
    setSelectedItems(prev => {
      const currentItems = prev[sectionId] || [];
      const newItems = currentItems.includes(itemId)
        ? currentItems.filter(id => id !== itemId)
        : [...currentItems, itemId];
      return { ...prev, [sectionId]: newItems };
    });
  };

  // Get count for filter items
  const getCount = useCallback((
    filterFn: (event: Event) => boolean,
    excludeSection?: string
  ) => {
    return allEvents.filter(event => {
      // Apply all filters except the section we're counting for
      const sections = Object.entries(selectedItems).filter(
        ([key]) => key !== excludeSection
      );

      for (const [sectionId, itemIds] of sections) {
        if (itemIds.length === 0) continue;

        switch (sectionId) {
          case 'type':
            if (!itemIds.includes(event.type)) return false;
            break;
          case 'status': {
            const status = getEventStatus(event);
            if (!itemIds.includes(status)) return false;
            break;
          }
          case 'accessLevel':
            if (itemIds.includes('free') && !event.isFree) return false;
            if (itemIds.includes('premium') && event.isFree) return false;
            break;
          case 'tags':
            if (!itemIds.some(tag => event.tags.includes(tag))) return false;
            break;
        }
      }

      return filterFn(event);
    }).length;
  }, [selectedItems]);

  // Build filter sections with counts
  const filterSections = useMemo((): FilterSection[] => {
    // Get all unique tags
    const allTags = Array.from(new Set(allEvents.flatMap(e => e.tags))).sort();

    return [
      {
        id: 'accessLevel',
        label: 'Access Level',
        items: [
          { id: 'free', label: 'Free', count: getCount(e => e.isFree === true, 'accessLevel') },
          { id: 'premium', label: 'Premium', count: getCount(e => !e.isFree, 'accessLevel') },
        ].filter(item => item.count > 0),
      },
      {
        id: 'type',
        label: 'Event Type',
        items: [
          { id: 'tournament', label: 'Tournament', count: getCount(e => e.type === 'tournament', 'type') },
          { id: 'coaching', label: 'Coaching', count: getCount(e => e.type === 'coaching', 'type') },
          { id: 'casting', label: 'Casting', count: getCount(e => e.type === 'casting', 'type') },
          { id: 'streaming', label: 'Streaming', count: getCount(e => e.type === 'streaming', 'type') },
          { id: 'replay-analysis', label: 'Replay Analysis', count: getCount(e => e.type === 'replay-analysis', 'type') },
          { id: 'arcade', label: 'Arcade', count: getCount(e => e.type === 'arcade', 'type') },
          { id: 'other', label: 'Other', count: getCount(e => e.type === 'other', 'type') },
        ].filter(item => item.count > 0),
      },
      {
        id: 'status',
        label: 'Status',
        items: [
          { id: 'upcoming', label: 'Upcoming', count: getCount(e => getEventStatus(e) === 'upcoming', 'status') },
          { id: 'past', label: 'Past', count: getCount(e => getEventStatus(e) === 'past', 'status') },
        ].filter(item => item.count > 0),
      },
      {
        id: 'tags',
        label: 'Tags',
        items: allTags.map(tag => ({
          id: tag,
          label: tag,
          count: getCount(e => e.tags.includes(tag)),
        })),
      },
    ];
  }, [getCount]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // Filter out past events by default (unless showPastEvents is true)
      if (!showPastEvents) {
        const status = getEventStatus(event);
        if (status === 'past') return false;
      }

      // Type filter
      if (selectedItems.type?.length > 0 && !selectedItems.type.includes(event.type)) {
        return false;
      }

      // Status filter
      if (selectedItems.status?.length > 0) {
        const status = getEventStatus(event);
        if (!selectedItems.status.includes(status)) {
          return false;
        }
      }

      // Access level filter
      if (selectedItems.accessLevel?.length > 0) {
        if (selectedItems.accessLevel.includes('free') && !event.isFree) return false;
        if (selectedItems.accessLevel.includes('premium') && event.isFree) return false;
      }

      // Tag filter
      if (selectedItems.tags?.length > 0 && !selectedItems.tags.some(tag => event.tags.includes(tag))) {
        return false;
      }

      return true;
    });
  }, [selectedItems, showPastEvents]);

  // Sort: upcoming events first, then by date
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const aStatus = getEventStatus(a);
      const bStatus = getEventStatus(b);

      // Upcoming events first
      if (aStatus === 'upcoming' && bStatus === 'past') return -1;
      if (aStatus === 'past' && bStatus === 'upcoming') return 1;

      // Then by date
      const aDate = new Date(`${a.date}T${a.time}`);
      const bDate = new Date(`${b.date}T${b.time}`);

      // Upcoming: soonest first
      if (aStatus === 'upcoming') {
        return aDate.getTime() - bDate.getTime();
      }

      // Past: most recent first
      return bDate.getTime() - aDate.getTime();
    });
  }, [filteredEvents]);

  const handleNewEvent = () => {
    setEditingEvent(null);
    setIsNewEvent(true);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-1">
      {/* Filter Sidebar */}
      <FilterSidebar
        sections={filterSections}
        selectedItems={selectedItems}
        onItemToggle={handleItemToggle}
        isMobileOpen={isMobileFilterOpen}
        onMobileOpenChange={setIsMobileFilterOpen}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 lg:px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          {/* Mobile Filter Button */}
          <MobileFilterButton
            onClick={() => setIsMobileFilterOpen(true)}
            label="Filters"
          />

          {/* Page Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Events</h2>
              <p className="text-muted-foreground">
                Join our community events: tournaments, coaching sessions, team games, and more
              </p>
            </div>

            {/* Admin Controls */}
            <PermissionGate require="coaches">
              <Button onClick={handleNewEvent} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </PermissionGate>
          </div>

          {/* Results and Toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {sortedEvents.length} of {allEvents.length} events
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPastEvents(!showPastEvents)}
              className="text-xs"
            >
              {showPastEvents ? 'Hide Past Events' : 'Show Past Events'}
            </Button>
          </div>

          {/* Events Table */}
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No events found matching your filters.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Event</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Duration</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Coach</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map((event, index) => {
                    const status = getEventStatus(event);
                    const coach = event.coach ? coachesData.find(c => c.id === event.coach) : null;
                    const href = event.isFree ? `/free/events/${event.id}` : `/events/${event.id}`;

                    const getTypeColor = (type: string): string => {
                      switch (type) {
                        case 'tournament':
                          return 'bg-red-500/10 text-red-500 border-red-500/20';
                        case 'coaching':
                          return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                        case 'casting':
                          return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
                        case 'streaming':
                          return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
                        case 'replay-analysis':
                          return 'bg-green-500/10 text-green-500 border-green-500/20';
                        case 'arcade':
                          return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                        default:
                          return 'bg-muted text-muted-foreground';
                      }
                    };

                    return (
                      <tr
                        key={event.id}
                        className={`border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? 'bg-card' : 'bg-card/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={href}
                            className="font-medium hover:text-primary transition-colors flex items-center gap-2"
                          >
                            {event.title}
                            {!event.isFree && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                            {event.recurring?.enabled && (
                              <Repeat className="h-3 w-3 text-cyan-500 flex-shrink-0" />
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`${getTypeColor(event.type)} border text-xs`}>
                            {event.type.replace('-', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <EventDateDisplay event={event} />
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {event.duration ? `${event.duration} min` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {coach?.displayName || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {status === 'upcoming' ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 border text-xs">
                              Upcoming
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border text-xs">
                              Past
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Event Edit Modal */}
          <EventEditModal
            event={editingEvent}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingEvent(null);
              setIsNewEvent(false);
            }}
            isNew={isNewEvent}
          />
        </div>
      </main>
    </div>
  );
}
