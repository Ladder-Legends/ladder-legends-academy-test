import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_API_KEY!,
  tokenSecret: process.env.MUX_SECRET!,
});

/**
 * POST /api/mux/upload
 * Creates a Mux direct upload URL for video uploads
 * Only accessible to coaches and owners
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !hasPermission(session, 'coaches')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only coaches and owners can upload videos.' },
        { status: 401 }
      );
    }

    // Get video metadata from request
    const body = await request.json();
    const { title, description } = body;

    // Create a direct upload URL
    // Note: Mux updated their API - now uses 'video_quality' instead of 'encoding_tier'
    // 'basic' = free tier (up to 1080p), 'plus' = paid tier (adaptive encoding)
    const videoQuality = process.env.MUX_VIDEO_QUALITY || 'basic';

    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      new_asset_settings: {
        playback_policies: ['signed'], // Use signed URLs for security
        video_quality: videoQuality as 'basic' | 'plus', // basic = free tier, plus = paid tier
        // Add metadata
        passthrough: JSON.stringify({
          title: title || 'Untitled Video',
          description: description || '',
          uploadedBy: session.user?.email || session.user?.name || 'Unknown',
          uploadedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      uploadId: upload.id,
      uploadUrl: upload.url,
      message: 'Upload URL created successfully. Upload your video to the provided URL.',
    });
  } catch (error) {
    console.error('Error creating Mux upload URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to create upload URL. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mux/upload?uploadId=xxx
 * Check the status of a Mux upload
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !hasPermission(session, 'coaches')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Missing uploadId parameter' },
        { status: 400 }
      );
    }

    // Get upload status
    const upload = await mux.video.uploads.retrieve(uploadId);

    return NextResponse.json({
      status: upload.status,
      assetId: upload.asset_id,
      error: upload.error,
    });
  } catch (error) {
    console.error('Error checking Mux upload status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check upload status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
