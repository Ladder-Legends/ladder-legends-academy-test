'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoGrid } from '@/components/videos/video-grid';
import { CategorySidebar } from '@/components/videos/category-sidebar';
import videos from '@/data/videos.json';

export function VideoLibrary() {
  const searchParams = useSearchParams();
  const coachFromUrl = searchParams.get('coach');

  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [selectedGeneral, setSelectedGeneral] = useState<string[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>(
    coachFromUrl ? [coachFromUrl] : []
  );
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFilter = (value: string, current: string[], setter: (val: string[]) => void) => {
    console.log('toggleFilter called:', { value, current });
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
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

      return true;
    });
  }, [selectedRaces, selectedGeneral, selectedCoaches, searchQuery]);

  const hasActiveFilters = selectedRaces.length > 0 || selectedGeneral.length > 0 || selectedCoaches.length > 0 || searchQuery.trim().length > 0;

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

          <VideoGrid videos={filteredVideos} />
        </div>
      </main>
    </div>
  );
}
