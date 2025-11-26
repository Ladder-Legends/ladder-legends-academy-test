'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Star, X } from 'lucide-react';
import type { ReferenceReplay } from '@/lib/replay-types';

interface AssignReferenceDropdownProps {
  matchup: string;
  currentReferenceId: string | null;
  onAssign: (referenceId: string | null) => Promise<void>;
}

/**
 * AssignReferenceDropdown - Dropdown to assign a reference build to a replay
 */
export function AssignReferenceDropdown({
  matchup,
  currentReferenceId,
  onAssign,
}: AssignReferenceDropdownProps) {
  const [references, setReferences] = useState<ReferenceReplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch references for this matchup
  useEffect(() => {
    const fetchReferences = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/my-replays/references?matchup=${matchup}`);
        const data = await response.json();
        if (response.ok) {
          setReferences(data.references || []);
        } else {
          setError(data.error || 'Failed to load references');
        }
      } catch (err) {
        setError('Failed to load references');
        console.error('Error fetching references:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (matchup) {
      fetchReferences();
    }
  }, [matchup]);

  const handleValueChange = async (value: string) => {
    if (value === 'none') {
      await handleAssign(null);
    } else {
      await handleAssign(value);
    }
  };

  const handleAssign = async (referenceId: string | null) => {
    setIsAssigning(true);
    try {
      await onAssign(referenceId);
    } catch (err) {
      console.error('Error assigning reference:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClear = async () => {
    await handleAssign(null);
  };

  const currentReference = references.find(r => r.id === currentReferenceId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading references...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (references.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No reference builds for {matchup}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentReferenceId || 'none'}
        onValueChange={handleValueChange}
        disabled={isAssigning}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a reference build">
            {isAssigning ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </span>
            ) : currentReference ? (
              <span className="flex items-center gap-2">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                {currentReference.alias}
              </span>
            ) : (
              'No reference assigned'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No reference</span>
          </SelectItem>
          {references.map((ref) => (
            <SelectItem key={ref.id} value={ref.id}>
              <div className="flex items-center gap-2">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                {ref.alias}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentReferenceId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isAssigning}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear reference</span>
        </Button>
      )}
    </div>
  );
}
