'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Replay, Race, Matchup, ReplayPlayer } from '@/types/replay';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import replays from '@/data/replays.json';

interface ReplayEditModalProps {
  replay: Replay | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function ReplayEditModal({ replay, isOpen, onClose, isNew = false }: ReplayEditModalProps) {
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<Replay>>({});
  const [tagInput, setTagInput] = useState('');

  // Get all unique tags from existing replays for autocomplete
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    replays.forEach(r => r.tags.forEach(tag => tagSet.add(tag)));
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
    if (replay) {
      setFormData(replay);
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        title: '',
        map: '',
        matchup: 'TvT',
        player1: {
          name: '',
          race: 'terran',
          result: 'win',
        },
        player2: {
          name: '',
          race: 'terran',
          result: 'loss',
        },
        duration: '',
        gameDate: new Date().toISOString().split('T')[0],
        uploadDate: new Date().toISOString().split('T')[0],
        downloadUrl: '',
        coachingVideoId: '',
        coach: '',
        tags: [],
        patch: '',
        notes: '',
      });
    }
    setTagInput('');
  }, [replay, isNew, isOpen]);

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

  const updatePlayer = (playerNum: 1 | 2, field: keyof ReplayPlayer, value: string | number) => {
    const playerKey = `player${playerNum}` as 'player1' | 'player2';
    setFormData({
      ...formData,
      [playerKey]: {
        ...formData[playerKey],
        [field]: value,
      }
    });
  };

  const handleSave = () => {
    if (!formData.id || !formData.title || !formData.map || !formData.player1?.name || !formData.player2?.name) {
      toast.error('Please fill in all required fields (Title, Map, Player Names)');
      return;
    }

    const replayData: Replay = {
      id: formData.id,
      title: formData.title,
      map: formData.map,
      matchup: formData.matchup || 'TvT',
      player1: formData.player1 as ReplayPlayer,
      player2: formData.player2 as ReplayPlayer,
      duration: formData.duration || '',
      gameDate: formData.gameDate || new Date().toISOString().split('T')[0],
      uploadDate: formData.uploadDate || new Date().toISOString().split('T')[0],
      downloadUrl: formData.downloadUrl,
      coachingVideoId: formData.coachingVideoId,
      coach: formData.coach,
      tags: formData.tags || [],
      patch: formData.patch,
      notes: formData.notes,
    };

    addChange({
      id: replayData.id,
      contentType: 'replays',
      operation: isNew ? 'create' : 'update',
      data: replayData as unknown as Record<string, unknown>,
    });

    toast.success(`Replay ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Replay' : 'Edit Replay'} size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="Epic ZvT on Altitude"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Map *</label>
            <input
              type="text"
              value={formData.map || ''}
              onChange={(e) => setFormData({ ...formData, map: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="Altitude LE"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Matchup *</label>
          <select
            value={formData.matchup || 'TvT'}
            onChange={(e) => setFormData({ ...formData, matchup: e.target.value as Matchup })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value="TvT">TvT</option>
            <option value="TvZ">TvZ</option>
            <option value="TvP">TvP</option>
            <option value="ZvT">ZvT</option>
            <option value="ZvZ">ZvZ</option>
            <option value="ZvP">ZvP</option>
            <option value="PvT">PvT</option>
            <option value="PvZ">PvZ</option>
            <option value="PvP">PvP</option>
          </select>
        </div>

        {/* Player 1 */}
        <div className="border border-border rounded-md p-4">
          <h3 className="text-sm font-semibold mb-3">Player 1</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Name *</label>
              <input
                type="text"
                value={formData.player1?.name || ''}
                onChange={(e) => updatePlayer(1, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                placeholder="Player name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Race *</label>
              <select
                value={formData.player1?.race || 'terran'}
                onChange={(e) => updatePlayer(1, 'race', e.target.value as Race)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="terran">Terran</option>
                <option value="zerg">Zerg</option>
                <option value="protoss">Protoss</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Result *</label>
              <select
                value={formData.player1?.result || 'win'}
                onChange={(e) => updatePlayer(1, 'result', e.target.value as 'win' | 'loss')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="win">Win</option>
                <option value="loss">Loss</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium mb-1">MMR</label>
            <input
              type="number"
              value={formData.player1?.mmr || ''}
              onChange={(e) => updatePlayer(1, 'mmr', e.target.value ? parseInt(e.target.value) : 0)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              placeholder="5000"
            />
          </div>
        </div>

        {/* Player 2 */}
        <div className="border border-border rounded-md p-4">
          <h3 className="text-sm font-semibold mb-3">Player 2</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Name *</label>
              <input
                type="text"
                value={formData.player2?.name || ''}
                onChange={(e) => updatePlayer(2, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                placeholder="Player name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Race *</label>
              <select
                value={formData.player2?.race || 'terran'}
                onChange={(e) => updatePlayer(2, 'race', e.target.value as Race)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="terran">Terran</option>
                <option value="zerg">Zerg</option>
                <option value="protoss">Protoss</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Result *</label>
              <select
                value={formData.player2?.result || 'loss'}
                onChange={(e) => updatePlayer(2, 'result', e.target.value as 'win' | 'loss')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="win">Win</option>
                <option value="loss">Loss</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium mb-1">MMR</label>
            <input
              type="number"
              value={formData.player2?.mmr || ''}
              onChange={(e) => updatePlayer(2, 'mmr', e.target.value ? parseInt(e.target.value) : 0)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              placeholder="4800"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Duration</label>
            <input
              type="text"
              value={formData.duration || ''}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="12:34"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Game Date</label>
            <input
              type="date"
              value={formData.gameDate || ''}
              onChange={(e) => setFormData({ ...formData, gameDate: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            />
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Coach</label>
          <input
            type="text"
            value={formData.coach || ''}
            onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="Hino"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Download URL</label>
            <input
              type="text"
              value={formData.downloadUrl || ''}
              onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="https://example.com/replay.SC2Replay"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Coaching Video ID</label>
            <input
              type="text"
              value={formData.coachingVideoId || ''}
              onChange={(e) => setFormData({ ...formData, coachingVideoId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="dQw4w9WgXcQ"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            rows={3}
            placeholder="Additional notes about this replay..."
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
