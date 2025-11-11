'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useMergedContent } from '@/hooks/use-merged-content';
import { Video, VideoRace } from '@/types/video';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import videos from '@/data/videos.json';
import coaches from '@/data/coaches.json';
import { MuxUpload } from './mux-upload';
import { VideoSelector } from './video-selector-enhanced';
import { extractYouTubeId } from '@/lib/youtube-parser';
import { MultiCategorySelector } from './multi-category-selector';
import { FileUpload } from './file-upload';

interface VideoEditModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function VideoEditModal({ video, isOpen, onClose, isNew = false }: VideoEditModalProps) {
  const { addChange } = usePendingChanges();
  const mergedVideos = useMergedContent(videos as Video[], 'videos');
  const [formData, setFormData] = useState<Partial<Video>>({});
  const [tagInput, setTagInput] = useState('');
  const [coachSearch, setCoachSearch] = useState('');
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [youtubeIdInput, setYoutubeIdInput] = useState('');
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null); // base64 or URL
  const [isPlaylistMode, setIsPlaylistMode] = useState(false);

  // Get all unique tags from existing videos for autocomplete
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    videos.forEach(v => v.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);

  // Check if this is a free playlist containing non-free videos
  const freePlaylistWarning = useMemo(() => {
    if (!isPlaylistMode || !formData.isFree || !formData.videoIds || formData.videoIds.length === 0) {
      return null;
    }

    const allVideos = videos as Video[];
    const selectedVideos = formData.videoIds
      .map(id => allVideos.find(v => v.id === id))
      .filter(Boolean) as Video[];

    const nonFreeVideos = selectedVideos.filter(v => !v.isFree);

    if (nonFreeVideos.length === 0) {
      return null;
    }

    return {
      count: nonFreeVideos.length,
      total: selectedVideos.length,
      titles: nonFreeVideos.map(v => v.title),
    };
  }, [isPlaylistMode, formData.isFree, formData.videoIds]);

  // Filter tags based on input
  const filteredTags = useMemo(() => {
    if (!tagInput.trim()) return [];
    const input = tagInput.toLowerCase();
    return allExistingTags
      .filter(tag => tag.toLowerCase().includes(input) && !formData.tags?.includes(tag))
      .slice(0, 5);
  }, [tagInput, allExistingTags, formData.tags]);

  // Filter coaches based on search input (only active coaches)
  const filteredCoaches = useMemo(() => {
    const activeCoaches = coaches.filter(coach => coach.isActive !== false);
    if (!coachSearch.trim()) return activeCoaches;
    const search = coachSearch.toLowerCase();
    return activeCoaches.filter(coach =>
      coach.name.toLowerCase().includes(search) ||
      coach.displayName.toLowerCase().includes(search)
    );
  }, [coachSearch]);


  useEffect(() => {
    if (!isOpen) return; // Only reset when opening the modal

    if (video) {
      setFormData(video);
      setCoachSearch(video.coach || '');
      setIsPlaylistMode(video.source === 'playlist');
    } else if (isNew) {
      // Always generate a fresh UUID when opening in "add new" mode
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        source: 'youtube', // Default to YouTube
        date: new Date().toISOString().split('T')[0],
        tags: [],
        race: 'terran',
        coach: '',
        coachId: '',
        isFree: false, // Default to premium
      });
      setCoachSearch('');
      setIsPlaylistMode(false);
    }
    setTagInput('');
    setYoutubeIdInput('');
  }, [video, isNew, isOpen]);

  const handleMuxUploadComplete = (assetId: string, playbackId: string) => {
    // Use functional setState to preserve any changes made during upload
    setFormData(prev => ({
      ...prev,
      source: 'mux',
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      muxAssetStatus: 'ready',
      // Use static thumbnail file path (downloaded at build time)
      thumbnail: `/thumbnails/${prev.id}.jpg`,
    }));
    toast.success('Mux video linked successfully');
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData({ ...formData, tags: [...(formData.tags || []), trimmedTag] });
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      }
    }
  };

  const selectCoach = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    if (coach) {
      setFormData({
        ...formData,
        coach: coach.displayName,
        coachId: coach.id,
      });
      setCoachSearch(coach.displayName);
      setShowCoachDropdown(false);
    }
  };

  const clearCoach = () => {
    setFormData({
      ...formData,
      coach: '',
      coachId: '',
    });
    setCoachSearch('');
    setShowCoachDropdown(true);
  };

  const handleYoutubeIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const extractedId = extractYouTubeId(youtubeIdInput);
      if (extractedId) {
        setFormData({ ...formData, youtubeId: extractedId });
        setYoutubeIdInput('');
      }
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomThumbnail(base64);
      toast.success('Custom thumbnail uploaded');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const isMuxVideo = formData.source === 'mux';
    const hasYoutubeId = formData.youtubeId;
    const hasMuxVideo = formData.muxPlaybackId && formData.muxAssetId;
    const hasPlaylistVideos = isPlaylistMode && formData.videoIds && formData.videoIds.length > 0;

    // Validate required fields based on source
    if (!formData.id || !formData.title) {
      toast.error('Please fill in all required fields (Title)');
      return;
    }

    // Validate video source
    if (isPlaylistMode && !hasPlaylistVideos) {
      toast.error('Please add at least one video to the playlist');
      return;
    } else if (isMuxVideo && !hasMuxVideo) {
      toast.error('Please upload a video to Mux or switch to YouTube');
      return;
    } else if (!isMuxVideo && !isPlaylistMode && !hasYoutubeId) {
      toast.error('Please add a YouTube video ID');
      return;
    }

    // For playlists, validate that all videoIds reference existing videos
    if (formData.source === 'playlist' && formData.videoIds && formData.videoIds.length > 0) {
      const invalidVideoIds = formData.videoIds.filter(
        id => !mergedVideos.find(v => v.id === id)
      );
      if (invalidVideoIds.length > 0) {
        toast.error(`Invalid video references in playlist: ${invalidVideoIds.join(', ')}. Please remove them before saving.`);
        return;
      }
    }

    let videoData: Video;

    if (isPlaylistMode) {
      // Playlist video - references other videos
      videoData = {
        id: formData.id,
        title: formData.title,
        description: formData.description || '',
        source: 'playlist',
        videoIds: formData.videoIds || [],
        thumbnail: formData.thumbnail || '/placeholder-thumbnail.jpg',
        date: formData.date || new Date().toISOString().split('T')[0],
        tags: formData.tags || [],
        race: formData.race || 'terran',
        coach: formData.coach || '',
        coachId: formData.coachId || '',
        isFree: formData.isFree || false,
      };
    } else if (isMuxVideo) {
      // Mux video
      videoData = {
        id: formData.id,
        title: formData.title,
        description: formData.description || '',
        source: 'mux',
        muxAssetId: formData.muxAssetId!,
        muxPlaybackId: formData.muxPlaybackId!,
        muxAssetStatus: formData.muxAssetStatus || 'ready',
        thumbnail: formData.thumbnail || `/thumbnails/${formData.id}.jpg`,
        date: formData.date || new Date().toISOString().split('T')[0],
        tags: formData.tags || [],
        race: formData.race || 'terran',
        coach: formData.coach || '',
        coachId: formData.coachId || '',
        isFree: formData.isFree || false,
      };
    } else {
      // Single YouTube video
      videoData = {
        id: formData.id,
        title: formData.title,
        description: formData.description || '',
        source: 'youtube',
        youtubeId: formData.youtubeId!,
        thumbnail: `https://img.youtube.com/vi/${formData.youtubeId}/hqdefault.jpg`,
        date: formData.date || new Date().toISOString().split('T')[0],
        tags: formData.tags || [],
        race: formData.race || 'terran',
        coach: formData.coach || '',
        coachId: formData.coachId || '',
        isFree: formData.isFree || false,
      };
    }

    addChange({
      id: videoData.id,
      contentType: 'videos',
      operation: isNew ? 'create' : 'update',
      data: videoData as unknown as Record<string, unknown>,
    });

    // If custom thumbnail uploaded for Mux video, add it as a file change
    if (isMuxVideo && customThumbnail) {
      addChange({
        id: `thumbnail-${videoData.id}`,
        contentType: 'file',
        operation: 'create',
        data: {
          path: `public/thumbnails/${videoData.id}.jpg`,
          content: customThumbnail, // base64
        },
      });
    }

    toast.success(`Video ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Video' : 'Edit Video'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="Hino Ladder VOD - ZvT Masterclass"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            rows={3}
            placeholder="Description of the video content..."
          />
        </div>

        {/* Video Type Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Video Type *</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsPlaylistMode(false);
                setFormData({ ...formData, source: 'youtube' });
              }}
              className={`px-4 py-2 border rounded-md transition-colors ${
                !isPlaylistMode && (formData.source || 'youtube') === 'youtube'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              Single YouTube
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaylistMode(false);
                setFormData({ ...formData, source: 'mux' });
              }}
              className={`px-4 py-2 border rounded-md transition-colors ${
                !isPlaylistMode && formData.source === 'mux'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              Mux Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaylistMode(true);
                setFormData({ ...formData, source: 'playlist' });
              }}
              className={`px-4 py-2 border rounded-md transition-colors ${
                isPlaylistMode
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              Playlist
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isPlaylistMode
              ? 'Playlist: Select multiple existing videos from the library to group together'
              : formData.source === 'mux'
                ? 'Mux: Upload your own video file'
                : 'YouTube: Link to a single YouTube video'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Race</label>
            <select
              value={formData.race || 'terran'}
              onChange={(e) => setFormData({ ...formData, race: e.target.value as VideoRace })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="terran">Terran</option>
              <option value="zerg">Zerg</option>
              <option value="protoss">Protoss</option>
              <option value="all">All Races</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Coach</label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coachSearch}
                  onChange={(e) => {
                    setCoachSearch(e.target.value);
                    setShowCoachDropdown(true);
                  }}
                  onFocus={() => setShowCoachDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCoachDropdown(false), 200)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                  placeholder="Type to search coaches..."
                />
                {formData.coach && formData.coachId && (
                  <button
                    type="button"
                    onClick={clearCoach}
                    className="px-3 py-2 border border-border hover:bg-muted rounded-md transition-colors text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Coach dropdown */}
              {showCoachDropdown && filteredCoaches.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredCoaches.map((coach) => (
                    <button
                      key={coach.id}
                      type="button"
                      onClick={() => selectCoach(coach.id)}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{coach.displayName}</div>
                      <div className="text-sm text-muted-foreground">{coach.name} • {coach.race}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.coach && formData.coachId && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: <strong>{formData.coach}</strong> (ID: {formData.coachId})
              </p>
            )}
          </div>
        </div>

        {/* Conditional Video Input - YouTube, Mux, or Playlist */}
        {isPlaylistMode ? (
          <VideoSelector
            mode="playlist"
            selectedVideoIds={formData.videoIds || []}
            onVideoIdsChange={(videoIds) => setFormData({ ...formData, videoIds })}
            label="Playlist Videos"
            suggestedTitle={formData.title}
            allowCreate={false}
            allowReorder={true}
          />
        ) : formData.source === 'mux' ? (
          <div>
            <label className="block text-sm font-medium mb-1">Upload Video to Mux *</label>
            {formData.muxPlaybackId ? (
              <div className="border border-border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-600">Video uploaded successfully</p>
                    <p className="text-xs text-muted-foreground">Asset ID: {formData.muxAssetId}</p>
                    <p className="text-xs text-muted-foreground">Playback ID: {formData.muxPlaybackId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      muxAssetId: undefined,
                      muxPlaybackId: undefined,
                      muxAssetStatus: undefined,
                    })}
                    className="px-3 py-1 text-sm text-destructive hover:text-destructive/70"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <MuxUpload
                onUploadComplete={handleMuxUploadComplete}
                title={formData.title}
                description={formData.description}
              />
            )}

            {/* Custom Thumbnail Upload for Mux Videos */}
            {formData.muxPlaybackId && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Custom Thumbnail (Optional)</label>
                <div className="space-y-3">
                  {customThumbnail ? (
                    <div className="relative">
                      <div className="relative w-full aspect-video rounded-lg border border-border overflow-hidden">
                        <Image
                          src={customThumbnail}
                          alt="Custom thumbnail preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomThumbnail(null)}
                        className="absolute top-2 right-2 px-3 py-1 bg-destructive text-destructive-foreground rounded-md text-sm hover:bg-destructive/90"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <FileUpload
                      onFileSelect={handleThumbnailUpload}
                      accept="image/*"
                      maxSizeMB={2}
                      label="Select Thumbnail"
                      description="Drag and drop an image or click to browse (PNG, JPG up to 2MB)"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {customThumbnail
                      ? 'This custom thumbnail will be saved when you commit changes.'
                      : 'If not uploaded, Mux will generate a thumbnail automatically during the build process.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">YouTube Video ID *</label>
            <div className="space-y-2">
              {/* Display current YouTube ID */}
              {formData.youtubeId && (
                <div className="px-3 py-2 border border-border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">{formData.youtubeId}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, youtubeId: undefined })}
                      className="text-destructive hover:text-destructive/70"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Input for YouTube ID */}
              {!formData.youtubeId && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={youtubeIdInput}
                    onChange={(e) => setYoutubeIdInput(e.target.value)}
                    onKeyDown={handleYoutubeIdKeyDown}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                    placeholder="YouTube URL or Video ID (e.g., https://youtube.com/watch?v=... or dQw4w9WgXcQ)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const extractedId = extractYouTubeId(youtubeIdInput);
                      if (extractedId) {
                        setFormData({ ...formData, youtubeId: extractedId });
                        setYoutubeIdInput('');
                      }
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                YouTube URL or Video ID (e.g., https://youtube.com/watch?v=... or dQw4w9WgXcQ)
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={formData.date || ''}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isFree || false}
              onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm font-medium">Free Content (accessible to all users)</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Leave unchecked for premium content (subscribers only). Defaults to premium.
          </p>

          {/* Warning for free playlists with non-free videos */}
          {freePlaylistWarning && (
            <div className="mt-3 border border-yellow-500/50 bg-yellow-500/10 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-500">
                    Free Playlist Warning
                  </p>
                  <p className="text-sm text-yellow-700/90 dark:text-yellow-500/90 mt-1">
                    This playlist is marked as <strong>free</strong> but contains <strong>{freePlaylistWarning.count} premium video{freePlaylistWarning.count > 1 ? 's' : ''}</strong> out of {freePlaylistWarning.total} total.
                    Premium videos will not show in a free playlist.
                  </p>
                  {freePlaylistWarning.count <= 3 && (
                    <ul className="text-xs text-yellow-700/80 dark:text-yellow-500/80 mt-2 space-y-1 list-disc list-inside">
                      {freePlaylistWarning.titles.map((title, i) => (
                        <li key={i}>{title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <MultiCategorySelector
          categories={formData.categories || []}
          onChange={(categories) => setFormData({ ...formData, categories })}
        />

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Save to Local Storage
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Changes are saved to browser storage. Click the commit button to push to GitHub.
        </p>
      </div>
    </Modal>
  );
}
