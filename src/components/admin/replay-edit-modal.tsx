'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Replay, Race, Matchup, ReplayPlayer } from '@/types/replay';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import replays from '@/data/replays.json';
import coaches from '@/data/coaches.json';

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
  const [mapSearch, setMapSearch] = useState('');
  const [player1Search, setPlayer1Search] = useState('');
  const [player2Search, setPlayer2Search] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showMapDropdown, setShowMapDropdown] = useState(false);
  const [showPlayer1Dropdown, setShowPlayer1Dropdown] = useState(false);
  const [showPlayer2Dropdown, setShowPlayer2Dropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

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

  // Get all unique maps from existing replays
  const allMaps = useMemo(() => {
    const mapSet = new Set<string>();
    replays.forEach(r => mapSet.add(r.map));
    return Array.from(mapSet).sort();
  }, []);

  // Filter maps based on search input
  const filteredMaps = useMemo(() => {
    if (!mapSearch.trim()) return [];
    const search = mapSearch.toLowerCase();
    return allMaps
      .filter(map => map.toLowerCase().includes(search))
      .slice(0, 5);
  }, [mapSearch, allMaps]);

  // Get all unique player names from existing replays
  const allPlayerNames = useMemo(() => {
    const nameSet = new Set<string>();
    replays.forEach(r => {
      nameSet.add(r.player1.name);
      nameSet.add(r.player2.name);
    });
    return Array.from(nameSet).sort();
  }, []);

  // Filter player names based on search input
  const filteredPlayer1Names = useMemo(() => {
    if (!player1Search.trim()) return [];
    const search = player1Search.toLowerCase();
    return allPlayerNames
      .filter(name => name.toLowerCase().includes(search))
      .slice(0, 5);
  }, [player1Search, allPlayerNames]);

  const filteredPlayer2Names = useMemo(() => {
    if (!player2Search.trim()) return [];
    const search = player2Search.toLowerCase();
    return allPlayerNames
      .filter(name => name.toLowerCase().includes(search))
      .slice(0, 5);
  }, [player2Search, allPlayerNames]);

  // Get latest patch version
  const getLatestPatch = useMemo(() => {
    const patches = replays
      .map(r => r.patch)
      .filter(p => p && p.trim())
      .map(p => p.trim());

    if (patches.length === 0) return '';

    // Sort patches by semantic versioning (5.0.14 > 5.0.12, 5.1.2 > 5.0.2)
    const sortedPatches = patches.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return bVal - aVal; // Descending order
      }
      return 0;
    });

    return sortedPatches[0];
  }, []);

  useEffect(() => {
    if (replay) {
      setFormData(replay);
      setMapSearch(replay.map || '');
      setPlayer1Search(replay.player1?.name || '');
      setPlayer2Search(replay.player2?.name || '');
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
        patch: getLatestPatch,
        notes: '',
      });
      setMapSearch('');
      setPlayer1Search('');
      setPlayer2Search('');
    }
    setTagInput('');
  }, [replay, isNew, isOpen, getLatestPatch]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading(true);

    try {
      // Delete old blob if exists
      if (formData.downloadUrl) {
        await fetch('/api/delete-replay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formData.downloadUrl }),
        });
      }

      // Upload new file
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload-replay', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { url, filename } = await response.json();

      setFormData({ ...formData, downloadUrl: url });
      setUploadedFileName(filename);
      toast.success('Replay file uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
      // Reset the input
      e.target.value = '';
    }
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
            <div className="relative">
              <input
                type="text"
                value={mapSearch}
                onChange={(e) => {
                  setMapSearch(e.target.value);
                  setFormData({ ...formData, map: e.target.value });
                }}
                onFocus={() => setShowMapDropdown(true)}
                onBlur={() => setTimeout(() => setShowMapDropdown(false), 200)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="Type to search maps..."
              />

              {/* Map autocomplete dropdown */}
              {showMapDropdown && filteredMaps.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredMaps.map((map) => (
                    <button
                      key={map}
                      type="button"
                      onClick={() => {
                        setMapSearch(map);
                        setFormData({ ...formData, map });
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                    >
                      {map}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              <div className="relative">
                <input
                  type="text"
                  value={player1Search}
                  onChange={(e) => {
                    setPlayer1Search(e.target.value);
                    updatePlayer(1, 'name', e.target.value);
                  }}
                  onFocus={() => setShowPlayer1Dropdown(true)}
                  onBlur={() => setTimeout(() => setShowPlayer1Dropdown(false), 200)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                  placeholder="Type to search player names..."
                />

                {/* Player 1 autocomplete dropdown */}
                {showPlayer1Dropdown && filteredPlayer1Names.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredPlayer1Names.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setPlayer1Search(name);
                          updatePlayer(1, 'name', name);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              <div className="relative">
                <input
                  type="text"
                  value={player2Search}
                  onChange={(e) => {
                    setPlayer2Search(e.target.value);
                    updatePlayer(2, 'name', e.target.value);
                  }}
                  onFocus={() => setShowPlayer2Dropdown(true)}
                  onBlur={() => setTimeout(() => setShowPlayer2Dropdown(false), 200)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                  placeholder="Type to search player names..."
                />

                {/* Player 2 autocomplete dropdown */}
                {showPlayer2Dropdown && filteredPlayer2Names.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredPlayer2Names.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setPlayer2Search(name);
                          updatePlayer(2, 'name', name);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
          <label className="block text-sm font-medium mb-1">Coach (Optional)</label>
          <select
            value={formData.coach || ''}
            onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value="">-- No Coach --</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.name}>
                {coach.displayName} ({coach.race})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Replay File (.SC2Replay)</label>
            <div className="space-y-2">
              {/* Current file display */}
              {formData.downloadUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                  <span className="flex-1 truncate">
                    {uploadedFileName || formData.downloadUrl.split('/').pop()}
                  </span>
                  <a
                    href={formData.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              )}

              {/* File upload button */}
              <label className="block">
                <input
                  type="file"
                  accept=".SC2Replay"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <span className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border-2 transition-colors cursor-pointer ${
                  isUploading
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-primary text-primary bg-transparent hover:bg-primary/10'
                }`}>
                  {isUploading ? 'Uploading...' : formData.downloadUrl ? 'Replace File' : 'Upload File'}
                </span>
              </label>

              <p className="text-xs text-muted-foreground">
                Max file size: 5MB • Allowed: .SC2Replay files
              </p>
            </div>
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
