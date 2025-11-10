import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import replaysData from '@/data/replays.json';

/**
 * Secure replay download endpoint
 * Validates authentication before redirecting to replay download
 *
 * GET /api/replay-download?replayId=<id>
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const replayId = searchParams.get('replayId');

    if (!replayId) {
      return NextResponse.json(
        { error: 'Missing replayId parameter' },
        { status: 400 }
      );
    }

    // Find the replay
    const replay = replaysData.find(r => r.id === replayId);

    if (!replay) {
      return NextResponse.json(
        { error: 'Replay not found' },
        { status: 404 }
      );
    }

    if (!replay.downloadUrl) {
      return NextResponse.json(
        { error: 'Replay has no download URL' },
        { status: 404 }
      );
    }

    // Check if user has access
    const isFree = replay.isFree || false;
    const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
    const hasAccess = isFree || hasSubscriberRole;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized. This replay requires a subscription.' },
        { status: 403 }
      );
    }

    // Redirect to the download URL
    // Note: Using public blob URLs for now. For private URLs, we would need to
    // implement signed URL generation with @vercel/blob's private access mode.
    return NextResponse.redirect(replay.downloadUrl);
  } catch (error) {
    console.error('Error in replay download:', error);
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: 500 }
    );
  }
}
