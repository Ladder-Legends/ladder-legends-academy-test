'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoGrid } from '@/components/videos/video-grid';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import videos from '@/data/videos.json';
import { X } from 'lucide-react';

export function VideoLibrary() {
  const searchParams = useSearchParams();
  const coachFromUrl = searchParams.get('coach');

  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    races: [],
    general: [],
    coaches: coachFromUrl ? [coachFromUrl] : [],
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Extract all unique tags from videos
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    videos.forEach(video => {
      video.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // Count videos for each filter with current filters applied
  const getCount = (tag: string, sectionId: string) => {
    return videos.filter(video => {
      const videoTags = video.tags.map(t => t.toLowerCase());

      // Check if video matches the tag we're counting
      if (!videoTags.includes(tag.toLowerCase())) return false;

      // Apply other active filters
      const races = sectionId === 'races' ? [] : (selectedItems.races || []);
      const general = sectionId === 'general' ? [] : (selectedItems.general || []);
      const coaches = sectionId === 'coaches' ? [] : (selectedItems.coaches || []);

      if (races.length > 0 && !races.some(r => videoTags.includes(r))) return false;
      if (general.length > 0 && !general.some(g => videoTags.includes(g))) return false;
      if (coaches.length > 0 && !coaches.some(c => videoTags.includes(c))) return false;

      return true;
    }).length;
  };

  // Build filter sections
  const filterSections = useMemo((): FilterSection[] => {
    const races = ['terran', 'zerg', 'protoss'];
    const generalTopics = ['mindset', 'fundamentals', 'meta', 'build order', 'micro', 'macro'];
    const coaches = ['groovy', 'hino', 'coach nico', 'gamerrichy', 'battleb', 'krystianer', 'drakka'];

    return [
      {
        id: 'races',
        label: 'Race-Specific',
        icon: '🎮',
        items: races.map(race => ({
          id: race,
          label: race,
          count: getCount(race, 'races'),
        })),
      },
      {
        id: 'general',
        label: 'General',
        icon: '📚',
        items: generalTopics.map(topic => ({
          id: topic,
          label: topic,
          count: getCount(topic, 'general'),
        })).filter(item => item.count > 0),
      },
      {
        id: 'coaches',
        label: 'Coaches',
        icon: '👨‍🏫',
        items: coaches.map(coach => ({
          id: coach,
          label: coach,
          count: getCount(coach, 'coaches'),
        })).filter(item => item.count > 0),
      },
    ];
  }, [selectedItems]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const videoTags = video.tags.map(t => t.toLowerCase());

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          video.title.toLowerCase().includes(query) ||
          video.description.toLowerCase().includes(query) ||
          videoTags.some(tag => tag.includes(query));
        if (!matchesSearch) return false;
      }

      // Apply sidebar filters
      const races = selectedItems.races || [];
      const general = selectedItems.general || [];
      const coaches = selectedItems.coaches || [];

      if (races.length > 0 && !races.some(r => videoTags.includes(r))) return false;
      if (general.length > 0 && !general.some(g => videoTags.includes(g))) return false;
      if (coaches.length > 0 && !coaches.some(c => videoTags.includes(c))) return false;

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

          <VideoGrid videos={filteredVideos} />
        </div>
      </main>
    </div>
  );
}
