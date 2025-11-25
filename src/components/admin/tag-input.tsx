'use client';

import { useTagManager } from '@/hooks/use-tag-manager';

interface TagInputProps {
  /** Current tags array */
  tags: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** All existing tags for autocomplete suggestions */
  existingTags?: string[];
  /** Label for the field */
  label?: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Help text below the input */
  helpText?: string;
  /** Whether to lowercase tags */
  lowercase?: boolean;
  /** Maximum suggestions to show */
  maxSuggestions?: number;
}

/**
 * Reusable tag input with autocomplete suggestions
 *
 * Features:
 * - Autocomplete from existing tags
 * - Add tags with Enter key
 * - Remove tags with X button
 * - Visual tag chips
 *
 * @example
 * ```tsx
 * <TagInput
 *   tags={formData.tags || []}
 *   onChange={(tags) => setFormData({ ...formData, tags })}
 *   existingTags={allExistingTags}
 *   label="Tags"
 *   placeholder="Type to add tags (press Enter)"
 *   helpText="Common tags: fundamentals, macro, micro, strategy"
 * />
 * ```
 */
export function TagInput({
  tags,
  onChange,
  existingTags = [],
  label = 'Tags',
  placeholder = 'Type to add tags (press Enter)',
  helpText,
  lowercase = true,
  maxSuggestions = 5,
}: TagInputProps) {
  const {
    input,
    setInput,
    showDropdown,
    suggestions,
    addTag,
    removeTag,
    handleKeyDown,
    handleFocus,
    handleBlur,
  } = useTagManager({
    tags,
    onChange,
    existingTags,
    maxSuggestions,
    lowercase,
  });

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <div className="space-y-2">
        {/* Selected tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-primary/70"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input with autocomplete */}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder={placeholder}
          />

          {/* Autocomplete dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addTag(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {helpText && (
          <p className="text-xs text-muted-foreground">{helpText}</p>
        )}
      </div>
    </div>
  );
}
