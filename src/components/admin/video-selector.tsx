'use client';

import { useState, useMemo, useEffect } from 'react';
import { Video } from '@/types/video';
import videos from '@/data/videos.json';
import { MuxUpload } from './mux-upload';
import { Button } from '@/components/ui/button';
import { X, Plus, Video as VideoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { usePendingChanges } from '@/hooks/use-pending-changes';

interface VideoSelectorProps {
  selectedVideoId?: string;
  onVideoSelect: (videoId: string | undefined) => void;
  label?: string;
  className?: string;
  suggestedTitle?: string; // Pre-fill upload form with this title
}

export function VideoSelector({
  selectedVideoId,
  onVideoSelect,
  label = 'Video',
  className = '',
  suggestedTitle = '',
}: VideoSelectorProps) {
  const { addChange } = usePendingChanges();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingVideoTitle, setUploadingVideoTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadType, setUploadType] = useState<'mux' | 'youtube'>('mux');
  const [youtubeId, setYoutubeId] = useState('');
  const [pendingNewVideo, setPendingNewVideo] = useState<Video | null>(null);

  // Auto-populate title when showing upload form
  useEffect(() => {
    if (showUpload && suggestedTitle && !uploadingVideoTitle) {
      setUploadingVideoTitle(suggestedTitle);
    }
  }, [showUpload, suggestedTitle, uploadingVideoTitle]);

  const allVideos = videos as Video[];

  const selectedVideo = useMemo(() => {
    // First check if there's a pending new video that matches
    if (pendingNewVideo && pendingNewVideo.id === selectedVideoId) {
      return pendingNewVideo;
    }
    // Otherwise look in existing videos
    return allVideos.find(v => v.id === selectedVideoId);
  }, [allVideos, selectedVideoId, pendingNewVideo]);

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
    const videoId = uuidv4();
    const newVideo: Video = {
      id: videoId,
      title: uploadingVideoTitle || 'Untitled Video',
      description: '',
      source: 'mux',
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      muxAssetStatus: 'ready',
      thumbnail: `/thumbnails/${videoId}.jpg`,
      date: new Date().toISOString().split('T')[0],
      tags: [],
      race: 'terran',
      coach: '',
      coachId: '',
      isFree: false,
    };

    // Store in pending state for immediate display
    setPendingNewVideo(newVideo);

    // Add to pending changes
    addChange({
      id: newVideo.id,
      contentType: 'videos',
      operation: 'create',
      data: newVideo as unknown as Record<string, unknown>,
    });

    // Select the new video
    onVideoSelect(newVideo.id);
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
    setPendingNewVideo(newVideo);

    // Add to pending changes
    addChange({
      id: newVideo.id,
      contentType: 'videos',
      operation: 'create',
      data: newVideo as unknown as Record<string, unknown>,
    });

    // Select the new video
    onVideoSelect(newVideo.id);
    setShowUpload(false);
    setUploadingVideoTitle('');
    setYoutubeId('');
    toast.success('YouTube video added and linked successfully');
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2">{label}</label>

      {/* Selected Video Display */}
      {selectedVideo && (
        <div className="mb-3 p-3 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <VideoIcon className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedVideo.title}</span>
                {pendingNewVideo && pendingNewVideo.id === selectedVideo.id && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium">
                    New - pending commit
                  </span>
                )}
              </div>
              {selectedVideo.coach && (
                <div className="text-sm text-muted-foreground">Coach: {selectedVideo.coach}</div>
              )}
              {selectedVideo.source === 'mux' && pendingNewVideo && (
                <div className="text-sm text-muted-foreground">Mux video uploaded successfully</div>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onVideoSelect(undefined);
              setPendingNewVideo(null);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
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
                        onClick={() => {
                          onVideoSelect(video.id);
                          setSearchQuery('');
                        }}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUpload(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload New Video
              </Button>
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
    </div>
  );
}
