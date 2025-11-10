'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useMergedContent } from '@/hooks/use-merged-content';
import { Masterclass, Race } from '@/types/masterclass';
import { Difficulty } from '@/types/video';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import masterclasses from '@/data/masterclasses.json';
import coaches from '@/data/coaches.json';
import videosJson from '@/data/videos.json';
import replaysJson from '@/data/replays.json';
import buildOrdersJson from '@/data/build-orders.json';
import { Video } from '@/types/video';
import { Replay } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import { VideoSelector } from './video-selector-enhanced';
import { MultiCategorySelector } from './multi-category-selector';

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
  const [replaySearch, setReplaySearch] = useState('');
  const [showReplayDropdown, setShowReplayDropdown] = useState(false);
  const [buildOrderSearch, setBuildOrderSearch] = useState('');
  const [showBuildOrderDropdown, setShowBuildOrderDropdown] = useState(false);

  // Merge static content with pending changes
  const allVideos = useMergedContent(videosJson as Video[], 'videos');
  const allReplays = useMergedContent(replaysJson as Replay[], 'replays');
  const allBuildOrders = useMergedContent(buildOrdersJson as BuildOrder[], 'build-orders');

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

  // Filter replays based on search input
  const filteredReplays = useMemo(() => {
    if (!replaySearch.trim()) return allReplays.slice(0, 10);
    const search = replaySearch.toLowerCase();
    return allReplays.filter(replay =>
      replay.title.toLowerCase().includes(search) ||
      replay.matchup.toLowerCase().includes(search) ||
      replay.map.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [replaySearch, allReplays]);

  // Filter build orders based on search input
  const filteredBuildOrders = useMemo(() => {
    if (!buildOrderSearch.trim()) return allBuildOrders.slice(0, 10);
    const search = buildOrderSearch.toLowerCase();
    return allBuildOrders.filter(buildOrder =>
      buildOrder.name.toLowerCase().includes(search) ||
      buildOrder.race.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [buildOrderSearch, allBuildOrders]);

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
        difficulty: 'basic',
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

    // Validate that masterclass has at least one video
    if (!formData.videoIds || formData.videoIds.length === 0) {
      toast.error('Please add at least one video to the masterclass');
      return;
    }

    // Validate that all videoIds reference existing videos
    const invalidVideoIds = formData.videoIds.filter(
      id => !allVideos.find(v => v.id === id)
    );
    if (invalidVideoIds.length > 0) {
      toast.error(`Invalid video references found: ${invalidVideoIds.join(', ')}. Please remove them before saving.`);
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
      coach: formData.coach || '',
      coachId: formData.coachId || '',
      race: formData.race || 'all',
      videoIds: formData.videoIds || [],
      replayIds: formData.replayIds || [],
      buildOrderIds: formData.buildOrderIds || [],
      difficulty: formData.difficulty || 'basic',
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
            <label className="block text-sm font-medium mb-1">Race</label>
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
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <select
              value={formData.difficulty || 'basic'}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="basic">Basic</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <VideoSelector
          mode="playlist"
          selectedVideoIds={formData.videoIds || []}
          onVideoIdsChange={(videoIds) => setFormData({ ...formData, videoIds })}
          label="Videos"
          suggestedTitle={formData.title ? `${formData.title}${formData.coach ? ` - ${formData.coach}` : ''}` : ''}
          suggestedRace={formData.race}
          suggestedCoach={formData.coach}
          suggestedCoachId={formData.coachId}
        />

        {/* Replay Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Linked Replays (Optional)</label>

          {/* Selected Replays */}
          {formData.replayIds && formData.replayIds.length > 0 && (
            <div className="mb-2 space-y-2">
              {formData.replayIds.map((replayId) => {
                const replay = allReplays.find(r => r.id === replayId);
                if (!replay) return null;
                return (
                  <div key={replayId} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md border border-border">
                    <div>
                      <p className="text-sm font-medium">{replay.title}</p>
                      <p className="text-xs text-muted-foreground">{replay.matchup} • {replay.map}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          replayIds: formData.replayIds?.filter(id => id !== replayId) || []
                        });
                      }}
                      className="text-destructive hover:text-destructive/70"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Replay Search Input */}
          <div className="relative">
            <input
              type="text"
              value={replaySearch}
              onChange={(e) => {
                setReplaySearch(e.target.value);
                setShowReplayDropdown(true);
              }}
              onFocus={() => setShowReplayDropdown(true)}
              onBlur={() => setTimeout(() => setShowReplayDropdown(false), 200)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="Search replays by title, matchup, or map..."
            />

            {/* Replay Dropdown */}
            {showReplayDropdown && filteredReplays.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredReplays.map((replay) => {
                  const isSelected = formData.replayIds?.includes(replay.id);
                  return (
                    <button
                      key={replay.id}
                      type="button"
                      onClick={() => {
                        if (!isSelected) {
                          setFormData({
                            ...formData,
                            replayIds: [...(formData.replayIds || []), replay.id]
                          });
                        }
                        setReplaySearch('');
                        setShowReplayDropdown(false);
                      }}
                      disabled={isSelected}
                      className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 ${
                        isSelected ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">{replay.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {replay.matchup} • {replay.map} • {replay.duration}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Build Order Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Linked Build Orders (Optional)</label>

          {/* Selected Build Orders */}
          {formData.buildOrderIds && formData.buildOrderIds.length > 0 && (
            <div className="mb-2 space-y-2">
              {formData.buildOrderIds.map((buildOrderId) => {
                const buildOrder = allBuildOrders.find(bo => bo.id === buildOrderId);
                if (!buildOrder) return null;
                return (
                  <div key={buildOrderId} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md border border-border">
                    <div>
                      <p className="text-sm font-medium">{buildOrder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {buildOrder.race} vs {buildOrder.vsRace} • {buildOrder.difficulty}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          buildOrderIds: formData.buildOrderIds?.filter(id => id !== buildOrderId) || []
                        });
                      }}
                      className="text-destructive hover:text-destructive/70"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Build Order Search Input */}
          <div className="relative">
            <input
              type="text"
              value={buildOrderSearch}
              onChange={(e) => {
                setBuildOrderSearch(e.target.value);
                setShowBuildOrderDropdown(true);
              }}
              onFocus={() => setShowBuildOrderDropdown(true)}
              onBlur={() => setTimeout(() => setShowBuildOrderDropdown(false), 200)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="Search build orders by name or race..."
            />

            {/* Build Order Dropdown */}
            {showBuildOrderDropdown && filteredBuildOrders.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredBuildOrders.map((buildOrder) => {
                  const isSelected = formData.buildOrderIds?.includes(buildOrder.id);
                  return (
                    <button
                      key={buildOrder.id}
                      type="button"
                      onClick={() => {
                        if (!isSelected) {
                          setFormData({
                            ...formData,
                            buildOrderIds: [...(formData.buildOrderIds || []), buildOrder.id]
                          });
                        }
                        setBuildOrderSearch('');
                        setShowBuildOrderDropdown(false);
                      }}
                      disabled={isSelected}
                      className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 ${
                        isSelected ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">{buildOrder.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {buildOrder.race} vs {buildOrder.vsRace} • {buildOrder.difficulty}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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

        <MultiCategorySelector
          categories={formData.categories || []}
          onChange={(categories) => setFormData({ ...formData, categories })}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Tags (legacy - use categories instead)</label>
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
