'use client';

import { useState, useMemo, useCallback, KeyboardEvent } from 'react';

export interface UseTagManagerOptions {
  /** Current tags array */
  tags: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** All existing tags for autocomplete suggestions */
  existingTags?: string[];
  /** Maximum number of autocomplete suggestions */
  maxSuggestions?: number;
  /** Whether to lowercase tags before adding */
  lowercase?: boolean;
}

export interface UseTagManagerReturn {
  /** Current input value */
  input: string;
  /** Set the input value */
  setInput: (value: string) => void;
  /** Whether to show autocomplete dropdown */
  showDropdown: boolean;
  /** Set dropdown visibility */
  setShowDropdown: (value: boolean) => void;
  /** Filtered tag suggestions */
  suggestions: string[];
  /** Add a tag */
  addTag: (tag: string) => void;
  /** Remove a tag */
  removeTag: (tag: string) => void;
  /** Handle keydown event (for Enter to add) */
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Handle input focus */
  handleFocus: () => void;
  /** Handle input blur */
  handleBlur: () => void;
}

/**
 * Hook for managing tag/specialty input with autocomplete
 *
 * Handles:
 * - Tag input state
 * - Autocomplete suggestions from existing tags
 * - Add/remove tags
 * - Enter key handling
 *
 * @example
 * ```tsx
 * const tagManager = useTagManager({
 *   tags: formData.tags || [],
 *   onChange: (tags) => setFormData({ ...formData, tags }),
 *   existingTags: allExistingTags,
 * });
 *
 * return (
 *   <input
 *     value={tagManager.input}
 *     onChange={(e) => tagManager.setInput(e.target.value)}
 *     onKeyDown={tagManager.handleKeyDown}
 *     onFocus={tagManager.handleFocus}
 *     onBlur={tagManager.handleBlur}
 *   />
 * );
 * ```
 */
export function useTagManager({
  tags,
  onChange,
  existingTags = [],
  maxSuggestions = 5,
  lowercase = true,
}: UseTagManagerOptions): UseTagManagerReturn {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];

    const searchLower = input.toLowerCase();
    return existingTags
      .filter(tag =>
        tag.toLowerCase().includes(searchLower) &&
        !tags.includes(tag) &&
        !tags.includes(tag.toLowerCase())
      )
      .slice(0, maxSuggestions);
  }, [input, existingTags, tags, maxSuggestions]);

  const addTag = useCallback((tag: string) => {
    const normalizedTag = lowercase ? tag.trim().toLowerCase() : tag.trim();

    if (normalizedTag && !tags.includes(normalizedTag)) {
      onChange([...tags, normalizedTag]);
    }
    setInput('');
    setShowDropdown(false);
  }, [tags, onChange, lowercase]);

  const removeTag = useCallback((tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
      }
    }
  }, [input, addTag]);

  const handleFocus = useCallback(() => {
    setShowDropdown(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  return {
    input,
    setInput,
    showDropdown,
    setShowDropdown,
    suggestions,
    addTag,
    removeTag,
    handleKeyDown,
    handleFocus,
    handleBlur,
  };
}
