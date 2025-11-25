'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FilterSidebar } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import { useContentFiltering } from '@/lib/filtering/hooks/use-content-filtering';
import { replayFilterConfig } from '@/lib/filtering/configs/replay-filters';
import { replays } from '@/lib/data';
import { Replay, normalizeReplays } from '@/types/replay';
import { ReplayCard } from './replay-card';
import { ReplaysTable } from './replays-table';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { ReplayEditModal } from '@/components/admin/replay-edit-modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';

// Filter out replays without downloadUrl and normalize so winner is always player1
const allReplays = normalizeReplays(replays.filter(replay => replay.downloadUrl));

export function ReplaysContent() {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
  const { addChange } = usePendingChanges();

  // Use the new filtering system
  const {
    filtered,
    filters,
    setFilter,
    clearFilters,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    sections: filterSections,
  } = useContentFiltering(allReplays, replayFilterConfig);

  // Sort replays: for free users, free content first then newest; for premium users, just newest
  const filteredReplays = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // For non-subscribers, prioritize free content first
      if (!hasSubscriberRole) {
        const aIsFree = a.isFree ?? false;
        const bIsFree = b.isFree ?? false;
        if (aIsFree !== bIsFree) {
          return bIsFree ? 1 : -1; // Free items come first
        }
      }

      // Then sort by date (newest first)
      const dateA = new Date(a.uploadDate || a.gameDate).getTime();
      const dateB = new Date(b.uploadDate || b.gameDate).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [filtered, hasSubscriberRole]);

  const [editingReplay, setEditingReplay] = useState<Replay | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Convert filters object to selectedItems format for FilterSidebar
  const selectedItems = useMemo(() => {
    const result: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        result[key] = value;
      } else if (value) {
        result[key] = [String(value)];
      } else {
        result[key] = [];
      }
    }

    return result;
  }, [filters]);

  // Handle selection changes from FilterSidebar
  const handleSelectionChange = (newSelectedItems: Record<string, string[]>) => {
    for (const [key, value] of Object.entries(newSelectedItems)) {
      if (JSON.stringify(selectedItems[key]) !== JSON.stringify(value)) {
        setFilter(key, value);
      }
    }
  };

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
      data: replay,
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
      onSelectionChange={handleSelectionChange}
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
        pageKey="replays"
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="table"
        showViewToggle={true}
        headerActions={headerActions}
        filters={filters}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        onClearFilters={clearFilters}
        onRemoveFilter={(key) => setFilter(key, [])}
onRemoveFilterValue={(key, value) => {
          const currentValues = filters[key];
          if (Array.isArray(currentValues)) {
            setFilter(key, currentValues.filter(v => v !== value));
          }
        }}
                onClearSearch={() => setSearchQuery('')}
        onRemoveTag={toggleTag}
        filterLabels={{}}
      />

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
