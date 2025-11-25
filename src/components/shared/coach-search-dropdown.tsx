'use client';

import { useMemo, useEffect } from 'react';
import { useAutocompleteSearch, AutocompleteOption } from '@/hooks/use-autocomplete-search';
import { coaches } from '@/lib/data';
import type { Coach } from '@/types/coach';

interface CoachSearchDropdownProps {
  /** Currently selected coach display name */
  value: string;
  /** Currently selected coach ID */
  coachId: string;
  /** Callback when coach is selected - receives (displayName, id) */
  onSelect: (displayName: string, coachId: string) => void;
  /** Callback when coach is cleared */
  onClear: () => void;
  /** Whether to show only active coaches */
  activeOnly?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Show the selected coach info below input */
  showSelectedInfo?: boolean;
}

/**
 * Searchable coach dropdown with autocomplete
 *
 * Features:
 * - Search by name or display name
 * - Shows coach race in dropdown
 * - Clear button when coach is selected
 * - Optional selected coach info display
 *
 * @example
 * ```tsx
 * <CoachSearchDropdown
 *   value={formData.coach || ''}
 *   coachId={formData.coachId || ''}
 *   onSelect={(name, id) => setFormData({ ...formData, coach: name, coachId: id })}
 *   onClear={() => setFormData({ ...formData, coach: '', coachId: '' })}
 * />
 * ```
 */
export function CoachSearchDropdown({
  value,
  coachId,
  onSelect,
  onClear,
  activeOnly = true,
  placeholder = 'Type to search coaches...',
  label,
  showSelectedInfo = true,
}: CoachSearchDropdownProps) {
  const availableCoaches = useMemo(() => {
    return activeOnly
      ? coaches.filter(coach => coach.isActive !== false)
      : coaches;
  }, [activeOnly]) as Coach[];

  const {
    search,
    setSearch,
    showDropdown,
    filteredOptions,
    handleFocus,
    handleBlur,
    handleSelect,
  } = useAutocompleteSearch<Coach>({
    options: availableCoaches,
    getSearchText: (c) => c.displayName,
    getSecondarySearchText: (c) => c.name,
    toOption: (c) => ({
      id: c.id,
      label: c.displayName,
      sublabel: `${c.name} • ${c.race}`,
      data: c,
    }),
  });

  // Sync search text with external value
  useEffect(() => {
    if (value !== search) {
      setSearch(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleCoachSelect = (option: AutocompleteOption<Coach>) => {
    handleSelect(option, () => {
      onSelect(option.data.displayName, option.data.id);
    });
  };

  const handleClear = () => {
    setSearch('');
    onClear();
  };

  const hasSelection = value && coachId;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              // If user types, clear the coachId
              if (coachId && e.target.value !== value) {
                onClear();
              }
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
            placeholder={placeholder}
          />
          {hasSelection && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 border border-border hover:bg-muted rounded-md transition-colors text-sm"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && filteredOptions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleCoachSelect(option)}
                className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
              >
                <div className="font-medium">{option.label}</div>
                {option.sublabel && (
                  <div className="text-sm text-muted-foreground">{option.sublabel}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected coach info */}
      {showSelectedInfo && hasSelection && (
        <p className="text-sm text-muted-foreground mt-1">
          Selected: <strong>{value}</strong> (ID: {coachId})
        </p>
      )}
    </div>
  );
}
