'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Video, VideoRace } from '@/types/video';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import videos from '@/data/videos.json';
import coaches from '@/data/coaches.json';
import { MuxUpload } from './mux-upload';

interface VideoEditModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function VideoEditModal({ video, isOpen, onClose, isNew = false }: VideoEditModalProps) {
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<Video>>({});
  const [tagInput, setTagInput] = useState('');
  const [coachSearch, setCoachSearch] = useState('');
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [youtubeIdInput, setYoutubeIdInput] = useState('');

  // Get all unique tags from existing videos for autocomplete
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    videos.forEach(v => v.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);

  // Filter tags based on input
  const filteredTags = useMemo(() => {
    if (!tagInput.trim()) return [];
    const input = tagInput.toLowerCase();
    return allExistingTags
      .filter(tag => tag.toLowerCase().includes(input) && !formData.tags?.includes(tag))
      .slice(0, 5);
  }, [tagInput, allExistingTags, formData.tags]);

  // Filter coaches based on search input
  const filteredCoaches = useMemo(() => {
    if (!coachSearch.trim()) return coaches;
    const search = coachSearch.toLowerCase();
    return coaches.filter(coach =>
      coach.name.toLowerCase().includes(search) ||
      coach.displayName.toLowerCase().includes(search)
    );
  }, [coachSearch]);

  useEffect(() => {
    if (video) {
      setFormData(video);
      setCoachSearch(video.coach || '');
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        source: 'youtube', // Default to YouTube
        youtubeIds: [],
        date: new Date().toISOString().split('T')[0],
        tags: [],
        race: 'terran',
        coach: '',
        coachId: '',
        thumbnailVideoIndex: 0,
        isFree: false, // Default to premium
      });
      setCoachSearch('');
    }
    setTagInput('');
    setYoutubeIdInput('');
  }, [video, isNew, isOpen]);

  const handleMuxUploadComplete = (assetId: string, playbackId: string) => {
    setFormData({
      ...formData,
      source: 'mux',
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      muxAssetStatus: 'ready',
      // Generate a Mux thumbnail URL
      thumbnail: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
    });
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

  const addYoutubeId = (ytId: string) => {
    const trimmedId = ytId.trim();
    if (trimmedId && !formData.youtubeIds?.includes(trimmedId)) {
      setFormData({ ...formData, youtubeIds: [...(formData.youtubeIds || []), trimmedId] });
    }
    setYoutubeIdInput('');
  };

  const removeYoutubeId = (index: number) => {
    setFormData({
      ...formData,
      youtubeIds: formData.youtubeIds?.filter((_, i) => i !== index) || []
    });
  };

  const handleYoutubeIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (youtubeIdInput.trim()) {
        addYoutubeId(youtubeIdInput);
      }
    }
  };

  const handleSave = () => {
    const isMuxVideo = formData.source === 'mux';
    const hasYoutubeIds = formData.youtubeIds && formData.youtubeIds.length > 0;
    const hasYoutubeId = formData.youtubeId;
    const hasMuxVideo = formData.muxPlaybackId && formData.muxAssetId;

    // Validate required fields based on source
    if (!formData.id || !formData.title || !formData.race || !formData.coach || !formData.coachId) {
      toast.error('Please fill in all required fields (Title, Race, Coach)');
      return;
    }

    // Validate video source
    if (isMuxVideo && !hasMuxVideo) {
      toast.error('Please upload a video to Mux or switch to YouTube');
      return;
    } else if (!isMuxVideo && !hasYoutubeIds && !hasYoutubeId) {
      toast.error('Please add at least one YouTube video ID or switch to Mux');
      return;
    }

    let videoData: Video;

    if (isMuxVideo) {
      // Mux video
      videoData = {
        id: formData.id,
        title: formData.title,
        description: formData.description || '',
        source: 'mux',
        muxAssetId: formData.muxAssetId!,
        muxPlaybackId: formData.muxPlaybackId!,
        muxAssetStatus: formData.muxAssetStatus || 'ready',
        thumbnail: formData.thumbnail || `https://image.mux.com/${formData.muxPlaybackId}/thumbnail.jpg`,
        date: formData.date || new Date().toISOString().split('T')[0],
        tags: formData.tags || [],
        race: formData.race!,
        coach: formData.coach,
        coachId: formData.coachId,
        isFree: formData.isFree || false,
      };
    } else {
      // YouTube video
      const thumbnailId = hasYoutubeIds
        ? formData.youtubeIds![formData.thumbnailVideoIndex || 0]
        : formData.youtubeId!;

      videoData = {
        id: formData.id,
        title: formData.title,
        description: formData.description || '',
        source: 'youtube',
        thumbnail: `https://img.youtube.com/vi/${thumbnailId}/hqdefault.jpg`,
        date: formData.date || new Date().toISOString().split('T')[0],
        tags: formData.tags || [],
        race: formData.race!,
        coach: formData.coach,
        coachId: formData.coachId,
        isFree: formData.isFree || false,
      };

      // Add the appropriate YouTube ID format
      if (hasYoutubeIds) {
        videoData.youtubeIds = formData.youtubeIds;
        videoData.thumbnailVideoIndex = formData.thumbnailVideoIndex || 0;
      } else {
        videoData.youtubeId = formData.youtubeId;
      }
    }

    addChange({
      id: videoData.id,
      contentType: 'videos',
      operation: isNew ? 'create' : 'update',
      data: videoData as unknown as Record<string, unknown>,
    });

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

        {/* Video Source Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Video Source *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, source: 'youtube' })}
              className={`px-4 py-2 border rounded-md transition-colors ${
                (formData.source || 'youtube') === 'youtube'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              YouTube
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, source: 'mux' })}
              className={`px-4 py-2 border rounded-md transition-colors ${
                formData.source === 'mux'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              Mux (Upload)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Race *</label>
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
            <label className="block text-sm font-medium mb-1">Coach *</label>
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

        {/* Conditional Video Input - YouTube or Mux */}
        {formData.source === 'mux' ? (
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
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">
              YouTube Video(s) *
              {formData.youtubeIds && formData.youtubeIds.length > 1 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Playlist with {formData.youtubeIds.length} videos)
                </span>
              )}
            </label>
            <div className="space-y-2">
            {/* Display existing youtubeId (for backwards compatibility with old videos) */}
            {formData.youtubeId && !formData.youtubeIds?.length && (
              <div className="px-3 py-2 border border-border rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">{formData.youtubeId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Convert to youtubeIds format
                      setFormData({
                        ...formData,
                        youtubeIds: [formData.youtubeId!],
                        youtubeId: undefined,
                      });
                    }}
                    className="text-xs text-primary hover:text-primary/70"
                  >
                    Convert to Playlist
                  </button>
                </div>
              </div>
            )}

            {/* Display youtubeIds list */}
            {formData.youtubeIds && formData.youtubeIds.length > 0 && (
              <div className="space-y-2">
                {formData.youtubeIds.map((ytId, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-muted/50"
                  >
                    <span className="text-sm text-muted-foreground font-medium w-6">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-sm font-mono">{ytId}</span>
                    {index === (formData.thumbnailVideoIndex || 0) && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Thumbnail
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, thumbnailVideoIndex: index })}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Set as Thumbnail
                    </button>
                    <button
                      type="button"
                      onClick={() => removeYoutubeId(index)}
                      className="text-destructive hover:text-destructive/70"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input for adding new YouTube IDs (only show if using youtubeIds format or new video) */}
            {(!formData.youtubeId || formData.youtubeIds) && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={youtubeIdInput}
                  onChange={(e) => setYoutubeIdInput(e.target.value)}
                  onKeyDown={handleYoutubeIdKeyDown}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                  placeholder="dQw4w9WgXcQ (press Enter to add)"
                />
                <button
                  type="button"
                  onClick={() => youtubeIdInput.trim() && addYoutubeId(youtubeIdInput)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              The ID from the YouTube URL (e.g., youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>).
              Add multiple videos to create a playlist.
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tags</label>
          <div className="space-y-2">
            {/* Selected tags */}
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-primary/70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input with autocomplete */}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => setShowTagDropdown(true)}
                onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="Type to add tags (press Enter)"
              />

              {/* Autocomplete dropdown */}
              {showTagDropdown && filteredTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Common tags: hino, groovy, zerg, terran, protoss, zvt, zvp, zvz, etc.
            </p>
          </div>
        </div>

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
