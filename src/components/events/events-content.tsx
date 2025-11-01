'use client';

import { useState, useMemo } from 'react';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import eventsData from '@/data/events.json';
import { Event, getEventStatus } from '@/types/event';
import { EventCard } from './event-card';
import { EventsTable } from './events-table';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { EventEditModal } from '@/components/admin/event-edit-modal';

const allEvents = eventsData as Event[];

export function EventsContent() {
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allEvents.forEach(event => {
      event.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    const filtered = allEvents.filter(event => {
      const status = getEventStatus(event);

      // Show past events filter
      if (!showPastEvents && status === 'past') return false;

      // Tag filters
      if (selectedTags.length > 0) {
        if (!event.tags || !selectedTags.every(tag => event.tags.includes(tag))) {
          return false;
        }
      }

      // Type filter
      if (selectedItems.type && selectedItems.type.length > 0) {
        if (!selectedItems.type.includes(event.type)) return false;
      }

      // Status filter
      if (selectedItems.status && selectedItems.status.length > 0) {
        if (!selectedItems.status.includes(status)) return false;
      }

      // Access level filter
      if (selectedItems.accessLevel && selectedItems.accessLevel.length > 0) {
        const isFree = event.isFree ?? false;
        if (selectedItems.accessLevel.includes('free') && !isFree) return false;
        if (selectedItems.accessLevel.includes('premium') && isFree) return false;
      }

      return true;
    });

    // Sort: upcoming first (by date), then past (by date desc)
    return filtered.sort((a, b) => {
      const statusA = getEventStatus(a);
      const statusB = getEventStatus(b);

      if (statusA !== statusB) {
        return statusA === 'upcoming' ? -1 : 1;
      }

      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      return statusA === 'upcoming' ? dateA - dateB : dateB - dateA;
    });
  }, [allEvents, selectedItems, showPastEvents, selectedTags]);

  // Filter sections
  const filterSections: FilterSection[] = [
    {
      id: 'type',
      title: 'Event Type',
      type: 'checkbox' as const,
      items: [
        { id: 'tournament', label: 'Tournament' },
        { id: 'coaching', label: 'Coaching' },
        { id: 'casting', label: 'Casting' },
        { id: 'streaming', label: 'Streaming' },
        { id: 'replay-analysis', label: 'Replay Analysis' },
        { id: 'arcade', label: 'Arcade' },
      ],
    },
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox' as const,
      items: [
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'past', label: 'Past' },
      ],
    },
    {
      id: 'accessLevel',
      title: 'Access Level',
      type: 'checkbox' as const,
      items: [
        { id: 'free', label: 'Free' },
        { id: 'premium', label: 'Premium' },
      ],
    },
  ];

  const handleAddNew = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  // Filter content
  const filterContent = (
    <FilterSidebar
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
    />
  );

  // Table content
  const tableContent = <EventsTable events={filteredEvents} />;

  // Grid content
  const gridContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredEvents.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPastEvents(!showPastEvents)}
      >
        {showPastEvents ? 'Hide Past Events' : 'Show Past Events'}
      </Button>
      <PermissionGate require="coaches">
        <Button onClick={handleAddNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Event
        </Button>
      </PermissionGate>
    </div>
  );

  return (
    <>
      <FilterableContentLayout
        title="Events"
        description="Join our community events: tournaments, coaching sessions, team games, and more"
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="table"
        showViewToggle={true}
        headerActions={headerActions}
        resultCount={`Showing ${filteredEvents.length} of ${allEvents.length} events`}
        tags={allTags}
        selectedTags={selectedTags}
        onTagToggle={toggleTag}
        onClearTags={() => setSelectedTags([])}
      />

      {/* Edit Modal */}
      <EventEditModal
        event={editingEvent}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
      />
    </>
  );
}
