'use client';

import { useState } from 'react';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Button } from '@/components/ui/button';
import { GitCommit, X, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export function CommitButton() {
  const { changes, clearAllChanges, hasChanges } = usePendingChanges();
  const [isCommitting, setIsCommitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: session } = useSession();

  const handleCommit = async () => {
    if (!session?.user) {
      toast.error('You must be logged in to commit changes');
      return;
    }

    setIsCommitting(true);

    try {
      // Commit all changes to GitHub in a single batch via the API
      const response = await fetch('/api/admin/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: changes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Commit failed:', errorData);
        throw new Error(errorData.error || 'Failed to commit changes');
      }

      await response.json();

      toast.success(
        `Successfully committed ${changes.length} change${changes.length !== 1 ? 's' : ''} in a single commit! The site is rebuilding with your changes. Please wait about a minute and then refresh the page to see your updates.`,
        { duration: 10000 }
      );
      clearAllChanges();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to commit: ${errorMessage}`);
      console.error(error);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleClearChanges = () => {
    clearAllChanges();
    setShowConfirm(false);
    toast.success('All pending changes cleared');
  };

  if (!hasChanges) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-card border-2 border-primary rounded-lg shadow-lg shadow-primary/20 p-4 min-w-[300px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitCommit className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {changes.length} Pending Change{changes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
          {changes.map((change, i) => (
            <div key={i} className="text-sm text-muted-foreground">
              <span className="capitalize">{change.operation}</span> {change.contentType.replace('-', ' ')}
              {' '}
              <span className="text-foreground font-mono">{String(change.data.id)}</span>
            </div>
          ))}
        </div>

        {showConfirm ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-2">
              Clear all pending changes? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearChanges}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleCommit}
            disabled={isCommitting}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
          >
            {isCommitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <GitCommit className="h-4 w-4 mr-2" />
                Commit to GitHub
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
