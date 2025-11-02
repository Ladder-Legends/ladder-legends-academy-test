'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUrlState } from '@/hooks/use-url-state';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import replaysData from '@/data/replays.json';
import { Replay } from '@/types/replay';
import { ReplayCard } from './replay-card';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { ReplayEditModal } from '@/components/admin/replay-edit-modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useSession } from 'next-auth/react';
import { ReplaysTable } from './replays-table';

const allReplays = replaysData as Replay[];

// Helper function to parse duration string (e.g., "12:34" or "1:02:34") into minutes
function parseDuration(duration: string): number {
  const parts = duration.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) {
    return parts[0];
  } else if (parts.length === 3) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function ReplaysContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
  const { addChange } = usePendingChanges();

  // Initialize state from URL parameters
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>(() => ({
    terran: searchParams.get('terran')?.split(',').filter(Boolean) || [],
    zerg: searchParams.get('zerg')?.split(',').filter(Boolean) || [],
    protoss: searchParams.get('protoss')?.split(',').filter(Boolean) || [],
    duration: searchParams.get('duration')?.split(',').filter(Boolean) || [],
    accessLevel: searchParams.get('access')?.split(',').filter(Boolean) || [],
  }));
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  );
  const [searchQuery, setSearchQuery] = useState(() =>
    searchParams.get('q') || ''
  );
  const [editingReplay, setEditingReplay] = useState<Replay | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Sync filters to URL whenever they change
  useUrlState({
    q: searchQuery,
    terran: selectedItems.terran,
    zerg: selectedItems.zerg,
    protoss: selectedItems.protoss,
    duration: selectedItems.duration,
    access: selectedItems.accessLevel,
    tags: selectedTags,
  });

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allReplays.forEach(replay => {
      replay.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Count replays for each filter
  const getCount = (matchupOrFilter: string, sectionId: string) => {
    return allReplays.filter(replay => {
      // Apply search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !replay.title.toLowerCase().includes(query) &&
          !replay.player1.name.toLowerCase().includes(query) &&
          !replay.player2.name.toLowerCase().includes(query) &&
          !replay.map.toLowerCase().includes(query) &&
          !replay.coach?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Check if replay matches the filter we're counting
      if (sectionId === 'terran') {
        if (!['TvT', 'TvZ', 'TvP'].includes(matchupOrFilter)) return false;
        if (replay.matchup !== matchupOrFilter) return false;
      } else if (sectionId === 'zerg') {
        if (!['ZvT', 'ZvZ', 'ZvP'].includes(matchupOrFilter)) return false;
        if (replay.matchup !== matchupOrFilter) return false;
      } else if (sectionId === 'protoss') {
        if (!['PvT', 'PvZ', 'PvP'].includes(matchupOrFilter)) return false;
        if (replay.matchup !== matchupOrFilter) return false;
      } else if (sectionId === 'duration') {
        const durationMinutes = parseDuration(replay.duration);
        if (matchupOrFilter === 'under10' && durationMinutes >= 10) return false;
        if (matchupOrFilter === '10-20' && (durationMinutes < 10 || durationMinutes > 20)) return false;
        if (matchupOrFilter === '20-30' && (durationMinutes <= 20 || durationMinutes > 30)) return false;
        if (matchupOrFilter === 'over30' && durationMinutes <= 30) return false;
      } else if (sectionId === 'accessLevel') {
        const isFree = replay.isFree ?? false;
        if (matchupOrFilter === 'free' && !isFree) return false;
        if (matchupOrFilter === 'premium' && isFree) return false;
      }

      // Apply other active filters (excluding current section)
      const terran = sectionId === 'terran' ? [] : (selectedItems.terran || []);
      const zerg = sectionId === 'zerg' ? [] : (selectedItems.zerg || []);
      const protoss = sectionId === 'protoss' ? [] : (selectedItems.protoss || []);
      const duration = sectionId === 'duration' ? [] : (selectedItems.duration || []);
      const accessLevel = sectionId === 'accessLevel' ? [] : (selectedItems.accessLevel || []);

      // Apply matchup filters
      const allSelectedMatchups = [...terran, ...zerg, ...protoss];
      if (allSelectedMatchups.length > 0 && !allSelectedMatchups.includes(replay.matchup)) {
        return false;
      }

      // Apply duration filters
      if (duration.length > 0) {
        const durationMinutes = parseDuration(replay.duration);
        const matchesDuration = duration.some(range => {
          if (range === 'under10') return durationMinutes < 10;
          if (range === '10-20') return durationMinutes >= 10 && durationMinutes <= 20;
          if (range === '20-30') return durationMinutes > 20 && durationMinutes <= 30;
          if (range === 'over30') return durationMinutes > 30;
          return false;
        });
        if (!matchesDuration) return false;
      }

      // Apply access level filters
      if (accessLevel.length > 0) {
        const isFree = replay.isFree ?? false;
        if (accessLevel.includes('free') && !isFree) return false;
        if (accessLevel.includes('premium') && isFree) return false;
      }

      return true;
    }).length;
  };

  // Filter replays
  const filteredReplays = useMemo(() => {
    return allReplays.filter(replay => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !replay.title.toLowerCase().includes(query) &&
          !replay.player1.name.toLowerCase().includes(query) &&
          !replay.player2.name.toLowerCase().includes(query) &&
          !replay.map.toLowerCase().includes(query) &&
          !replay.coach?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Tag filters
      if (selectedTags.length > 0) {
        if (!replay.tags || !selectedTags.every(tag => replay.tags.includes(tag))) {
          return false;
        }
      }

      // Apply matchup filters
      const allSelectedMatchups = [
        ...(selectedItems.terran || []),
        ...(selectedItems.zerg || []),
        ...(selectedItems.protoss || []),
      ];

      if (allSelectedMatchups.length > 0) {
        if (!allSelectedMatchups.includes(replay.matchup)) {
          return false;
        }
      }

      // Duration filters
      if (selectedItems.duration.length > 0) {
        const durationMinutes = parseDuration(replay.duration);
        const matchesDuration = selectedItems.duration.some(range => {
          if (range === 'under10') return durationMinutes < 10;
          if (range === '10-20') return durationMinutes >= 10 && durationMinutes <= 20;
          if (range === '20-30') return durationMinutes > 20 && durationMinutes <= 30;
          if (range === 'over30') return durationMinutes > 30;
          return false;
        });
        if (!matchesDuration) return false;
      }

      // Access level filters
      if (selectedItems.accessLevel.length > 0) {
        const isFree = replay.isFree ?? false;
        if (selectedItems.accessLevel.includes('free') && !isFree) return false;
        if (selectedItems.accessLevel.includes('premium') && isFree) return false;
      }

      return true;
    });
  }, [allReplays, selectedItems, selectedTags, searchQuery]);

  // Filter sections for sidebar
  const filterSections: FilterSection[] = [
    {
      id: 'search',
      title: 'Search',
      type: 'search' as const,
      items: [],
    },
    {
      id: 'accessLevel',
      title: 'Access Level',
      type: 'checkbox' as const,
      items: [
        { id: 'free', label: 'Free', count: getCount('free', 'accessLevel') },
        { id: 'premium', label: 'Premium', count: getCount('premium', 'accessLevel') },
      ],
    },
    {
      id: 'terran',
      title: 'Terran',
      type: 'checkbox' as const,
      items: [
        { id: 'TvT', label: 'vs Terran', count: getCount('TvT', 'terran') },
        { id: 'TvZ', label: 'vs Zerg', count: getCount('TvZ', 'terran') },
        { id: 'TvP', label: 'vs Protoss', count: getCount('TvP', 'terran') },
      ],
    },
    {
      id: 'zerg',
      title: 'Zerg',
      type: 'checkbox' as const,
      items: [
        { id: 'ZvT', label: 'vs Terran', count: getCount('ZvT', 'zerg') },
        { id: 'ZvZ', label: 'vs Zerg', count: getCount('ZvZ', 'zerg') },
        { id: 'ZvP', label: 'vs Protoss', count: getCount('ZvP', 'zerg') },
      ],
    },
    {
      id: 'protoss',
      title: 'Protoss',
      type: 'checkbox' as const,
      items: [
        { id: 'PvT', label: 'vs Terran', count: getCount('PvT', 'protoss') },
        { id: 'PvZ', label: 'vs Zerg', count: getCount('PvZ', 'protoss') },
        { id: 'PvP', label: 'vs Protoss', count: getCount('PvP', 'protoss') },
      ],
    },
    {
      id: 'duration',
      title: 'Duration',
      type: 'checkbox' as const,
      items: [
        { id: 'under10', label: 'Under 10 min', count: getCount('under10', 'duration') },
        { id: '10-20', label: '10-20 min', count: getCount('10-20', 'duration') },
        { id: '20-30', label: '20-30 min', count: getCount('20-30', 'duration') },
        { id: 'over30', label: 'Over 30 min', count: getCount('over30', 'duration') },
      ],
    },
  ];

  const handleAddNew = () => {
    setEditingReplay(null);
    setIsAddingNew(true);
  };

  const handleEdit = (replay: Replay) => {
    setEditingReplay(replay);
    setIsAddingNew(false);
  };

  const handleDelete = async (replay: Replay) => {
    if (!confirm(`Are you sure you want to delete "${replay.title}"?`)) {
      return;
    }
    addChange({
      id: replay.id,
      contentType: 'replays',
      operation: 'delete',
      data: replay as unknown as Record<string, unknown>,
    });
  };

  // Filter sidebar content
  const filterContent = (
    <FilterSidebar
      searchEnabled={true}
      searchPlaceholder="Search replays..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
    />
  );

  // Table content
  const tableContent = (
    <ReplaysTable
      replays={filteredReplays}
      hasSubscriberRole={hasSubscriberRole}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  // Grid content
  const gridContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredReplays.map(replay => (
        <ReplayCard
          key={replay.id}
          replay={replay}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  // Header actions (Add button)
  const headerActions = (
    <PermissionGate require="coaches">
      <Button onClick={handleAddNew} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add New Replay
      </Button>
    </PermissionGate>
  );

  return (
    <>
      <FilterableContentLayout
        title="Replays"
        description="Download and study replays from our coaches and top-level games. Filter by race, matchup, and MMR bracket."
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="table"
        showViewToggle={true}
        headerActions={headerActions}
        tags={allTags}
        selectedTags={selectedTags}
        onTagToggle={toggleTag}
        onClearTags={() => setSelectedTags([])}
      />

      {/* Edit Modal */}
      <ReplayEditModal
        replay={editingReplay}
        isOpen={!!(editingReplay || isAddingNew)}
        onClose={() => {
          setEditingReplay(null);
          setIsAddingNew(false);
        }}
        isNew={isAddingNew}
      />
    </>
  );
}
