/**
 * Filter configuration for masterclass content.
 */

import type { Masterclass } from '@/types/masterclass';
import type { FilterConfig, FilterFieldConfig, FilterSectionConfig } from '../types';
import { createFilterField } from '../types';
import { createBooleanPredicate } from '../filter-engine';

/**
 * Filter field configurations
 */
const fields: FilterFieldConfig<Masterclass>[] = [
  // Coach filter
  {
    id: 'coaches',
    urlParam: 'coaches',
    predicate: (masterclass, filters) => {
      const selectedCoaches = filters.coaches;
      if (!selectedCoaches || (Array.isArray(selectedCoaches) && selectedCoaches.length === 0)) {
        return true;
      }

      const coaches = Array.isArray(selectedCoaches) ? selectedCoaches : [String(selectedCoaches)];
      return coaches.includes(masterclass.coach);
    },
  },

  // Access level filter
  createFilterField<Masterclass, 'accessLevel'>({
    id: 'accessLevel',
    urlParam: 'accessLevel',
    predicate: createBooleanPredicate('isFree', 'accessLevel', 'free', 'premium'),
  }),
];

/**
 * Section configurations for the sidebar
 */
const sections: FilterSectionConfig<Masterclass>[] = [
  {
    id: 'search',
    title: 'Search',
    type: 'search',
  },
  {
    id: 'coaches',
    title: 'Coach',
    type: 'checkbox',
    getOptions: (masterclasses) => {
      const coaches = new Set<string>();
      masterclasses.forEach(mc => coaches.add(mc.coach));
      return Array.from(coaches).sort().map(coach => ({
        id: coach,
        label: coach,
      }));
    },
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
];

/**
 * Complete masterclass filter configuration
 */
export const masterclassFilterConfig: FilterConfig<Masterclass> = {
  fields,
  sections,
  searchFields: ['title', 'description', 'coach', 'race', 'tags'],
};
