'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { BuildOrder, BuildOrderStep, Race, VsRace, Difficulty, BuildType } from '@/types/build-order';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import buildOrders from '@/data/build-orders.json';
import coaches from '@/data/coaches.json';
import videos from '@/data/videos.json';
import { Video } from '@/types/video';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import type { SC2AnalysisResponse, SC2ReplayPlayer, SC2BuildOrderEvent } from '@/lib/sc2reader-client';
import { VideoSelector } from './video-selector';

interface BuildOrderEditModalProps {
  buildOrder: BuildOrder | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function BuildOrderEditModal({ buildOrder, isOpen, onClose, isNew = false }: BuildOrderEditModalProps) {
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<BuildOrder>>({});
  const [tagInput, setTagInput] = useState('');
  const [coachSearch, setCoachSearch] = useState('');
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);
  const [typeInput, setTypeInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [replayAnalysisData, setReplayAnalysisData] = useState<SC2AnalysisResponse | null>(null);
  const [selectedPlayerForImport, setSelectedPlayerForImport] = useState<string | null>(null);

  // Get all unique tags from existing build orders for autocomplete
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    buildOrders.forEach(bo => bo.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);

  // Get all unique types from existing build orders for autocomplete
  const allExistingTypes = useMemo(() => {
    const typeSet = new Set<string>();
    buildOrders.forEach(bo => typeSet.add(bo.type));
    return Array.from(typeSet).sort();
  }, []);

  // Filter tags based on input
  const filteredTags = useMemo(() => {
    if (!tagInput.trim()) return [];
    const input = tagInput.toLowerCase();
    return allExistingTags
      .filter(tag => tag.toLowerCase().includes(input) && !formData.tags?.includes(tag))
      .slice(0, 5);
  }, [tagInput, allExistingTags, formData.tags]);

  // Filter types based on input
  const filteredTypes = useMemo(() => {
    if (!typeInput.trim()) return allExistingTypes;
    const input = typeInput.toLowerCase();
    return allExistingTypes
      .filter(type => type.toLowerCase().includes(input))
      .slice(0, 5);
  }, [typeInput, allExistingTypes]);

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
    if (buildOrder) {
      setFormData(buildOrder);
      setCoachSearch(buildOrder.coach || '');
      setTypeInput(buildOrder.type || '');
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        name: '',
        race: 'terran',
        vsRace: 'terran',
        type: 'macro',
        difficulty: 'beginner',
        coach: '',
        coachId: '',
        description: '',
        videoId: '',
        steps: [],
        tags: [],
        patch: '',
        updatedAt: new Date().toISOString().split('T')[0],
        isFree: false,
      });
      setCoachSearch('');
      setTypeInput('macro');
    }
    setTagInput('');
  }, [buildOrder, isNew, isOpen]);

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
      coach: undefined,
      coachId: undefined,
    });
    setCoachSearch('');
    setShowCoachDropdown(false);
  };

  const addStep = () => {
    const newStep: BuildOrderStep = {
      supply: 0,
      action: '',
    };
    setFormData({
      ...formData,
      steps: [...(formData.steps || []), newStep]
    });
  };

  const updateStep = (index: number, field: keyof BuildOrderStep, value: string | number) => {
    const steps = [...(formData.steps || [])];
    steps[index] = { ...steps[index], [field]: value };
    setFormData({ ...formData, steps });
  };

  const removeStep = (index: number) => {
    const steps = [...(formData.steps || [])];
    steps.splice(index, 1);
    setFormData({ ...formData, steps });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const steps = [...(formData.steps || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    setFormData({ ...formData, steps });
  };

  const handleReplayFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith('.SC2Replay')) {
      toast.error('Invalid file type. Only .SC2Replay files are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds maximum allowed size of 5MB');
      return;
    }

    setIsAnalyzing(true);
    setReplayAnalysisData(null);
    setSelectedPlayerForImport(null);

    try {
      const analyzeFormData = new FormData();
      analyzeFormData.append('file', file);

      const response = await fetch('/api/analyze-replay', {
        method: 'POST',
        body: analyzeFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      setReplayAnalysisData(data);
      toast.success('Replay analyzed! Select a player to import their build order.');
    } catch (error) {
      console.error('Error analyzing replay:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze replay');
    } finally {
      setIsAnalyzing(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const importBuildOrderFromPlayer = (playerName: string) => {
    if (!replayAnalysisData) return;

    const { metadata, build_orders } = replayAnalysisData;
    const playerData = metadata.players.find((p: SC2ReplayPlayer) => p.name === playerName);
    const buildOrderEvents = build_orders[playerName] || [];

    if (!playerData) {
      toast.error('Player not found in replay data');
      return;
    }

    // Format time from seconds to MM:SS
    const formatTime = (seconds: string | number) => {
      const secs = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
      const mins = Math.floor(secs / 60);
      const remainingSecs = Math.floor(secs % 60);
      return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    // Filter and convert events to build order steps
    const steps: BuildOrderStep[] = buildOrderEvents
      .filter((event: SC2BuildOrderEvent) => {
        const action = event.event === 'upgrade'
          ? `Upgrade: ${event.upgrade || 'Unknown'}`
          : event.unit || 'Unknown';
        // Filter out Unknown and Spray events
        return action !== 'Unknown' && !action.includes('Spray');
      })
      .map((event: SC2BuildOrderEvent) => ({
        supply: event.supply,
        time: formatTime(event.time),
        action: event.event === 'upgrade'
          ? `Upgrade: ${event.upgrade || 'Unknown'}`
          : event.unit || 'Unknown',
        notes: undefined,
      }));

    // Normalize race
    const normalizeRace = (race: string): Race => race.toLowerCase() as Race;

    // Auto-populate form with replay data
    setFormData({
      ...formData,
      name: formData.name || `${playerData.name} ${metadata.map_name} Build`,
      race: normalizeRace(playerData.race),
      steps: steps,
      patch: metadata.release_string || formData.patch,
    });

    setSelectedPlayerForImport(playerName);
    toast.success(`Imported ${steps.length} build order steps from ${playerName}'s replay!`);
  };

  const handleSave = () => {
    if (!formData.id || !formData.name || !formData.coach || !formData.coachId) {
      toast.error('Please fill in all required fields (Name, Coach, Coach ID)');
      return;
    }

    if (!formData.steps || formData.steps.length === 0) {
      toast.error('Please add at least one build order step');
      return;
    }

    const buildOrderData: BuildOrder = {
      id: formData.id,
      name: formData.name,
      race: formData.race || 'terran',
      vsRace: formData.vsRace || 'terran',
      type: (typeInput.trim() as BuildType) || 'macro',
      difficulty: formData.difficulty || 'beginner',
      coach: formData.coach,
      coachId: formData.coachId,
      description: formData.description || '',
      videoId: formData.videoId,
      steps: formData.steps,
      tags: formData.tags || [],
      patch: formData.patch,
      updatedAt: new Date().toISOString().split('T')[0],
      isFree: formData.isFree || false,
    };

    addChange({
      id: buildOrderData.id,
      contentType: 'build-orders',
      operation: isNew ? 'create' : 'update',
      data: buildOrderData as unknown as Record<string, unknown>,
    });

    // If there's a linked video, update it with build order metadata
    if (formData.videoId) {
      const existingVideo = (videos as Video[]).find(v => v.id === formData.videoId);
      if (existingVideo) {
        const updatedVideo: Video = {
          ...existingVideo,
          title: formData.name, // Use build order name as title
          tags: Array.from(new Set([...(existingVideo.tags || []), 'build-order'])), // Add 'build-order' tag
          race: formData.race || existingVideo.race, // Use build order race
        };

        addChange({
          id: updatedVideo.id,
          contentType: 'videos',
          operation: 'update',
          data: updatedVideo as unknown as Record<string, unknown>,
        });
      }
    }

    toast.success(`Build order ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Build Order' : 'Edit Build Order'} size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="3 Hatch Roach Timing"
              autoFocus
            />
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

        <VideoSelector
          selectedVideoId={formData.videoId}
          onVideoSelect={(videoId) => setFormData({ ...formData, videoId })}
          label="Video"
          suggestedTitle={formData.name}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            rows={2}
            placeholder="Description of the build order..."
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

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Race *</label>
            <select
              value={formData.race || 'terran'}
              onChange={(e) => setFormData({ ...formData, race: e.target.value as Race })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="terran">Terran</option>
              <option value="zerg">Zerg</option>
              <option value="protoss">Protoss</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">vs Race *</label>
            <select
              value={formData.vsRace || 'terran'}
              onChange={(e) => setFormData({ ...formData, vsRace: e.target.value as VsRace })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="terran">Terran</option>
              <option value="zerg">Zerg</option>
              <option value="protoss">Protoss</option>
              <option value="all">All</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <div className="relative">
              <input
                type="text"
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                onFocus={() => setShowTypeDropdown(true)}
                onBlur={() => setTimeout(() => setShowTypeDropdown(false), 200)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="macro, all-in, timing..."
              />
              {/* Type autocomplete dropdown */}
              {showTypeDropdown && filteredTypes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTypeInput(type)}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm capitalize"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Difficulty *</label>
            <select
              value={formData.difficulty || 'beginner'}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Patch</label>
          <input
            type="text"
            value={formData.patch || ''}
            onChange={(e) => setFormData({ ...formData, patch: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="5.0.14"
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
          </div>
        </div>

        {/* Import from Replay Section */}
        <div className="border border-border rounded-md p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3">Import from Replay (Optional)</h3>
          <div className="space-y-3">
            <div>
              <label className="block">
                <input
                  type="file"
                  accept=".SC2Replay"
                  onChange={handleReplayFileSelect}
                  disabled={isAnalyzing}
                  className="hidden"
                />
                <span className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border-2 transition-colors cursor-pointer ${
                  isAnalyzing
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-primary text-primary bg-transparent hover:bg-primary/10'
                }`}>
                  {isAnalyzing ? 'Analyzing...' : 'Upload Replay to Import Build Order'}
                </span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a .SC2Replay file to automatically extract build order steps
              </p>
            </div>

            {/* Player Selection */}
            {replayAnalysisData && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Select Player to Import:</label>
                <div className="grid grid-cols-2 gap-2">
                  {replayAnalysisData.metadata.players.map((player: SC2ReplayPlayer) => (
                    <button
                      key={player.name}
                      type="button"
                      onClick={() => importBuildOrderFromPlayer(player.name)}
                      className={`p-3 border-2 rounded-md text-left transition-colors ${
                        selectedPlayerForImport === player.name
                          ? 'border-green-600 bg-green-600/10'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.race} • {player.result} • APM: {player.apm || 'N/A'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Build Order Steps *</label>
            <Button onClick={addStep} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto border border-border rounded-md p-3">
            {formData.steps && formData.steps.length > 0 ? (
              formData.steps.map((step, index) => (
                <div key={index} className="flex gap-2 items-start p-2 bg-muted/30 rounded-md">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveStep(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <MoveUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(index, 'down')}
                      disabled={index === (formData.steps?.length || 0) - 1}
                      className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <MoveDown className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={step.supply}
                        onChange={(e) => updateStep(index, 'supply', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-border rounded-md bg-background text-sm"
                        placeholder="Supply"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={step.time || ''}
                        onChange={(e) => updateStep(index, 'time', e.target.value)}
                        className="w-full px-2 py-1 border border-border rounded-md bg-background text-sm"
                        placeholder="Time (e.g., 3:30)"
                      />
                    </div>
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={step.action}
                        onChange={(e) => updateStep(index, 'action', e.target.value)}
                        className="w-full px-2 py-1 border border-border rounded-md bg-background text-sm"
                        placeholder="Action (e.g., Barracks, Supply Depot)"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={step.notes || ''}
                        onChange={(e) => updateStep(index, 'notes', e.target.value)}
                        className="w-full px-2 py-1 border border-border rounded-md bg-background text-sm"
                        placeholder="Notes"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No steps added yet. Click &quot;Add Step&quot; to begin.
              </p>
            )}
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
