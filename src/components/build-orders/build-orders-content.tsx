'use client';

import { useState, useMemo, useCallback } from 'react';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import buildOrdersData from '@/data/build-orders.json';
import { BuildOrder } from '@/types/build-order';
import { BuildOrderCard } from './build-order-card';
import { BuildOrdersTable } from './build-orders-table';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { BuildOrderEditModal } from '@/components/admin/build-order-edit-modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

const allBuildOrders = buildOrdersData as BuildOrder[];

export function BuildOrdersContent() {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
  const { addChange } = usePendingChanges();

  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    terran: [],
    zerg: [],
    protoss: [],
    difficulty: [],
    type: [],
    accessLevel: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingBuildOrder, setEditingBuildOrder] = useState<BuildOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewBuildOrder, setIsNewBuildOrder] = useState(false);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allBuildOrders.forEach(bo => {
      bo.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  // Get unique types
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    allBuildOrders.forEach(bo => types.add(bo.type));
    return Array.from(types).sort();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Count build orders for each filter with context-aware filtering
  const getCount = useCallback((filterFn: (bo: BuildOrder) => boolean, excludeSectionId?: string) => {
    return allBuildOrders.filter(bo => {
      if (!filterFn(bo)) return false;

      // Apply tag filter
      if (selectedTags.length > 0 && !selectedTags.every(tag => bo.tags.includes(tag))) {
        return false;
      }

      // Apply other race/matchup filters (excluding the current section being counted)
      const allSelectedMatchups = [
        ...(excludeSectionId === 'terran' ? [] : (selectedItems.terran || [])),
        ...(excludeSectionId === 'zerg' ? [] : (selectedItems.zerg || [])),
        ...(excludeSectionId === 'protoss' ? [] : (selectedItems.protoss || [])),
      ];

      if (allSelectedMatchups.length > 0) {
        const matchesFilter = allSelectedMatchups.some(filterId => {
          if (filterId.includes('-')) {
            const [race, matchup] = filterId.split('-');
            const vsRace = matchup.substring(matchup.length - 1);
            const vsRaceMap: Record<string, string> = { t: 'terran', z: 'zerg', p: 'protoss' };
            return bo.race === race && (bo.vsRace === vsRaceMap[vsRace] || bo.vsRace === 'all');
          }
          return false;
        });
        if (!matchesFilter) return false;
      }

      // Apply difficulty filter (excluding if counting difficulty section)
      const selectedDifficulties = excludeSectionId === 'difficulty' ? [] : (selectedItems.difficulty || []);
      if (selectedDifficulties.length > 0) {
        if (!selectedDifficulties.includes(bo.difficulty)) return false;
      }

      // Apply type filter (excluding if counting type section)
      const selectedTypes = excludeSectionId === 'type' ? [] : (selectedItems.type || []);
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(bo.type)) return false;
      }

      // Apply access level filter (excluding if counting accessLevel section)
      const selectedAccessLevels = excludeSectionId === 'accessLevel' ? [] : (selectedItems.accessLevel || []);
      if (selectedAccessLevels.length > 0) {
        const isFree = bo.isFree === true;
        const matchesAccessLevel = selectedAccessLevels.some(level => {
          if (level === 'free') return isFree;
          if (level === 'premium') return !isFree;
          return false;
        });
        if (!matchesAccessLevel) return false;
      }

      return true;
    }).length;
  }, [selectedTags, selectedItems]);

  // Build filter sections with race as top-level sections
  const filterSections: FilterSection[] = useMemo(() => [
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
        { id: 'free', label: 'Free', count: getCount(bo => bo.isFree === true, 'accessLevel') },
        { id: 'premium', label: 'Premium', count: getCount(bo => !bo.isFree, 'accessLevel') },
      ].filter(item => item.count !== undefined && item.count > 0),
    },
    {
      id: 'terran',
      title: 'Terran',
      type: 'checkbox' as const,
      items: [
        { id: 'terran-tvt', label: 'vs Terran', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'terran', 'terran') },
        { id: 'terran-tvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'zerg', 'terran') },
        { id: 'terran-tvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'protoss', 'terran') },
      ],
    },
    {
      id: 'zerg',
      title: 'Zerg',
      type: 'checkbox' as const,
      items: [
        { id: 'zerg-zvt', label: 'vs Terran', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'terran', 'zerg') },
        { id: 'zerg-zvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'zerg', 'zerg') },
        { id: 'zerg-zvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'protoss', 'zerg') },
      ],
    },
    {
      id: 'protoss',
      title: 'Protoss',
      type: 'checkbox' as const,
      items: [
        { id: 'protoss-pvt', label: 'vs Terran', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'terran', 'protoss') },
        { id: 'protoss-pvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'zerg', 'protoss') },
        { id: 'protoss-pvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'protoss', 'protoss') },
      ],
    },
    {
      id: 'type',
      title: 'Type',
      type: 'checkbox' as const,
      items: allTypes.map(type => ({
        id: type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        count: getCount(bo => bo.type === type, 'type'),
      })).filter(item => item.count !== undefined && item.count > 0),
    },
    {
      id: 'difficulty',
      title: 'Difficulty',
      type: 'checkbox' as const,
      items: [
        { id: 'beginner', label: 'Beginner', count: getCount(bo => bo.difficulty === 'beginner', 'difficulty') },
        { id: 'intermediate', label: 'Intermediate', count: getCount(bo => bo.difficulty === 'intermediate', 'difficulty') },
        { id: 'advanced', label: 'Advanced', count: getCount(bo => bo.difficulty === 'advanced', 'difficulty') },
      ].filter(item => item.count !== undefined && item.count > 0),
    },
  ], [selectedTags, selectedItems, getCount, allTypes]);

  // Filter build orders based on search, selected filters, and tags
  const filteredBuildOrders = useMemo(() => {
    return allBuildOrders.filter(bo => {
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          bo.name.toLowerCase().includes(query) ||
          bo.description.toLowerCase().includes(query) ||
          bo.tags.some(tag => tag.toLowerCase().includes(query)) ||
          bo.coach.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Apply matchup filters with OR logic (selecting multiple matchups shows ANY match)
      const allSelectedMatchups = [
        ...(selectedItems.terran || []),
        ...(selectedItems.zerg || []),
        ...(selectedItems.protoss || []),
      ];

      if (allSelectedMatchups.length > 0) {
        const matchesAnyMatchup = allSelectedMatchups.some(filterId => {
          if (filterId.includes('-')) {
            const [race, matchup] = filterId.split('-');
            const vsRace = matchup.substring(matchup.length - 1);
            const vsRaceMap: Record<string, string> = { t: 'terran', z: 'zerg', p: 'protoss' };
            return bo.race === race && (bo.vsRace === vsRaceMap[vsRace] || bo.vsRace === 'all');
          }
          return false;
        });
        if (!matchesAnyMatchup) return false;
      }

      // Apply tag filters with AND logic (must have ALL selected tags)
      if (selectedTags.length > 0 && !selectedTags.every(tag => bo.tags.includes(tag))) {
        return false;
      }

      // Apply difficulty filter
      const selectedDifficulties = selectedItems.difficulty || [];
      if (selectedDifficulties.length > 0) {
        if (!selectedDifficulties.includes(bo.difficulty)) return false;
      }

      // Apply type filter
      const selectedTypes = selectedItems.type || [];
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(bo.type)) return false;
      }

      // Apply access level filter
      const selectedAccessLevels = selectedItems.accessLevel || [];
      if (selectedAccessLevels.length > 0) {
        const isFree = bo.isFree === true;
        const matchesAccessLevel = selectedAccessLevels.some(level => {
          if (level === 'free') return isFree;
          if (level === 'premium') return !isFree;
          return false;
        });
        if (!matchesAccessLevel) return false;
      }

      return true;
    });
  }, [selectedItems, selectedTags, searchQuery]);

  const handleEdit = (buildOrder: BuildOrder) => {
    setEditingBuildOrder(buildOrder);
    setIsNewBuildOrder(false);
    setIsModalOpen(true);
  };

  const handleDelete = (buildOrder: BuildOrder) => {
    if (confirm(`Are you sure you want to delete "${buildOrder.name}"?`)) {
      addChange({
        id: buildOrder.id,
        contentType: 'build-orders',
        operation: 'delete',
        data: buildOrder as unknown as Record<string, unknown>,
      });
      toast.success(`Build order deleted (pending commit)`);
    }
  };

  const handleAddNew = () => {
    setEditingBuildOrder(null);
    setIsNewBuildOrder(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBuildOrder(null);
    setIsNewBuildOrder(false);
  };

  // Filter content
  const filterContent = (
    <FilterSidebar
      searchEnabled={true}
      searchPlaceholder="Search build orders..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
    />
  );

  // Table content
  const tableContent = (
    <BuildOrdersTable
      buildOrders={filteredBuildOrders}
      hasSubscriberRole={hasSubscriberRole}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  // Grid content
  const gridContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredBuildOrders.map(bo => (
        <BuildOrderCard
          key={bo.id}
          buildOrder={bo}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  // Header actions
  const headerActions = (
    <PermissionGate require="coaches">
      <Button onClick={handleAddNew} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add New Build Order
      </Button>
    </PermissionGate>
  );

  return (
    <>
      <FilterableContentLayout
        title="Build Orders"
        description="Master proven build orders from our expert coaches. Each build includes detailed timings, supply counts, and linked video demonstrations."
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="grid"
        showViewToggle={true}
        headerActions={headerActions}
        resultCount={`Showing ${filteredBuildOrders.length} build order${filteredBuildOrders.length !== 1 ? 's' : ''}`}
        tags={allTags}
        selectedTags={selectedTags}
        onTagToggle={toggleTag}
        onClearTags={() => setSelectedTags([])}
      />

      {/* Edit Modal */}
      <BuildOrderEditModal
        buildOrder={editingBuildOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewBuildOrder}
      />
    </>
  );
}
