/**
 * Extracted pure functions from commit route for testing
 * These functions have no side effects and are easily testable
 */

type ContentType = 'build-orders' | 'replays' | 'masterclasses' | 'videos' | 'coaches' | 'about' | 'privacy' | 'terms' | 'events' | 'file' | 'sponsorships';
type Operation = 'create' | 'update' | 'delete';

// Content types that are single objects (not arrays)
const SINGLE_OBJECT_TYPES: ContentType[] = ['about', 'privacy', 'terms', 'sponsorships'];

export interface Change {
  id: string;
  contentType: ContentType;
  operation: Operation;
  data: Record<string, unknown>;
}

export interface FileInfo {
  path: string;
  sha: string;
  content: Record<string, unknown>[] | Record<string, unknown>;
}

/**
 * Fixes references to videos in build orders, replays, and events
 * Removes invalid video IDs and logs warnings
 */
export function fixVideoReferences(
  files: Record<string, FileInfo>,
  validVideoIds: Set<string>
): Record<string, FileInfo> {
  const updatedFiles = { ...files };
  const typesToFix = ['build-orders', 'replays', 'events'] as const;

  for (const contentType of typesToFix) {
    if (!updatedFiles[contentType]) continue;

    const content = updatedFiles[contentType].content as Record<string, unknown>[];
    let fixedCount = 0;

    const fixedContent = content.map((item: Record<string, unknown>) => {
      const videoIds = item.videoIds as string[] | undefined;
      if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
        return item;
      }

      const validIds = videoIds.filter(id => validVideoIds.has(id));

      if (validIds.length !== videoIds.length) {
        const invalidIds = videoIds.filter(id => !validVideoIds.has(id));
        console.log(
          `[REFERENCE CLEANUP] Fixed ${contentType}/${item.id}: ` +
          `removed ${invalidIds.length} invalid video reference(s): ${invalidIds.join(', ')}`
        );
        fixedCount++;
      }

      return {
        ...item,
        videoIds: validIds,
      };
    });

    if (fixedCount > 0) {
      console.log(`[REFERENCE CLEANUP] Fixed ${fixedCount} ${contentType} item(s) with invalid video references`);
      updatedFiles[contentType] = {
        ...updatedFiles[contentType],
        content: fixedContent,
      };
    }
  }

  return updatedFiles;
}

/**
 * Applies changes to file contents (pure function - easily testable!)
 */
export function applyChanges(
  files: Record<string, FileInfo>,
  changesByType: Partial<Record<ContentType, Change[]>>
): Record<string, FileInfo> {
  const updatedFiles = { ...files };

  for (const [contentType, typeChanges] of Object.entries(changesByType)) {
    // Check if this is a single-object type (about, privacy, terms, etc.)
    if (SINGLE_OBJECT_TYPES.includes(contentType as ContentType)) {
      // Single object content types - just replace the whole object
      for (const change of typeChanges) {
        if (change.operation === 'update') {
          updatedFiles[contentType] = {
            ...updatedFiles[contentType],
            content: change.data,
          };
        }
      }
      continue;
    }

    // Array-based content (videos, build-orders, replays, etc.)
    let updatedContent = [...(updatedFiles[contentType].content as Record<string, unknown>[])];

    for (const change of typeChanges) {
      switch (change.operation) {
        case 'create':
          // Only add if it doesn't already exist (idempotent)
          if (!updatedContent.some((item: Record<string, unknown>) => item.id === change.data.id)) {
            updatedContent = [...updatedContent, change.data];
          }
          break;

        case 'update':
          // Check if item exists
          const itemExists = updatedContent.some((item: Record<string, unknown>) => item.id === change.data.id);
          if (itemExists) {
            // Update existing item
            updatedContent = updatedContent.map((item: Record<string, unknown>) =>
              item.id === change.data.id ? change.data : item
            );
          } else {
            // Item doesn't exist - add it (upsert behavior)
            console.warn(`[UPSERT] Item ${change.data.id} not found in ${contentType}, creating instead`);
            updatedContent = [...updatedContent, change.data];
          }
          break;

        case 'delete':
          updatedContent = updatedContent.filter((item: Record<string, unknown>) =>
            item.id !== change.data.id
          );
          break;

        default:
          throw new Error(`Invalid operation: ${change.operation}`);
      }
    }

    updatedFiles[contentType] = {
      ...updatedFiles[contentType],
      content: updatedContent,
    };
  }

  return updatedFiles;
}
