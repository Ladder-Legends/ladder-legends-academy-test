'use client';

import { useState, useMemo } from 'react';
import { CategorySidebar, Category } from '@/components/category-sidebar';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';

const allMasterclasses = masterclassesData as Masterclass[];

export function MasterclassesContent() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Create categories based on coach
  const categories: Category[] = useMemo(() => {
    const coaches = Array.from(new Set(allMasterclasses.map(mc => mc.coachId)));

    return coaches.map(coachId => {
      const coachMasterclass = allMasterclasses.find(mc => mc.coachId === coachId);
      const count = allMasterclasses.filter(mc => mc.coachId === coachId).length;

      return {
        id: coachId,
        label: coachMasterclass?.coach || coachId,
        count
      };
    });
  }, []);

  // Filter masterclasses based on selected category
  const filteredMasterclasses = useMemo(() => {
    if (!selectedCategory) return allMasterclasses;
    return allMasterclasses.filter(mc => mc.coachId === selectedCategory);
  }, [selectedCategory]);

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
    <div className="flex gap-8">
      <CategorySidebar
        title="Masterclasses"
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <div className="flex-1">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredMasterclasses.length} masterclass{filteredMasterclasses.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Series Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Coach</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Race</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Episodes</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Difficulty</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Duration</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Actions</th>
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
                  <td className="px-4 py-3">
                    <Link
                      href={`/masterclasses/${masterclass.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {masterclass.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {masterclass.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm">{masterclass.coach}</td>
                  <td className={`px-4 py-3 text-sm capitalize ${getRaceColor(masterclass.race)}`}>
                    {masterclass.race}
                  </td>
                  <td className="px-4 py-3 text-sm">{masterclass.episodes.length}</td>
                  <td className={`px-4 py-3 text-sm capitalize ${getDifficultyColor(masterclass.difficulty)}`}>
                    {masterclass.difficulty}
                  </td>
                  <td className="px-4 py-3 text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {masterclass.totalDuration}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/masterclasses/${masterclass.id}`}
                      className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
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
  );
}
