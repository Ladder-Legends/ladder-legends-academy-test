'use client';

import { useState, useMemo } from 'react';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import buildOrdersData from '@/data/build-orders.json';
import { BuildOrder } from '@/types/build-order';
import Link from 'next/link';
import { Video, X } from 'lucide-react';

const allBuildOrders = buildOrdersData as BuildOrder[];

export function BuildOrdersContent() {
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    terran: [],
    zerg: [],
    protoss: [],
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  // Extract all unique tags from build orders
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allBuildOrders.forEach(bo => {
      bo.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // Count build orders for each filter
  const getCount = (filterFn: (bo: BuildOrder) => boolean) => {
    return allBuildOrders.filter(bo => {
      if (!filterFn(bo)) return false;

      // Apply tag filter
      if (selectedTags.length > 0 && !selectedTags.every(tag => bo.tags.includes(tag))) {
        return false;
      }

      return true;
    }).length;
  };

  // Build filter sections with race as top-level sections
  const filterSections = useMemo((): FilterSection[] => {
    return [
      {
        id: 'terran',
        label: 'Terran',
        icon: '🔴',
        items: [
          { id: 'terran-tvt', label: 'vs Terran', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'terran') },
          { id: 'terran-tvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'zerg') },
          { id: 'terran-tvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'terran' && bo.vsRace === 'protoss') },
        ],
      },
      {
        id: 'zerg',
        label: 'Zerg',
        icon: '🟣',
        items: [
          { id: 'zerg-zvt', label: 'vs Terran', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'terran') },
          { id: 'zerg-zvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'zerg') },
          { id: 'zerg-zvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'zerg' && bo.vsRace === 'protoss') },
        ],
      },
      {
        id: 'protoss',
        label: 'Protoss',
        icon: '🔵',
        items: [
          { id: 'protoss-pvt', label: 'vs Terran', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'terran') },
          { id: 'protoss-pvz', label: 'vs Zerg', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'zerg') },
          { id: 'protoss-pvp', label: 'vs Protoss', count: getCount(bo => bo.race === 'protoss' && bo.vsRace === 'protoss') },
        ],
      },
    ];
  }, [selectedTags]);

  // Filter build orders based on selected filters and tags
  const filteredBuildOrders = useMemo(() => {
    let filtered = allBuildOrders;

    // Collect all selected matchup filters from all race sections
    const allSelectedMatchups = [
      ...(selectedItems.terran || []),
      ...(selectedItems.zerg || []),
      ...(selectedItems.protoss || []),
    ];

    if (allSelectedMatchups.length > 0) {
      filtered = filtered.filter(bo => {
        return allSelectedMatchups.some(filterId => {
          if (filterId.includes('-')) {
            // Matchup filter like "terran-tvz"
            const [race, matchup] = filterId.split('-');
            const vsRace = matchup.substring(matchup.length - 1);
            const vsRaceMap: Record<string, string> = { t: 'terran', z: 'zerg', p: 'protoss' };
            return bo.race === race && bo.vsRace === vsRaceMap[vsRace];
          }
          return false;
        });
      });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(bo =>
        selectedTags.every(tag => bo.tags.includes(tag))
      );
    }

    return filtered;
  }, [selectedItems, selectedTags]);

  return (
    <div className="flex flex-1">
      <FilterSidebar
        sections={filterSections}
        selectedItems={selectedItems}
        onItemToggle={handleItemToggle}
      />

      <main className="flex-1 px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Build Orders</h2>
            <p className="text-muted-foreground">
              Master proven build orders from our expert coaches. Each build includes detailed timings, supply counts, and linked video demonstrations.
            </p>
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

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
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
                      className="text-base font-medium hover:text-primary transition-colors"
                    >
                      {buildOrder.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1 leading-relaxed">
                      {buildOrder.description}
                    </p>
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
                        <a
                          href={`https://youtube.com/watch?v=${buildOrder.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm px-4 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Video
                        </a>
                      )}
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
    </div>
  );
}
