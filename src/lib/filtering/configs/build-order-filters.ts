/**
 * Filter configuration for build order content.
 */

import type { BuildOrder } from '@/types/build-order';
import type { FilterConfig, FilterFieldConfig, FilterSectionConfig } from '../types';
import { createFilterField } from '../types';
import { createTagPredicate, createBooleanPredicate } from '../filter-engine';

/**
 * Filter field configurations
 */
const fields: FilterFieldConfig<BuildOrder>[] = [
  // Terran matchups
  {
    id: 'terran',
    urlParam: 'terran',
    predicate: (buildOrder, filters) => {
      const selectedMatchups = filters.terran;
      if (!selectedMatchups || (Array.isArray(selectedMatchups) && selectedMatchups.length === 0)) {
        return true;
      }

      const matchups = Array.isArray(selectedMatchups) ? selectedMatchups : [String(selectedMatchups)];

      return matchups.some(matchupId => {
        if (!matchupId.includes('-')) return false;
        const [race, matchup] = matchupId.split('-');
        const vsRace = matchup.substring(matchup.length - 1);
        const vsRaceMap: Record<string, string> = { t: 'terran', z: 'zerg', p: 'protoss' };
        return buildOrder.race === race && (buildOrder.vsRace === vsRaceMap[vsRace] || buildOrder.vsRace === 'all');
      });
    },
  },

  // Zerg matchups
  {
    id: 'zerg',
    urlParam: 'zerg',
    predicate: (buildOrder, filters) => {
      const selectedMatchups = filters.zerg;
      if (!selectedMatchups || (Array.isArray(selectedMatchups) && selectedMatchups.length === 0)) {
        return true;
      }

      const matchups = Array.isArray(selectedMatchups) ? selectedMatchups : [String(selectedMatchups)];

      return matchups.some(matchupId => {
        if (!matchupId.includes('-')) return false;
        const [race, matchup] = matchupId.split('-');
        const vsRace = matchup.substring(matchup.length - 1);
        const vsRaceMap: Record<string, string> = { t: 'terran', z: 'zerg', p: 'protoss' };
        return buildOrder.race === race && (buildOrder.vsRace === vsRaceMap[vsRace] || buildOrder.vsRace === 'all');
      });
    },
  },

  // Protoss matchups
  {
    id: 'protoss',
    urlParam: 'protoss',
    predicate: (buildOrder, filters) => {
      const selectedMatchups = filters.protoss;
      if (!selectedMatchups || (Array.isArray(selectedMatchups) && selectedMatchups.length === 0)) {
        return true;
      }

      const matchups = Array.isArray(selectedMatchups) ? selectedMatchups : [String(selectedMatchups)];

      return matchups.some(matchupId => {
        if (!matchupId.includes('-')) return false;
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
    id: 'terran',
    title: 'Terran',
    type: 'checkbox',
    options: [
      { id: 'terran-tvt', label: 'vs Terran' },
      { id: 'terran-tvz', label: 'vs Zerg' },
      { id: 'terran-tvp', label: 'vs Protoss' },
    ],
  },
  {
    id: 'zerg',
    title: 'Zerg',
    type: 'checkbox',
    options: [
      { id: 'zerg-zvt', label: 'vs Terran' },
      { id: 'zerg-zvz', label: 'vs Zerg' },
      { id: 'zerg-zvp', label: 'vs Protoss' },
    ],
  },
  {
    id: 'protoss',
    title: 'Protoss',
    type: 'checkbox',
    options: [
      { id: 'protoss-pvt', label: 'vs Terran' },
      { id: 'protoss-pvz', label: 'vs Zerg' },
      { id: 'protoss-pvp', label: 'vs Protoss' },
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
];

/**
 * Complete build order filter configuration
 */
export const buildOrderFilterConfig: FilterConfig<BuildOrder> = {
  fields,
  sections,
  searchFields: ['name', 'description', 'coach', 'tags'],
};
