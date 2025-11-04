'use client';

import { useMemo } from 'react';
import { usePendingChanges, ContentType } from '@/hooks/use-pending-changes';

/**
 * Merges static JSON data with pending changes from localStorage
 * This allows modals to see newly created content before it's committed to GitHub
 */
export function useMergedContent<T extends { id: string }>(
  staticData: T[],
  contentType: ContentType
): T[] {
  const { changes } = usePendingChanges();

  return useMemo(() => {
    // Start with static data
    const merged = [...staticData];

    // Get pending changes for this content type
    const relevantChanges = changes.filter(c => c.contentType === contentType);

    // Apply each change
    for (const change of relevantChanges) {
      const index = merged.findIndex(item => item.id === change.id);

      if (change.operation === 'delete') {
        // Remove deleted items
        if (index !== -1) {
          merged.splice(index, 1);
        }
      } else if (change.operation === 'create') {
        // Add new items if not already present
        if (index === -1) {
          merged.push(change.data as T);
        }
      } else if (change.operation === 'update') {
        // Update existing items
        if (index !== -1) {
          merged[index] = change.data as T;
        } else {
          // If updating an item that doesn't exist in static data, add it
          merged.push(change.data as T);
        }
      }
    }

    return merged;
  }, [staticData, changes, contentType]);
}
