'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Modal } from '@/components/ui/modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useMergedContent } from '@/hooks/use-merged-content';
import { Replay, Race, Matchup, ReplayPlayer } from '@/types/replay';
import { Video } from '@/types/video';
import { BuildOrder } from '@/types/build-order';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { replays, videos as videosJson } from '@/lib/data';
import { getDefaultCoachForSession, getCoachSelectOptions } from '@/lib/coach-utils';
import type { SC2AnalysisResponse } from '@/lib/sc2reader-client';
import { VideoSelector } from './video-selector-enhanced';
import { MultiCategorySelector } from './multi-category-selector';
import { FileUpload } from './file-upload';
import { FormField } from './form-field';
import { EditModalFooter } from './edit-modal-footer';
import { useAutocompleteSearch } from '@/hooks/use-autocomplete-search';

interface ReplayEditModalProps {
  replay: Replay | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

const matchupOptions = [
  { value: 'TvT', label: 'TvT' },
  { value: 'TvZ', label: 'TvZ' },
  { value: 'TvP', label: 'TvP' },
  { value: 'ZvT', label: 'ZvT' },
  { value: 'ZvZ', label: 'ZvZ' },
  { value: 'ZvP', label: 'ZvP' },
  { value: 'PvT', label: 'PvT' },
  { value: 'PvZ', label: 'PvZ' },
  { value: 'PvP', label: 'PvP' },
];

const raceOptions = [
  { value: 'terran', label: 'Terran' },
  { value: 'zerg', label: 'Zerg' },
  { value: 'protoss', label: 'Protoss' },
];

const resultOptions = [
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
];

export function ReplayEditModal({ replay, isOpen, onClose, isNew = false }: ReplayEditModalProps) {
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const allVideos = useMergedContent(videosJson as Video[], 'videos');
  const [formData, setFormData] = useState<Partial<Replay>>({});

  // Get default coach for logged-in user
  const defaultCoach = useMemo(() =>
    getDefaultCoachForSession(session?.user?.discordId, session?.user?.name ?? undefined),
    [session?.user?.discordId, session?.user?.name]
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedReplayFile, setAnalyzedReplayFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<SC2AnalysisResponse | null>(null);

  // Get all unique maps from existing replays
  const allMaps = useMemo(() => {
    const mapSet = new Set<string>();
    replays.forEach(r => mapSet.add(r.map));
    return Array.from(mapSet).sort();
  }, []);

  // Get all unique player names from existing replays
  const allPlayerNames = useMemo(() => {
    const nameSet = new Set<string>();
    replays.forEach(r => {
      nameSet.add(r.player1.name);
      nameSet.add(r.player2.name);
    });
    return Array.from(nameSet).sort();
  }, []);

  // Map autocomplete
  const mapSearch = useAutocompleteSearch<string>({
    options: allMaps,
    getSearchText: (m) => m,
    toOption: (m) => ({ id: m, label: m, data: m }),
    maxResults: 5,
  });

  // Player 1 autocomplete
  const player1Search = useAutocompleteSearch<string>({
    options: allPlayerNames,
    getSearchText: (n) => n,
    toOption: (n) => ({ id: n, label: n, data: n }),
    maxResults: 5,
  });

  // Player 2 autocomplete
  const player2Search = useAutocompleteSearch<string>({
    options: allPlayerNames,
    getSearchText: (n) => n,
    toOption: (n) => ({ id: n, label: n, data: n }),
    maxResults: 5,
  });

  // Get latest patch version
  const getLatestPatch = useMemo(() => {
    const patches = replays
      .map(r => r.patch)
      .filter((p): p is string => Boolean(p && p.trim()))
      .map(p => p.trim());

    if (patches.length === 0) return '';

    const sortedPatches = patches.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return bVal - aVal;
      }
      return 0;
    });

    return sortedPatches[0];
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (replay) {
      setFormData(replay);
      mapSearch.setSearch(replay.map || '');
      player1Search.setSearch(replay.player1?.name || '');
      player2Search.setSearch(replay.player2?.name || '');
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        title: '',
        map: '',
        matchup: 'TvT',
        player1: { name: '', race: 'terran', result: 'win' },
        player2: { name: '', race: 'terran', result: 'loss' },
        duration: '',
        gameDate: new Date().toISOString().split('T')[0],
        uploadDate: new Date().toISOString().split('T')[0],
        downloadUrl: '',
        videoIds: [],
        coach: defaultCoach, // Auto-populate with logged-in coach
        tags: [],
        patch: getLatestPatch,
        notes: '',
        isFree: false,
      });
      mapSearch.setSearch('');
      player1Search.setSearch('');
      player2Search.setSearch('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay, isNew, isOpen, getLatestPatch, defaultCoach]);

  const updateField = <K extends keyof Replay>(field: K, value: Replay[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updatePlayer = (playerNum: 1 | 2, field: keyof ReplayPlayer, value: string | number) => {
    const playerKey = `player${playerNum}` as 'player1' | 'player2';
    setFormData(prev => ({
      ...prev,
      [playerKey]: { ...prev[playerKey], [field]: value }
    }));
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
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

      const { metadata } = data;
      const normalizeRace = (race: string) => race.toLowerCase() as Race;
      const determineMatchup = (r1: string, r2: string) => {
        const race1 = r1.charAt(0).toUpperCase();
        const race2 = r2.charAt(0).toUpperCase();
        return `${race1}v${race2}` as Matchup;
      };
      const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      const player1Data = metadata.players[0];
      const player2Data = metadata.players[1];

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

      mapSearch.setSearch(metadata.map_name);
      player1Search.setSearch(player1Data.name);
      player2Search.setSearch(player2Data.name);

      toast.success('Replay analyzed successfully! Form fields have been populated.');

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
      const buildOrdersModule = await import('@/data/build-orders.json');
      const buildOrders = buildOrdersModule.default as BuildOrder[];
      const linkedBuildOrders = buildOrders.filter(bo => bo.replayId === replayId);

      if (linkedBuildOrders.length === 0) return;

      const playerNames = Object.keys(analysisData.build_orders);
      if (playerNames.length === 0) return;

      const message = `Found ${linkedBuildOrders.length} build order(s) linked to this replay:\n\n` +
        linkedBuildOrders.map(bo => `• ${bo.name}`).join('\n') +
        `\n\nWould you like to update them with the new replay analysis?`;

      if (confirm(message)) {
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

        const { convertToBuildOrderSteps } = await import('@/lib/sc2reader-client');
        const buildOrderEvents = analysisData.build_orders[selectedPlayer];
        const newSteps = convertToBuildOrderSteps(buildOrderEvents);

        toast.success(
          `Updated ${linkedBuildOrders.length} build order(s) with ${newSteps.length} steps from ${selectedPlayer}'s replay analysis.`,
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Error updating linked build orders:', error);
    }
  };

  const handleSave = () => {
    if (!formData.id || !formData.title || !formData.map || !formData.player1?.name || !formData.player2?.name) {
      toast.error('Please fill in all required fields (Title, Map, Player Names)');
      return;
    }

    if (formData.videoIds && formData.videoIds.length > 0) {
      const invalidVideoIds = formData.videoIds.filter(id => !allVideos.find(v => v.id === id));
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

  const coachOptions = getCoachSelectOptions();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Replay' : 'Edit Replay'} size="xl">
      <div className="space-y-4">
        <FormField
          label="Title"
          required
          type="text"
          inputProps={{
            value: formData.title || '',
            onChange: (e) => updateField('title', e.target.value),
            placeholder: 'Epic ZvT on Altitude',
            autoFocus: true,
          }}
        />

        <FormField
          label="Description (Optional)"
          type="textarea"
          rows={3}
          inputProps={{
            value: formData.description || '',
            onChange: (e) => updateField('description', e.target.value),
            placeholder: 'Brief description of the replay...',
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Map autocomplete */}
          <div>
            <label className="block text-sm font-medium mb-1">Map *</label>
            <div className="relative">
              <input
                type="text"
                value={mapSearch.search}
                onChange={(e) => {
                  mapSearch.setSearch(e.target.value);
                  updateField('map', e.target.value);
                }}
                onFocus={mapSearch.handleFocus}
                onBlur={mapSearch.handleBlur}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="Type to search maps..."
              />
              {mapSearch.showDropdown && mapSearch.filteredOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {mapSearch.filteredOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        mapSearch.setSearch(option.label);
                        updateField('map', option.label);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <FormField
            label="Matchup"
            required
            type="select"
            options={matchupOptions}
            inputProps={{
              value: formData.matchup || 'TvT',
              onChange: (e) => updateField('matchup', e.target.value as Matchup),
            }}
          />
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
                  value={player1Search.search}
                  onChange={(e) => {
                    player1Search.setSearch(e.target.value);
                    updatePlayer(1, 'name', e.target.value);
                  }}
                  onFocus={player1Search.handleFocus}
                  onBlur={player1Search.handleBlur}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                  placeholder="Type to search player names..."
                />
                {player1Search.showDropdown && player1Search.filteredOptions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {player1Search.filteredOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          player1Search.setSearch(option.label);
                          updatePlayer(1, 'name', option.label);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <FormField
              label="Race"
              required
              type="select"
              options={raceOptions}
              inputProps={{
                value: formData.player1?.race || 'terran',
                onChange: (e) => updatePlayer(1, 'race', e.target.value as Race),
                className: 'text-sm',
              }}
            />
            <FormField
              label="Result"
              required
              type="select"
              options={resultOptions}
              inputProps={{
                value: formData.player1?.result || 'win',
                onChange: (e) => updatePlayer(1, 'result', e.target.value as 'win' | 'loss'),
                className: 'text-sm',
              }}
            />
          </div>
          <div className="mt-3">
            <FormField
              label="MMR"
              type="number"
              inputProps={{
                value: formData.player1?.mmr || '',
                onChange: (e) => updatePlayer(1, 'mmr', e.target.value ? parseInt(e.target.value) : 0),
                placeholder: '5000',
              }}
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
                  value={player2Search.search}
                  onChange={(e) => {
                    player2Search.setSearch(e.target.value);
                    updatePlayer(2, 'name', e.target.value);
                  }}
                  onFocus={player2Search.handleFocus}
                  onBlur={player2Search.handleBlur}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                  placeholder="Type to search player names..."
                />
                {player2Search.showDropdown && player2Search.filteredOptions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {player2Search.filteredOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          player2Search.setSearch(option.label);
                          updatePlayer(2, 'name', option.label);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <FormField
              label="Race"
              required
              type="select"
              options={raceOptions}
              inputProps={{
                value: formData.player2?.race || 'terran',
                onChange: (e) => updatePlayer(2, 'race', e.target.value as Race),
                className: 'text-sm',
              }}
            />
            <FormField
              label="Result"
              required
              type="select"
              options={resultOptions}
              inputProps={{
                value: formData.player2?.result || 'loss',
                onChange: (e) => updatePlayer(2, 'result', e.target.value as 'win' | 'loss'),
                className: 'text-sm',
              }}
            />
          </div>
          <div className="mt-3">
            <FormField
              label="MMR"
              type="number"
              inputProps={{
                value: formData.player2?.mmr || '',
                onChange: (e) => updatePlayer(2, 'mmr', e.target.value ? parseInt(e.target.value) : 0),
                placeholder: '4800',
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="Duration"
            type="text"
            inputProps={{
              value: formData.duration || '',
              onChange: (e) => updateField('duration', e.target.value),
              placeholder: '12:34',
            }}
          />
          <FormField
            label="Game Date"
            type="date"
            inputProps={{
              value: formData.gameDate || '',
              onChange: (e) => updateField('gameDate', e.target.value),
            }}
          />
          <FormField
            label="Patch"
            type="text"
            inputProps={{
              value: formData.patch || '',
              onChange: (e) => updateField('patch', e.target.value),
              placeholder: '5.0.14',
            }}
          />
        </div>

        <FormField
          label="Coach (Optional)"
          type="select"
          options={coachOptions}
          inputProps={{
            value: formData.coach || '',
            onChange: (e) => updateField('coach', e.target.value),
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Replay File (.SC2Replay)</label>
            <div className="space-y-2">
              {formData.downloadUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                  <span className="flex-1 truncate">
                    {uploadedFileName || formData.downloadUrl.split('/').pop()}
                  </span>
                  <a href={formData.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    View
                  </a>
                </div>
              )}

              <FileUpload
                onFileSelect={handleFileUpload}
                accept=".SC2Replay"
                maxSizeMB={5}
                label={formData.downloadUrl ? 'Replace Replay File' : 'Select Replay File'}
                description="Drag and drop a .SC2Replay file or click to browse (max 5MB)"
                uploading={isUploading}
              />

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
            onVideoIdsChange={(videoIds) => updateField('videoIds', videoIds)}
            label="Videos"
            suggestedTitle={formData.title}
            suggestedRace={formData.player1?.result === 'win' ? formData.player1.race : formData.player2?.race}
            suggestedCoach={formData.coach}
          />
        </div>

        <FormField
          label="Notes"
          type="textarea"
          rows={3}
          inputProps={{
            value: formData.notes || '',
            onChange: (e) => updateField('notes', e.target.value),
            placeholder: 'Additional notes about this replay...',
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

        <EditModalFooter
          onSave={handleSave}
          onCancel={onClose}
          isNew={isNew}
        />
      </div>
    </Modal>
  );
}
