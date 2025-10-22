'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { BuildOrder, BuildOrderStep, Race, Difficulty, BuildType } from '@/types/build-order';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import buildOrders from '@/data/build-orders.json';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';

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

  // Get all unique tags from existing build orders for autocomplete
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    buildOrders.forEach(bo => bo.tags.forEach(tag => tagSet.add(tag)));
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
    if (buildOrder) {
      setFormData(buildOrder);
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
      });
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
      type: formData.type || 'macro',
      difficulty: formData.difficulty || 'beginner',
      coach: formData.coach,
      coachId: formData.coachId,
      description: formData.description || '',
      videoId: formData.videoId,
      steps: formData.steps,
      tags: formData.tags || [],
      patch: formData.patch,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    addChange({
      id: buildOrderData.id,
      contentType: 'build-orders',
      operation: isNew ? 'create' : 'update',
      data: buildOrderData as unknown as Record<string, unknown>,
    });

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
            <input
              type="text"
              value={formData.coach || ''}
              onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="Hino"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Coach ID *</label>
            <input
              type="text"
              value={formData.coachId || ''}
              onChange={(e) => setFormData({ ...formData, coachId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="hino"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Video ID (YouTube)</label>
            <input
              type="text"
              value={formData.videoId || ''}
              onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="dQw4w9WgXcQ"
            />
          </div>
        </div>

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
              onChange={(e) => setFormData({ ...formData, vsRace: e.target.value as Race })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="terran">Terran</option>
              <option value="zerg">Zerg</option>
              <option value="protoss">Protoss</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select
              value={formData.type || 'macro'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as BuildType })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="macro">Macro</option>
              <option value="all-in">All-In</option>
              <option value="timing">Timing</option>
              <option value="cheese">Cheese</option>
              <option value="defensive">Defensive</option>
            </select>
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
