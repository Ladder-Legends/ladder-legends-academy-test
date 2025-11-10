import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { auth } from '@/lib/auth';
import { unstable_cache } from 'next/cache';
import { handleMuxError, createErrorResponse } from '@/lib/api-errors';

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_API_KEY!,
  tokenSecret: process.env.MUX_SECRET!,
});

/**
 * Decode JWT payload without verification
 * Used to check token expiry before serving from cache
 */
function decodeJWT(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired or expiring soon
 * @param token JWT token to check
 * @param bufferHours How many hours before expiry to consider "expiring soon"
 * @returns true if token is valid and has enough time remaining
 */
function isTokenValid(token: string, bufferHours: number = 2): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return false;

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const timeUntilExpiry = payload.exp - now;
  const bufferSeconds = bufferHours * 60 * 60;

  return timeUntilExpiry > bufferSeconds;
}

/**
 * Cached token generation function
 * Caches tokens for 12 hours (tokens are valid for 24h)
 * This ensures we regenerate tokens with plenty of validity remaining
 * Each playbackId gets its own cache entry
 */
const getCachedMuxTokens = unstable_cache(
  async (playbackId: string) => {
    console.log('[MUX CACHE] Generating NEW tokens for:', playbackId);

    // Generate signed playback token (valid for 24 hours)
    const playbackToken = await mux.jwt.signPlaybackId(playbackId, {
      keyId: process.env.MUX_SIGNING_KEY_ID!,
      keySecret: process.env.MUX_SIGNING_KEY_PRIVATE_KEY!,
      expiration: '24h',
      type: 'video',
    });

    // Generate signed thumbnail token
    const thumbnailToken = await mux.jwt.signPlaybackId(playbackId, {
      keyId: process.env.MUX_SIGNING_KEY_ID!,
      keySecret: process.env.MUX_SIGNING_KEY_PRIVATE_KEY!,
      expiration: '24h',
      type: 'thumbnail',
    });

    return {
      playback: playbackToken,
      thumbnail: thumbnailToken,
      generatedAt: Date.now(), // Track when tokens were generated
    };
  },
  ['mux-tokens'], // This will be combined with the playbackId parameter for unique cache keys
  {
    revalidate: 43200, // 12 hours in seconds (half of token validity)
    tags: ['mux-playback-tokens'],
  }
);

/**
 * GET /api/mux/playback?playbackId=xxx
 * Generates a signed playback URL for a Mux video
 *
 * This endpoint generates JWT tokens for secure video playback.
 * The tokens expire after a set time to prevent unauthorized sharing.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to watch videos.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const playbackId = searchParams.get('playbackId');

    if (!playbackId) {
      return NextResponse.json(
        { error: 'Missing playbackId parameter' },
        { status: 400 }
      );
    }

    // Check if signing keys are configured
    if (!process.env.MUX_SIGNING_KEY_ID || !process.env.MUX_SIGNING_KEY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Mux signing keys not configured' },
        { status: 500 }
      );
    }

    // Get cached tokens (or generate if not in cache)
    const tokens = await getCachedMuxTokens(playbackId);

    // CRITICAL: Validate cached token before returning
    // If token is expired or expiring soon (< 2h), regenerate it
    if (!isTokenValid(tokens.playback, 2)) {
      console.warn('[MUX PLAYBACK] Cached token expired or expiring soon, regenerating for:', playbackId);

      // Generate fresh tokens directly (bypassing cache)
      const freshPlaybackToken = await mux.jwt.signPlaybackId(playbackId, {
        keyId: process.env.MUX_SIGNING_KEY_ID!,
        keySecret: process.env.MUX_SIGNING_KEY_PRIVATE_KEY!,
        expiration: '24h',
        type: 'video',
      });

      const freshThumbnailToken = await mux.jwt.signPlaybackId(playbackId, {
        keyId: process.env.MUX_SIGNING_KEY_ID!,
        keySecret: process.env.MUX_SIGNING_KEY_PRIVATE_KEY!,
        expiration: '24h',
        type: 'thumbnail',
      });

      console.log('[MUX PLAYBACK] Fresh tokens generated for:', playbackId);

      return NextResponse.json({
        playbackId,
        token: freshPlaybackToken, // Keep for backward compatibility
        playback: freshPlaybackToken,
        thumbnail: freshThumbnailToken,
        expiresIn: '24h',
        regenerated: true,
      });
    }

    console.log('[MUX PLAYBACK] Served tokens for playbackId:', playbackId);
    console.log('[MUX PLAYBACK] Tokens served from cache (NEW log means cache miss)');

    const playbackTokenStr = tokens.playback;
    const thumbnailTokenStr = tokens.thumbnail;

    return NextResponse.json({
      playbackId,
      token: playbackTokenStr, // Keep for backward compatibility
      playback: playbackTokenStr,
      thumbnail: thumbnailTokenStr,
      expiresIn: '24h',
    });
  } catch (error) {
    const { searchParams } = new URL(request.url);
    const playbackId = searchParams.get('playbackId');

    const { status, response } = handleMuxError(error, `Generating playback token for ${playbackId}`);
    return createErrorResponse(status, response);
  }
}

/**
 * POST /api/mux/playback
 * Get asset information and playback ID by asset ID
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: 'Missing assetId' },
        { status: 400 }
      );
    }

    console.log('[MUX ASSET] Retrieving asset:', { assetId });

    // Get asset information
    const asset = await mux.video.assets.retrieve(assetId);

    console.log('[MUX ASSET] Asset details:', {
      assetId: asset.id,
      status: asset.status,
      playbackIds: asset.playback_ids?.map(p => ({
        id: p.id,
        policy: p.policy,
      })),
    });

    // Get the first playback ID (should be signed)
    const playbackId = asset.playback_ids?.[0]?.id;
    const playbackPolicy = asset.playback_ids?.[0]?.policy;

    if (!playbackId) {
      return NextResponse.json(
        {
          error: 'No playback ID found for this asset',
          assetId: asset.id,
          status: asset.status,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      assetId: asset.id,
      playbackId: playbackId,
      playbackPolicy: playbackPolicy,
      status: asset.status,
      duration: asset.duration,
      aspectRatio: asset.aspect_ratio,
      resolution: asset.resolution_tier,
      createdAt: asset.created_at,
    });
  } catch (error) {
    // Try to get assetId from body for logging context
    let assetId = 'unknown';
    try {
      const body = await request.json();
      assetId = body.assetId || 'unknown';
    } catch {}

    const { status, response } = handleMuxError(error, `Retrieving asset info for ${assetId}`);
    return createErrorResponse(status, response);
  }
}
