'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, UserCheck, HelpCircle, Trash2 } from 'lucide-react';
import { UserSettings } from '@/lib/replay-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function PlayerNamesSettings() {
  const { status } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameToRemove, setNameToRemove] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setSettings(data.settings || null);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load player names');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, fetchSettings]);

  const handleRemoveConfirmed = async () => {
    if (!nameToRemove) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_confirmed_name',
          player_name: nameToRemove,
        }),
      });

      if (!response.ok) throw new Error('Failed to remove name');

      const data = await response.json();
      setSettings(data.settings || null);
      toast.success(`Removed "${nameToRemove}" from your gamer tags`);
      setNameToRemove(null);
    } catch (err) {
      console.error('Error removing name:', err);
      toast.error('Failed to remove gamer tag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSuggestion = async (name: string) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_player_name',
          player_name: name,
        }),
      });

      if (!response.ok) throw new Error('Failed to confirm name');

      const data = await response.json();
      setSettings(data.settings || null);
      toast.success(`Confirmed "${name}" as your gamer tag`);
    } catch (err) {
      console.error('Error confirming name:', err);
      toast.error('Failed to confirm gamer tag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismissSuggestion = async (name: string) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_player_name',
          player_name: name,
        }),
      });

      if (!response.ok) throw new Error('Failed to dismiss name');

      const data = await response.json();
      setSettings(data.settings || null);
      toast.success(`Dismissed "${name}" suggestion`);
    } catch (err) {
      console.error('Error dismissing name:', err);
      toast.error('Failed to dismiss suggestion');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllSuggestions = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_all_possible_names',
        }),
      });

      if (!response.ok) throw new Error('Failed to clear suggestions');

      const data = await response.json();
      setSettings(data.settings || null);
      toast.success('All suggestions cleared');
    } catch (err) {
      console.error('Error clearing suggestions:', err);
      toast.error('Failed to clear suggestions');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center text-muted-foreground py-4">
        Sign in to manage your gamer tags
      </div>
    );
  }

  const confirmedNames = settings?.confirmed_player_names || [];
  const possibleNames = Object.entries(settings?.possible_player_names || {})
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Confirmed Gamer Tags */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-medium">Confirmed Gamer Tags</h3>
        </div>

        {confirmedNames.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No confirmed gamer tags yet. Confirm your player names from the suggestions below or from the My Replays page.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {confirmedNames.map((name) => (
              <Badge
                key={name}
                variant="secondary"
                className="flex items-center gap-1.5 py-1.5 px-3"
              >
                <span>{name}</span>
                <button
                  onClick={() => setNameToRemove(name)}
                  className="ml-1 hover:text-destructive focus:outline-none"
                  disabled={isSaving}
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Confirmed tags are used to identify you in replays and calculate your statistics.
        </p>
      </div>

      {/* Suggested Names */}
      {possibleNames.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-sm font-medium">Suggested Names</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllSuggestions}
              disabled={isSaving}
              className="text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </div>

          <div className="space-y-2">
            {possibleNames.map(([name, count]) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <span className="font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({count} game{count !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismissSuggestion(name)}
                    disabled={isSaving}
                    className="h-7 text-xs"
                  >
                    Not me
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleConfirmSuggestion(name)}
                    disabled={isSaving}
                    className="h-7 text-xs"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            These names appear frequently in your replays. Confirm if they belong to you.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-medium mb-2">About Gamer Tags</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Gamer tags link your SC2 accounts to your profile</li>
          <li>Statistics are calculated based on confirmed tags</li>
          <li>You can have multiple tags (for smurfs, name changes, etc.)</li>
          <li>New names are suggested after appearing in 3+ replays</li>
        </ul>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!nameToRemove} onOpenChange={() => setNameToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Gamer Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{nameToRemove}&quot; from your confirmed gamer tags?
              This will affect how your statistics are calculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNameToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveConfirmed} disabled={isSaving}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
