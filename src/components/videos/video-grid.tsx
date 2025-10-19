'use client';

import { useState, useMemo } from 'react';
import { Video } from '@/types/video';
import { VideoCard } from './video-card';
import { TagFilter } from './tag-filter';

interface VideoGridProps {
  videos: Video[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get all unique tags from videos
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    videos.forEach(video => {
      video.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [videos]);

  // Filter videos based on selected tags
  const filteredVideos = useMemo(() => {
    if (selectedTags.length === 0) return videos;
    return videos.filter(video =>
      selectedTags.every(tag => video.tags.includes(tag))
    );
  }, [videos, selectedTags]);

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

  return (
    <div className="space-y-8">
      <TagFilter
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        onClearAll={handleClearAll}
      />

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
