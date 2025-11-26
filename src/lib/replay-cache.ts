/**
 * IndexedDB Cache for Computed Replay Metrics
 *
 * Provides:
 * 1. Persistent storage for computed time-series data
 * 2. Version tracking to invalidate stale data
 * 3. Replay index tracking to detect new replays
 */

import type { TimeSeriesData, TimePeriod, MatchupTimeSeriesData } from './replay-time-series';

// ============================================================================
// Types
// ============================================================================

const DB_NAME = 'ladder-legends-replay-cache';
const DB_VERSION = 1;

const STORES = {
  timeSeries: 'time-series',
  replayIndex: 'replay-index',
  metadata: 'metadata',
} as const;

export interface CachedTimeSeries {
  key: string; // e.g., "all-daily", "TvZ-weekly"
  userId: string;
  period: TimePeriod;
  matchup: string | null; // null for all matchups
  data: TimeSeriesData;
  replayCount: number; // Number of replays when cached
  replayVersionHash: string; // Hash of replay IDs to detect changes
  cachedAt: number; // Timestamp
}

export interface CachedReplayIndex {
  userId: string;
  replayIds: string[];
  versionHash: string;
  cachedAt: number;
}

export interface CacheMetadata {
  userId: string;
  lastComputed: number;
  cacheVersion: number;
}

// ============================================================================
// IndexedDB Helpers
// ============================================================================

let dbInstance: IDBDatabase | null = null;

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Open the database connection
 */
async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create time-series store
      if (!db.objectStoreNames.contains(STORES.timeSeries)) {
        const tsStore = db.createObjectStore(STORES.timeSeries, { keyPath: 'key' });
        tsStore.createIndex('userId', 'userId', { unique: false });
        tsStore.createIndex('period', 'period', { unique: false });
      }

      // Create replay index store
      if (!db.objectStoreNames.contains(STORES.replayIndex)) {
        db.createObjectStore(STORES.replayIndex, { keyPath: 'userId' });
      }

      // Create metadata store
      if (!db.objectStoreNames.contains(STORES.metadata)) {
        db.createObjectStore(STORES.metadata, { keyPath: 'userId' });
      }
    };
  });
}

/**
 * Execute a transaction on the database
 */
async function executeTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Generate a cache key for time-series data
 */
export function generateCacheKey(
  userId: string,
  period: TimePeriod,
  matchup: string | null
): string {
  const matchupPart = matchup || 'all';
  return `${userId}-${matchupPart}-${period}`;
}

/**
 * Generate a hash from replay IDs to detect changes
 */
export function generateReplayVersionHash(replayIds: string[]): string {
  const sorted = [...replayIds].sort();
  const str = sorted.join('|');
  // Simple hash using string length and some characters
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${replayIds.length}-${Math.abs(hash).toString(36)}`;
}

/**
 * Get cached time-series data
 */
export async function getCachedTimeSeries(
  userId: string,
  period: TimePeriod,
  matchup: string | null
): Promise<CachedTimeSeries | null> {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  try {
    const key = generateCacheKey(userId, period, matchup);
    const result = await executeTransaction<CachedTimeSeries | undefined>(
      STORES.timeSeries,
      'readonly',
      (store) => store.get(key)
    );
    return result || null;
  } catch (error) {
    console.warn('Failed to get cached time-series:', error);
    return null;
  }
}

/**
 * Save time-series data to cache
 */
export async function setCachedTimeSeries(
  userId: string,
  period: TimePeriod,
  matchup: string | null,
  data: TimeSeriesData,
  replayIds: string[]
): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  try {
    const key = generateCacheKey(userId, period, matchup);
    const cached: CachedTimeSeries = {
      key,
      userId,
      period,
      matchup,
      data,
      replayCount: replayIds.length,
      replayVersionHash: generateReplayVersionHash(replayIds),
      cachedAt: Date.now(),
    };

    await executeTransaction(
      STORES.timeSeries,
      'readwrite',
      (store) => store.put(cached)
    );
  } catch (error) {
    console.warn('Failed to cache time-series:', error);
  }
}

/**
 * Check if cache is still valid
 */
export async function isCacheValid(
  userId: string,
  period: TimePeriod,
  matchup: string | null,
  currentReplayIds: string[]
): Promise<boolean> {
  const cached = await getCachedTimeSeries(userId, period, matchup);
  if (!cached) {
    return false;
  }

  // Check if replay count or hash has changed
  const currentHash = generateReplayVersionHash(currentReplayIds);
  if (cached.replayVersionHash !== currentHash) {
    return false;
  }

  // Check if cache is too old (24 hours)
  const maxAge = 24 * 60 * 60 * 1000;
  if (Date.now() - cached.cachedAt > maxAge) {
    return false;
  }

  return true;
}

/**
 * Clear all cached data for a user
 */
export async function clearUserCache(userId: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.timeSeries, STORES.replayIndex, STORES.metadata], 'readwrite');

    // Clear time-series for user
    const tsStore = transaction.objectStore(STORES.timeSeries);
    const tsIndex = tsStore.index('userId');
    const tsCursor = tsIndex.openCursor(IDBKeyRange.only(userId));

    await new Promise<void>((resolve, reject) => {
      tsCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      tsCursor.onerror = () => reject(tsCursor.error);
    });

    // Clear replay index
    const riStore = transaction.objectStore(STORES.replayIndex);
    riStore.delete(userId);

    // Clear metadata
    const metaStore = transaction.objectStore(STORES.metadata);
    metaStore.delete(userId);
  } catch (error) {
    console.warn('Failed to clear user cache:', error);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.timeSeries, STORES.replayIndex, STORES.metadata], 'readwrite');

    transaction.objectStore(STORES.timeSeries).clear();
    transaction.objectStore(STORES.replayIndex).clear();
    transaction.objectStore(STORES.metadata).clear();
  } catch (error) {
    console.warn('Failed to clear all cache:', error);
  }
}

// ============================================================================
// Cache-Aware Data Loading
// ============================================================================

export interface CacheLoadResult<T> {
  data: T;
  fromCache: boolean;
  computeTime: number; // ms
}

/**
 * Load time-series data with caching
 * Returns cached data if valid, otherwise computes and caches
 */
export async function loadTimeSeriesWithCache(
  userId: string,
  period: TimePeriod,
  matchup: string | null,
  replayIds: string[],
  computeFn: () => TimeSeriesData
): Promise<CacheLoadResult<TimeSeriesData>> {
  const startTime = performance.now();

  // Try to get from cache first
  if (await isCacheValid(userId, period, matchup, replayIds)) {
    const cached = await getCachedTimeSeries(userId, period, matchup);
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
        computeTime: performance.now() - startTime,
      };
    }
  }

  // Compute fresh data
  const data = computeFn();
  const computeTime = performance.now() - startTime;

  // Cache the result (async, don't wait)
  setCachedTimeSeries(userId, period, matchup, data, replayIds).catch((err) => {
    console.warn('Failed to cache time-series data:', err);
  });

  return {
    data,
    fromCache: false,
    computeTime,
  };
}

// ============================================================================
// Replay Index Tracking
// ============================================================================

/**
 * Get the cached replay index
 */
export async function getCachedReplayIndex(userId: string): Promise<CachedReplayIndex | null> {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  try {
    const result = await executeTransaction<CachedReplayIndex | undefined>(
      STORES.replayIndex,
      'readonly',
      (store) => store.get(userId)
    );
    return result || null;
  } catch (error) {
    console.warn('Failed to get cached replay index:', error);
    return null;
  }
}

/**
 * Update the cached replay index
 */
export async function updateCachedReplayIndex(
  userId: string,
  replayIds: string[]
): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  try {
    const cached: CachedReplayIndex = {
      userId,
      replayIds,
      versionHash: generateReplayVersionHash(replayIds),
      cachedAt: Date.now(),
    };

    await executeTransaction(
      STORES.replayIndex,
      'readwrite',
      (store) => store.put(cached)
    );
  } catch (error) {
    console.warn('Failed to update cached replay index:', error);
  }
}

/**
 * Check if replay index has changed since last cache
 */
export async function hasReplayIndexChanged(
  userId: string,
  currentReplayIds: string[]
): Promise<boolean> {
  const cached = await getCachedReplayIndex(userId);
  if (!cached) {
    return true; // No cache, assume changed
  }

  const currentHash = generateReplayVersionHash(currentReplayIds);
  return cached.versionHash !== currentHash;
}
