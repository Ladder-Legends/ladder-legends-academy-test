'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useMergedContent } from '@/hooks/use-merged-content';
import { Masterclass, Race } from '@/types/masterclass';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import masterclasses from '@/data/masterclasses.json';
import coaches from '@/data/coaches.json';
import videosJson from '@/data/videos.json';
import { Video } from '@/types/video';
import { VideoSelector } from './video-selector-enhanced';

interface MasterclassEditModalProps {
  masterclass: Masterclass | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function MasterclassEditModal({ masterclass, isOpen, onClose, isNew = false }: MasterclassEditModalProps) {
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<Masterclass>>({});
  const [tagInput, setTagInput] = useState('');
  const [coachSearch, setCoachSearch] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);

  // Merge static videos with pending changes
  const allVideos = useMergedContent(videosJson as Video[], 'videos');

  // Get all unique tags from existing masterclasses for autocomplete
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    masterclasses.forEach(mc => mc.tags.forEach(tag => tagSet.add(tag)));
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

    if (masterclass) {
      setFormData(masterclass);
      setCoachSearch(masterclass.coach || '');
    } else if (isNew) {
      // Always generate a fresh UUID when opening in "add new" mode
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        coach: '',
        coachId: '',
        race: 'all',
        videoIds: [],
        difficulty: 'beginner',
        tags: [],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        isFree: false,
      });
      setCoachSearch('');
    }
    setTagInput('');
  }, [masterclass, isNew, isOpen]);

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
        coach: coach.name,
        coachId: coach.id,
      });
      setCoachSearch(coach.name);
    }
  };

  const handleSave = () => {
    if (!formData.id || !formData.title) {
      toast.error('Please fill in all required fields (Title)');
      return;
    }

    // Get thumbnail from the first video if available
    let thumbnail = formData.thumbnail;
    if (!thumbnail && formData.videoIds && formData.videoIds.length > 0) {
      const firstVideo = allVideos.find(v => v.id === formData.videoIds![0]);
      thumbnail = firstVideo?.thumbnail;
    }

    const masterclassData: Masterclass = {
      id: formData.id,
      title: formData.title,
      description: formData.description || '',
      coach: formData.coach,
      coachId: formData.coachId,
      race: formData.race || 'all',
      videoIds: formData.videoIds || [],
      difficulty: formData.difficulty || 'beginner',
      tags: formData.tags || [],
      thumbnail: thumbnail,
      createdAt: formData.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      isFree: formData.isFree || false,
    };

    addChange({
      id: masterclassData.id,
      contentType: 'masterclasses',
      operation: isNew ? 'create' : 'update',
      data: masterclassData as unknown as Record<string, unknown>,
    });

    toast.success(`Masterclass ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Masterclass' : 'Edit Masterclass'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="Hino&apos;s Complete Zerg Fundamentals"
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
            placeholder="Comprehensive series covering everything from injects to late-game compositions..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Coach</label>
          <div className="relative">
            <input
              type="text"
              value={coachSearch}
              onChange={(e) => setCoachSearch(e.target.value)}
              onFocus={() => setShowCoachDropdown(true)}
              onBlur={() => setTimeout(() => setShowCoachDropdown(false), 200)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="Type to search coaches..."
            />

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Race *</label>
            <select
              value={formData.race || 'all'}
              onChange={(e) => setFormData({ ...formData, race: e.target.value as Race })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="terran">Terran</option>
              <option value="zerg">Zerg</option>
              <option value="protoss">Protoss</option>
              <option value="all">All Races</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Difficulty *</label>
            <select
              value={formData.difficulty || 'beginner'}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' | 'all' })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="all">All Levels</option>
            </select>
          </div>
        </div>

        <VideoSelector
          mode="playlist"
          selectedVideoIds={formData.videoIds || []}
          onVideoIdsChange={(videoIds) => setFormData({ ...formData, videoIds })}
          label="Videos"
          suggestedTitle={formData.title}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={formData.createdAt || ''}
            onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
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
              Common tags: fundamentals, zerg, terran, protoss, macro, micro, strategy, etc.
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
