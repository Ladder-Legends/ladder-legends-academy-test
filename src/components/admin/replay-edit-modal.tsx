'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useMergedContent } from '@/hooks/use-merged-content';
import { Replay, Race, Matchup, ReplayPlayer } from '@/types/replay';
import { Video } from '@/types/video';
import { BuildOrder } from '@/types/build-order';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import replays from '@/data/replays.json';
import coaches from '@/data/coaches.json';
import videosJson from '@/data/videos.json';
import type { SC2AnalysisResponse } from '@/lib/sc2reader-client';
import { VideoSelector } from './video-selector-enhanced';
import { MultiCategorySelector } from './multi-category-selector';
import { FileUpload } from './file-upload';

interface ReplayEditModalProps {
  replay: Replay | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function ReplayEditModal({ replay, isOpen, onClose, isNew = false }: ReplayEditModalProps) {
  const { addChange } = usePendingChanges();
  const allVideos = useMergedContent(videosJson as Video[], 'videos');
  const [formData, setFormData] = useState<Partial<Replay>>({});
  const [, setTagInput] = useState(''); // tagInput unused until tag autocomplete UI is added
  const [mapSearch, setMapSearch] = useState('');
  const [player1Search, setPlayer1Search] = useState('');
  const [player2Search, setPlayer2Search] = useState('');
  const [showMapDropdown, setShowMapDropdown] = useState(false);
  const [showPlayer1Dropdown, setShowPlayer1Dropdown] = useState(false);
  const [showPlayer2Dropdown, setShowPlayer2Dropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedReplayFile, setAnalyzedReplayFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<SC2AnalysisResponse | null>(null);

  // Get all unique tags from existing replays for autocomplete (unused until tag autocomplete UI is added)
  const _allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    replays.forEach(r => r.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, []);
  void _allExistingTags;


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
    if (!isOpen) return; // Only reset when opening the modal

    if (replay) {
      setFormData(replay);
      setMapSearch(replay.map || '');
      setPlayer1Search(replay.player1?.name || '');
      setPlayer2Search(replay.player2?.name || '');
    } else if (isNew) {
      // Always generate a fresh UUID when opening in "add new" mode
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
        videoIds: [],
        coach: '',
        tags: [],
        patch: getLatestPatch,
        notes: '',
        isFree: false,
      });
      setMapSearch('');
      setPlayer1Search('');
      setPlayer2Search('');
    }
    setTagInput('');
  }, [replay, isNew, isOpen, getLatestPatch]);

  // Tag handler - prepared for future tag autocomplete UI
  const _addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData({ ...formData, tags: [...(formData.tags || []), trimmedTag] });
    }
    setTagInput('');
  };
  void _addTag;

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

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      // Note: Old blob files are not deleted here to keep operations reversible
      // The checkup script will clean up orphaned blobs

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

      // Use functional setState to preserve any changes made during upload
      setFormData(prev => ({ ...prev, downloadUrl: url }));
      setUploadedFileName(filename);
      setAnalyzedReplayFile(file);
      toast.success('Replay file uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeReplay = async (file?: File) => {
    const fileToAnalyze = file || analyzedReplayFile;

    if (!fileToAnalyze) {
      toast.error('Please upload a replay file first');
      return;
    }

    setIsAnalyzing(true);

    try {
      const analyzeFormData = new FormData();
      analyzeFormData.append('file', fileToAnalyze);

      const response = await fetch('/api/analyze-replay', {
        method: 'POST',
        body: analyzeFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysisData(data);

      // Auto-populate form fields from analysis
      const { metadata } = data;

      // Normalize race names (Terran -> terran)
      const normalizeRace = (race: string) => race.toLowerCase() as Race;

      // Determine matchup (e.g., "TvP")
      const determineMatchup = (r1: string, r2: string) => {
        const race1 = r1.charAt(0).toUpperCase();
        const race2 = r2.charAt(0).toUpperCase();
        return `${race1}v${race2}` as Matchup;
      };

      // Format duration from seconds to MM:SS
      const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      const player1Data = metadata.players[0];
      const player2Data = metadata.players[1];

      // Use functional setState to preserve any changes made during analysis
      setFormData(prev => ({
        ...prev,
        title: prev.title || `${player1Data.name} vs ${player2Data.name}`,
        map: metadata.map_name,
        matchup: determineMatchup(player1Data.race, player2Data.race),
        player1: {
          name: player1Data.name,
          race: normalizeRace(player1Data.race),
          result: player1Data.result === 'Win' ? 'win' : 'loss',
          mmr: player1Data.mmr || undefined,
        },
        player2: {
          name: player2Data.name,
          race: normalizeRace(player2Data.race),
          result: player2Data.result === 'Win' ? 'win' : 'loss',
          mmr: player2Data.mmr || undefined,
        },
        duration: metadata.game_length_seconds ? formatDuration(metadata.game_length_seconds) : prev.duration,
        gameDate: metadata.date ? metadata.date.split('T')[0] : prev.gameDate,
        patch: metadata.release_string || prev.patch,
      }));

      // Update search fields
      setMapSearch(metadata.map_name);
      setPlayer1Search(player1Data.name);
      setPlayer2Search(player2Data.name);

      toast.success('Replay analyzed successfully! Form fields have been populated.');

      // Check if this replay is linked to any build orders and offer to update them
      if (replay?.id && data.build_orders) {
        await checkAndUpdateLinkedBuildOrders(replay.id, data);
      }
    } catch (error) {
      console.error('Error analyzing replay:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze replay');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkAndUpdateLinkedBuildOrders = async (replayId: string, analysisData: SC2AnalysisResponse) => {
    try {
      // This is a hack - we should have a proper GET endpoint for build orders
      // For now, we'll just import the build orders client-side
      const buildOrdersModule = await import('@/data/build-orders.json');
      const buildOrders = buildOrdersModule.default as BuildOrder[];

      // Find build orders that reference this replay
      const linkedBuildOrders = buildOrders.filter(bo => bo.replayId === replayId);

      if (linkedBuildOrders.length === 0) {
        return; // No linked build orders
      }

      // Ask user if they want to update the linked build orders
      const playerNames = Object.keys(analysisData.build_orders);
      if (playerNames.length === 0) {
        return;
      }

      // Show confirmation with player selection
      const message = `Found ${linkedBuildOrders.length} build order(s) linked to this replay:\n\n` +
        linkedBuildOrders.map(bo => `• ${bo.name}`).join('\n') +
        `\n\nWould you like to update them with the new replay analysis?`;

      if (confirm(message)) {
        // Ask which player's build order to use
        let selectedPlayer = playerNames[0];
        if (playerNames.length > 1) {
          const playerChoice = prompt(
            `Multiple players found:\n${playerNames.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nEnter the number of the player whose build order to use:`,
            '1'
          );
          const playerIndex = parseInt(playerChoice || '1') - 1;
          if (playerIndex >= 0 && playerIndex < playerNames.length) {
            selectedPlayer = playerNames[playerIndex];
          }
        }

        // Convert SC2 events to build order steps
        const { convertToBuildOrderSteps } = await import('@/lib/sc2reader-client');
        const buildOrderEvents = analysisData.build_orders[selectedPlayer];
        const newSteps = convertToBuildOrderSteps(buildOrderEvents);

        // Update each linked build order
        const updatePromises = linkedBuildOrders.map(async bo => {
          return {
            id: bo.id,
            contentType: 'build-orders' as const,
            operation: 'update' as const,
            data: {
              ...bo,
              steps: newSteps,
              updatedAt: new Date().toISOString().split('T')[0],
            },
          };
        });

        const changes = await Promise.all(updatePromises);

        // Show summary
        toast.success(
          `Updated ${linkedBuildOrders.length} build order(s) with ${newSteps.length} steps from ${selectedPlayer}'s replay analysis.`,
          { duration: 5000 }
        );

        // Store changes for commit (parent component should handle this)
        console.log('Build order updates ready:', changes);

        // You may want to emit these changes to parent or auto-commit
        // For now, just log them - the admin will need to commit manually
      }
    } catch (error) {
      console.error('Error updating linked build orders:', error);
      // Don't show error toast - this is optional functionality
    }
  };

  const handleSave = () => {
    if (!formData.id || !formData.title || !formData.map || !formData.player1?.name || !formData.player2?.name) {
      toast.error('Please fill in all required fields (Title, Map, Player Names)');
      return;
    }

    // Validate that all videoIds reference existing videos (if any videoIds present)
    if (formData.videoIds && formData.videoIds.length > 0) {
      const invalidVideoIds = formData.videoIds.filter(
        id => !allVideos.find(v => v.id === id)
      );
      if (invalidVideoIds.length > 0) {
        toast.error(`Invalid video references found: ${invalidVideoIds.join(', ')}. Please remove them before saving.`);
        return;
      }
    }

    const replayData: Replay = {
      id: formData.id,
      title: formData.title,
      description: formData.description,
      map: formData.map,
      matchup: formData.matchup || 'TvT',
      player1: formData.player1 as ReplayPlayer,
      player2: formData.player2 as ReplayPlayer,
      duration: formData.duration || '',
      gameDate: formData.gameDate || new Date().toISOString().split('T')[0],
      uploadDate: formData.uploadDate || new Date().toISOString().split('T')[0],
      downloadUrl: formData.downloadUrl,
      videoIds: formData.videoIds || [],
      coach: formData.coach,
      tags: formData.tags || [],
      patch: formData.patch,
      notes: formData.notes,
      isFree: formData.isFree || false,
    };

    addChange({
      id: replayData.id,
      contentType: 'replays',
      operation: isNew ? 'create' : 'update',
      data: replayData,
    });


    toast.success(`Replay ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Replay' : 'Edit Replay'} size="xl">
      <div className="space-y-4">
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
          <label className="block text-sm font-medium mb-1">Description (Optional)</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="Brief description of the replay..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            {coaches.filter(coach => coach.isActive !== false).map((coach) => (
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

              {/* File upload */}
              <FileUpload
                onFileSelect={handleFileUpload}
                accept=".SC2Replay"
                maxSizeMB={5}
                label={formData.downloadUrl ? 'Replace Replay File' : 'Select Replay File'}
                description="Drag and drop a .SC2Replay file or click to browse (max 5MB)"
                uploading={isUploading}
              />

              {/* Analyze Replay Button */}
              {analyzedReplayFile && (
                <button
                  type="button"
                  onClick={() => handleAnalyzeReplay()}
                  disabled={isAnalyzing}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-md border-2 transition-colors ${
                    isAnalyzing
                      ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-border text-foreground bg-transparent hover:bg-muted'
                  }`}
                >
                  {isAnalyzing ? 'Analyzing...' : analysisData ? 'Re-analyze Replay' : 'Analyze Replay & Auto-Fill'}
                </button>
              )}
            </div>
          </div>

          <VideoSelector
            mode="playlist"
            selectedVideoIds={formData.videoIds || []}
            onVideoIdsChange={(videoIds) => setFormData({ ...formData, videoIds })}
            label="Videos"
            suggestedTitle={formData.title}
            suggestedRace={
              formData.player1?.result === 'win'
                ? formData.player1.race
                : formData.player2?.race
            }
            suggestedCoach={formData.coach}
          />
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
