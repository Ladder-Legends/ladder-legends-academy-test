import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import replaysData from '@/data/replays.json';
import { getDownloadUrl } from '@vercel/blob';

/**
 * Secure replay download endpoint
 * - For FREE content: redirects to public blob URL
 * - For PREMIUM content: validates auth and generates signed URL
 *
 * GET /api/replay-download?replayId=<id>
 */
export async function GET(request: NextRequest) {
  try {
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

    const isFree = replay.isFree || false;

    // For free content, just redirect to public URL (no auth check needed)
    if (isFree) {
      return NextResponse.redirect(replay.downloadUrl);
    }

    // For premium content, check authentication
    const session = await auth();
    const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;

    if (!hasSubscriberRole) {
      return NextResponse.json(
        { error: 'Unauthorized. This replay requires a subscription.' },
        { status: 403 }
      );
    }

    // Generate signed URL for premium content (expires in 5 minutes)
    const signedUrl = await getDownloadUrl(replay.downloadUrl, {
      expiresIn: 300, // 5 minutes
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error in replay download:', error);
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: 500 }
    );
  }
}
