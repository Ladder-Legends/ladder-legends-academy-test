'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Modal } from '@/components/ui/modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useMergedContent } from '@/hooks/use-merged-content';
import { Masterclass, Race } from '@/types/masterclass';
import { Difficulty } from '@/types/video';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import {
  masterclasses,
  videos as videosJson,
  replays as replaysJson,
  buildOrders as buildOrdersJson,
} from '@/lib/data';
import { Video } from '@/types/video';
import { Replay } from '@/types/replay';
import { BuildOrder } from '@/types/build-order';
import { VideoSelector } from './video-selector-enhanced';
import { MultiCategorySelector } from './multi-category-selector';
import { FormField } from './form-field';
import { TagInput } from './tag-input';
import { EditModalFooter } from './edit-modal-footer';
import { CoachSearchDropdown } from '@/components/shared/coach-search-dropdown';
import { useAutocompleteSearch } from '@/hooks/use-autocomplete-search';
import { getCoachForUser } from '@/lib/coach-utils';

interface MasterclassEditModalProps {
  masterclass: Masterclass | null;
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

const difficultyOptions = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
];

export function MasterclassEditModal({ masterclass, isOpen, onClose, isNew = false }: MasterclassEditModalProps) {
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<Masterclass>>({});

  // Get default coach for logged-in user
  const defaultCoach = useMemo(() =>
    getCoachForUser(session?.user?.discordId, session?.user?.name ?? undefined),
    [session?.user?.discordId, session?.user?.name]
  );

  const allVideos = useMergedContent(videosJson as Video[], 'videos');
  const allReplays = useMergedContent(replaysJson as Replay[], 'replays');
  const allBuildOrders = useMergedContent(buildOrdersJson as BuildOrder[], 'build-orders');

  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    masterclasses.forEach(mc => mc.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);

  // Replay search
  const replaySearch = useAutocompleteSearch<Replay>({
    options: allReplays,
    getSearchText: (r) => r.title,
    getSecondarySearchText: (r) => `${r.matchup} ${r.map}`,
    toOption: (r) => ({
      id: r.id,
      label: r.title,
      sublabel: `${r.matchup} • ${r.map} • ${r.duration}`,
      data: r,
    }),
  });

  // Build order search
  const buildOrderSearch = useAutocompleteSearch<BuildOrder>({
    options: allBuildOrders,
    getSearchText: (bo) => bo.name,
    getSecondarySearchText: (bo) => bo.race,
    toOption: (bo) => ({
      id: bo.id,
      label: bo.name,
      sublabel: `${bo.race} vs ${bo.vsRace} • ${bo.difficulty}`,
      data: bo,
    }),
  });

  useEffect(() => {
    if (!isOpen) return;

    if (masterclass) {
      setFormData(masterclass);
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        title: '',
        description: '',
        coach: defaultCoach?.displayName ?? '',
        coachId: defaultCoach?.id ?? '',
        race: 'all',
        videoIds: [],
        difficulty: 'basic',
        tags: [],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        isFree: false,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterclass, isNew, isOpen, defaultCoach]);

  const updateField = <K extends keyof Masterclass>(field: K, value: Masterclass[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.id || !formData.title) {
      toast.error('Please fill in all required fields (Title)');
      return;
    }

    if (!formData.videoIds || formData.videoIds.length === 0) {
      toast.error('Please add at least one video to the masterclass');
      return;
    }

    const invalidVideoIds = formData.videoIds.filter(
      id => !allVideos.find(v => v.id === id)
    );
    if (invalidVideoIds.length > 0) {
      toast.error(`Invalid video references found: ${invalidVideoIds.join(', ')}. Please remove them before saving.`);
      return;
    }

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
      data: masterclassData,
    });

    toast.success(`Masterclass ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  const addReplay = (replayId: string) => {
    if (!formData.replayIds?.includes(replayId)) {
      updateField('replayIds', [...(formData.replayIds || []), replayId]);
    }
    replaySearch.clear();
  };

  const removeReplay = (replayId: string) => {
    updateField('replayIds', formData.replayIds?.filter(id => id !== replayId) || []);
  };

  const addBuildOrder = (buildOrderId: string) => {
    if (!formData.buildOrderIds?.includes(buildOrderId)) {
      updateField('buildOrderIds', [...(formData.buildOrderIds || []), buildOrderId]);
    }
    buildOrderSearch.clear();
  };

  const removeBuildOrder = (buildOrderId: string) => {
    updateField('buildOrderIds', formData.buildOrderIds?.filter(id => id !== buildOrderId) || []);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Masterclass' : 'Edit Masterclass'} size="lg">
      <div className="space-y-4">
        <FormField
          label="Title"
          required
          type="text"
          inputProps={{
            value: formData.title || '',
            onChange: (e) => updateField('title', e.target.value),
            placeholder: "Hino's Complete Zerg Fundamentals",
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
            placeholder: 'Comprehensive series covering everything from injects to late-game compositions...',
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Race"
            type="select"
            options={raceOptions}
            inputProps={{
              value: formData.race || 'none',
              onChange: (e) => updateField('race', e.target.value as Race),
            }}
          />
          <FormField
            label="Difficulty"
            type="select"
            options={difficultyOptions}
            inputProps={{
              value: formData.difficulty || 'basic',
              onChange: (e) => updateField('difficulty', e.target.value as Difficulty),
            }}
          />
        </div>

        <VideoSelector
          mode="playlist"
          selectedVideoIds={formData.videoIds || []}
          onVideoIdsChange={(videoIds) => updateField('videoIds', videoIds)}
          label="Videos"
          suggestedTitle={formData.title ? `${formData.title}${formData.coach ? ` - ${formData.coach}` : ''}` : ''}
          suggestedRace={formData.race}
          suggestedCoach={formData.coach}
          suggestedCoachId={formData.coachId}
        />

        {/* Replay Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Linked Replays (Optional)</label>

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
                    <button type="button" onClick={() => removeReplay(replayId)} className="text-destructive hover:text-destructive/70">×</button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={replaySearch.search}
              onChange={(e) => replaySearch.setSearch(e.target.value)}
              onFocus={replaySearch.handleFocus}
              onBlur={replaySearch.handleBlur}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="Search replays by title, matchup, or map..."
            />
            {replaySearch.showDropdown && replaySearch.filteredOptions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {replaySearch.filteredOptions.map((option) => {
                  const isSelected = formData.replayIds?.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => !isSelected && addReplay(option.id)}
                      disabled={isSelected}
                      className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 ${isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.sublabel}</div>
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

          {formData.buildOrderIds && formData.buildOrderIds.length > 0 && (
            <div className="mb-2 space-y-2">
              {formData.buildOrderIds.map((buildOrderId) => {
                const buildOrder = allBuildOrders.find(bo => bo.id === buildOrderId);
                if (!buildOrder) return null;
                return (
                  <div key={buildOrderId} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md border border-border">
                    <div>
                      <p className="text-sm font-medium">{buildOrder.name}</p>
                      <p className="text-xs text-muted-foreground">{buildOrder.race} vs {buildOrder.vsRace} • {buildOrder.difficulty}</p>
                    </div>
                    <button type="button" onClick={() => removeBuildOrder(buildOrderId)} className="text-destructive hover:text-destructive/70">×</button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={buildOrderSearch.search}
              onChange={(e) => buildOrderSearch.setSearch(e.target.value)}
              onFocus={buildOrderSearch.handleFocus}
              onBlur={buildOrderSearch.handleBlur}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="Search build orders by name or race..."
            />
            {buildOrderSearch.showDropdown && buildOrderSearch.filteredOptions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {buildOrderSearch.filteredOptions.map((option) => {
                  const isSelected = formData.buildOrderIds?.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => !isSelected && addBuildOrder(option.id)}
                      disabled={isSelected}
                      className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 ${isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.sublabel}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <FormField
          label="Date"
          type="date"
          inputProps={{
            value: formData.createdAt || '',
            onChange: (e) => updateField('createdAt', e.target.value),
          }}
        />

        <FormField
          label="Free Content"
          type="checkbox"
          checkboxLabel="Free Content (accessible to all users)"
          inputProps={{
            checked: formData.isFree || false,
            onChange: (e) => updateField('isFree', (e.target as HTMLInputElement).checked),
          }}
          helpText="Leave unchecked for premium content (subscribers only). Defaults to premium."
        />

        <MultiCategorySelector
          categories={formData.categories || []}
          onChange={(categories) => updateField('categories', categories)}
        />

        <TagInput
          tags={formData.tags || []}
          onChange={(tags) => updateField('tags', tags)}
          existingTags={allExistingTags}
          label="Tags (legacy - use categories instead)"
          placeholder="Type to add tags (press Enter)"
          helpText="Common tags: fundamentals, zerg, terran, protoss, macro, micro, strategy, etc."
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
