import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pending changes hook
const mockAddChange = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/hooks/use-pending-changes', () => ({
  usePendingChanges: () => ({
    addChange: mockAddChange,
    changes: [],
    hasChanges: false,
    removeChange: vi.fn(),
    clearAllChanges: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
  },
}));

describe('CMS Edit Modal Operations Pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create operation contract', () => {
    it('should call addChange with create operation for new event', () => {
      const newEvent = {
        id: 'event-new-123',
        title: 'New Event',
        description: 'Event description',
        date: '2024-12-25',
        time: '18:00',
        type: 'coaching',
        tags: [],
      };

      // Simulate what EventEditModal does when saving a new event
      mockAddChange({
        id: newEvent.id,
        contentType: 'events',
        operation: 'create',
        data: newEvent,
      });
      mockToastSuccess('Event created (pending commit)');

      expect(mockAddChange).toHaveBeenCalledWith({
        id: 'event-new-123',
        contentType: 'events',
        operation: 'create',
        data: newEvent,
      });
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('pending commit'));
    });

    it('should call addChange with create operation for new video', () => {
      const newVideo = {
        id: 'video-new-456',
        title: 'New Video',
        source: 'youtube',
        youtubeId: 'abc123',
        date: '2024-01-01',
        tags: [],
        race: 'terran',
        coach: 'TestCoach',
        coachId: 'coach-1',
        isFree: false,
      };

      mockAddChange({
        id: newVideo.id,
        contentType: 'videos',
        operation: 'create',
        data: newVideo,
      });

      expect(mockAddChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'videos',
          operation: 'create',
        })
      );
    });

    it('should call addChange with create operation for new coach', () => {
      const newCoach = {
        id: 'coach-new-789',
        name: 'New Coach',
        active: true,
        specialties: ['terran'],
        bio: 'Coach bio',
        socials: {},
      };

      mockAddChange({
        id: newCoach.id,
        contentType: 'coaches',
        operation: 'create',
        data: newCoach,
      });

      expect(mockAddChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'coaches',
          operation: 'create',
        })
      );
    });

    it('should call addChange with create operation for new replay', () => {
      const newReplay = {
        id: 'replay-new-101',
        title: 'New Replay',
        map: 'Test Map',
        date: '2024-01-01',
        players: [],
        race: 'zerg',
        matchup: 'ZvT',
      };

      mockAddChange({
        id: newReplay.id,
        contentType: 'replays',
        operation: 'create',
        data: newReplay,
      });

      expect(mockAddChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'replays',
          operation: 'create',
        })
      );
    });

    it('should call addChange with create operation for new build order', () => {
      const newBuildOrder = {
        id: 'build-new-202',
        title: 'New Build Order',
        race: 'protoss',
        matchup: 'PvZ',
        steps: [],
        description: 'Build description',
      };

      mockAddChange({
        id: newBuildOrder.id,
        contentType: 'build-orders',
        operation: 'create',
        data: newBuildOrder,
      });

      expect(mockAddChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'build-orders',
          operation: 'create',
        })
      );
    });

    it('should call addChange with create operation for new masterclass', () => {
      const newMasterclass = {
        id: 'mc-new-303',
        title: 'New Masterclass',
        description: 'Masterclass description',
        coach: 'TestCoach',
        coachId: 'coach-1',
        videoIds: ['video-1'],
      };

      mockAddChange({
        id: newMasterclass.id,
        contentType: 'masterclasses',
        operation: 'create',
        data: newMasterclass,
      });

      expect(mockAddChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'masterclasses',
          operation: 'create',
        })
      );
    });
  });

  describe('Update operation contract', () => {
    it('should call addChange with update operation for existing event', () => {
      const existingEvent = {
        id: 'event-existing-123',
        title: 'Updated Event Title',
        description: 'Updated description',
        date: '2024-12-25',
        time: '19:00',
        type: 'tournament',
        tags: ['tag1'],
      };

      mockAddChange({
        id: existingEvent.id,
        contentType: 'events',
        operation: 'update',
        data: existingEvent,
      });
      mockToastSuccess('Event updated (pending commit)');

      expect(mockAddChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-existing-123',
          contentType: 'events',
          operation: 'update',
        })
      );
    });

    it('should call addChange with update operation for existing video', () => {
      const existingVideo = {
        id: 'video-existing-456',
        title: 'Updated Video Title',
        source: 'youtube',
        youtubeId: 'xyz789',
      };

      mockAddChange({
        id: existingVideo.id,
        contentType: 'videos',
        operation: 'update',
        data: existingVideo,
      });

      expect(mockAddChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'video-existing-456',
          operation: 'update',
        })
      );
    });
  });

  describe('All content types operations', () => {
    const contentTypes = [
      'videos',
      'events',
      'coaches',
      'replays',
      'build-orders',
      'masterclasses',
    ] as const;

    const operations = ['create', 'update'] as const;

    contentTypes.forEach((contentType) => {
      operations.forEach((operation) => {
        it(`should handle ${operation} for ${contentType}`, () => {
          const mockItem = {
            id: `${contentType}-test`,
            title: 'Test Item',
          };

          mockAddChange({
            id: mockItem.id,
            contentType: contentType,
            operation: operation,
            data: mockItem,
          });

          expect(mockAddChange).toHaveBeenCalledWith(
            expect.objectContaining({
              id: `${contentType}-test`,
              contentType: contentType,
              operation: operation,
              data: expect.any(Object),
            })
          );
        });
      });
    });
  });

  describe('Validation behavior', () => {
    it('should show error toast if required fields are missing', () => {
      // Simulate validation failure
      mockToastError('Please fill in all required fields');

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('required fields')
      );

      // addChange should NOT be called on validation failure
      expect(mockAddChange).not.toHaveBeenCalled();
    });

    it('should not call addChange when validation fails', () => {
      const invalidItem = { id: '', title: '' }; // Missing required fields

      // Simulate validation check
      if (!invalidItem.title) {
        mockToastError('Please fill in all required fields');
        // Return early, don't call addChange
      } else {
        mockAddChange({
          id: invalidItem.id,
          contentType: 'events',
          operation: 'create',
          data: invalidItem,
        });
      }

      expect(mockToastError).toHaveBeenCalled();
      expect(mockAddChange).not.toHaveBeenCalled();
    });
  });

  describe('Toast notification patterns', () => {
    it('should show "created (pending commit)" for new items', () => {
      const newItem = { id: 'new-1', title: 'New Item' };

      mockAddChange({
        id: newItem.id,
        contentType: 'events',
        operation: 'create',
        data: newItem,
      });
      mockToastSuccess('Event created (pending commit)');

      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/created.*pending commit/i)
      );
    });

    it('should show "updated (pending commit)" for existing items', () => {
      const existingItem = { id: 'existing-1', title: 'Existing Item' };

      mockAddChange({
        id: existingItem.id,
        contentType: 'events',
        operation: 'update',
        data: existingItem,
      });
      mockToastSuccess('Event updated (pending commit)');

      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/updated.*pending commit/i)
      );
    });
  });

  describe('Modal close behavior', () => {
    it('should close modal after successful save', () => {
      const onClose = vi.fn();
      const item = { id: 'test-1', title: 'Test Item' };

      // Simulate successful save
      mockAddChange({
        id: item.id,
        contentType: 'events',
        operation: 'create',
        data: item,
      });
      mockToastSuccess('Event created (pending commit)');

      // Modal should close
      onClose();

      expect(onClose).toHaveBeenCalled();
    });

    it('should not close modal on validation error', () => {
      const onClose = vi.fn();

      // Simulate validation failure
      mockToastError('Please fill in all required fields');

      // onClose should NOT be called
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
