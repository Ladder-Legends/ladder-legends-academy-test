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
 * Cached token generation function
 * Caches tokens for 23 hours (tokens are valid for 24h)
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
    };
  },
  ['mux-tokens'], // This will be combined with the playbackId parameter for unique cache keys
  {
    revalidate: 82800, // 23 hours in seconds
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
