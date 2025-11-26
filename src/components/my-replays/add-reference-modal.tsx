'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload } from 'lucide-react';
import type { UserReplayData, ReplayFingerprint } from '@/lib/replay-types';

interface AddReferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userReplays: UserReplayData[];
  onSuccess?: () => void;
}

const MATCHUPS = ['TvZ', 'TvP', 'TvT', 'ZvT', 'ZvP', 'ZvZ', 'PvT', 'PvZ', 'PvP'];

type SourceType = 'my_replay' | 'uploaded_replay' | 'site_build_order';

/**
 * AddReferenceModal - Modal for creating new reference replays
 */
export function AddReferenceModal({
  open,
  onOpenChange,
  userReplays,
  onSuccess,
}: AddReferenceModalProps) {
  const [alias, setAlias] = useState('');
  const [matchup, setMatchup] = useState<string>('');
  const [sourceType, setSourceType] = useState<SourceType>('my_replay');
  const [selectedReplayId, setSelectedReplayId] = useState<string>('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter replays by selected matchup
  const filteredReplays = matchup
    ? userReplays.filter(r => r.fingerprint.matchup === matchup)
    : userReplays;

  // Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAlias('');
      setMatchup('');
      setSourceType('my_replay');
      setSelectedReplayId('');
      setSetAsDefault(false);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!alias.trim()) {
      setError('Please enter an alias for this reference');
      return;
    }
    if (!matchup) {
      setError('Please select a matchup');
      return;
    }
    if (sourceType === 'my_replay' && !selectedReplayId) {
      setError('Please select a replay');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get fingerprint from selected source
      let fingerprint: ReplayFingerprint | undefined;
      let sourceId = '';

      if (sourceType === 'my_replay') {
        const selectedReplay = userReplays.find(r => r.id === selectedReplayId);
        if (!selectedReplay) {
          throw new Error('Selected replay not found');
        }
        fingerprint = selectedReplay.fingerprint;
        sourceId = selectedReplayId;
      } else if (sourceType === 'uploaded_replay') {
        // TODO: Handle uploaded replay file
        throw new Error('Upload functionality coming soon');
      } else if (sourceType === 'site_build_order') {
        // TODO: Handle site build order selection
        throw new Error('Build order selection coming soon');
      }

      // Create the reference
      const response = await fetch('/api/my-replays/references', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alias: alias.trim(),
          matchup,
          source_type: sourceType,
          source_id: sourceId,
          fingerprint,
          build_order: [],
          set_as_default: setAsDefault,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create reference');
      }

      // Success - close modal and notify parent
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Reference Build</DialogTitle>
            <DialogDescription>
              Create a reference build to compare your replays against.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Alias Input */}
            <div className="grid gap-2">
              <Label htmlFor="alias">Name</Label>
              <Input
                id="alias"
                placeholder="e.g., My Standard TvZ Mech"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is how it will appear in filters and comparisons
              </p>
            </div>

            {/* Matchup Select */}
            <div className="grid gap-2">
              <Label htmlFor="matchup">Matchup</Label>
              <Select value={matchup} onValueChange={setMatchup}>
                <SelectTrigger id="matchup">
                  <SelectValue placeholder="Select matchup" />
                </SelectTrigger>
                <SelectContent>
                  {MATCHUPS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Selection */}
            <div className="grid gap-2">
              <Label>Source</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sourceType"
                    value="my_replay"
                    checked={sourceType === 'my_replay'}
                    onChange={(e) => setSourceType(e.target.value as SourceType)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Select from my uploaded replays</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer opacity-50">
                  <input
                    type="radio"
                    name="sourceType"
                    value="uploaded_replay"
                    checked={sourceType === 'uploaded_replay'}
                    onChange={(e) => setSourceType(e.target.value as SourceType)}
                    disabled
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Upload a replay file (coming soon)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer opacity-50">
                  <input
                    type="radio"
                    name="sourceType"
                    value="site_build_order"
                    checked={sourceType === 'site_build_order'}
                    onChange={(e) => setSourceType(e.target.value as SourceType)}
                    disabled
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Select from site build orders (coming soon)</span>
                </label>
              </div>
            </div>

            {/* Replay Selection (if my_replay source) */}
            {sourceType === 'my_replay' && (
              <div className="grid gap-2">
                <Label htmlFor="replay">Select Replay</Label>
                <Select
                  value={selectedReplayId}
                  onValueChange={setSelectedReplayId}
                  disabled={!matchup}
                >
                  <SelectTrigger id="replay">
                    <SelectValue placeholder={matchup ? 'Select a replay' : 'Select matchup first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredReplays.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No replays found for {matchup}
                      </div>
                    ) : (
                      filteredReplays.map((replay) => (
                        <SelectItem key={replay.id} value={replay.id}>
                          <div className="flex flex-col">
                            <span>{replay.filename}</span>
                            <span className="text-xs text-muted-foreground">
                              {replay.fingerprint.metadata.result} vs {replay.fingerprint.metadata.opponent_race}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Upload Zone (if uploaded_replay source) */}
            {sourceType === 'uploaded_replay' && (
              <div className="grid gap-2">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drop replay here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coming soon
                  </p>
                </div>
              </div>
            )}

            {/* Set as Default Checkbox */}
            {matchup && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="setAsDefault"
                  checked={setAsDefault}
                  onCheckedChange={(checked) => setSetAsDefault(checked === true)}
                />
                <Label htmlFor="setAsDefault" className="text-sm cursor-pointer">
                  Set as default reference for {matchup}
                </Label>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Reference'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
