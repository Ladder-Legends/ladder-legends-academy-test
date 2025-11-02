'use client';

import { useState, useMemo, useEffect } from 'react';
import { Video } from '@/types/video';
import videos from '@/data/videos.json';
import { MuxUpload } from './mux-upload';
import { VideoEditModal } from './video-edit-modal';
import { Button } from '@/components/ui/button';
import { X, Plus, Video as VideoIcon, Edit, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { usePendingChanges } from '@/hooks/use-pending-changes';

interface VideoSelectorProps {
  // Mode
  mode?: 'single' | 'playlist';

  // Single mode (current behavior, enhanced with edit)
  selectedVideoId?: string;
  onVideoSelect?: (videoId: string | undefined) => void;

  // Playlist mode (new)
  selectedVideoIds?: string[];
  onVideoIdsChange?: (videoIds: string[]) => void;

  // Common
  label?: string;
  className?: string;
  suggestedTitle?: string; // Pre-fill upload form with this title
  allowReorder?: boolean;   // Enable drag-to-reorder (playlist mode only) - TODO: Future enhancement
  allowCreate?: boolean;    // Allow creating new videos (default: true)
}

export function VideoSelector({
  mode = 'single',
  selectedVideoId,
  onVideoSelect,
  selectedVideoIds = [],
  onVideoIdsChange,
  label = 'Video',
  className = '',
  suggestedTitle = '',
  allowReorder = false,
  allowCreate = true,
}: VideoSelectorProps) {
  const { addChange } = usePendingChanges();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingVideoTitle, setUploadingVideoTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadType, setUploadType] = useState<'mux' | 'youtube'>('mux');
  const [youtubeId, setYoutubeId] = useState('');
  const [pendingNewVideos, setPendingNewVideos] = useState<Video[]>([]);

  // Video editing state
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Auto-populate title when showing upload form
  useEffect(() => {
    if (showUpload && suggestedTitle && !uploadingVideoTitle) {
      setUploadingVideoTitle(suggestedTitle);
    }
  }, [showUpload, suggestedTitle, uploadingVideoTitle]);

  const allVideos = useMemo(() => {
    return [...(videos as Video[]), ...pendingNewVideos];
  }, [pendingNewVideos]);

  // Get video by ID (handles pending videos)
  const getVideoById = (id: string): Video | undefined => {
    return allVideos.find(v => v.id === id);
  };

  // Single mode: selected video
  const selectedVideo = useMemo(() => {
    if (mode === 'single' && selectedVideoId) {
      return getVideoById(selectedVideoId);
    }
    return undefined;
  }, [mode, selectedVideoId, allVideos]);

  // Playlist mode: selected videos
  const playlistVideos = useMemo(() => {
    if (mode === 'playlist') {
      return selectedVideoIds.map(id => getVideoById(id)).filter(Boolean) as Video[];
    }
    return [];
  }, [mode, selectedVideoIds, allVideos]);

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return allVideos;
    const query = searchQuery.toLowerCase();
    return allVideos.filter(v =>
      v.title.toLowerCase().includes(query) ||
      v.description?.toLowerCase().includes(query) ||
      v.coach?.toLowerCase().includes(query)
    );
  }, [searchQuery, allVideos]);

  const handleMuxUploadComplete = (assetId: string, playbackId: string) => {
    // Create a new video entry
    const newVideo: Video = {
      id: uuidv4(),
      title: uploadingVideoTitle || 'Untitled Video',
      description: '',
      source: 'mux',
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      muxAssetStatus: 'ready',
      thumbnail: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
      date: new Date().toISOString().split('T')[0],
      tags: [],
      race: 'terran',
      coach: '',
      coachId: '',
      isFree: false,
    };

    // Store in pending state for immediate display
    setPendingNewVideos(prev => [...prev, newVideo]);

    // Add to pending changes
    addChange({
      id: newVideo.id,
      contentType: 'videos',
      operation: 'create',
      data: newVideo as unknown as Record<string, unknown>,
    });

    // Add to selection
    if (mode === 'single' && onVideoSelect) {
      onVideoSelect(newVideo.id);
    } else if (mode === 'playlist' && onVideoIdsChange) {
      onVideoIdsChange([...selectedVideoIds, newVideo.id]);
    }

    setShowUpload(false);
    setUploadingVideoTitle('');
    setYoutubeId('');
    toast.success('Video uploaded and linked successfully');
  };

  const handleYoutubeVideoCreate = () => {
    if (!youtubeId.trim()) {
      toast.error('Please enter a YouTube video ID');
      return;
    }

    if (!uploadingVideoTitle.trim()) {
      toast.error('Please enter a video title');
      return;
    }

    // Create a new video entry for YouTube
    const newVideo: Video = {
      id: uuidv4(),
      title: uploadingVideoTitle,
      description: '',
      source: 'youtube',
      youtubeId: youtubeId.trim(),
      thumbnail: `https://img.youtube.com/vi/${youtubeId.trim()}/hqdefault.jpg`,
      date: new Date().toISOString().split('T')[0],
      tags: [],
      race: 'terran',
      coach: '',
      coachId: '',
      isFree: false,
    };

    // Store in pending state for immediate display
    setPendingNewVideos(prev => [...prev, newVideo]);

    // Add to pending changes
    addChange({
      id: newVideo.id,
      contentType: 'videos',
      operation: 'create',
      data: newVideo as unknown as Record<string, unknown>,
    });

    // Add to selection
    if (mode === 'single' && onVideoSelect) {
      onVideoSelect(newVideo.id);
    } else if (mode === 'playlist' && onVideoIdsChange) {
      onVideoIdsChange([...selectedVideoIds, newVideo.id]);
    }

    setShowUpload(false);
    setUploadingVideoTitle('');
    setYoutubeId('');
    toast.success('YouTube video added and linked successfully');
  };

  const handleSelectExisting = (videoId: string) => {
    if (mode === 'single' && onVideoSelect) {
      onVideoSelect(videoId);
    } else if (mode === 'playlist' && onVideoIdsChange) {
      // Don't add duplicates
      if (!selectedVideoIds.includes(videoId)) {
        onVideoIdsChange([...selectedVideoIds, videoId]);
      } else {
        toast.info('Video already in playlist');
      }
    }
    setSearchQuery('');
  };

  const handleRemove = (videoId?: string) => {
    if (mode === 'single' && onVideoSelect) {
      onVideoSelect(undefined);
    } else if (mode === 'playlist' && onVideoIdsChange && videoId) {
      onVideoIdsChange(selectedVideoIds.filter(id => id !== videoId));
    }
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setIsEditModalOpen(true);
  };

  const handleMoveVideo = (index: number, direction: 'up' | 'down') => {
    if (mode !== 'playlist' || !onVideoIdsChange) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedVideoIds.length) return;

    const newIds = [...selectedVideoIds];
    [newIds[index], newIds[newIndex]] = [newIds[newIndex], newIds[index]];
    onVideoIdsChange(newIds);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || mode !== 'playlist' || !onVideoIdsChange) return;
    if (draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newIds = [...selectedVideoIds];
    const draggedId = newIds[draggedIndex];

    // Remove from old position
    newIds.splice(draggedIndex, 1);

    // Insert at new position
    newIds.splice(dropIndex, 0, draggedId);

    onVideoIdsChange(newIds);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Render: Single Mode
  if (mode === 'single') {
    return (
      <div className={className}>
        <label className="block text-sm font-medium mb-2">{label}</label>

        {/* Selected Video Display */}
        {selectedVideo && (
          <div className="mb-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <VideoIcon className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{selectedVideo.title}</span>
                  {pendingNewVideos.some(v => v.id === selectedVideo.id) && (
                    <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium whitespace-nowrap">
                      New - pending commit
                    </span>
                  )}
                </div>
                {selectedVideo.coach && (
                  <div className="text-sm text-muted-foreground">Coach: {selectedVideo.coach}</div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(selectedVideo)}
                  title="Edit video details"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove()}
                  title="Remove video"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload New Video Section */}
        {!selectedVideo && (
          <>
            {!showUpload ? (
              <div className="space-y-2">
                {/* Search/Select Existing Video */}
                <div>
                  <input
                    type="text"
                    placeholder="Search existing videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {searchQuery && filteredVideos.length > 0 && (
                    <div className="mt-2 border border-border rounded-md max-h-60 overflow-y-auto">
                      {filteredVideos.map((video) => (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => handleSelectExisting(video.id)}
                          className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                        >
                          <div className="font-medium">{video.title}</div>
                          {video.coach && (
                            <div className="text-sm text-muted-foreground">Coach: {video.coach}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload New Video Button */}
                {allowCreate && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUpload(true)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload New Video
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Video Title *</label>
                  <input
                    type="text"
                    value={uploadingVideoTitle}
                    onChange={(e) => setUploadingVideoTitle(e.target.value)}
                    placeholder="Enter video title"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Video Source Type Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Video Source</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={uploadType === 'mux' ? 'default' : 'outline'}
                      onClick={() => setUploadType('mux')}
                      className="flex-1"
                    >
                      Mux Upload
                    </Button>
                    <Button
                      type="button"
                      variant={uploadType === 'youtube' ? 'default' : 'outline'}
                      onClick={() => setUploadType('youtube')}
                      className="flex-1"
                    >
                      YouTube
                    </Button>
                  </div>
                </div>

                {/* Conditional rendering based on upload type */}
                {uploadType === 'mux' ? (
                  <MuxUpload
                    onUploadComplete={handleMuxUploadComplete}
                    title={uploadingVideoTitle}
                  />
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">YouTube Video ID *</label>
                      <input
                        type="text"
                        value={youtubeId}
                        onChange={(e) => setYoutubeId(e.target.value)}
                        placeholder="dQw4w9WgXcQ"
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The ID from the YouTube URL (e.g., youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleYoutubeVideoCreate}
                      className="w-full"
                    >
                      Add YouTube Video
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowUpload(false);
                    setUploadingVideoTitle('');
                    setYoutubeId('');
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}

        {/* Video Edit Modal */}
        <VideoEditModal
          video={editingVideo}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingVideo(null);
          }}
          isNew={false}
        />
      </div>
    );
  }

  // Render: Playlist Mode
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">{label}</label>
        {!showUpload && allowCreate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        )}
      </div>

      {/* Always-visible search when allowCreate is false */}
      {!allowCreate && (
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search existing videos to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && filteredVideos.length > 0 && (
            <div className="mt-2 border border-border rounded-md max-h-60 overflow-y-auto">
              {filteredVideos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => handleSelectExisting(video.id)}
                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                >
                  <div className="text-sm font-medium">{video.title}</div>
                  {video.coach && (
                    <div className="text-xs text-muted-foreground">Coach: {video.coach}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlist Display */}
      {playlistVideos.length > 0 && (
        <div className="mb-3 space-y-2 border border-border rounded-md p-3 max-h-96 overflow-y-auto">
          {playlistVideos.map((video, index) => (
            <div
              key={video.id}
              draggable={allowReorder}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 bg-muted/50 rounded-md transition-all ${
                allowReorder ? 'cursor-move' : ''
              } ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${
                dragOverIndex === index && draggedIndex !== index
                  ? 'border-2 border-primary border-dashed'
                  : ''
              }`}
            >
              {allowReorder && (
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <VideoIcon className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{index + 1}.</span>
                  <span className="text-sm font-medium truncate">{video.title}</span>
                  {pendingNewVideos.some(v => v.id === video.id) && (
                    <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium whitespace-nowrap">
                      New
                    </span>
                  )}
                </div>
                {video.coach && (
                  <div className="text-xs text-muted-foreground">Coach: {video.coach}</div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(video)}
                  title="Edit video details"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(video.id)}
                  title="Remove from playlist"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Video Section */}
      {showUpload && allowCreate && (
        <div className="border border-border rounded-md p-4 space-y-3 mb-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Add Video to Playlist</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowUpload(false);
                setSearchQuery('');
                setUploadingVideoTitle('');
                setYoutubeId('');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search Existing */}
          <div>
            <label className="block text-sm font-medium mb-1">Select Existing Video</label>
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && filteredVideos.length > 0 && (
              <div className="mt-2 border border-border rounded-md max-h-40 overflow-y-auto">
                {filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => handleSelectExisting(video.id)}
                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="text-sm font-medium">{video.title}</div>
                    {video.coach && (
                      <div className="text-xs text-muted-foreground">Coach: {video.coach}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Upload New */}
          <div>
            <label className="block text-sm font-medium mb-1">Upload New Video</label>
            <div className="space-y-3">
              <input
                type="text"
                value={uploadingVideoTitle}
                onChange={(e) => setUploadingVideoTitle(e.target.value)}
                placeholder="Video title"
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={uploadType === 'mux' ? 'default' : 'outline'}
                  onClick={() => setUploadType('mux')}
                  size="sm"
                  className="flex-1"
                >
                  Mux
                </Button>
                <Button
                  type="button"
                  variant={uploadType === 'youtube' ? 'default' : 'outline'}
                  onClick={() => setUploadType('youtube')}
                  size="sm"
                  className="flex-1"
                >
                  YouTube
                </Button>
              </div>

              {uploadType === 'mux' ? (
                <MuxUpload
                  onUploadComplete={handleMuxUploadComplete}
                  title={uploadingVideoTitle}
                />
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={youtubeId}
                    onChange={(e) => setYoutubeId(e.target.value)}
                    placeholder="YouTube Video ID"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    type="button"
                    onClick={handleYoutubeVideoCreate}
                    className="w-full"
                    size="sm"
                  >
                    Add YouTube Video
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {playlistVideos.length === 0 && !showUpload && (
        <div className="text-center py-8 border border-dashed border-border rounded-md">
          <p className="text-sm text-muted-foreground">No videos in playlist</p>
          {allowCreate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(true)}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Video
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              Search for existing videos above to add them to this playlist
            </p>
          )}
        </div>
      )}

      {/* Video Edit Modal */}
      <VideoEditModal
        video={editingVideo}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingVideo(null);
        }}
        isNew={false}
      />
    </div>
  );
}
