'use client';

import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';

interface AdminActionsProps<T> {
  /** The item being acted upon */
  item: T;
  /** Callback when edit is clicked */
  onEdit?: (item: T) => void;
  /** Callback when delete is clicked */
  onDelete?: (item: T) => void;
  /** Permission required to see these actions (default: "coaches") */
  require?: 'coaches' | 'subscribers' | 'owners';
}

/**
 * Admin edit/delete action buttons for table rows.
 * Wrapped in PermissionGate to only show to authorized users.
 */
export function AdminActions<T>({ item, onEdit, onDelete, require = 'coaches' }: AdminActionsProps<T>) {
  if (!onEdit && !onDelete) {
    return null;
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(item);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(item);
  };

  return (
    <PermissionGate require={require}>
      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleEdit}
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </PermissionGate>
  );
}
