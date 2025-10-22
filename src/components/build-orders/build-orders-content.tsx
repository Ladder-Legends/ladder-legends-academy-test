'use client';

import { useState, useMemo, useCallback } from 'react';
import { FilterSidebar, MobileFilterButton, type FilterSection } from '@/components/shared/filter-sidebar';
import buildOrdersData from '@/data/build-orders.json';
import { BuildOrder } from '@/types/build-order';
import Link from 'next/link';
import { Video, X, Plus, Edit, Trash2, Lock } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { BuildOrderEditModal } from '@/components/admin/build-order-edit-modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

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
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile filter state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modal state for editing
  const [editingBuildOrder, setEditingBuildOrder] = useState<BuildOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewBuildOrder, setIsNewBuildOrder] = useState(false);

  // Handle filter toggle
  const handleItemToggle = (sectionId: string, itemId: string) => {
    setSelectedItems(prev => {
      const current = prev[sectionId] || [];
      const updated = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [sectionId]: updated };
    });
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Admin handlers
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

  // Extract all unique tags from build orders
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allBuildOrders.forEach(bo => {
      bo.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

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

      return true;
    }).length;
  }, [selectedTags, selectedItems]);

  // Build filter sections with race as top-level sections
  const filterSections = useMemo((): FilterSection[] => {
    return [
      {
        id: 'terran',
        label: 'Terran',
        items: [
          { id: 'terran-tvt', label: 'vs Terran', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'terran', 'terran') },
          { id: 'terran-tvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'zerg', 'terran') },
          { id: 'terran-tvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'protoss', 'terran') },
        ],
      },
      {
        id: 'zerg',
        label: 'Zerg',
        items: [
          { id: 'zerg-zvt', label: 'vs Terran', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'terran', 'zerg') },
          { id: 'zerg-zvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'zerg', 'zerg') },
          { id: 'zerg-zvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'protoss', 'zerg') },
        ],
      },
      {
        id: 'protoss',
        label: 'Protoss',
        items: [
          { id: 'protoss-pvt', label: 'vs Terran', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'terran', 'protoss') },
          { id: 'protoss-pvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'zerg', 'protoss') },
          { id: 'protoss-pvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'protoss', 'protoss') },
        ],
      },
      {
        id: 'difficulty',
        label: 'Difficulty',
        items: [
          { id: 'beginner', label: 'Beginner', count: getCount(bo => bo.difficulty === 'beginner', 'difficulty') },
          { id: 'intermediate', label: 'Intermediate', count: getCount(bo => bo.difficulty === 'intermediate', 'difficulty') },
          { id: 'advanced', label: 'Advanced', count: getCount(bo => bo.difficulty === 'advanced', 'difficulty') },
        ].filter(item => item.count > 0),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTags, selectedItems, getCount]);

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

      return true;
    });
  }, [selectedItems, selectedTags, searchQuery]);

  return (
    <div className="flex flex-1">
      <FilterSidebar
        searchEnabled={true}
        searchPlaceholder="Search build orders..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sections={filterSections}
        selectedItems={selectedItems}
        onItemToggle={handleItemToggle}
        isMobileOpen={isMobileFilterOpen}
        onMobileOpenChange={setIsMobileFilterOpen}
      />

      <main className="flex-1 px-4 lg:px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          {/* Mobile Filter Button */}
          <MobileFilterButton
            onClick={() => setIsMobileFilterOpen(true)}
            label="Filters & Search"
          />

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Build Orders</h2>
              <p className="text-muted-foreground">
                Master proven build orders from our expert coaches. Each build includes detailed timings, supply counts, and linked video demonstrations.
              </p>
            </div>
            <PermissionGate require="coaches">
              <Button onClick={handleAddNew} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Build Order
              </Button>
            </PermissionGate>
          </div>

          <div className="space-y-4">
          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Filter by Tags</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="inline-block ml-1 h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredBuildOrders.length} build order{filteredBuildOrders.length !== 1 ? 's' : ''}
            </p>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold">Build Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Matchup</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Type</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Difficulty</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Coach</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBuildOrders.map((buildOrder, index) => (
                <tr
                  key={buildOrder.id}
                  className={`border-t border-border hover:bg-muted/30 transition-colors ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                  }`}
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/build-orders/${buildOrder.id}`}
                      className="text-base font-medium hover:text-primary transition-colors block"
                    >
                      {buildOrder.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed">
                        {buildOrder.description}
                      </p>
                      {!buildOrder.isFree && !hasSubscriberRole && (
                        <span className="bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium whitespace-nowrap flex-shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          Premium
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {buildOrder.race.charAt(0).toUpperCase()}v{buildOrder.vsRace.charAt(0).toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2.5 py-1.5 rounded-full bg-muted">
                      {buildOrder.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm capitalize">
                    {buildOrder.difficulty}
                  </td>
                  <td className="px-6 py-4 text-sm">{buildOrder.coach}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/build-orders/${buildOrder.id}`}
                        className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                      >
                        View
                      </Link>
                      {buildOrder.videoId && (
                        <PaywallLink
                          href={`https://youtube.com/watch?v=${buildOrder.videoId}`}
                          external
                          isFree={buildOrder.isFree}
                          className="text-sm px-4 py-2 border-2 border-primary text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Video
                        </PaywallLink>
                      )}
                      <PermissionGate require="coaches">
                        <button
                          onClick={() => handleEdit(buildOrder)}
                          className="text-sm px-3 py-2 border border-border hover:bg-muted rounded-md transition-colors flex items-center gap-1.5"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(buildOrder)}
                          className="text-sm px-3 py-2 border border-destructive text-destructive hover:bg-destructive/10 rounded-md transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          {filteredBuildOrders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No build orders found for this category.</p>
            </div>
          )}
        </div>
      </main>

      <BuildOrderEditModal
        buildOrder={editingBuildOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewBuildOrder}
      />
    </div>
  );
}
