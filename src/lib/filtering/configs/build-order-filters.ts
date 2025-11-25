/**
 * Filter configuration for build order content.
 */

import type { BuildOrder } from '@/types/build-order';
import type { FilterConfig, FilterFieldConfig, FilterSectionConfig } from '../types';
import { createFilterField } from '../types';
import { createBooleanPredicate, createCategoryPredicate } from '../filter-engine';
import { getCategoryFilterOptions } from '@/lib/taxonomy';

/**
 * Filter field configurations
 */
const fields: FilterFieldConfig<BuildOrder>[] = [
  // Unified matchup filter (replaces separate terran/zerg/protoss)
  {
    id: 'matchups',
    urlParam: 'matchups',
    predicate: (buildOrder, filters) => {
      const selectedMatchups = filters.matchups;
      if (!selectedMatchups || (Array.isArray(selectedMatchups) && selectedMatchups.length === 0)) {
        return true;
      }

      const matchups = Array.isArray(selectedMatchups) ? selectedMatchups : [String(selectedMatchups)];

      return matchups.some(matchupId => {
        // Handle parent race selection (e.g., "terran" without opponent)
        if (!matchupId.includes('-')) {
          // Match all build orders for this race
          return buildOrder.race === matchupId;
        }

        // Handle specific matchup selection (e.g., "terran-tvz")
        const [race, matchup] = matchupId.split('-');
        const vsRace = matchup.substring(matchup.length - 1);
        const vsRaceMap: Record<string, string> = { t: 'terran', z: 'zerg', p: 'protoss' };
        return buildOrder.race === race && (buildOrder.vsRace === vsRaceMap[vsRace] || buildOrder.vsRace === 'all');
      });
    },
  },

  // Difficulty filter
  {
    id: 'difficulty',
    urlParam: 'difficulty',
    predicate: (buildOrder, filters) => {
      const selectedDifficulties = filters.difficulty;
      if (!selectedDifficulties || (Array.isArray(selectedDifficulties) && selectedDifficulties.length === 0)) {
        return true;
      }

      const difficulties = Array.isArray(selectedDifficulties) ? selectedDifficulties : [String(selectedDifficulties)];
      return difficulties.includes(buildOrder.difficulty);
    },
  },

  // Access level filter
  createFilterField<BuildOrder, 'accessLevel'>({
    id: 'accessLevel',
    urlParam: 'accessLevel',
    predicate: createBooleanPredicate('isFree', 'accessLevel', 'free', 'premium'),
  }),

  // Category filter (multi-category support)
  createFilterField<BuildOrder, 'categories'>({
    id: 'categories',
    urlParam: 'categories',
    predicate: createCategoryPredicate('categories', 'categories'),
  }),
];

/**
 * Section configurations for the sidebar
 */
const sections: FilterSectionConfig<BuildOrder>[] = [
  {
    id: 'search',
    title: 'Search',
    type: 'search',
  },
  {
    id: 'accessLevel',
    title: 'Access Level',
    type: 'checkbox',
    options: [
      { id: 'free', label: 'Free' },
      { id: 'premium', label: 'Premium' },
    ],
  },
  {
    id: 'matchups',
    title: 'Races',
    type: 'checkbox',
    options: [
      {
        id: 'terran',
        label: 'Terran',
        children: [
          { id: 'terran-tvt', label: 'vs Terran' },
          { id: 'terran-tvz', label: 'vs Zerg' },
          { id: 'terran-tvp', label: 'vs Protoss' },
        ],
      },
      {
        id: 'zerg',
        label: 'Zerg',
        children: [
          { id: 'zerg-zvt', label: 'vs Terran' },
          { id: 'zerg-zvz', label: 'vs Zerg' },
          { id: 'zerg-zvp', label: 'vs Protoss' },
        ],
      },
      {
        id: 'protoss',
        label: 'Protoss',
        children: [
          { id: 'protoss-pvt', label: 'vs Terran' },
          { id: 'protoss-pvz', label: 'vs Zerg' },
          { id: 'protoss-pvp', label: 'vs Protoss' },
        ],
      },
    ],
  },
  {
    id: 'difficulty',
    title: 'Difficulty',
    type: 'checkbox',
    options: [
      { id: 'basic', label: 'Basic' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'expert', label: 'Expert' },
    ],
  },
  {
    id: 'categories',
    title: 'Categories',
    type: 'checkbox',
    getOptions: (buildOrders) => {
      // Filter to only show categories/subcategories that have content
      const categoryCounts = new Map<string, number>();

      buildOrders.forEach(buildOrder => {
        if (buildOrder.categories && Array.isArray(buildOrder.categories)) {
          buildOrder.categories.forEach(category => {
            // Count the category itself
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

            // Also count the primary category if this is a secondary
            if (category.includes('.')) {
              const primary = category.split('.')[0];
              categoryCounts.set(primary, (categoryCounts.get(primary) || 0) + 1);
            }
          });
        }
      });

      const allOptions = getCategoryFilterOptions();
      return allOptions
        .filter(primary => categoryCounts.has(primary.id))
        .map(primary => ({
          ...primary,
          children: primary.children?.filter(secondary =>
            categoryCounts.has(secondary.id)
          ),
        }));
    },
  },
];

/**
 * Complete build order filter configuration
 */
export const buildOrderFilterConfig: FilterConfig<BuildOrder> = {
  fields,
  sections,
  searchFields: ['name', 'description', 'coach', 'tags', 'race', 'vsRace', 'type'],
};
