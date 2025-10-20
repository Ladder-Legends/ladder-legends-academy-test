'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoGrid } from '@/components/videos/video-grid';
import { CategorySidebar } from '@/components/videos/category-sidebar';
import videos from '@/data/videos.json';
import { X } from 'lucide-react';

export function VideoLibrary() {
  const searchParams = useSearchParams();
  const coachFromUrl = searchParams.get('coach');

  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [selectedGeneral, setSelectedGeneral] = useState<string[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>(
    coachFromUrl ? [coachFromUrl] : []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique tags from videos
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    videos.forEach(video => {
      video.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  const toggleFilter = (value: string, current: string[], setter: (val: string[]) => void) => {
    console.log('toggleFilter called:', { value, current });
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

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

      // If any race filter is active, video must have at least one
      if (selectedRaces.length > 0 && !selectedRaces.some(r => videoTags.includes(r))) {
        return false;
      }

      // If any general filter is active, video must have at least one
      if (selectedGeneral.length > 0 && !selectedGeneral.some(g => videoTags.includes(g))) {
        return false;
      }

      // If any coach filter is active, video must have at least one
      if (selectedCoaches.length > 0 && !selectedCoaches.some(c => videoTags.includes(c))) {
        return false;
      }

      // If any tag filter is active, video must have all selected tags
      if (selectedTags.length > 0 && !selectedTags.every(tag => video.tags.includes(tag))) {
        return false;
      }

      return true;
    });
  }, [selectedRaces, selectedGeneral, selectedCoaches, selectedTags, searchQuery]);

  const hasActiveFilters = selectedRaces.length > 0 || selectedGeneral.length > 0 || selectedCoaches.length > 0 || selectedTags.length > 0 || searchQuery.trim().length > 0;

  return (
    <div className="flex flex-1">
      <CategorySidebar
        videos={videos}
        selectedRaces={selectedRaces}
        selectedGeneral={selectedGeneral}
        selectedCoaches={selectedCoaches}
        searchQuery={searchQuery}
        onRaceToggle={(race) => toggleFilter(race, selectedRaces, setSelectedRaces)}
        onGeneralToggle={(topic) => toggleFilter(topic, selectedGeneral, setSelectedGeneral)}
        onCoachToggle={(coach) => toggleFilter(coach, selectedCoaches, setSelectedCoaches)}
        onSearchChange={setSearchQuery}
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
