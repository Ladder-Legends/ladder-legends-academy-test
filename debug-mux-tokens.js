/**
 * Mux Token Debugging Script
 *
 * Paste this into your browser console to debug playback token issues.
 * This will show you:
 * - All cached tokens in localStorage
 * - Whether tokens are expired
 * - What tokens are currently being used
 * - Detailed JWT payload information
 */

// Helper to decode JWT without verification
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format' };
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch (e) {
    return { error: 'Failed to decode JWT', details: e.message };
  }
}

// Helper to format timestamp
function formatTimestamp(unix) {
  if (!unix) return 'N/A';
  const date = new Date(unix * 1000);
  return date.toLocaleString() + ' (' + date.toISOString() + ')';
}

// Helper to check if token is expired
function isTokenExpired(exp) {
  if (!exp) return { expired: true, reason: 'No expiration found' };
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = exp - now;
  const hoursUntilExpiry = timeUntilExpiry / 3600;

  return {
    expired: timeUntilExpiry <= 0,
    timeUntilExpiry,
    hoursUntilExpiry: hoursUntilExpiry.toFixed(2),
    expiresAt: formatTimestamp(exp),
    now: formatTimestamp(now),
  };
}

// Main debugging function
function debugMuxTokens() {
  console.clear();
  console.log('%c🎬 MUX TOKEN DEBUGGER 🎬', 'font-size: 20px; font-weight: bold; color: #00dc82');
  console.log('================================================\n');

  // 1. Check all Mux tokens in localStorage
  console.log('%c📦 LOCALSTORAGE CACHE:', 'font-size: 16px; font-weight: bold; color: #0ea5e9');

  const muxTokens = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('mux-token-')) {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        const playbackId = key.replace('mux-token-', '');

        // Decode the JWT
        const decoded = decodeJWT(cached.token);
        const expiryCheck = isTokenExpired(decoded.exp);

        muxTokens.push({
          key,
          playbackId,
          cached,
          decoded,
          expiryCheck,
        });

        console.log(`\n🎥 PlaybackId: ${playbackId}`);
        console.log('   Cache Key:', key);
        console.log('   Cached Expires At:', new Date(cached.expiresAt).toLocaleString());
        console.log('   JWT Payload:', decoded);
        console.log('   JWT Issued At:', formatTimestamp(decoded.iat));
        console.log('   JWT Expires At:', formatTimestamp(decoded.exp));
        console.log('   JWT Audience:', decoded.aud);
        console.log('   JWT Subject:', decoded.sub);
        console.log('   Expiry Status:', expiryCheck);

        if (expiryCheck.expired) {
          console.log('   ⚠️  TOKEN IS EXPIRED!');
        } else if (parseFloat(expiryCheck.hoursUntilExpiry) < 1) {
          console.log('   ⚠️  TOKEN EXPIRES IN LESS THAN 1 HOUR!');
        } else {
          console.log('   ✅ Token is still valid');
        }
      } catch (e) {
        console.error(`   ❌ Error parsing token for ${key}:`, e);
      }
    }
  }

  if (muxTokens.length === 0) {
    console.log('   No Mux tokens found in localStorage');
  }

  // 2. Check for active Mux players on the page
  console.log('\n%c🎮 ACTIVE MUX PLAYERS:', 'font-size: 16px; font-weight: bold; color: #f59e0b');
  const players = document.querySelectorAll('mux-player');

  if (players.length === 0) {
    console.log('   No Mux players found on current page');
  } else {
    players.forEach((player, index) => {
      console.log(`\n   Player ${index + 1}:`);
      console.log('   - Playback ID:', player.playbackId);
      console.log('   - Stream Type:', player.streamType);
      console.log('   - Current Time:', player.currentTime);
      console.log('   - Duration:', player.duration);
      console.log('   - Paused:', player.paused);
      console.log('   - Element:', player);
    });
  }

  // 3. Provide helper functions
  console.log('\n%c🛠️  HELPER FUNCTIONS:', 'font-size: 16px; font-weight: bold; color: #8b5cf6');
  console.log('\n   Use these functions to debug further:\n');
  console.log('   • clearAllMuxTokens() - Clear all Mux tokens from localStorage');
  console.log('   • testFetchToken(playbackId) - Fetch a fresh token from the API');
  console.log('   • inspectToken(token) - Decode and inspect a JWT token');
  console.log('   • checkServerCache() - Check if server cache might be stale');

  return {
    tokensInCache: muxTokens.length,
    playersOnPage: players.length,
    tokens: muxTokens,
  };
}

// Helper function to clear all Mux tokens
window.clearAllMuxTokens = function() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('mux-token-')) {
      keys.push(key);
    }
  }

  keys.forEach(key => localStorage.removeItem(key));
  console.log(`✅ Cleared ${keys.length} Mux tokens from localStorage`);
  console.log('🔄 Reload the page to fetch fresh tokens');
};

// Helper function to test fetching a token
window.testFetchToken = async function(playbackId) {
  if (!playbackId) {
    console.error('❌ Please provide a playbackId');
    return;
  }

  console.log(`🔄 Fetching fresh token for playbackId: ${playbackId}`);

  try {
    const response = await fetch(`/api/mux/playback?playbackId=${playbackId}`, {
      cache: 'no-store', // Force bypass cache
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', data);
      return;
    }

    console.log('✅ Fresh token received:', data);

    const decoded = decodeJWT(data.playback || data.token);
    console.log('📝 Decoded JWT:', decoded);

    const expiryCheck = isTokenExpired(decoded.exp);
    console.log('⏰ Expiry Status:', expiryCheck);

    return data;
  } catch (error) {
    console.error('❌ Error fetching token:', error);
  }
};

// Helper function to inspect a token
window.inspectToken = function(token) {
  if (!token) {
    console.error('❌ Please provide a token');
    return;
  }

  const decoded = decodeJWT(token);
  const expiryCheck = isTokenExpired(decoded.exp);

  console.log('📝 Decoded JWT:', decoded);
  console.log('⏰ Expiry Status:', expiryCheck);

  return { decoded, expiryCheck };
};

// Helper to check server cache issues
window.checkServerCache = function() {
  console.log('\n%c🔍 SERVER CACHE ANALYSIS:', 'font-size: 16px; font-weight: bold; color: #ec4899');
  console.log('\nThe server uses Next.js unstable_cache with:');
  console.log('  - Cache duration: 23 hours');
  console.log('  - Token validity: 24 hours');
  console.log('  - Cache tags: ["mux-playback-tokens"]');
  console.log('\n⚠️  POTENTIAL ISSUES:');
  console.log('  1. If a token is generated at hour 0 and cached for 23h,');
  console.log('     it might be served at hour 23 with only 1h validity left');
  console.log('  2. Client-side cache also caches for 23h, compounding the issue');
  console.log('  3. Race condition: token might expire during page load');
  console.log('\n💡 SOLUTIONS:');
  console.log('  1. Reduce server cache to 12h (half of token validity)');
  console.log('  2. Add buffer time in client cache check (currently 1h buffer)');
  console.log('  3. Check token expiry on server before returning cached token');
  console.log('  4. Clear cache tag after 12h to force regeneration');
  console.log('\n🔧 TO INVALIDATE SERVER CACHE:');
  console.log('  1. Use Vercel CLI: vercel env pull');
  console.log('  2. Redeploy: git commit --allow-empty -m "Force cache clear" && git push');
  console.log('  3. Or add revalidateTag in your API route (requires code change)');
};

// Auto-run on paste
debugMuxTokens();
