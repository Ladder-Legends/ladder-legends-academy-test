import { describe, it, expect } from 'vitest';
import { applyChanges, fixVideoReferences, type Change, type FileInfo } from '../commit-logic';

describe('applyChanges', () => {
  describe('Array-based content types', () => {
    const mockFiles: Record<string, FileInfo> = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'mock-sha',
        content: [
          { id: 'video-1', title: 'Video 1' },
          { id: 'video-2', title: 'Video 2' },
        ],
      },
    };

    describe('create operation', () => {
      it('should add new item to array', () => {
        const changes: Change[] = [
          {
            id: 'video-3',
            contentType: 'videos',
            operation: 'create',
            data: { id: 'video-3', title: 'Video 3' },
          },
        ];

        const result = applyChanges(mockFiles, { videos: changes });

        expect(result.videos.content).toHaveLength(3);
        expect(result.videos.content).toContainEqual({ id: 'video-3', title: 'Video 3' });
      });

      it('should be idempotent (not add duplicate)', () => {
        const changes: Change[] = [
          {
            id: 'video-1',
            contentType: 'videos',
            operation: 'create',
            data: { id: 'video-1', title: 'Video 1 Updated' },
          },
        ];

        const result = applyChanges(mockFiles, { videos: changes });

        expect(result.videos.content).toHaveLength(2);
        expect(result.videos.content).toContainEqual({ id: 'video-1', title: 'Video 1' });
      });
    });

    describe('update operation', () => {
      it('should update existing item', () => {
        const changes: Change[] = [
          {
            id: 'video-1',
            contentType: 'videos',
            operation: 'update',
            data: { id: 'video-1', title: 'Video 1 Updated' },
          },
        ];

        const result = applyChanges(mockFiles, { videos: changes });

        expect(result.videos.content).toHaveLength(2);
        expect(result.videos.content).toContainEqual({ id: 'video-1', title: 'Video 1 Updated' });
      });

      it('should use upsert behavior when item does not exist', () => {
        const changes: Change[] = [
          {
            id: 'video-999',
            contentType: 'videos',
            operation: 'update',
            data: { id: 'video-999', title: 'New Video via Update' },
          },
        ];

        const result = applyChanges(mockFiles, { videos: changes });

        expect(result.videos.content).toHaveLength(3);
        expect(result.videos.content).toContainEqual({ id: 'video-999', title: 'New Video via Update' });
      });

      it('should not affect other items when updating', () => {
        const changes: Change[] = [
          {
            id: 'video-1',
            contentType: 'videos',
            operation: 'update',
            data: { id: 'video-1', title: 'Updated' },
          },
        ];

        const result = applyChanges(mockFiles, { videos: changes });

        expect(result.videos.content).toHaveLength(2);
        expect(result.videos.content).toContainEqual({ id: 'video-2', title: 'Video 2' });
      });
    });

    describe('delete operation', () => {
      it('should remove item from array', () => {
        const changes: Change[] = [
          {
            id: 'video-1',
            contentType: 'videos',
            operation: 'delete',
            data: { id: 'video-1' },
          },
        ];

        const result = applyChanges(mockFiles, { videos: changes });

        expect(result.videos.content).toHaveLength(1);
        expect(result.videos.content).not.toContainEqual({ id: 'video-1', title: 'Video 1' });
        expect(result.videos.content).toContainEqual({ id: 'video-2', title: 'Video 2' });
      });

      it('should be idempotent (not error if item does not exist)', () => {
        const changes: Change[] = [
          {
            id: 'video-999',
            contentType: 'videos',
            operation: 'delete',
            data: { id: 'video-999' },
          },
        ];

        const result = applyChanges(mockFiles, { videos: changes });

        expect(result.videos.content).toHaveLength(2);
      });
    });

    describe('batch operations', () => {
      it('should apply multiple changes in order', () => {
        const changes: Change[] = [
          {
            id: 'video-3',
            contentType: 'videos',
            operation: 'create',
            data: { id: 'video-3', title: 'Video 3' },
          },
          {
            id: 'video-1',
            contentType: 'videos',
            operation: 'update',
            data: { id: 'video-1', title: 'Video 1 Updated' },
          },
          {
            id: 'video-2',
            contentType: 'videos',
            operation: 'delete',
            data: { id: 'video-2' },
          },
        ];

        const result = applyChanges(mockFiles, { videos: changes });

        expect(result.videos.content).toHaveLength(2);
        expect(result.videos.content).toContainEqual({ id: 'video-1', title: 'Video 1 Updated' });
        expect(result.videos.content).toContainEqual({ id: 'video-3', title: 'Video 3' });
        expect(result.videos.content).not.toContainEqual(expect.objectContaining({ id: 'video-2' }));
      });
    });
  });

  describe('All content types', () => {
    const contentTypes = [
      'videos',
      'replays',
      'build-orders',
      'masterclasses',
      'events',
      'coaches',
    ] as const;

    contentTypes.forEach((contentType) => {
      describe(`${contentType}`, () => {
        const mockFiles: Record<string, FileInfo> = {
          [contentType]: {
            path: `src/data/${contentType}.json`,
            sha: 'mock-sha',
            content: [
              { id: 'item-1', name: 'Item 1' },
              { id: 'item-2', name: 'Item 2' },
            ],
          },
        };

        it('should create new item', () => {
          const changes: Change[] = [
            {
              id: 'item-3',
              contentType,
              operation: 'create',
              data: { id: 'item-3', name: 'Item 3' },
            },
          ];

          const result = applyChanges(mockFiles, { [contentType]: changes });

          expect(result[contentType].content).toHaveLength(3);
        });

        it('should update existing item', () => {
          const changes: Change[] = [
            {
              id: 'item-1',
              contentType,
              operation: 'update',
              data: { id: 'item-1', name: 'Updated' },
            },
          ];

          const result = applyChanges(mockFiles, { [contentType]: changes });

          expect(result[contentType].content).toHaveLength(2);
          expect(result[contentType].content).toContainEqual({ id: 'item-1', name: 'Updated' });
        });

        it('should upsert when updating non-existent item', () => {
          const changes: Change[] = [
            {
              id: 'item-999',
              contentType,
              operation: 'update',
              data: { id: 'item-999', name: 'Upserted' },
            },
          ];

          const result = applyChanges(mockFiles, { [contentType]: changes });

          expect(result[contentType].content).toHaveLength(3);
          expect(result[contentType].content).toContainEqual({ id: 'item-999', name: 'Upserted' });
        });

        it('should delete existing item', () => {
          const changes: Change[] = [
            {
              id: 'item-1',
              contentType,
              operation: 'delete',
              data: { id: 'item-1' },
            },
          ];

          const result = applyChanges(mockFiles, { [contentType]: changes });

          expect(result[contentType].content).toHaveLength(1);
          expect(result[contentType].content).not.toContainEqual(expect.objectContaining({ id: 'item-1' }));
        });
      });
    });
  });

  describe('Single-object content types', () => {
    const singleObjectTypes = ['about', 'privacy', 'terms', 'sponsorships'] as const;

    singleObjectTypes.forEach((contentType) => {
      describe(`${contentType}`, () => {
        const mockFiles: Record<string, FileInfo> = {
          [contentType]: {
            path: `src/data/${contentType}.json`,
            sha: 'mock-sha',
            content: { title: 'Original', content: 'Original content' },
          },
        };

        it('should update entire object', () => {
          const changes: Change[] = [
            {
              id: contentType,
              contentType,
              operation: 'update',
              data: { title: 'Updated', content: 'Updated content' },
            },
          ];

          const result = applyChanges(mockFiles, { [contentType]: changes });

          expect(result[contentType].content).toEqual({
            title: 'Updated',
            content: 'Updated content',
          });
        });

        it('should not support create operation', () => {
          const changes: Change[] = [
            {
              id: contentType,
              contentType,
              operation: 'create',
              data: { title: 'New', content: 'New content' },
            },
          ];

          const result = applyChanges(mockFiles, { [contentType]: changes });

          // Create is ignored for single-object types
          expect(result[contentType].content).toEqual({
            title: 'Original',
            content: 'Original content',
          });
        });
      });
    });
  });
});

describe('fixVideoReferences', () => {
  it('should remove invalid video IDs from build-orders', () => {
    const validVideoIds = new Set(['video-1', 'video-2']);
    const files: Record<string, FileInfo> = {
      'build-orders': {
        path: 'src/data/build-orders.json',
        sha: 'mock-sha',
        content: [
          { id: 'bo-1', videoIds: ['video-1', 'video-2', 'invalid-video'] },
          { id: 'bo-2', videoIds: ['video-1'] },
        ],
      },
      videos: {
        path: 'src/data/videos.json',
        sha: 'mock-sha',
        content: [{ id: 'video-1' }, { id: 'video-2' }],
      },
    };

    const result = fixVideoReferences(files, validVideoIds);

    expect(result['build-orders'].content).toEqual([
      { id: 'bo-1', videoIds: ['video-1', 'video-2'] },
      { id: 'bo-2', videoIds: ['video-1'] },
    ]);
  });

  it('should remove invalid video IDs from replays', () => {
    const validVideoIds = new Set(['video-1']);
    const files: Record<string, FileInfo> = {
      replays: {
        path: 'src/data/replays.json',
        sha: 'mock-sha',
        content: [{ id: 'replay-1', videoIds: ['video-1', 'invalid-video'] }],
      },
      videos: {
        path: 'src/data/videos.json',
        sha: 'mock-sha',
        content: [{ id: 'video-1' }],
      },
    };

    const result = fixVideoReferences(files, validVideoIds);

    expect(result.replays.content).toEqual([{ id: 'replay-1', videoIds: ['video-1'] }]);
  });

  it('should remove invalid video IDs from events', () => {
    const validVideoIds = new Set(['video-1']);
    const files: Record<string, FileInfo> = {
      events: {
        path: 'src/data/events.json',
        sha: 'mock-sha',
        content: [{ id: 'event-1', videoIds: ['video-1', 'invalid-video'] }],
      },
      videos: {
        path: 'src/data/videos.json',
        sha: 'mock-sha',
        content: [{ id: 'video-1' }],
      },
    };

    const result = fixVideoReferences(files, validVideoIds);

    expect(result.events.content).toEqual([{ id: 'event-1', videoIds: ['video-1'] }]);
  });

  it('should handle items with no videoIds', () => {
    const validVideoIds = new Set(['video-1']);
    const files: Record<string, FileInfo> = {
      replays: {
        path: 'src/data/replays.json',
        sha: 'mock-sha',
        content: [
          { id: 'replay-1', videoIds: [] },
          { id: 'replay-2' }, // no videoIds field
        ],
      },
      videos: {
        path: 'src/data/videos.json',
        sha: 'mock-sha',
        content: [{ id: 'video-1' }],
      },
    };

    const result = fixVideoReferences(files, validVideoIds);

    expect(result.replays.content).toEqual([
      { id: 'replay-1', videoIds: [] },
      { id: 'replay-2' },
    ]);
  });

  it('should not modify files without video references', () => {
    const validVideoIds = new Set(['video-1']);
    const files: Record<string, FileInfo> = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'mock-sha',
        content: [{ id: 'video-1' }],
      },
      coaches: {
        path: 'src/data/coaches.json',
        sha: 'mock-sha',
        content: [{ id: 'coach-1', name: 'Coach 1' }],
      },
    };

    const result = fixVideoReferences(files, validVideoIds);

    expect(result.coaches).toEqual(files.coaches);
  });

  it('should handle empty validVideoIds set', () => {
    const validVideoIds = new Set<string>();
    const files: Record<string, FileInfo> = {
      replays: {
        path: 'src/data/replays.json',
        sha: 'mock-sha',
        content: [{ id: 'replay-1', videoIds: ['video-1', 'video-2'] }],
      },
      videos: {
        path: 'src/data/videos.json',
        sha: 'mock-sha',
        content: [],
      },
    };

    const result = fixVideoReferences(files, validVideoIds);

    expect(result.replays.content).toEqual([{ id: 'replay-1', videoIds: [] }]);
  });
});
