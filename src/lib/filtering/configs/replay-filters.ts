/**
 * Filter configuration for replay content.
 */

import type { Replay } from '@/types/replay';
import type { FilterConfig, FilterFieldConfig, FilterSectionConfig } from '../types';
import { createFilterField } from '../types';
import { createBooleanPredicate } from '../filter-engine';

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
];

/**
 * Complete replay filter configuration
 */
export const replayFilterConfig: FilterConfig<Replay> = {
  fields,
  sections,
  searchFields: ['title', 'player1', 'player2', 'map', 'coach'],
};
