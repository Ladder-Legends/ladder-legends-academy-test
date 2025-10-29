import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { auth } from '@/lib/auth';

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_API_KEY!,
  tokenSecret: process.env.MUX_SECRET!,
});

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

    // Generate signed playback token (valid for 24 hours)
    const token = mux.jwt.signPlaybackId(playbackId, {
      keyId: process.env.MUX_SIGNING_KEY_ID,
      keySecret: process.env.MUX_SIGNING_KEY_PRIVATE_KEY,
      expiration: '24h', // Token expires in 24 hours
    });

    return NextResponse.json({
      playbackId,
      token,
      expiresIn: '24h',
    });
  } catch (error) {
    console.error('Error generating signed playback URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate signed playback URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mux/playback
 * Get asset information by asset ID
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

    // Get asset information
    const asset = await mux.video.assets.retrieve(assetId);

    return NextResponse.json({
      assetId: asset.id,
      playbackId: asset.playback_ids?.[0]?.id,
      status: asset.status,
      duration: asset.duration,
      aspectRatio: asset.aspect_ratio,
      resolution: asset.resolution_tier,
      createdAt: asset.created_at,
    });
  } catch (error) {
    console.error('Error retrieving asset information:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve asset information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
