'use client';

import { useState, useMemo, useCallback } from 'react';
import { FilterSidebar, MobileFilterButton, type FilterSection } from '@/components/shared/filter-sidebar';
import eventsData from '@/data/events.json';
import { Event, getEventStatus } from '@/types/event';
import { EventCard } from './event-card';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EventEditModal } from '@/components/admin/event-edit-modal';
import { useState as useStateAlias } from 'react';

const allEvents = eventsData as Event[];

export function EventsContent() {
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [editingEvent, setEditingEvent] = useStateAlias<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useStateAlias(false);
  const [isNewEvent, setIsNewEvent] = useStateAlias(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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
  }, [selectedItems]);

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
    <>
      {/* Filter Sidebar */}
      <FilterSidebar
        sections={filterSections}
        selectedItems={selectedItems}
        onItemToggle={handleItemToggle}
        isMobileOpen={isMobileFilterOpen}
        onMobileOpenChange={setIsMobileFilterOpen}
      />

      {/* Main Content */}
      <div className="flex-1">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-6">
          <MobileFilterButton
            onClick={() => setIsMobileFilterOpen(true)}
            label="Filters"
          />
        </div>

        {/* Admin Controls */}
        <PermissionGate require={["coaches", "owners"]}>
          <div className="mb-6">
            <Button onClick={handleNewEvent} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </div>
        </PermissionGate>

        {/* Results */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {sortedEvents.length} of {allEvents.length} events
          </p>
        </div>

        {/* Events Grid */}
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
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
    </>
  );
}
