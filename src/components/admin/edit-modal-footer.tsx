'use client';

import { Button } from '@/components/ui/button';

interface EditModalFooterProps {
  /** Callback when save button is clicked */
  onSave: () => void;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Whether this is a new item (changes button text) */
  isNew?: boolean;
  /** Custom save button text */
  saveText?: string;
  /** Whether save is disabled */
  saveDisabled?: boolean;
  /** Whether to show the help text */
  showHelpText?: boolean;
  /** Custom help text */
  helpText?: string;
}

/**
 * Standard footer for edit modals with Save and Cancel buttons
 *
 * @example
 * ```tsx
 * <EditModalFooter
 *   onSave={handleSave}
 *   onCancel={onClose}
 *   isNew={isNew}
 * />
 * ```
 */
export function EditModalFooter({
  onSave,
  onCancel,
  isNew = false,
  saveText,
  saveDisabled = false,
  showHelpText = true,
  helpText = 'Changes are saved to browser storage. Click the commit button to push to GitHub.',
}: EditModalFooterProps) {
  const buttonText = saveText || (isNew ? 'Create' : 'Save to Local Storage');

  return (
    <>
      <div className="flex gap-2 pt-4">
        <Button
          onClick={onSave}
          className="flex-1"
          disabled={saveDisabled}
        >
          {buttonText}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>

      {showHelpText && (
        <p className="text-xs text-muted-foreground text-center">
          {helpText}
        </p>
      )}
    </>
  );
}
