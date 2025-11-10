/**
 * Filter configuration for video content.
 * This defines all filtering logic for the video library.
 */

import type { Video } from '@/types/video';
import type { Coach } from '@/types/coach';
import type { FilterConfig, FilterFieldConfig, FilterSectionConfig, FilterState } from '../types';
import { createFilterField } from '../types';
import { createTagPredicate, createFieldMatchPredicate, createBooleanPredicate, createCategoryPredicate, validateFilterConfig } from '../filter-engine';
import { isOwner } from '@/lib/permissions';
import { getCategoryFilterOptions } from '@/lib/taxonomy';
import coachesData from '@/data/coaches.json';

const allCoaches = coachesData as Coach[];
const activeCoachIds = allCoaches.filter(c => c.isActive !== false).map(c => c.id);
const inactiveCoachIds = allCoaches.filter(c => c.isActive === false).map(c => c.id);

/**
 * Filter field configurations
 */
const fields: FilterFieldConfig<Video>[] = [
  // Race filters (tag-based)
  {
    id: 'races',
    urlParam: 'races',
    predicate: createTagPredicate('tags', 'races'),
  },

  // Coach filter (coachId field-based)
  {
    id: 'coaches',
    urlParam: 'coaches',
    predicate: (video, filters) => {
      const selectedCoaches = filters.coaches;
      if (!selectedCoaches || (Array.isArray(selectedCoaches) && selectedCoaches.length === 0)) {
        return true;
      }

      const coachIds = Array.isArray(selectedCoaches) ? selectedCoaches : [String(selectedCoaches)];
      return coachIds.some(id => video.coachId?.toLowerCase() === String(id).toLowerCase());
    },
    // Sanitize coach IDs - remove inactive coaches for non-owners
    sanitizeValue: (value, session) => {
      if (!value) return value;

      const coachIds = Array.isArray(value) ? value.map(String) : [String(value)];

      // Owners can see all coaches
      if (isOwner(session)) {
        return coachIds;
      }

      // Non-owners only see active coaches
      return coachIds.filter(id => activeCoachIds.includes(id));
    },
  },

  // Access level filter (free vs premium)
  createFilterField<Video, 'accessLevel'>({
    id: 'accessLevel',
    urlParam: 'accessLevel', // Type-safe: must match id!
    predicate: createBooleanPredicate('isFree', 'accessLevel', 'free', 'premium'),
  }),

  // Category filter (multi-category support)
  createFilterField<Video, 'categories'>({
    id: 'categories',
    urlParam: 'categories',
    predicate: createCategoryPredicate('categories', 'categories'),
  }),
];

/**
 * Section configurations for the sidebar
 */
const sections: FilterSectionConfig<Video>[] = [
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
    id: 'races',
    title: 'Race-Specific',
    type: 'checkbox',
    options: [
      { id: 'terran', label: 'Terran' },
      { id: 'zerg', label: 'Zerg' },
      { id: 'protoss', label: 'Protoss' },
    ],
  },
  {
    id: 'categories',
    title: 'Categories',
    type: 'checkbox',
    getOptions: (videos) => {
      // Filter to only show categories/subcategories that have content
      const categoryCounts = new Map<string, number>();

      videos.forEach(video => {
        if (video.categories && Array.isArray(video.categories)) {
          video.categories.forEach(category => {
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
  {
    id: 'coaches',
    title: 'Coaches',
    type: 'checkbox',
    getOptions: (videos, filters) => {
      const formatCoachName = (coachId: string): string => {
        const video = videos.find(v => v.coachId === coachId);
        return video?.coach || coachId;
      };

      return activeCoachIds.map(coachId => ({
        id: coachId,
        label: formatCoachName(coachId),
      }));
    },
  },
];

/**
 * Complete video filter configuration
 */
export const videoFilterConfig: FilterConfig<Video> = {
  fields,
  sections,
  searchFields: ['title', 'description', 'coach', 'tags'],
  // Only show active coaches' content to non-owners
  // (Content from inactive coaches is still visible, they just don't appear in filters)
  // This is intentionally empty - we handle coach visibility in the sanitizeValue function
};
