'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useMergedContent } from '@/hooks/use-merged-content';
import { useAutocompleteSearch } from '@/hooks/use-autocomplete-search';
import { BuildOrder, BuildOrderStep, Race, VsRace, Difficulty } from '@/types/build-order';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { replays, videos as videosJson } from '@/lib/data';
import { Replay, Matchup, Race as ReplayRace } from '@/types/replay';
import { Video } from '@/types/video';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import type { SC2AnalysisResponse, SC2ReplayPlayer, SC2BuildOrderEvent } from '@/lib/sc2reader-client';
import { VideoSelector } from './video-selector-enhanced';
import { MultiCategorySelector } from './multi-category-selector';
import { FileUpload } from './file-upload';
import { CoachSearchDropdown } from '@/components/shared/coach-search-dropdown';
import { FormField } from './form-field';
import { EditModalFooter } from './edit-modal-footer';
import { getCoachForUser } from '@/lib/coach-utils';

interface BuildOrderEditModalProps {
  buildOrder: BuildOrder | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function BuildOrderEditModal({ buildOrder, isOpen, onClose, isNew = false }: BuildOrderEditModalProps) {
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<BuildOrder>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [replayAnalysisData, setReplayAnalysisData] = useState<SC2AnalysisResponse | null>(null);
  const [selectedPlayerForImport, setSelectedPlayerForImport] = useState<string | null>(null);
  const [uploadedReplayFile, setUploadedReplayFile] = useState<File | null>(null);
  const [replayLinkMode, setReplayLinkMode] = useState<'existing' | 'upload'>('existing');

  // Get default coach for logged-in user
  const defaultCoach = useMemo(() =>
    getCoachForUser(session?.user?.discordId, session?.user?.name ?? undefined),
    [session?.user?.discordId, session?.user?.name]
  );

  // Merge static videos with pending changes for validation
  const allVideos = useMergedContent(videosJson as Video[], 'videos');

  // Merge static replays with pending changes
  const allReplays = useMergedContent(replays as Replay[], 'replays');

  // Replay search using autocomplete hook
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
    maxResults: 10,
  });

  useEffect(() => {
    if (!isOpen) return; // Only reset when opening the modal

    if (buildOrder) {
      // Auto-cleanup invalid video IDs
      const validVideoIds = (buildOrder.videoIds || []).filter(
        id => allVideos.find(v => v.id === id)
      );

      // If some video IDs were invalid, show a warning
      if (buildOrder.videoIds && validVideoIds.length !== buildOrder.videoIds.length) {
        const invalidCount = buildOrder.videoIds.length - validVideoIds.length;
        toast.warning(`Removed ${invalidCount} invalid video reference(s) from this build order`);
      }

      setFormData({
        ...buildOrder,
        videoIds: validVideoIds,
      });
    } else if (isNew) {
      // Always generate a fresh UUID when opening in "add new" mode
      setFormData({
        id: uuidv4(),
        name: '',
        race: 'terran',
        vsRace: 'terran',
        difficulty: 'basic',
        coach: defaultCoach?.name ?? '',
        coachId: defaultCoach?.id ?? '',
        description: '',
        videoIds: [],
        steps: [],
        tags: [],
        patch: '',
        updatedAt: new Date().toISOString().split('T')[0],
        isFree: false,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildOrder, isNew, isOpen, allVideos, defaultCoach]);

  const updateField = <K extends keyof BuildOrder>(field: K, value: BuildOrder[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectReplay = (replayId: string) => {
    const replay = allReplays.find(r => r.id === replayId);
    if (replay) {
      setFormData(prev => ({
        ...prev,
        replayId: replay.id,
      }));
      replaySearch.setSearch(replay.title);
      toast.success(`Linked to replay: ${replay.title}`);
    }
  };

  const analyzeExistingReplay = async () => {
    if (!formData.replayId) {
      toast.error('Please select a replay first');
      return;
    }

    const replay = allReplays.find(r => r.id === formData.replayId);
    if (!replay || !replay.downloadUrl) {
      toast.error('Replay file not found');
      return;
    }

    setIsAnalyzing(true);
    setReplayAnalysisData(null);
    setSelectedPlayerForImport(null);

    try {
      // Fetch the replay file
      const fileResponse = await fetch(replay.downloadUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to download replay file');
      }

      const blob = await fileResponse.blob();
      const file = new File([blob], `${replay.id}.SC2Replay`, { type: 'application/octet-stream' });

      // Analyze the replay
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

      // Automatically import build order from the first player (or prompt if multiple players)
      const playerNames = Object.keys(data.build_orders);
      if (playerNames.length > 0) {
        // If there's only one player, auto-import immediately
        if (playerNames.length === 1) {
          importBuildOrderFromPlayer(playerNames[0]);
        } else {
          // If multiple players, let the user choose via the existing UI
          toast.success('Replay analyzed! Select a player to import build steps.');
        }
      } else {
        toast.success('Replay analyzed but no build order data found.');
      }
    } catch (error) {
      console.error('Error analyzing replay:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze replay');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearReplay = () => {
    setFormData(prev => ({
      ...prev,
      replayId: undefined,
    }));
    replaySearch.clear();
  };

  const saveUploadedReplayToDatabase = async (): Promise<string | null> => {
    if (!uploadedReplayFile || !replayAnalysisData) {
      toast.error('No replay file to save');
      return null;
    }

    const { metadata } = replayAnalysisData;

    // Use build order name for replay title if available
    const buildOrderName = formData.name?.trim();
    const replayTitle = buildOrderName
      ? `${buildOrderName} Replay`
      : `${metadata.map_name} - ${metadata.players[0].name} vs ${metadata.players[1].name}`;

    // Create a new replay entry
    const newReplay: Replay = {
      id: `replay-${uuidv4()}`,
      title: replayTitle,
      map: metadata.map_name,
      matchup: `${metadata.players[0].race.charAt(0)}v${metadata.players[1].race.charAt(0)}` as Matchup,
      player1: {
        name: metadata.players[0].name,
        race: metadata.players[0].race.toLowerCase() as ReplayRace,
        result: metadata.players[0].result.toLowerCase() as 'win' | 'loss',
      },
      player2: {
        name: metadata.players[1].name,
        race: metadata.players[1].race.toLowerCase() as ReplayRace,
        result: metadata.players[1].result.toLowerCase() as 'win' | 'loss',
      },
      duration: metadata.game_length || '0:00',
      gameDate: metadata.unix_timestamp
        ? new Date(metadata.unix_timestamp * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      uploadDate: new Date().toISOString().split('T')[0],
      videoIds: [],
      tags: [],
      patch: metadata.release_string || undefined,
      isFree: false,
    };

    // Upload the replay file
    const uploadFormData = new FormData();
    uploadFormData.append('file', uploadedReplayFile);
    uploadFormData.append('metadata', JSON.stringify({
      title: newReplay.title,
      map: newReplay.map,
      matchup: newReplay.matchup,
    }));

    try {
      const response = await fetch('/api/upload-replay', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload replay file');
      }

      const { url: downloadUrl } = await response.json();
      newReplay.downloadUrl = downloadUrl;

      // Add to pending changes
      addChange({
        id: newReplay.id,
        contentType: 'replays',
        operation: 'create',
        data: newReplay,
      });

      // Link this replay to the build order (use functional setState to preserve changes)
      setFormData(prev => ({
        ...prev,
        replayId: newReplay.id,
      }));
      replaySearch.setSearch(newReplay.title);

      toast.success(`Replay auto-saved: ${replayTitle}`);

      // Clear upload state
      setUploadedReplayFile(null);
      setReplayAnalysisData(null);
      setSelectedPlayerForImport(null);

      return newReplay.id;
    } catch (error) {
      console.error('Error saving replay:', error);
      toast.error('Failed to save replay to database');
      throw error;
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

  const analyzeReplayFile = async (file: File) => {
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
      toast.success('Replay analyzed! You can import build steps and/or save the replay.');
    } catch (error) {
      console.error('Error analyzing replay:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze replay');
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReplayFileSelect = async (file: File) => {
    setUploadedReplayFile(file); // Save the file for later upload

    // Auto-analyze the replay
    try {
      await analyzeReplayFile(file);
    } catch {
      setUploadedReplayFile(null);
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

    // List of abilities, spells, and temporary units to filter out from build orders
    const excludedActions = [
      // General
      'Unknown',
      'Spray',

      // Terran abilities & temporary units
      'MULE',
      'Scan',
      'ScannerSweep',
      'KD8Charge',
      'AutoTurret',
      'PointDefenseDrone',
      'Nuke',
      'SupplyDrop',
      'Salvage',
      'CalldownMULE',

      // Zerg abilities & temporary units
      'Larva',
      'CreepTumor',
      'ChangelingMarine',
      'ChangelingMarineShield',
      'ChangelingZergling',
      'ChangelingZealot',
      'InfestorTerran',
      'Broodling',
      'Locust',
      'LocustMP',
      'LocustMPFlying',

      // Protoss abilities & temporary units
      'ForceField',
      'PylonOvercharge',
      'Hallucination',
      'HallucinationArchon',
      'HallucinationColossus',
      'HallucinationHighTemplar',
      'HallucinationImmortal',
      'HallucinationPhoenix',
      'HallucinationProbe',
      'HallucinationStalker',
      'HallucinationVoidRay',
      'HallucinationWarpPrism',
      'HallucinationZealot',
      'HallucinationAdept',
      'HallucinationOracle',
      'HallucinationDisruptor',
    ];

    // Filter and convert events to build order steps
    const steps: BuildOrderStep[] = buildOrderEvents
      .filter((event: SC2BuildOrderEvent) => {
        const action = event.event === 'upgrade'
          ? `Upgrade: ${event.upgrade || 'Unknown'}`
          : event.unit || 'Unknown';

        // Filter out excluded actions (abilities, spells, temporary units)
        return !excludedActions.some(excluded =>
          action.toLowerCase().includes(excluded.toLowerCase())
        );
      })
      .map((event: SC2BuildOrderEvent) => ({
        supply: event.supply,
        time: formatTime(event.time),
        action: event.event === 'upgrade'
          ? `Upgrade: ${event.upgrade || 'Unknown'}`
          : event.unit || 'Unknown',
        notes: undefined,
      }));

    // Normalize race from SC2 format (Terran/Zerg/Protoss) to app format (terran/zerg/protoss)
    const normalizeRace = (race: string): Race => race.toLowerCase() as Race;

    // Extract opponent's race for vsRace
    const opponentData = metadata.players.find((p: SC2ReplayPlayer) => p.name !== playerName);
    const vsRace = opponentData ? normalizeRace(opponentData.race) : formData.vsRace || 'terran';

    // Auto-populate form with replay data including both races (use functional setState to preserve changes)
    setFormData(prev => ({
      ...prev,
      name: prev.name || `${playerData.name} ${metadata.map_name} Build`,
      race: normalizeRace(playerData.race),
      vsRace: vsRace as VsRace,
      steps: steps,
      patch: metadata.release_string || prev.patch,
    }));

    setSelectedPlayerForImport(playerName);
    toast.success(`Imported ${steps.length} build order steps from ${playerName}'s replay!`);
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name) {
      toast.error('Please fill in all required fields (Name)');
      return;
    }

    if (!formData.steps || formData.steps.length === 0) {
      toast.error('Please add at least one build order step');
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

    // Auto-save uploaded replay file if it hasn't been saved yet
    let finalReplayId = formData.replayId;
    if (uploadedReplayFile && replayAnalysisData && !formData.replayId) {
      try {
        const savedReplayId = await saveUploadedReplayToDatabase();
        if (savedReplayId) {
          finalReplayId = savedReplayId;
        }
      } catch (error) {
        console.error('Error auto-saving replay:', error);
        toast.error('Failed to save replay file. Please try again.');
        return;
      }
    }

    const buildOrderData: BuildOrder = {
      id: formData.id,
      name: formData.name,
      race: formData.race || 'terran',
      vsRace: formData.vsRace || 'terran',
      difficulty: formData.difficulty || 'basic',
      coach: formData.coach || '',
      coachId: formData.coachId || '',
      description: formData.description || '',
      videoIds: formData.videoIds || [],
      steps: formData.steps,
      tags: formData.tags || [],
      patch: formData.patch,
      updatedAt: new Date().toISOString().split('T')[0],
      isFree: formData.isFree || false,
      replayId: finalReplayId,
    };

    addChange({
      id: buildOrderData.id,
      contentType: 'build-orders',
      operation: isNew ? 'create' : 'update',
      data: buildOrderData,
    });

    toast.success(`Build order ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Build Order' : 'Edit Build Order'} size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Name"
            required
            type="text"
            inputProps={{
              value: formData.name || '',
              onChange: (e) => updateField('name', e.target.value),
              placeholder: '3 Hatch Roach Timing',
              autoFocus: true,
            }}
          />

          <CoachSearchDropdown
            label="Coach"
            value={formData.coach || ''}
            coachId={formData.coachId || ''}
            onSelect={(displayName, coachId) => {
              updateField('coach', displayName);
              updateField('coachId', coachId);
            }}
            onClear={() => {
              updateField('coach', '');
              updateField('coachId', '');
            }}
          />
        </div>

        <FormField
          label="Description"
          type="textarea"
          rows={2}
          inputProps={{
            value: formData.description || '',
            onChange: (e) => updateField('description', e.target.value),
            placeholder: 'Description of the build order...',
          }}
        />

        {/* Replay Link Section */}
        <div>
          <label className="block text-sm font-medium mb-1">Linked Replay (Optional)</label>

          {/* Show linked replay if one exists */}
          {formData.replayId ? (
            <div className="border border-border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Replay linked successfully</p>
                  <p className="text-xs text-muted-foreground">
                    {replaySearch.search || `Replay ID: ${formData.replayId}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearReplay}
                  className="px-3 py-1 text-sm text-destructive hover:text-destructive/70"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Tab buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReplayLinkMode('existing')}
                  className={`px-4 py-2 border rounded-md transition-colors ${
                    replayLinkMode === 'existing'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  Link Existing
                </button>
                <button
                  type="button"
                  onClick={() => setReplayLinkMode('upload')}
                  className={`px-4 py-2 border rounded-md transition-colors ${
                    replayLinkMode === 'upload'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  Upload New
                </button>
              </div>

              {/* Content based on selected mode */}
              {replayLinkMode === 'existing' ? (
                <div className="relative">
                  <input
                    type="text"
                    value={replaySearch.search}
                    onChange={(e) => replaySearch.setSearch(e.target.value)}
                    onFocus={replaySearch.handleFocus}
                    onBlur={replaySearch.handleBlur}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    placeholder="Search for an existing replay..."
                  />

                  {/* Replay dropdown */}
                  {replaySearch.showDropdown && replaySearch.filteredOptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {replaySearch.filteredOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => selectReplay(option.id)}
                          className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                        >
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.sublabel}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Search by title, matchup, or map name
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Upload replay to link AND import build order */}
                  <FileUpload
                    onFileSelect={handleReplayFileSelect}
                    accept=".SC2Replay"
                    maxSizeMB={5}
                    label="Upload Replay File"
                    description="Drag and drop a .SC2Replay file or click to browse to extract build order (max 5MB)"
                    uploading={isAnalyzing}
                  />

                  {/* Show player selection and import/link actions */}
                  {replayAnalysisData && (
                    <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">Import Build Steps From:</label>
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

                      {/* Save & Link Button */}
                      <div className="pt-2 border-t border-border">
                        <Button
                          type="button"
                          onClick={saveUploadedReplayToDatabase}
                          className="w-full"
                        >
                          Save Replay & Link to Build Order
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          This will upload the replay file and add it to the replays page
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Build Order Steps Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Build Order Steps *</label>
            <div className="flex gap-2">
              {formData.replayId && (
                <Button
                  onClick={analyzeExistingReplay}
                  size="sm"
                  variant="outline"
                  disabled={isAnalyzing}
                  type="button"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Replay'}
                </Button>
              )}
              <Button onClick={addStep} size="sm" variant="outline" type="button">
                <Plus className="h-4 w-4" />
                Add Step
              </Button>
            </div>
          </div>

          {/* Show analysis results if available */}
          {replayAnalysisData && formData.replayId && (
            <div className="mb-3 border border-border rounded-lg p-3 bg-muted/30">
              <label className="block text-sm font-medium mb-2">Import Build Steps From:</label>
              <div className="grid grid-cols-2 gap-2">
                {replayAnalysisData.metadata.players.map((player: SC2ReplayPlayer) => (
                  <button
                    key={player.name}
                    type="button"
                    onClick={() => importBuildOrderFromPlayer(player.name)}
                    className={`p-2 border-2 rounded-md text-left transition-colors ${
                      selectedPlayerForImport === player.name
                        ? 'border-green-600 bg-green-600/10'
                        : 'border-border hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <div className="font-medium text-sm">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.race} • {player.result}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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

        {/* Additional Metadata Section */}
        <div>
          <label className="block text-sm font-medium mb-2">Additional Metadata</label>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Race"
              required
              type="select"
              options={[
                { value: 'terran', label: 'Terran' },
                { value: 'zerg', label: 'Zerg' },
                { value: 'protoss', label: 'Protoss' },
              ]}
              inputProps={{
                value: formData.race || 'terran',
                onChange: (e) => updateField('race', e.target.value as Race),
              }}
            />

            <FormField
              label="vs Race"
              required
              type="select"
              options={[
                { value: 'terran', label: 'Terran' },
                { value: 'zerg', label: 'Zerg' },
                { value: 'protoss', label: 'Protoss' },
                { value: 'all', label: 'All' },
              ]}
              inputProps={{
                value: formData.vsRace || 'terran',
                onChange: (e) => updateField('vsRace', e.target.value as VsRace),
              }}
            />

            <FormField
              label="Difficulty"
              required
              type="select"
              options={[
                { value: 'basic', label: 'Basic' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'expert', label: 'Expert' },
              ]}
              inputProps={{
                value: formData.difficulty || 'basic',
                onChange: (e) => updateField('difficulty', e.target.value as Difficulty),
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

            <FormField
              label="Date"
              type="date"
              inputProps={{
                value: formData.updatedAt || '',
                onChange: (e) => updateField('updatedAt', e.target.value),
              }}
            />
          </div>

          <MultiCategorySelector
            categories={formData.categories || []}
            onChange={(categories) => updateField('categories', categories)}
            className="mt-4"
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
            className="mt-4"
          />
        </div>

        {/* Video Selector */}
        <VideoSelector
          mode="playlist"
          selectedVideoIds={formData.videoIds || []}
          onVideoIdsChange={(videoIds) => updateField('videoIds', videoIds)}
          label="Linked Videos"
          suggestedTitle={formData.name ? `${formData.name}${formData.coach ? ` - ${formData.coach}` : ''}` : ''}
          suggestedRace={formData.race}
          suggestedCoach={formData.coach}
          suggestedCoachId={formData.coachId}
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
