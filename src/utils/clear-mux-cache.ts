/**
 * Utility to clear all Mux playback token cache from localStorage
 *
 * This is useful when videos show "Invalid playback URL" errors due to
 * corrupted or stale cached tokens.
 *
 * Usage:
 * 1. Open browser console
 * 2. Run: clearMuxCache()
 * 3. Refresh the page
 */
export function clearMuxCache() {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.error('localStorage not available');
    return;
  }

  let cleared = 0;
  const keys: string[] = [];

  // Find all mux-token keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('mux-token-')) {
      keys.push(key);
    }
  }

  // Remove them
  keys.forEach(key => {
    try {
      localStorage.removeItem(key);
      cleared++;
      console.log(`✓ Cleared: ${key}`);
    } catch (err) {
      console.error(`✗ Failed to clear: ${key}`, err);
    }
  });

  console.log(`\n🎉 Cleared ${cleared} Mux token cache entries`);
  console.log('Please refresh the page to fetch fresh tokens.');

  return cleared;
}

// Make it globally available in the browser console
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).clearMuxCache = clearMuxCache;
}
