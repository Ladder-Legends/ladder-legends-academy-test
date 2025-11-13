'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUrlState } from '@/hooks/use-url-state';
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
import { useSession } from 'next-auth/react';

const allEvents = eventsData as Event[];

export function EventsContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  // Initialize state from URL parameters
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  );
  const [searchQuery, setSearchQuery] = useState(() =>
    searchParams.get('q') || ''
  );

  // Sync filters to URL whenever they change
  useUrlState({
    q: searchQuery,
    tags: selectedTags,
    startDate: startDate,
    endDate: endDate,
  });

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
      const eventDate = new Date(`${event.date}T${event.time}`);

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !event.title.toLowerCase().includes(query) &&
          !event.description.toLowerCase().includes(query) &&
          !event.type.toLowerCase().includes(query) &&
          !(event.coach && event.coach.toLowerCase().includes(query)) &&
          !event.tags?.some(tag => tag.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      // Date range filter
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (eventDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (eventDate > end) return false;
      }

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

    // Sort: upcoming events first (by date ascending), then past events (by date descending)
    return filtered.sort((a, b) => {
      const statusA = getEventStatus(a);
      const statusB = getEventStatus(b);

      // Upcoming events come before past events
      if (statusA !== statusB) {
        return statusA === 'upcoming' ? -1 : 1;
      }

      // Within each status group, sort by date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      // Upcoming: closest date first (ascending)
      // Past: most recent first (descending)
      return statusA === 'upcoming' ? dateA - dateB : dateB - dateA;
    });
  }, [allEvents, selectedItems, startDate, endDate, selectedTags, searchQuery]);

  // Filter sections
  const filterSections: FilterSection[] = [
    {
      id: 'accessLevel',
      title: 'Access Level',
      type: 'checkbox' as const,
      items: [
        { id: 'free', label: 'Free' },
        { id: 'premium', label: 'Premium' },
      ],
    },
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
  ];

  const handleAddNew = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDelete = (event: Event) => {
    if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
      // Would add pending change here
      console.log('Delete event:', event.id);
    }
  };

  // Date picker component to inject into sidebar
  const datePickerSection = (
    <div className="pb-4 mb-4 border-b border-border">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Date Range
      </h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="start-date" className="text-xs font-medium text-muted-foreground block mb-1.5">
            From
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="text-xs font-medium text-muted-foreground block mb-1.5">
            To
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear dates
          </button>
        )}
      </div>
    </div>
  );

  // Filter content
  const filterContent = (
    <FilterSidebar
      searchEnabled={true}
      searchPlaceholder="Search events..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      customSectionAfterSearch={datePickerSection}
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
    />
  );

  // Table content
  const tableContent = (
    <EventsTable
      events={filteredEvents}
      hasSubscriberRole={hasSubscriberRole}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

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
    <PermissionGate require="coaches">
      <Button onClick={handleAddNew} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add New Event
      </Button>
    </PermissionGate>
  );

  return (
    <>
      <FilterableContentLayout
        title="Events"
        description="Join our community events: tournaments, coaching sessions, team games, and more"
        pageKey="events"
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="table"
        showViewToggle={true}
        headerActions={headerActions}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        onClearSearch={() => setSearchQuery('')}
        onRemoveTag={toggleTag}
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
