'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoGrid } from '@/components/videos/video-grid';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import { VideoEditModal } from '@/components/admin/video-edit-modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import videosData from '@/data/videos.json';
import { Video, isPlaylist } from '@/types/video';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Cast imported JSON to Video[] to ensure proper typing
const videos = videosData as Video[];

export function VideoLibrary() {
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

  // Handle filter toggle
  const handleItemToggle = (sectionId: string, itemId: string) => {
    setSelectedItems(prev => {
      const current = prev[sectionId] || [];
      const updated = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [sectionId]: updated };
    });
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
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
        // For coaches, check coachId instead of tags
        if (videoCoachId !== tag.toLowerCase()) return false;
      } else if (sectionId === 'contentType') {
        // For content type, check if it's a playlist or single video
        if (tag === 'playlist' && !videoIsPlaylist) return false;
        if (tag === 'single' && videoIsPlaylist) return false;
      } else if (sectionId === 'accessLevel') {
        // For access level, check if it's free or premium
        const videoIsFree = video.isFree || false;
        if (tag === 'free' && !videoIsFree) return false;
        if (tag === 'premium' && videoIsFree) return false;
      } else {
        // For other sections, check tags as before
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

      // Apply content type filter
      if (contentTypes.length > 0) {
        const matchesContentType = contentTypes.some(type =>
          (type === 'playlist' && videoIsPlaylist) ||
          (type === 'single' && !videoIsPlaylist)
        );
        if (!matchesContentType) return false;
      }

      // Apply access level filter
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

    // Helper to format coach name for display
    const formatCoachName = (coachId: string): string => {
      // Find the coach's display name from the video data
      const video = videos.find(v => v.coachId === coachId);
      return video?.coach || coachId;
    };

    return [
      {
        id: 'accessLevel',
        label: 'Access Level',
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
        label: 'Content Type',
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
        label: 'Race-Specific',
        items: races.map(race => ({
          id: race,
          label: race,
          count: getCount(race, 'races'),
        })),
      },
      {
        id: 'general',
        label: 'General',
        items: generalTopics.map(topic => ({
          id: topic,
          label: topic,
          count: getCount(topic, 'general'),
        })).filter(item => item.count > 0),
      },
      {
        id: 'coaches',
        label: 'Coaches',
        items: allCoaches.map(coachId => ({
          id: coachId,
          label: formatCoachName(coachId),
          count: getCount(coachId, 'coaches'),
        })).filter(item => item.count > 0),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Apply content type filter (playlists vs single videos)
      if (contentTypes.length > 0) {
        const videoIsPlaylist = isPlaylist(video);
        const matchesContentType = contentTypes.some(type =>
          (type === 'playlist' && videoIsPlaylist) ||
          (type === 'single' && !videoIsPlaylist)
        );
        if (!matchesContentType) return false;
      }

      // Apply access level filter (free vs premium)
      if (accessLevels.length > 0) {
        const videoIsFree = video.isFree || false;
        const matchesAccessLevel = accessLevels.some(level =>
          (level === 'free' && videoIsFree) ||
          (level === 'premium' && !videoIsFree)
        );
        if (!matchesAccessLevel) return false;
      }

      // If any tag filter is active, video must have all selected tags
      if (selectedTags.length > 0 && !selectedTags.every(tag => video.tags.includes(tag))) {
        return false;
      }

      return true;
    });
  }, [selectedItems, selectedTags, searchQuery]);

  const hasActiveFilters =
    (selectedItems.races?.length || 0) > 0 ||
    (selectedItems.general?.length || 0) > 0 ||
    (selectedItems.coaches?.length || 0) > 0 ||
    (selectedItems.contentType?.length || 0) > 0 ||
    (selectedItems.accessLevel?.length || 0) > 0 ||
    selectedTags.length > 0 ||
    searchQuery.trim().length > 0;

  return (
    <div className="flex flex-1">
      <FilterSidebar
        searchEnabled={true}
        searchPlaceholder="Search videos..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sections={filterSections}
        selectedItems={selectedItems}
        onItemToggle={handleItemToggle}
      />

      <main className="flex-1 px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Video Library</h2>
              <p className="text-muted-foreground">
                {hasActiveFilters ? (
                  <>Showing {filteredVideos.length} filtered video{filteredVideos.length !== 1 ? 's' : ''}</>
                ) : (
                  <>Browse our collection of {videos.length} coaching videos</>
                )}
              </p>
            </div>
            <PermissionGate require="coaches">
              <Button onClick={handleAddNew} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Video
              </Button>
            </PermissionGate>
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filter by Tags</h3>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear tag filters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="inline-block ml-1 h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <VideoGrid
            videos={filteredVideos}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </main>

      <VideoEditModal
        video={editingVideo}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewVideo}
      />
    </div>
  );
}
