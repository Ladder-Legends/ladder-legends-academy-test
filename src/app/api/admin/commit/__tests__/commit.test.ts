/**
 * Comprehensive tests for commit API logic
 * Tests reference cleanup, change application, and edge cases
 */

// We need to extract the pure functions from route.ts to test them
// For now, we'll create a separate testable module

import { fixVideoReferences, applyChanges } from '../commit-logic'

describe('Video Reference Cleanup', () => {
  describe('fixVideoReferences', () => {
    it('should remove invalid video IDs from build orders', () => {
      const files = {
        'build-orders': {
          path: 'src/data/build-orders.json',
          sha: 'test-sha',
          content: [
            {
              id: 'bo-1',
              name: '5-1-1 Tank Push',
              videoIds: ['valid-video-1', 'invalid-video-1', 'valid-video-2'],
            },
            {
              id: 'bo-2',
              name: '2-1-1',
              videoIds: ['valid-video-1'],
            },
          ],
        },
      }

      const validVideoIds = new Set(['valid-video-1', 'valid-video-2'])

      const result = fixVideoReferences(files, validVideoIds)

      expect(result['build-orders'].content[0].videoIds).toEqual([
        'valid-video-1',
        'valid-video-2',
      ])
      expect(result['build-orders'].content[1].videoIds).toEqual(['valid-video-1'])
    })

    it('should remove invalid video IDs from replays', () => {
      const files = {
        replays: {
          path: 'src/data/replays.json',
          sha: 'test-sha',
          content: [
            {
              id: 'replay-1',
              title: 'TvP Ladder Game',
              videoIds: ['invalid-video-1', 'invalid-video-2'],
            },
          ],
        },
      }

      const validVideoIds = new Set(['valid-video-1'])

      const result = fixVideoReferences(files, validVideoIds)

      expect(result.replays.content[0].videoIds).toEqual([])
    })

    it('should remove invalid video IDs from events', () => {
      const files = {
        events: {
          path: 'src/data/events.json',
          sha: 'test-sha',
          content: [
            {
              id: 'event-1',
              title: 'Coaching Session',
              videoIds: ['valid-video-1', 'invalid-video-1'],
            },
          ],
        },
      }

      const validVideoIds = new Set(['valid-video-1'])

      const result = fixVideoReferences(files, validVideoIds)

      expect(result.events.content[0].videoIds).toEqual(['valid-video-1'])
    })

    it('should handle items with no videoIds field', () => {
      const files = {
        'build-orders': {
          path: 'src/data/build-orders.json',
          sha: 'test-sha',
          content: [
            {
              id: 'bo-1',
              name: 'Build Order',
              // No videoIds field
            },
          ],
        },
      }

      const validVideoIds = new Set(['valid-video-1'])

      const result = fixVideoReferences(files, validVideoIds)

      expect(result['build-orders'].content[0]).not.toHaveProperty('videoIds')
    })

    it('should handle items with empty videoIds array', () => {
      const files = {
        'build-orders': {
          path: 'src/data/build-orders.json',
          sha: 'test-sha',
          content: [
            {
              id: 'bo-1',
              name: 'Build Order',
              videoIds: [],
            },
          ],
        },
      }

      const validVideoIds = new Set(['valid-video-1'])

      const result = fixVideoReferences(files, validVideoIds)

      expect(result['build-orders'].content[0].videoIds).toEqual([])
    })

    it('should not modify items with all valid video IDs', () => {
      const files = {
        'build-orders': {
          path: 'src/data/build-orders.json',
          sha: 'test-sha',
          content: [
            {
              id: 'bo-1',
              name: 'Build Order',
              videoIds: ['valid-video-1', 'valid-video-2'],
            },
          ],
        },
      }

      const validVideoIds = new Set(['valid-video-1', 'valid-video-2', 'valid-video-3'])

      const result = fixVideoReferences(files, validVideoIds)

      expect(result['build-orders'].content[0].videoIds).toEqual([
        'valid-video-1',
        'valid-video-2',
      ])
    })

    it('should handle multiple content types simultaneously', () => {
      const files = {
        'build-orders': {
          path: 'src/data/build-orders.json',
          sha: 'test-sha',
          content: [
            {
              id: 'bo-1',
              name: 'Build Order',
              videoIds: ['valid-video-1', 'invalid-video-1'],
            },
          ],
        },
        replays: {
          path: 'src/data/replays.json',
          sha: 'test-sha',
          content: [
            {
              id: 'replay-1',
              title: 'Replay',
              videoIds: ['invalid-video-2'],
            },
          ],
        },
        events: {
          path: 'src/data/events.json',
          sha: 'test-sha',
          content: [
            {
              id: 'event-1',
              title: 'Event',
              videoIds: ['valid-video-1'],
            },
          ],
        },
      }

      const validVideoIds = new Set(['valid-video-1'])

      const result = fixVideoReferences(files, validVideoIds)

      expect(result['build-orders'].content[0].videoIds).toEqual(['valid-video-1'])
      expect(result.replays.content[0].videoIds).toEqual([])
      expect(result.events.content[0].videoIds).toEqual(['valid-video-1'])
    })
  })
})

describe('Apply Changes', () => {
  describe('applyChanges', () => {
    it('should create new items', () => {
      const files = {
        videos: {
          path: 'src/data/videos.json',
          sha: 'test-sha',
          content: [],
        },
      }

      const changesByType = {
        videos: [
          {
            id: 'video-1',
            contentType: 'videos' as const,
            operation: 'create' as const,
            data: {
              id: 'video-1',
              title: 'New Video',
            },
          },
        ],
      }

      const result = applyChanges(files, changesByType)

      expect(result.videos.content).toHaveLength(1)
      expect(result.videos.content[0]).toEqual({
        id: 'video-1',
        title: 'New Video',
      })
    })

    it('should update existing items', () => {
      const files = {
        videos: {
          path: 'src/data/videos.json',
          sha: 'test-sha',
          content: [
            {
              id: 'video-1',
              title: 'Old Title',
              description: 'Old Description',
            },
          ],
        },
      }

      const changesByType = {
        videos: [
          {
            id: 'video-1',
            contentType: 'videos' as const,
            operation: 'update' as const,
            data: {
              id: 'video-1',
              title: 'New Title',
              description: 'New Description',
            },
          },
        ],
      }

      const result = applyChanges(files, changesByType)

      expect(result.videos.content).toHaveLength(1)
      expect(result.videos.content[0]).toEqual({
        id: 'video-1',
        title: 'New Title',
        description: 'New Description',
      })
    })

    it('should delete items', () => {
      const files = {
        videos: {
          path: 'src/data/videos.json',
          sha: 'test-sha',
          content: [
            { id: 'video-1', title: 'Video 1' },
            { id: 'video-2', title: 'Video 2' },
          ],
        },
      }

      const changesByType = {
        videos: [
          {
            id: 'video-1',
            contentType: 'videos' as const,
            operation: 'delete' as const,
            data: {
              id: 'video-1',
            },
          },
        ],
      }

      const result = applyChanges(files, changesByType)

      expect(result.videos.content).toHaveLength(1)
      expect(result.videos.content[0].id).toBe('video-2')
    })

    it('should be idempotent for create operations', () => {
      const files = {
        videos: {
          path: 'src/data/videos.json',
          sha: 'test-sha',
          content: [
            { id: 'video-1', title: 'Existing Video' },
          ],
        },
      }

      const changesByType = {
        videos: [
          {
            id: 'video-1',
            contentType: 'videos' as const,
            operation: 'create' as const,
            data: {
              id: 'video-1',
              title: 'New Video',
            },
          },
        ],
      }

      const result = applyChanges(files, changesByType)

      // Should not create duplicate
      expect(result.videos.content).toHaveLength(1)
      expect(result.videos.content[0].title).toBe('Existing Video')
    })

    it('should handle single-object content types (about, privacy, terms)', () => {
      const files = {
        about: {
          path: 'src/data/about.json',
          sha: 'test-sha',
          content: {
            title: 'Old About',
            content: 'Old content',
          },
        },
      }

      const changesByType = {
        about: [
          {
            id: 'about',
            contentType: 'about' as const,
            operation: 'update' as const,
            data: {
              title: 'New About',
              content: 'New content',
            },
          },
        ],
      }

      const result = applyChanges(files, changesByType)

      expect(result.about.content).toEqual({
        title: 'New About',
        content: 'New content',
      })
    })

    it('should handle multiple operations in sequence', () => {
      const files = {
        videos: {
          path: 'src/data/videos.json',
          sha: 'test-sha',
          content: [
            { id: 'video-1', title: 'Video 1' },
          ],
        },
      }

      const changesByType = {
        videos: [
          {
            id: 'video-2',
            contentType: 'videos' as const,
            operation: 'create' as const,
            data: { id: 'video-2', title: 'Video 2' },
          },
          {
            id: 'video-1',
            contentType: 'videos' as const,
            operation: 'update' as const,
            data: { id: 'video-1', title: 'Updated Video 1' },
          },
          {
            id: 'video-3',
            contentType: 'videos' as const,
            operation: 'create' as const,
            data: { id: 'video-3', title: 'Video 3' },
          },
        ],
      }

      const result = applyChanges(files, changesByType)

      expect(result.videos.content).toHaveLength(3)
      expect(result.videos.content.find(v => v.id === 'video-1')?.title).toBe('Updated Video 1')
      expect(result.videos.content.find(v => v.id === 'video-2')).toBeDefined()
      expect(result.videos.content.find(v => v.id === 'video-3')).toBeDefined()
    })
  })
})

describe('ID Persistence and Reference Integrity', () => {
  it('should NOT change ID during update operations', () => {
    const files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          {
            id: 'original-id',
            title: 'Original Title',
            muxAssetId: 'abc123',
            muxPlaybackId: 'xyz789'
          },
        ],
      },
    }

    const changesByType = {
      videos: [
        {
          id: 'original-id',
          contentType: 'videos' as const,
          operation: 'update' as const,
          data: {
            id: 'original-id', // MUST be the same ID
            title: 'Updated Title',
            muxAssetId: 'abc123',
            muxPlaybackId: 'xyz789',
            description: 'New description',
          },
        },
      ],
    }

    const result = applyChanges(files, changesByType)

    // ID must remain unchanged
    expect(result.videos.content).toHaveLength(1)
    expect(result.videos.content[0].id).toBe('original-id')
    expect(result.videos.content[0].title).toBe('Updated Title')
  })

  it('should preserve existing references during video updates', () => {
    const files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          { id: 'video-1', title: 'Video 1' },
        ],
      },
      'build-orders': {
        path: 'src/data/build-orders.json',
        sha: 'test-sha',
        content: [
          {
            id: 'bo-1',
            name: 'Build Order 1',
            videoIds: ['video-1'],
          },
        ],
      },
    }

    // Update video metadata (title, description, etc)
    const changesByType = {
      videos: [
        {
          id: 'video-1',
          contentType: 'videos' as const,
          operation: 'update' as const,
          data: {
            id: 'video-1', // Same ID
            title: 'Updated Video Title',
            description: 'New description',
          },
        },
      ],
    }

    const result = applyChanges(files, changesByType)

    // Video ID should not change
    expect(result.videos.content[0].id).toBe('video-1')

    // Build order reference should still be valid
    const validVideoIds = new Set(result.videos.content.map((v: any) => v.id))
    const cleaned = fixVideoReferences(result, validVideoIds)

    expect(cleaned['build-orders'].content[0].videoIds).toEqual(['video-1'])
  })

  it('should preserve browser URLs when editing content', () => {
    // This test ensures that /videos/[id], /build-orders/[id], etc. URLs remain valid
    const files = {
      replays: {
        path: 'src/data/replays.json',
        sha: 'test-sha',
        content: [
          {
            id: 'replay-abc123',
            title: 'TvP Ladder Game',
            coach: 'nico'
          },
        ],
      },
    }

    const changesByType = {
      replays: [
        {
          id: 'replay-abc123',
          contentType: 'replays' as const,
          operation: 'update' as const,
          data: {
            id: 'replay-abc123', // ID MUST NOT CHANGE
            title: 'Updated Title',
            coach: 'nico',
            description: 'Added analysis notes',
          },
        },
      ],
    }

    const result = applyChanges(files, changesByType)

    // ID must remain the same so /replays/replay-abc123 still works
    expect(result.replays.content[0].id).toBe('replay-abc123')
    expect(result.replays.content[0].title).toBe('Updated Title')
  })
})

describe('Reference Unlinking vs Deletion', () => {
  it('should NOT delete video when removing it from a build order', () => {
    const files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          { id: 'video-1', title: 'Video 1' },
          { id: 'video-2', title: 'Video 2' },
        ],
      },
      'build-orders': {
        path: 'src/data/build-orders.json',
        sha: 'test-sha',
        content: [
          {
            id: 'bo-1',
            name: 'Build Order 1',
            videoIds: ['video-1', 'video-2'],
          },
        ],
      },
    }

    // Update build order to remove video-2 from its videoIds
    const changesByType = {
      'build-orders': [
        {
          id: 'bo-1',
          contentType: 'build-orders' as const,
          operation: 'update' as const,
          data: {
            id: 'bo-1',
            name: 'Build Order 1',
            videoIds: ['video-1'], // Removed video-2
          },
        },
      ],
    }

    const result = applyChanges(files, changesByType)

    // Video should still exist - only the reference was removed
    expect(result.videos.content).toHaveLength(2)
    expect(result.videos.content.find((v: any) => v.id === 'video-2')).toBeDefined()

    // Build order should have only video-1
    expect(result['build-orders'].content[0].videoIds).toEqual(['video-1'])
  })

  it('should NOT delete video when removing it from a replay', () => {
    const files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          { id: 'video-1', title: 'Video 1' },
        ],
      },
      replays: {
        path: 'src/data/replays.json',
        sha: 'test-sha',
        content: [
          {
            id: 'replay-1',
            title: 'Replay',
            videoIds: ['video-1'],
          },
        ],
      },
    }

    // Update replay to remove all videos
    const changesByType = {
      replays: [
        {
          id: 'replay-1',
          contentType: 'replays' as const,
          operation: 'update' as const,
          data: {
            id: 'replay-1',
            title: 'Replay',
            videoIds: [], // Removed all videos
          },
        },
      ],
    }

    const result = applyChanges(files, changesByType)

    // Video should still exist
    expect(result.videos.content).toHaveLength(1)
    expect(result.videos.content[0].id).toBe('video-1')

    // Replay should have no videos
    expect(result.replays.content[0].videoIds).toEqual([])
  })

  it('should NOT delete video when removing it from an event', () => {
    const files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          { id: 'video-1', title: 'Video 1' },
          { id: 'video-2', title: 'Video 2' },
        ],
      },
      events: {
        path: 'src/data/events.json',
        sha: 'test-sha',
        content: [
          {
            id: 'event-1',
            title: 'Event',
            videoIds: ['video-1', 'video-2'],
          },
        ],
      },
    }

    // Update event to keep only video-1
    const changesByType = {
      events: [
        {
          id: 'event-1',
          contentType: 'events' as const,
          operation: 'update' as const,
          data: {
            id: 'event-1',
            title: 'Event',
            videoIds: ['video-1'], // Removed video-2
          },
        },
      ],
    }

    const result = applyChanges(files, changesByType)

    // Both videos should still exist
    expect(result.videos.content).toHaveLength(2)
    expect(result.videos.content.find((v: any) => v.id === 'video-2')).toBeDefined()

    // Event should have only video-1
    expect(result.events.content[0].videoIds).toEqual(['video-1'])
  })

  it('should ONLY delete video when explicitly deleting via videos contentType', () => {
    const files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          { id: 'video-1', title: 'Video 1' },
          { id: 'video-2', title: 'Video 2' },
        ],
      },
      'build-orders': {
        path: 'src/data/build-orders.json',
        sha: 'test-sha',
        content: [
          {
            id: 'bo-1',
            name: 'Build Order',
            videoIds: ['video-1'],
          },
        ],
      },
    }

    // Explicitly delete video-1
    const changesByType = {
      videos: [
        {
          id: 'video-1',
          contentType: 'videos' as const,
          operation: 'delete' as const,
          data: { id: 'video-1' },
        },
      ],
    }

    const result = applyChanges(files, changesByType)

    // Video should be deleted
    expect(result.videos.content).toHaveLength(1)
    expect(result.videos.content[0].id).toBe('video-2')

    // Build order still has the reference (will be cleaned up by fixVideoReferences)
    expect(result['build-orders'].content[0].videoIds).toEqual(['video-1'])

    // After cleanup, invalid reference should be removed
    const validVideoIds = new Set(result.videos.content.map((v: any) => v.id))
    const cleaned = fixVideoReferences(result, validVideoIds)
    expect(cleaned['build-orders'].content[0].videoIds).toEqual([])
  })

  it('should handle masterclasses with video references', () => {
    const files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          { id: 'video-1', title: 'Video 1' },
        ],
      },
      masterclasses: {
        path: 'src/data/masterclasses.json',
        sha: 'test-sha',
        content: [
          {
            id: 'mc-1',
            title: 'Masterclass',
            videoIds: ['video-1'],
          },
        ],
      },
    }

    // Remove video from masterclass (unlink, not delete)
    const changesByType = {
      masterclasses: [
        {
          id: 'mc-1',
          contentType: 'masterclasses' as const,
          operation: 'update' as const,
          data: {
            id: 'mc-1',
            title: 'Masterclass',
            videoIds: [], // Unlinked video
          },
        },
      ],
    }

    const result = applyChanges(files, changesByType)

    // Video should still exist
    expect(result.videos.content).toHaveLength(1)
    expect(result.videos.content[0].id).toBe('video-1')

    // Masterclass should have no videos
    expect(result.masterclasses.content[0].videoIds).toEqual([])
  })
})

describe('Integration: Reference Cleanup + Apply Changes', () => {
  it('should clean up references after video deletion', () => {
    // Start with videos and build orders
    let files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          { id: 'video-1', title: 'Video 1' },
          { id: 'video-2', title: 'Video 2' },
        ],
      },
      'build-orders': {
        path: 'src/data/build-orders.json',
        sha: 'test-sha',
        content: [
          {
            id: 'bo-1',
            name: 'Build Order 1',
            videoIds: ['video-1', 'video-2'],
          },
        ],
      },
    }

    // Delete video-2
    const changesByType = {
      videos: [
        {
          id: 'video-2',
          contentType: 'videos' as const,
          operation: 'delete' as const,
          data: { id: 'video-2' },
        },
      ],
    }

    // Apply the deletion
    files = applyChanges(files, changesByType)

    // Now clean up references
    const validVideoIds = new Set(files.videos.content.map((v: any) => v.id))
    const cleaned = fixVideoReferences(files, validVideoIds)

    // Build order should only reference video-1 now
    expect(cleaned['build-orders'].content[0].videoIds).toEqual(['video-1'])
  })

  it('should handle video recreation with new ID (YouTube -> Mux)', () => {
    // Start state: old YouTube video
    let files = {
      videos: {
        path: 'src/data/videos.json',
        sha: 'test-sha',
        content: [
          { id: 'old-youtube-id', title: '5-1-1 Tank Push', source: 'youtube' },
        ],
      },
      'build-orders': {
        path: 'src/data/build-orders.json',
        sha: 'test-sha',
        content: [
          {
            id: 'bo-1',
            name: '5-1-1 Tank Push',
            videoIds: ['old-youtube-id'],
          },
        ],
      },
    }

    // Delete old video and create new Mux video
    const changesByType = {
      videos: [
        {
          id: 'old-youtube-id',
          contentType: 'videos' as const,
          operation: 'delete' as const,
          data: { id: 'old-youtube-id' },
        },
        {
          id: 'new-mux-id',
          contentType: 'videos' as const,
          operation: 'create' as const,
          data: { id: 'new-mux-id', title: '5-1-1 Tank Push', source: 'mux' },
        },
      ],
    }

    // Apply changes
    files = applyChanges(files, changesByType)

    // Clean up references
    const validVideoIds = new Set(files.videos.content.map((v: any) => v.id))
    const cleaned = fixVideoReferences(files, validVideoIds)

    // Old reference should be removed
    expect(cleaned['build-orders'].content[0].videoIds).toEqual([])

    // In real app, user would manually add new-mux-id
  })
})
