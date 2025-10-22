'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Video } from '@/types/video';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import videos from '@/data/videos.json';

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

  useEffect(() => {
    if (video) {
      setFormData(video);
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        youtubeId: '',
        date: new Date().toISOString().split('T')[0],
        tags: [],
      });
    }
    setTagInput('');
  }, [video, isNew, isOpen]);

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

  const handleSave = () => {
    if (!formData.id || !formData.title || !formData.youtubeId) {
      toast.error('Please fill in all required fields (Title, YouTube ID)');
      return;
    }

    const videoData: Video = {
      id: formData.id,
      title: formData.title,
      description: formData.description || '',
      youtubeId: formData.youtubeId,
      thumbnail: `https://img.youtube.com/vi/${formData.youtubeId}/hqdefault.jpg`,
      date: formData.date || new Date().toISOString().split('T')[0],
      tags: formData.tags || [],
    };

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

        <div>
          <label className="block text-sm font-medium mb-1">YouTube ID *</label>
          <input
            type="text"
            value={formData.youtubeId || ''}
            onChange={(e) => setFormData({ ...formData, youtubeId: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="dQw4w9WgXcQ"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The ID from the YouTube URL (e.g., youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
          </p>
        </div>

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
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="Type to add tags (press Enter)"
              />

              {/* Autocomplete dropdown */}
              {filteredTags.length > 0 && (
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
