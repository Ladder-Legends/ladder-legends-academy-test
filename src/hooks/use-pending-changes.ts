'use client';

import { useState, useEffect } from 'react';
import { posthog } from '@/lib/posthog';
import type { Video } from '@/types/video';
import type { Coach } from '@/types/coach';
import type { Replay } from '@/types/replay';
import type { BuildOrder } from '@/types/build-order';
import type { Masterclass } from '@/types/masterclass';
import type { Event } from '@/types/event';
import type { Sponsorship } from '@/types/sponsorship';

export type ContentType = 'videos' | 'build-orders' | 'replays' | 'masterclasses' | 'coaches' | 'events' | 'file' | 'about' | 'privacy' | 'terms' | 'sponsorships';

/**
 * File content type for static pages (about, privacy, terms)
 */
export interface FileContent {
  path: string;
  content: string;
}

/**
 * Union of all content types that can be stored as pending changes.
 * This allows type-safe usage without requiring `as unknown as Record<string, unknown>` casts.
 */
export type ContentData =
  | Video
  | Partial<Video>
  | Coach
  | Partial<Coach>
  | Replay
  | Partial<Replay>
  | BuildOrder
  | Partial<BuildOrder>
  | Masterclass
  | Partial<Masterclass>
  | Event
  | Partial<Event>
  | Sponsorship
  | Partial<Sponsorship>
  | FileContent
  | Record<string, unknown>; // Fallback for edge cases

export interface PendingChange {
  id: string;
  contentType: ContentType;
  operation: 'create' | 'update' | 'delete';
  data: ContentData;
  timestamp: number;
}

const STORAGE_KEY = 'ladder-legends-pending-changes';

export function usePendingChanges() {
  const [changes, setChanges] = useState<PendingChange[]>([]);

  // Load changes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setChanges(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse pending changes:', e);
      }
    }

    // Listen for storage changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setChanges(JSON.parse(e.newValue));
        } catch (e) {
          console.error('Failed to parse pending changes:', e);
        }
      }
    };

    // Listen for custom event (for same-tab updates)
    const handleCustomStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setChanges(parsed);
        } catch (e) {
          console.error('Failed to parse pending changes:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
    };
  }, []);

  // Save changes to localStorage whenever they change, but don't trigger events here
  useEffect(() => {
    const current = localStorage.getItem(STORAGE_KEY);
    const newValue = JSON.stringify(changes);

    // Only update if actually changed
    if (current !== newValue) {
      localStorage.setItem(STORAGE_KEY, newValue);
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event('localStorageChange'));
    }
  }, [changes]);

  const addChange = (change: Omit<PendingChange, 'timestamp'>) => {
    setChanges(prev => {
      // Remove any existing change for the same item
      const filtered = prev.filter(
        c => !(c.id === change.id && c.contentType === change.contentType)
      );
      const newChange = { ...change, timestamp: Date.now() };

      // Track CMS action in PostHog
      const title = 'title' in change.data ? (change.data.title as string | undefined) : undefined;
      posthog.capture('cms_action', {
        content_type: change.contentType,
        operation: change.operation,
        content_id: change.id,
        content_title: title,
      });

      return [...filtered, newChange];
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
