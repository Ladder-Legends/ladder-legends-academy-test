/**
 * Filter configuration for replay content.
 */

import type { Replay } from '@/types/replay';
import type { FilterConfig, FilterFieldConfig, FilterSectionConfig } from '../types';
import { createFilterField } from '../types';
import { createBooleanPredicate, createCategoryPredicate } from '../filter-engine';
import { getCategoryFilterOptions } from '@/lib/taxonomy';

// Helper function to parse duration string (e.g., "12.34" or "12:34" or "1:02:34") into minutes
function parseDuration(duration: string): number {
  // Support both . and : as separators
  const separator = duration.includes('.') ? '.' : ':';
  const parts = duration.split(separator).map(p => parseInt(p, 10));
  if (parts.length === 2) {
    return parts[0];
  } else if (parts.length === 3) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Filter field configurations
 */
const fields: FilterFieldConfig<Replay>[] = [
  // Terran matchups
  {
    id: 'terran',
    urlParam: 'terran',
    predicate: (replay, filters) => {
      const selectedMatchups = filters.terran;
      if (!selectedMatchups || (Array.isArray(selectedMatchups) && selectedMatchups.length === 0)) {
        return true;
      }

      const matchups = Array.isArray(selectedMatchups) ? selectedMatchups : [String(selectedMatchups)];
      return matchups.includes(replay.matchup);
    },
  },

  // Zerg matchups
  {
    id: 'zerg',
    urlParam: 'zerg',
    predicate: (replay, filters) => {
      const selectedMatchups = filters.zerg;
      if (!selectedMatchups || (Array.isArray(selectedMatchups) && selectedMatchups.length === 0)) {
        return true;
      }

      const matchups = Array.isArray(selectedMatchups) ? selectedMatchups : [String(selectedMatchups)];
      return matchups.includes(replay.matchup);
    },
  },

  // Protoss matchups
  {
    id: 'protoss',
    urlParam: 'protoss',
    predicate: (replay, filters) => {
      const selectedMatchups = filters.protoss;
      if (!selectedMatchups || (Array.isArray(selectedMatchups) && selectedMatchups.length === 0)) {
        return true;
      }

      const matchups = Array.isArray(selectedMatchups) ? selectedMatchups : [String(selectedMatchups)];
      return matchups.includes(replay.matchup);
    },
  },

  // Duration filter
  {
    id: 'duration',
    urlParam: 'duration',
    predicate: (replay, filters) => {
      const selectedDurations = filters.duration;
      if (!selectedDurations || (Array.isArray(selectedDurations) && selectedDurations.length === 0)) {
        return true;
      }

      const durations = Array.isArray(selectedDurations) ? selectedDurations : [String(selectedDurations)];
      const durationMinutes = parseDuration(replay.duration);

      return durations.some(range => {
        if (range === 'under10') return durationMinutes < 10;
        if (range === '10-20') return durationMinutes >= 10 && durationMinutes <= 20;
        if (range === '20-30') return durationMinutes > 20 && durationMinutes <= 30;
        if (range === 'over30') return durationMinutes > 30;
        return false;
      });
    },
  },

  // Access level filter
  createFilterField<Replay, 'accessLevel'>({
    id: 'accessLevel',
    urlParam: 'accessLevel',
    predicate: createBooleanPredicate('isFree', 'accessLevel', 'free', 'premium'),
  }),

  // MMR range filter
  {
    id: 'mmrRange',
    urlParam: 'mmrRange',
    predicate: (replay, filters) => {
      const mmrRange = filters.mmrRange;
      if (!mmrRange || (Array.isArray(mmrRange) && mmrRange.length === 0)) {
        return true;
      }

      const ranges = Array.isArray(mmrRange) ? mmrRange : [String(mmrRange)];

      // Get the higher MMR from both players (winner typically has higher MMR)
      const player1MMR = replay.player1.mmr || 0;
      const player2MMR = replay.player2.mmr || 0;
      const maxMMR = Math.max(player1MMR, player2MMR);

      // If no MMR data, don't filter it out
      if (maxMMR === 0) return true;

      return ranges.some(range => {
        if (range === 'under3000') return maxMMR < 3000;
        if (range === '3000-3900') return maxMMR >= 3000 && maxMMR < 3900;
        if (range === '3900-4500') return maxMMR >= 3900 && maxMMR < 4500;
        if (range === '4500-5400') return maxMMR >= 4500 && maxMMR < 5400;
        if (range === '5400-6000') return maxMMR >= 5400 && maxMMR < 6000;
        if (range === 'over6000') return maxMMR >= 6000;
        return false;
      });
    },
  },

  // Category filter (multi-category support)
  createFilterField<Replay, 'categories'>({
    id: 'categories',
    urlParam: 'categories',
    predicate: createCategoryPredicate('categories', 'categories'),
  }),
];

/**
 * Section configurations for the sidebar
 */
const sections: FilterSectionConfig<Replay>[] = [
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
    id: 'terran',
    title: 'Terran',
    type: 'checkbox',
    options: [
      { id: 'TvT', label: 'vs Terran' },
      { id: 'TvZ', label: 'vs Zerg' },
      { id: 'TvP', label: 'vs Protoss' },
    ],
  },
  {
    id: 'zerg',
    title: 'Zerg',
    type: 'checkbox',
    options: [
      { id: 'ZvT', label: 'vs Terran' },
      { id: 'ZvZ', label: 'vs Zerg' },
      { id: 'ZvP', label: 'vs Protoss' },
    ],
  },
  {
    id: 'protoss',
    title: 'Protoss',
    type: 'checkbox',
    options: [
      { id: 'PvT', label: 'vs Terran' },
      { id: 'PvZ', label: 'vs Zerg' },
      { id: 'PvP', label: 'vs Protoss' },
    ],
  },
  {
    id: 'duration',
    title: 'Duration',
    type: 'checkbox',
    options: [
      { id: 'under10', label: 'Under 10 min' },
      { id: '10-20', label: '10-20 min' },
      { id: '20-30', label: '20-30 min' },
      { id: 'over30', label: 'Over 30 min' },
    ],
  },
  {
    id: 'mmrRange',
    title: 'MMR Range',
    type: 'checkbox',
    options: [
      { id: 'under3000', label: '< 3000 (Bronze-Gold)' },
      { id: '3000-3900', label: '3000-3900 (Platinum)' },
      { id: '3900-4500', label: '3900-4500 (Diamond)' },
      { id: '4500-5400', label: '4500-5400 (Master)' },
      { id: '5400-6000', label: '5400-6000 (GM)' },
      { id: 'over6000', label: '6000+ (Top GM)' },
    ],
  },
  {
    id: 'categories',
    title: 'Categories',
    type: 'checkbox',
    getOptions: (replays) => {
      // Filter to only show categories/subcategories that have content
      const categoryCounts = new Map<string, number>();

      replays.forEach(replay => {
        if (replay.categories && Array.isArray(replay.categories)) {
          replay.categories.forEach(category => {
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
 * Complete replay filter configuration
 */
export const replayFilterConfig: FilterConfig<Replay> = {
  fields,
  sections,
  searchFields: ['title', 'player1', 'player2', 'map', 'coach'],
};
