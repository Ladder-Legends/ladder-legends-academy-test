'use client';

import { useState, useEffect } from 'react';

export type ContentType = 'videos' | 'build-orders' | 'replays' | 'masterclasses' | 'coaches';

export interface PendingChange {
  id: string;
  contentType: ContentType;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

const STORAGE_KEY = 'ladder-legends-pending-changes';

export function usePendingChanges() {
  const [changes, setChanges] = useState<PendingChange[]>([]);

  // Load changes from localStorage on mount
  useEffect(() => {
    const loadChanges = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setChanges(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse pending changes:', e);
        }
      }
    };

    // Load initial changes
    loadChanges();

    // Listen for storage changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadChanges();
      }
    };

    // Listen for custom event (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadChanges();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
    };
  }, []);

  // Save changes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('localStorageChange'));
  }, [changes]);

  const addChange = (change: Omit<PendingChange, 'timestamp'>) => {
    setChanges(prev => {
      // Remove any existing change for the same item
      const filtered = prev.filter(
        c => !(c.id === change.id && c.contentType === change.contentType)
      );
      return [...filtered, { ...change, timestamp: Date.now() }];
    });
  };

  const removeChange = (id: string, contentType: ContentType) => {
    setChanges(prev => prev.filter(
      c => !(c.id === id && c.contentType === contentType)
    ));
  };

  const clearAllChanges = () => {
    setChanges([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasChanges = changes.length > 0;

  return {
    changes,
    addChange,
    removeChange,
    clearAllChanges,
    hasChanges,
  };
}
