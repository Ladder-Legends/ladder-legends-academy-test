/**
 * Filter configuration for masterclass content.
 */

import type { Masterclass } from '@/types/masterclass';
import type { FilterConfig, FilterFieldConfig, FilterSectionConfig } from '../types';
import { createFilterField } from '../types';
import { createBooleanPredicate, createCategoryPredicate } from '../filter-engine';
import { getCategoryFilterOptions } from '@/lib/taxonomy';

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
      return masterclass.coach ? coaches.includes(masterclass.coach) : false;
    },
  },

  // Access level filter
  createFilterField<Masterclass, 'accessLevel'>({
    id: 'accessLevel',
    urlParam: 'accessLevel',
    predicate: createBooleanPredicate('isFree', 'accessLevel', 'free', 'premium'),
  }),

  // Category filter (hierarchical)
  createFilterField<Masterclass, 'categories'>({
    id: 'categories',
    urlParam: 'categories',
    predicate: createCategoryPredicate('primaryCategory', 'secondaryCategory', 'categories'),
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
    id: 'accessLevel',
    title: 'Access Level',
    type: 'checkbox',
    options: [
      { id: 'free', label: 'Free' },
      { id: 'premium', label: 'Premium' },
    ],
  },
  {
    id: 'coaches',
    title: 'Coach',
    type: 'checkbox',
    getOptions: (masterclasses) => {
      const coaches = new Set<string>();
      masterclasses.forEach(mc => {
        if (mc.coach) coaches.add(mc.coach);
      });
      return Array.from(coaches).sort().map(coach => ({
        id: coach,
        label: coach,
      }));
    },
  },
  {
    id: 'categories',
    title: 'Categories',
    type: 'checkbox',
    getOptions: (masterclasses) => {
      // Filter to only show categories/subcategories that have content
      const categoryCounts = new Map<string, number>();

      masterclasses.forEach(masterclass => {
        if (masterclass.primaryCategory) {
          const primaryKey = masterclass.primaryCategory;
          categoryCounts.set(primaryKey, (categoryCounts.get(primaryKey) || 0) + 1);

          if (masterclass.secondaryCategory) {
            const secondaryKey = `${masterclass.primaryCategory}.${masterclass.secondaryCategory}`;
            categoryCounts.set(secondaryKey, (categoryCounts.get(secondaryKey) || 0) + 1);
          }
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
 * Complete masterclass filter configuration
 */
export const masterclassFilterConfig: FilterConfig<Masterclass> = {
  fields,
  sections,
  searchFields: ['title', 'description', 'coach', 'race', 'tags'],
};
