import { useState } from 'react';

type ViewMode = 'grid' | 'table';

/**
 * Custom hook to persist view mode preference in localStorage per page
 * @param pageKey - Unique identifier for the page (e.g., 'videos', 'replays', 'build-orders')
 * @param defaultView - Default view mode if no preference is saved
 * @returns [view, setView] - Current view mode and setter function
 */
export function useViewPreference(
  pageKey: string,
  defaultView: ViewMode = 'table'
): [ViewMode, (view: ViewMode) => void] {
  const storageKey = `view-preference-${pageKey}`;

  // Initialize state from localStorage or default
  const [view, setViewState] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return defaultView;

    try {
      const saved = localStorage.getItem(storageKey);
      return (saved === 'grid' || saved === 'table') ? saved : defaultView;
    } catch (error) {
      console.error('Failed to read view preference from localStorage:', error);
      return defaultView;
    }
  });

  // Persist to localStorage whenever view changes
  const setView = (newView: ViewMode) => {
    setViewState(newView);

    try {
      localStorage.setItem(storageKey, newView);
    } catch (error) {
      console.error('Failed to save view preference to localStorage:', error);
    }
  };

  return [view, setView];
}
