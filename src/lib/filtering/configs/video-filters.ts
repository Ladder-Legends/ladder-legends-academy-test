/**
 * Filter configuration for video content.
 * This defines all filtering logic for the video library.
 */

import type { Video } from '@/types/video';
import type { Coach } from '@/types/coach';
import type { FilterConfig, FilterFieldConfig, FilterSectionConfig, FilterState } from '../types';
import { createFilterField } from '../types';
import { createTagPredicate, createFieldMatchPredicate, createBooleanPredicate, validateFilterConfig } from '../filter-engine';
import { isOwner } from '@/lib/permissions';
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

  // General topic filters (tag-based)
  {
    id: 'general',
    urlParam: 'general',
    predicate: createTagPredicate('tags', 'general'),
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
    id: 'general',
    title: 'General',
    type: 'checkbox',
    getOptions: (videos, filters) => {
      const topics = ['mindset', 'fundamentals', 'meta', 'build order', 'micro', 'macro'];
      return topics.map(topic => ({
        id: topic,
        label: topic.charAt(0).toUpperCase() + topic.slice(1),
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
