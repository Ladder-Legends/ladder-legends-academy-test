/**
 * Tests for the useContentFiltering hook
 * Focuses on count aggregation for hierarchical filter options
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useContentFiltering } from '../use-content-filtering';
import type { FilterConfig } from '../../types';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null })),
}));

// Mock URL state hooks
vi.mock('../../url-state', () => ({
  useInitialFiltersFromUrl: vi.fn(() => ({
    initialFilters: {},
    initialSearch: '',
    initialTags: [],
  })),
  useSyncFiltersToUrl: vi.fn(),
}));

interface TestItem {
  id: string;
  race: string;
  matchup?: string;
  name: string;
}

describe('useContentFiltering - Count Aggregation', () => {
  const testItems: TestItem[] = [
    { id: '1', race: 'terran', matchup: 'TvT', name: 'TvT Build 1' },
    { id: '2', race: 'terran', matchup: 'TvZ', name: 'TvZ Build 1' },
    { id: '3', race: 'terran', matchup: 'TvP', name: 'TvP Build 1' },
    { id: '4', race: 'zerg', matchup: 'ZvT', name: 'ZvT Build 1' },
    { id: '5', race: 'zerg', matchup: 'ZvZ', name: 'ZvZ Build 1' },
    { id: '6', race: 'protoss', matchup: 'PvT', name: 'PvT Build 1' },
  ];

  const config: FilterConfig<TestItem> = {
    fields: [
      {
        id: 'matchups',
        predicate: (item, filters) => {
          const matchupFilter = filters.matchups;
          if (!matchupFilter || (Array.isArray(matchupFilter) && matchupFilter.length === 0)) {
            return true;
          }

          const filterArray = Array.isArray(matchupFilter) ? matchupFilter : [matchupFilter];
          return filterArray.includes(item.matchup || '');
        },
      },
    ],
    sections: [
      {
        id: 'matchups',
        title: 'Race & Matchups',
        type: 'checkbox',
        options: [
          {
            id: 'terran',
            label: 'Terran',
            children: [
              { id: 'TvT', label: 'vs Terran' },
              { id: 'TvZ', label: 'vs Zerg' },
              { id: 'TvP', label: 'vs Protoss' },
            ],
          },
          {
            id: 'zerg',
            label: 'Zerg',
            children: [
              { id: 'ZvT', label: 'vs Terran' },
              { id: 'ZvZ', label: 'vs Zerg' },
            ],
          },
          {
            id: 'protoss',
            label: 'Protoss',
            children: [
              { id: 'PvT', label: 'vs Terran' },
            ],
          },
        ],
      },
    ],
    searchFields: ['name'],
  };

  it('should aggregate counts from children to parent items', () => {
    const { result } = renderHook(() => useContentFiltering(testItems, config));

    waitFor(() => {
      const matchupSection = result.current.sections.find(s => s.id === 'matchups');
      expect(matchupSection).toBeDefined();

      if (matchupSection) {
        // Find parent items
        const terranOption = matchupSection.items.find(item => item.id === 'terran');
        const zergOption = matchupSection.items.find(item => item.id === 'zerg');
        const protossOption = matchupSection.items.find(item => item.id === 'protoss');

        // Parent items should have aggregated counts
        expect(terranOption?.count).toBe(3); // TvT + TvZ + TvP
        expect(zergOption?.count).toBe(2); // ZvT + ZvZ
        expect(protossOption?.count).toBe(1); // PvT

        // Children should have individual counts
        expect(terranOption?.children?.[0].count).toBe(1); // TvT
        expect(terranOption?.children?.[1].count).toBe(1); // TvZ
        expect(terranOption?.children?.[2].count).toBe(1); // TvP
        expect(zergOption?.children?.[0].count).toBe(1); // ZvT
        expect(zergOption?.children?.[1].count).toBe(1); // ZvZ
        expect(protossOption?.children?.[0].count).toBe(1); // PvT
      }
    });
  });

  it('should have zero count for parent with no matching children', () => {
    // Config with a parent that has no matching items
    const emptyParentConfig: FilterConfig<TestItem> = {
      ...config,
      sections: [
        {
          id: 'matchups',
          title: 'Race & Matchups',
          type: 'checkbox',
          options: [
            {
              id: 'random',
              label: 'Random',
              children: [
                { id: 'RvT', label: 'vs Terran' },
                { id: 'RvZ', label: 'vs Zerg' },
              ],
            },
          ],
        },
      ],
    };

    const { result } = renderHook(() => useContentFiltering(testItems, emptyParentConfig));

    waitFor(() => {
      const matchupSection = result.current.sections.find(s => s.id === 'matchups');
      const randomOption = matchupSection?.items.find(item => item.id === 'random');

      // Parent with no matching children should have count 0
      expect(randomOption?.count).toBe(0);
      expect(randomOption?.children?.[0].count).toBe(0);
      expect(randomOption?.children?.[1].count).toBe(0);
    });
  });

  it('should update parent counts when filters change', () => {
    const { result } = renderHook(() => useContentFiltering(testItems, config));

    waitFor(() => {
      // Initial state - all items counted
      let matchupSection = result.current.sections.find(s => s.id === 'matchups');
      let terranOption = matchupSection?.items.find(item => item.id === 'terran');
      expect(terranOption?.count).toBe(3);

      // Apply search filter
      result.current.setSearchQuery('TvT');

      // After search, only TvT matches
      matchupSection = result.current.sections.find(s => s.id === 'matchups');
      terranOption = matchupSection?.items.find(item => item.id === 'terran');
      expect(terranOption?.count).toBe(1); // Only TvT now
    });
  });

  it('should handle deeply nested hierarchies', () => {
    const nestedConfig: FilterConfig<TestItem> = {
      ...config,
      sections: [
        {
          id: 'matchups',
          title: 'Race & Matchups',
          type: 'checkbox',
          options: [
            {
              id: 'terran-group',
              label: 'Terran Builds',
              children: [
                {
                  id: 'terran',
                  label: 'Terran',
                  children: [
                    { id: 'TvT', label: 'vs Terran' },
                    { id: 'TvZ', label: 'vs Zerg' },
                    { id: 'TvP', label: 'vs Protoss' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const { result } = renderHook(() => useContentFiltering(testItems, nestedConfig));

    waitFor(() => {
      const matchupSection = result.current.sections.find(s => s.id === 'matchups');
      const terranGroup = matchupSection?.items.find(item => item.id === 'terran-group');
      const terranOption = terranGroup?.children?.find(item => item.id === 'terran');

      // Top-level parent should aggregate from all descendants
      expect(terranGroup?.count).toBe(3);

      // Mid-level parent should aggregate from immediate children
      expect(terranOption?.count).toBe(3);

      // Leaf nodes should have individual counts
      expect(terranOption?.children?.[0].count).toBe(1); // TvT
      expect(terranOption?.children?.[1].count).toBe(1); // TvZ
      expect(terranOption?.children?.[2].count).toBe(1); // TvP
    });
  });

  it('should not aggregate counts for items without children', () => {
    const flatConfig: FilterConfig<TestItem> = {
      ...config,
      sections: [
        {
          id: 'matchups',
          title: 'Matchups',
          type: 'checkbox',
          options: [
            { id: 'TvT', label: 'TvT' },
            { id: 'TvZ', label: 'TvZ' },
            { id: 'TvP', label: 'TvP' },
          ],
        },
      ],
    };

    const { result } = renderHook(() => useContentFiltering(testItems, flatConfig));

    waitFor(() => {
      const matchupSection = result.current.sections.find(s => s.id === 'matchups');

      // Each item should have its individual count, not aggregated
      expect(matchupSection?.items[0].count).toBe(1); // TvT
      expect(matchupSection?.items[1].count).toBe(1); // TvZ
      expect(matchupSection?.items[2].count).toBe(1); // TvP

      // No children should exist
      expect(matchupSection?.items[0].children).toBeUndefined();
      expect(matchupSection?.items[1].children).toBeUndefined();
      expect(matchupSection?.items[2].children).toBeUndefined();
    });
  });
});
