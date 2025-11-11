import { Video } from '@/types/video';
import { VideoCard } from './video-card';

interface VideoGridProps {
  videos: Video[];
  onEdit?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  allVideos?: Video[]; // Pass through to resolve playlist thumbnails
}

export function VideoGrid({ videos, onEdit, onDelete, allVideos }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No videos found matching the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onEdit={onEdit}
          onDelete={onDelete}
          allVideos={allVideos}
        />
      ))}
    </div>
  );
}
