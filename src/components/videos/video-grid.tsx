'use client';

import { useState, useMemo } from 'react';
import { Video } from '@/types/video';
import { VideoCard } from './video-card';
import { TagFilter } from './tag-filter';
import { SearchInput } from './search-input';

interface VideoGridProps {
  videos: Video[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get all unique tags from videos
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    videos.forEach(video => {
      video.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [videos]);

  // Filter videos based on search query and selected tags
  const filteredVideos = useMemo(() => {
    let filtered = videos;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video => {
        // Search in title
        if (video.title.toLowerCase().includes(query)) return true;
        // Search in description
        if (video.description.toLowerCase().includes(query)) return true;
        // Search in tags
        if (video.tags.some(tag => tag.toLowerCase().includes(query))) return true;
        return false;
      });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(video =>
        selectedTags.every(tag => video.tags.includes(tag))
      );
    }

    return filtered;
  }, [videos, selectedTags, searchQuery]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleClearAll = () => {
    setSelectedTags([]);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={handleSearchClear}
        />
        <TagFilter
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearAll={handleClearAll}
        />
      </div>

      {filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No videos found matching the selected filters.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
