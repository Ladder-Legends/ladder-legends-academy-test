'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Modal } from '@/components/ui/modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useMergedContent } from '@/hooks/use-merged-content';
import { Video, VideoRace } from '@/types/video';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { videos } from '@/lib/data';
import { MuxUpload } from './mux-upload';
import { VideoSelector } from './video-selector-enhanced';
import { extractYouTubeId } from '@/lib/youtube-parser';
import { MultiCategorySelector } from './multi-category-selector';
import { FileUpload } from './file-upload';
import { FormField } from './form-field';
import { EditModalFooter } from './edit-modal-footer';
import { CoachSearchDropdown } from '@/components/shared/coach-search-dropdown';
import { getCoachForUser } from '@/lib/coach-utils';

interface VideoEditModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

const raceOptions = [
  { value: 'none', label: 'None / Not Applicable' },
  { value: 'terran', label: 'Terran' },
  { value: 'zerg', label: 'Zerg' },
  { value: 'protoss', label: 'Protoss' },
  { value: 'all', label: 'All Races' },
];

export function VideoEditModal({ video, isOpen, onClose, isNew = false }: VideoEditModalProps) {
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const mergedVideos = useMergedContent(videos as Video[], 'videos');
  const [formData, setFormData] = useState<Partial<Video>>({});
  const [youtubeIdInput, setYoutubeIdInput] = useState('');
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const [isPlaylistMode, setIsPlaylistMode] = useState(false);

  // Get default coach for logged-in user
  const defaultCoach = useMemo(() =>
    getCoachForUser(session?.user?.discordId, session?.user?.name ?? undefined),
    [session?.user?.discordId, session?.user?.name]
  );

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

  useEffect(() => {
    if (!isOpen) return;

    if (video) {
      setFormData(video);
      setIsPlaylistMode(video.source === 'playlist');
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        source: 'youtube',
        date: new Date().toISOString().split('T')[0],
        tags: [],
        race: 'terran',
        coach: defaultCoach?.name ?? '',
        coachId: defaultCoach?.id ?? '',
        isFree: false,
      });
      setIsPlaylistMode(false);
    }
    setYoutubeIdInput('');
   
  }, [video, isNew, isOpen, defaultCoach]);

  const updateField = <K extends keyof Video>(field: K, value: Video[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMuxUploadComplete = (assetId: string, playbackId: string) => {
    setFormData(prev => ({
      ...prev,
      source: 'mux',
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      muxAssetStatus: 'ready',
      thumbnail: `/thumbnails/${prev.id}.jpg`,
    }));
    toast.success('Mux video linked successfully');
  };

  const handleYoutubeIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addYoutubeId();
    }
  };

  const addYoutubeId = () => {
    const extractedId = extractYouTubeId(youtubeIdInput);
    if (extractedId) {
      updateField('youtubeId', extractedId);
      setYoutubeIdInput('');
    }
  };

  const handleThumbnailUpload = async (file: File) => {
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

    if (!formData.id || !formData.title) {
      toast.error('Please fill in all required fields (Title)');
      return;
    }

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
      videoData = {
        id: formData.id,
        title: formData.title,
        description: formData.description || '',
        source: 'playlist',
        videoIds: formData.videoIds || [],
        thumbnail: formData.thumbnail || '/placeholder-thumbnail.jpg',
        date: formData.date || new Date().toISOString().split('T')[0],
        categories: formData.categories || [],
        tags: formData.tags || [],
        race: formData.race || 'terran',
        coach: formData.coach || '',
        coachId: formData.coachId || '',
        isFree: formData.isFree || false,
      };
    } else if (isMuxVideo) {
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
        categories: formData.categories || [],
        tags: formData.tags || [],
        race: formData.race || 'terran',
        coach: formData.coach || '',
        coachId: formData.coachId || '',
        isFree: false,
      };
    } else {
      videoData = {
        id: formData.id,
        title: formData.title,
        description: formData.description || '',
        source: 'youtube',
        youtubeId: formData.youtubeId!,
        thumbnail: `https://img.youtube.com/vi/${formData.youtubeId}/hqdefault.jpg`,
        date: formData.date || new Date().toISOString().split('T')[0],
        categories: formData.categories || [],
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
      data: videoData,
    });

    if (isMuxVideo && customThumbnail) {
      addChange({
        id: `thumbnail-${videoData.id}`,
        contentType: 'file',
        operation: 'create',
        data: {
          path: `public/thumbnails/${videoData.id}.jpg`,
          content: customThumbnail,
        },
      });
    }

    toast.success(`Video ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Video' : 'Edit Video'} size="lg">
      <div className="space-y-4">
        <FormField
          label="Title"
          required
          type="text"
          inputProps={{
            value: formData.title || '',
            onChange: (e) => updateField('title', e.target.value),
            placeholder: 'Hino Ladder VOD - ZvT Masterclass',
            autoFocus: true,
          }}
        />

        <FormField
          label="Description"
          type="textarea"
          rows={3}
          inputProps={{
            value: formData.description || '',
            onChange: (e) => updateField('description', e.target.value),
            placeholder: 'Description of the video content...',
          }}
        />

        {/* Video Type Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Video Type *</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsPlaylistMode(false);
                updateField('source', 'youtube');
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
                updateField('source', 'mux');
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
                updateField('source', 'playlist');
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
          <FormField
            label="Race"
            type="select"
            options={raceOptions}
            inputProps={{
              value: formData.race || 'none',
              onChange: (e) => updateField('race', e.target.value as VideoRace),
            }}
          />
          <CoachSearchDropdown
            label="Coach"
            value={formData.coach || ''}
            coachId={formData.coachId || ''}
            onSelect={(name, id) => {
              updateField('coach', name);
              updateField('coachId', id);
            }}
            onClear={() => {
              updateField('coach', '');
              updateField('coachId', '');
            }}
          />
        </div>

        {/* Conditional Video Input */}
        {isPlaylistMode ? (
          <VideoSelector
            mode="playlist"
            selectedVideoIds={formData.videoIds || []}
            onVideoIdsChange={(videoIds) => updateField('videoIds', videoIds)}
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
                    <p className="text-sm font-medium text-foreground">Video uploaded successfully</p>
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
              {formData.youtubeId && (
                <div className="px-3 py-2 border border-border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">{formData.youtubeId}</span>
                    <button
                      type="button"
                      onClick={() => updateField('youtubeId', undefined)}
                      className="text-destructive hover:text-destructive/70"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

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
                    onClick={addYoutubeId}
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

        <FormField
          label="Date"
          type="date"
          inputProps={{
            value: formData.date || '',
            onChange: (e) => updateField('date', e.target.value),
          }}
        />

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isFree || false}
              onChange={(e) => updateField('isFree', e.target.checked)}
              disabled={!!formData.muxPlaybackId}
              className="w-4 h-4 rounded border-border disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium">Free Content (accessible to all users)</span>
          </label>
          {formData.muxPlaybackId ? (
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Mux videos are ALWAYS premium content. This cannot be changed.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Leave unchecked for premium content (subscribers only). Defaults to premium.
            </p>
          )}

          {freePlaylistWarning && (
            <div className="mt-3 border border-border bg-muted rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Free Playlist Warning</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This playlist is marked as <strong>free</strong> but contains <strong>{freePlaylistWarning.count} premium video{freePlaylistWarning.count > 1 ? 's' : ''}</strong> out of {freePlaylistWarning.total} total.
                    Premium videos will not show in a free playlist.
                  </p>
                  {freePlaylistWarning.count <= 3 && (
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
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
          onChange={(categories) => updateField('categories', categories)}
        />

        <EditModalFooter
          onSave={handleSave}
          onCancel={onClose}
          isNew={isNew}
        />
      </div>
    </Modal>
  );
}
