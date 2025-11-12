'use client';

import { useMemo } from 'react';
import { VideoGrid } from '@/components/videos/video-grid';
import { VideosTable } from '@/components/videos/videos-table';
import { FilterSidebar } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import { VideoEditModal } from '@/components/admin/video-edit-modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useContentFiltering } from '@/lib/filtering/hooks/use-content-filtering';
import { videoFilterConfig } from '@/lib/filtering/configs/video-filters';
import videosData from '@/data/videos.json';
import { Video } from '@/types/video';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

// Cast imported JSON to Video[] to ensure proper typing
const videos = videosData as Video[];

export function VideoLibraryContent() {
  const { addChange } = usePendingChanges();
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

  // Use the new filtering system - replaces ~300 lines of code!
  const {
    filtered,
    filters,
    setFilter,
    clearFilters,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    clearTags,
    sections: filterSections,
  } = useContentFiltering(videos, videoFilterConfig);

  // Sort videos: for free users, free content first then newest; for premium users, just newest
  const filteredVideos = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // For non-subscribers, prioritize free content first
      if (!hasSubscriberRole) {
        const aIsFree = a.isFree ?? false;
        const bIsFree = b.isFree ?? false;
        if (aIsFree !== bIsFree) {
          return bIsFree ? 1 : -1; // Free items come first
        }
      }

      // Then sort by date (newest first)
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [filtered, hasSubscriberRole]);

  // Modal state for editing
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewVideo, setIsNewVideo] = useState(false);

  // Extract all unique tags from videos
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    videos.forEach(video => {
      video.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // Convert filters object to selectedItems format for FilterSidebar
  const selectedItems = useMemo(() => {
    const result: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        result[key] = value;
      } else if (value) {
        result[key] = [String(value)];
      } else {
        result[key] = [];
      }
    }

    return result;
  }, [filters]);

  // Handle selection changes from FilterSidebar
  const handleSelectionChange = (newSelectedItems: Record<string, string[]>) => {
    // Update each changed filter
    for (const [key, value] of Object.entries(newSelectedItems)) {
      if (JSON.stringify(selectedItems[key]) !== JSON.stringify(value)) {
        setFilter(key, value);
      }
    }
  };

  // Admin handlers
  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setIsNewVideo(false);
    setIsModalOpen(true);
  };

  const handleDelete = (video: Video) => {
    if (confirm(`Are you sure you want to delete "${video.title}"?`)) {
      addChange({
        id: video.id,
        contentType: 'videos',
        operation: 'delete',
        data: video as unknown as Record<string, unknown>,
      });
      toast.success(`Video deleted (pending commit)`);
    }
  };

  const handleAddNew = () => {
    setEditingVideo(null);
    setIsNewVideo(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVideo(null);
    setIsNewVideo(false);
  };

  // Filter sidebar content
  const filterContent = (
    <FilterSidebar
      searchEnabled={true}
      searchPlaceholder="Search videos..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={handleSelectionChange}
    />
  );

  // Grid content
  const gridContent = (
    <VideoGrid
      videos={filteredVideos}
      onEdit={handleEdit}
      onDelete={handleDelete}
      allVideos={videos}
    />
  );

  // Table content
  const tableContent = (
    <VideosTable
      videos={filteredVideos}
      hasSubscriberRole={hasSubscriberRole}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  // Header actions
  const headerActions = (
    <PermissionGate require="coaches">
      <Button onClick={handleAddNew} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add New Video
      </Button>
    </PermissionGate>
  );

  return (
    <>
      <FilterableContentLayout
        title="Video Library"
        description="Browse our collection of coaching videos and playlists"
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="grid"
        showViewToggle={true}
        headerActions={headerActions}
        filters={filters}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        onClearFilters={clearFilters}
        onRemoveFilter={(key) => setFilter(key, [])}
        onClearSearch={() => setSearchQuery('')}
        onRemoveTag={toggleTag}
        filterLabels={{
          coaches: 'Coach',
          races: 'Race',
          accessLevel: 'Access',
          categories: 'Category',
        }}
      />

      <VideoEditModal
        video={editingVideo}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewVideo}
      />
    </>
  );
}
