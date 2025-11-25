import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { handleMuxError, createErrorResponse } from '@/lib/api-errors';

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
    const { title } = body;

    console.log('[MUX UPLOAD] Creating upload URL for:', {
      title: title || 'Untitled Video',
      titleLength: (title || 'Untitled Video').length,
      user: session.user?.email || session.user?.name,
    });

    // Create a direct upload URL
    // Note: Mux updated their API - now uses 'video_quality' instead of 'encoding_tier'
    // 'basic' = free tier (up to 1080p), 'plus' = paid tier (adaptive encoding)
    const videoQuality = process.env.MUX_VIDEO_QUALITY || 'basic';

    // Mux has a 255 character limit on passthrough - just store title (truncated if needed)
    const videoTitle = (title || 'Untitled Video').substring(0, 250);

    console.log('[MUX UPLOAD] Passthrough data:', {
      videoTitle,
      length: videoTitle.length,
    });

    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      new_asset_settings: {
        playback_policies: ['signed'], // Use signed URLs for security
        video_quality: videoQuality as 'basic' | 'plus', // basic = free tier, plus = paid tier
        // Store just the video title (max 255 chars)
        passthrough: videoTitle,
      },
    });

    console.log('[MUX UPLOAD] Upload URL created:', {
      uploadId: upload.id,
      status: upload.status,
    });

    return NextResponse.json({
      uploadId: upload.id,
      uploadUrl: upload.url,
      message: 'Upload URL created successfully. Upload your video to the provided URL.',
    });
  } catch (error) {
    const { status, response } = handleMuxError(error, 'Creating upload URL');
    return createErrorResponse(status, response);
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

    console.log('[MUX UPLOAD] Status check:', {
      uploadId,
      status: upload.status,
      assetId: upload.asset_id,
      error: upload.error,
    });

    return NextResponse.json({
      status: upload.status,
      assetId: upload.asset_id,
      error: upload.error,
    });
  } catch (error) {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    const { status, response } = handleMuxError(error, `Checking upload status for ${uploadId}`);
    return createErrorResponse(status, response);
  }
}
