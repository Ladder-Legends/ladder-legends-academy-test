'use client';

import { useState, useMemo } from 'react';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';

const allMasterclasses = masterclassesData as Masterclass[];

export function MasterclassesContent() {
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    coaches: [],
  });

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

  // Count masterclasses for each coach
  const getCount = (coachId: string) => {
    return allMasterclasses.filter(mc => mc.coachId === coachId).length;
  };

  // Build filter sections with coaches
  const filterSections = useMemo((): FilterSection[] => {
    const coaches = Array.from(new Set(allMasterclasses.map(mc => mc.coachId)));

    return [
      {
        id: 'coaches',
        label: 'Coaches',
        icon: '👨‍🏫',
        items: coaches.map(coachId => {
          const coachMasterclass = allMasterclasses.find(mc => mc.coachId === coachId);
          return {
            id: coachId,
            label: coachMasterclass?.coach || coachId,
            count: getCount(coachId),
          };
        }),
      },
    ];
  }, []);

  // Filter masterclasses based on selected coaches
  const filteredMasterclasses = useMemo(() => {
    let filtered = allMasterclasses;

    const coachFilters = selectedItems.coaches || [];
    if (coachFilters.length > 0) {
      filtered = filtered.filter(mc => coachFilters.includes(mc.coachId));
    }

    return filtered;
  }, [selectedItems]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-500';
      case 'intermediate': return 'text-yellow-500';
      case 'advanced': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getRaceColor = (race: string) => {
    switch (race.toLowerCase()) {
      case 'terran': return 'text-orange-500';
      case 'zerg': return 'text-purple-500';
      case 'protoss': return 'text-cyan-500';
      default: return 'text-muted-foreground';
    }
  };

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
            <h2 className="text-3xl font-bold">Masterclasses</h2>
            <p className="text-muted-foreground">
              In-depth series and structured courses from our coaches. Perfect for systematic improvement in specific areas.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredMasterclasses.length} masterclass{filteredMasterclasses.length !== 1 ? 'es' : ''}
              </p>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Series Name</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Coach</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Race</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Episodes</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Difficulty</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Duration</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMasterclasses.map((masterclass, index) => (
                    <tr
                      key={masterclass.id}
                      className={`border-t border-border hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/masterclasses/${masterclass.id}`}
                          className="text-base font-medium hover:text-primary transition-colors"
                        >
                          {masterclass.title}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1 leading-relaxed">
                          {masterclass.description}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm">{masterclass.coach}</td>
                      <td className={`px-6 py-4 text-sm capitalize font-medium ${getRaceColor(masterclass.race)}`}>
                        {masterclass.race}
                      </td>
                      <td className="px-6 py-4 text-sm">{masterclass.episodes.length}</td>
                      <td className={`px-6 py-4 text-sm capitalize font-medium ${getDifficultyColor(masterclass.difficulty)}`}>
                        {masterclass.difficulty}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {masterclass.totalDuration}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/masterclasses/${masterclass.id}`}
                          className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 font-medium"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Watch Series
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMasterclasses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No masterclasses found for this category.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
