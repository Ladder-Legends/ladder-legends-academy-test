'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoGrid } from '@/components/videos/video-grid';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import { VideoEditModal } from '@/components/admin/video-edit-modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import videosData from '@/data/videos.json';
import { Video, isPlaylist } from '@/types/video';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

// Cast imported JSON to Video[] to ensure proper typing
const videos = videosData as Video[];

export function VideoLibraryContent() {
  const searchParams = useSearchParams();
  const coachFromUrl = searchParams.get('coach');
  const { addChange } = usePendingChanges();

  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    races: [],
    general: [],
    coaches: coachFromUrl ? [coachFromUrl] : [],
    contentType: [], // 'single' or 'playlist'
    accessLevel: [], // 'free' or 'premium'
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for editing
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewVideo, setIsNewVideo] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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

  // Extract all unique tags from videos
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    videos.forEach(video => {
      video.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // Extract all unique coaches from videos
  const allCoaches = useMemo(() => {
    const coachSet = new Set<string>();
    videos.forEach(video => {
      if (video.coachId) {
        coachSet.add(video.coachId);
      }
    });
    return Array.from(coachSet).sort();
  }, []);

  // Count videos for each filter with current filters applied
  const getCount = useCallback((tag: string, sectionId: string) => {
    return videos.filter(video => {
      const videoTags = video.tags.map(t => t.toLowerCase());
      const videoCoachId = video.coachId?.toLowerCase() || '';
      const videoIsPlaylist = isPlaylist(video);

      // Check if video matches the tag/coach/contentType we're counting
      if (sectionId === 'coaches') {
        if (videoCoachId !== tag.toLowerCase()) return false;
      } else if (sectionId === 'contentType') {
        if (tag === 'playlist' && !videoIsPlaylist) return false;
        if (tag === 'single' && !videoIsPlaylist) return false;
      } else if (sectionId === 'accessLevel') {
        const videoIsFree = video.isFree || false;
        if (tag === 'free' && !videoIsFree) return false;
        if (tag === 'premium' && videoIsFree) return false;
      } else {
        if (!videoTags.includes(tag.toLowerCase())) return false;
      }

      // Apply other active filters (excluding current section)
      const races = sectionId === 'races' ? [] : (selectedItems.races || []);
      const general = sectionId === 'general' ? [] : (selectedItems.general || []);
      const coaches = sectionId === 'coaches' ? [] : (selectedItems.coaches || []);
      const contentTypes = sectionId === 'contentType' ? [] : (selectedItems.contentType || []);
      const accessLevels = sectionId === 'accessLevel' ? [] : (selectedItems.accessLevel || []);

      if (races.length > 0 && !races.some(r => videoTags.includes(r))) return false;
      if (general.length > 0 && !general.some(g => videoTags.includes(g))) return false;
      if (coaches.length > 0 && !coaches.some(c => videoCoachId === c.toLowerCase())) return false;

      if (contentTypes.length > 0) {
        const matchesContentType = contentTypes.some(type =>
          (type === 'playlist' && videoIsPlaylist) ||
          (type === 'single' && !videoIsPlaylist)
        );
        if (!matchesContentType) return false;
      }

      if (accessLevels.length > 0) {
        const videoIsFree = video.isFree || false;
        const matchesAccessLevel = accessLevels.some(level =>
          (level === 'free' && videoIsFree) ||
          (level === 'premium' && !videoIsFree)
        );
        if (!matchesAccessLevel) return false;
      }

      return true;
    }).length;
  }, [selectedItems]);

  // Build filter sections
  const filterSections = useMemo((): FilterSection[] => {
    const races = ['terran', 'zerg', 'protoss'];
    const generalTopics = ['mindset', 'fundamentals', 'meta', 'build order', 'micro', 'macro'];

    const formatCoachName = (coachId: string): string => {
      const video = videos.find(v => v.coachId === coachId);
      return video?.coach || coachId;
    };

    return [
      {
        id: 'search',
        title: 'Search',
        type: 'search' as const,
        items: [],
      },
      {
        id: 'accessLevel',
        title: 'Access Level',
        type: 'checkbox' as const,
        items: [
          {
            id: 'free',
            label: 'Free',
            count: getCount('free', 'accessLevel'),
          },
          {
            id: 'premium',
            label: 'Premium',
            count: getCount('premium', 'accessLevel'),
          },
        ].filter(item => item.count > 0),
      },
      {
        id: 'contentType',
        title: 'Content Type',
        type: 'checkbox' as const,
        items: [
          {
            id: 'single',
            label: 'Single Videos',
            count: getCount('single', 'contentType'),
          },
          {
            id: 'playlist',
            label: 'Playlists',
            count: getCount('playlist', 'contentType'),
          },
        ].filter(item => item.count > 0),
      },
      {
        id: 'races',
        title: 'Race-Specific',
        type: 'checkbox' as const,
        items: races.map(race => ({
          id: race,
          label: race,
          count: getCount(race, 'races'),
        })),
      },
      {
        id: 'general',
        title: 'General',
        type: 'checkbox' as const,
        items: generalTopics.map(topic => ({
          id: topic,
          label: topic,
          count: getCount(topic, 'general'),
        })).filter(item => item.count > 0),
      },
      {
        id: 'coaches',
        title: 'Coaches',
        type: 'checkbox' as const,
        items: allCoaches.map(coachId => ({
          id: coachId,
          label: formatCoachName(coachId),
          count: getCount(coachId, 'coaches'),
        })).filter(item => item.count > 0),
      },
    ];
  }, [selectedItems, getCount, allCoaches]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const videoTags = video.tags.map(t => t.toLowerCase());
      const videoCoachId = video.coachId?.toLowerCase() || '';

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          video.title.toLowerCase().includes(query) ||
          video.description.toLowerCase().includes(query) ||
          videoTags.some(tag => tag.includes(query)) ||
          video.coach?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Apply sidebar filters
      const races = selectedItems.races || [];
      const general = selectedItems.general || [];
      const coaches = selectedItems.coaches || [];
      const contentTypes = selectedItems.contentType || [];
      const accessLevels = selectedItems.accessLevel || [];

      if (races.length > 0 && !races.some(r => videoTags.includes(r))) return false;
      if (general.length > 0 && !general.some(g => videoTags.includes(g))) return false;
      if (coaches.length > 0 && !coaches.some(c => videoCoachId === c.toLowerCase())) return false;

      if (contentTypes.length > 0) {
        const videoIsPlaylist = isPlaylist(video);
        const matchesContentType = contentTypes.some(type =>
          (type === 'playlist' && videoIsPlaylist) ||
          (type === 'single' && !videoIsPlaylist)
        );
        if (!matchesContentType) return false;
      }

      if (accessLevels.length > 0) {
        const videoIsFree = video.isFree || false;
        const matchesAccessLevel = accessLevels.some(level =>
          (level === 'free' && videoIsFree) ||
          (level === 'premium' && !videoIsFree)
        );
        if (!matchesAccessLevel) return false;
      }

      if (selectedTags.length > 0 && !selectedTags.every(tag => video.tags.includes(tag))) {
        return false;
      }

      return true;
    });
  }, [selectedItems, selectedTags, searchQuery]);

  // Filter sidebar content
  const filterContent = (
    <FilterSidebar
      searchEnabled={true}
      searchPlaceholder="Search videos..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
    />
  );

  // Grid content
  const gridContent = (
    <VideoGrid
      videos={filteredVideos}
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
        tableContent={<div />}
        gridContent={gridContent}
        defaultView="grid"
        showViewToggle={false}
        headerActions={headerActions}
        tags={allTags}
        selectedTags={selectedTags}
        onTagToggle={toggleTag}
        onClearTags={() => setSelectedTags([])}
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
