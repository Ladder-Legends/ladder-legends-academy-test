'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
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
import { MoreHorizontal, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import type { ReferenceReplay, ReplayIndexEntry } from '@/lib/replay-types';

interface ReferenceBuildsTableProps {
  references: ReferenceReplay[];
  replayIndex: ReplayIndexEntry[];
  defaultReferenceIds: Record<string, string | null>; // matchup -> reference_id
  onEdit?: (reference: ReferenceReplay) => void;
  onDelete?: (referenceId: string) => Promise<void>;
  onSetDefault?: (matchup: string, referenceId: string | null) => Promise<void>;
}

/**
 * Calculate usage stats for a reference
 */
function calculateReferenceStats(
  reference: ReferenceReplay,
  replayIndex: ReplayIndexEntry[]
): { gamesCompared: number; avgScore: number | null } {
  const comparedReplays = replayIndex.filter(
    r => r.reference_id === reference.id && r.comparison_score !== null
  );

  if (comparedReplays.length === 0) {
    return { gamesCompared: 0, avgScore: null };
  }

  const avgScore =
    comparedReplays.reduce((sum, r) => sum + (r.comparison_score || 0), 0) /
    comparedReplays.length;

  return {
    gamesCompared: comparedReplays.length,
    avgScore: Math.round(avgScore * 10) / 10,
  };
}

/**
 * Get source type display name
 */
function getSourceTypeDisplay(sourceType: ReferenceReplay['source_type']): string {
  switch (sourceType) {
    case 'my_replay':
      return 'My Replay';
    case 'uploaded_replay':
      return 'Uploaded';
    case 'site_build_order':
      return 'Build Order';
    case 'site_replay':
      return 'Site Replay';
    default:
      return sourceType;
  }
}

/**
 * ReferenceBuildsTable - Table displaying user's reference builds
 */
export function ReferenceBuildsTable({
  references,
  replayIndex,
  defaultReferenceIds,
  onEdit,
  onDelete,
  onSetDefault,
}: ReferenceBuildsTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteConfirmId || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteConfirmId);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleDefault = async (reference: ReferenceReplay) => {
    if (!onSetDefault) return;

    const isCurrentDefault = defaultReferenceIds[reference.matchup] === reference.id;
    await onSetDefault(reference.matchup, isCurrentDefault ? null : reference.id);
  };

  if (references.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No reference builds yet.</p>
        <p className="text-sm mt-1">
          Create a reference to compare your replays against.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Alias</TableHead>
            <TableHead>Matchup</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Games</TableHead>
            <TableHead className="text-right">Avg Score</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {references.map((ref) => {
            const stats = calculateReferenceStats(ref, replayIndex);
            const isDefault = defaultReferenceIds[ref.matchup] === ref.id;

            return (
              <TableRow key={ref.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <span className="font-medium">{ref.alias}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ref.matchup}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getSourceTypeDisplay(ref.source_type)}
                </TableCell>
                <TableCell className="text-right">
                  {stats.gamesCompared}
                </TableCell>
                <TableCell className="text-right">
                  {stats.avgScore !== null ? `${stats.avgScore}%` : '--'}
                </TableCell>
                <TableCell>
                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    }
                    align="right"
                  >
                    {onSetDefault && (
                      <DropdownMenuItem onClick={() => handleToggleDefault(ref)}>
                        <Star className="mr-2 h-4 w-4" />
                        {isDefault ? 'Remove as default' : 'Set as default'}
                      </DropdownMenuItem>
                    )}
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(ref)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        className="text-red-600 hover:text-red-600"
                        onClick={() => setDeleteConfirmId(ref.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reference Build</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reference build? This action
              cannot be undone. Replays compared to this reference will lose
              their comparison data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
