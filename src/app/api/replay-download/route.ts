import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import replaysData from '@/data/replays.json';
import { getDownloadUrl } from '@vercel/blob';
import { generateDownloadToken, verifyDownloadToken } from '@/lib/signed-urls';
import { checkRateLimit } from '@/lib/rate-limiter';

/**
 * Secure replay download endpoint with signed URLs and rate limiting
 *
 * Two-step flow:
 * 1. GET /api/replay-download?replayId=<id> → generates signed token, redirects to step 2
 * 2. GET /api/replay-download?token=<token> → validates token, checks rate limit, redirects to blob
 *
 * Rate limits (per IP):
 * - Free content: 20 downloads per hour
 * - Premium content: 50 downloads per hour
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const replayId = searchParams.get('replayId');

    // Step 2: Token validation and download
    if (token) {
      return handleTokenDownload(token, request);
    }

    // Step 1: Generate signed token
    if (replayId) {
      return handleGenerateToken(replayId, request);
    }

    return NextResponse.json(
      { error: 'Missing replayId or token parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in replay download:', error);
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: 500 }
    );
  }
}

/**
 * Step 1: Generate signed token and redirect
 */
async function handleGenerateToken(
  replayId: string,
  request: NextRequest
): Promise<NextResponse> {
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

  // For premium content, check authentication first
  if (!isFree) {
    const session = await auth();

    // CRITICAL SECURITY CHECK: Use hasPermission() instead of client-modifiable flag
    const { hasPermission } = await import('@/lib/permissions');
    if (!hasPermission(session, 'subscribers')) {
      return NextResponse.json(
        { error: 'Unauthorized. This replay requires a subscription.' },
        { status: 403 }
      );
    }
  }

  // Generate signed token (expires in 5 minutes)
  const token = generateDownloadToken(replayId, 300);

  // Redirect to token download endpoint
  const tokenUrl = new URL(request.url);
  tokenUrl.searchParams.delete('replayId');
  tokenUrl.searchParams.set('token', token);

  return NextResponse.redirect(tokenUrl);
}

/**
 * Step 2: Validate token, check rate limit, and redirect to blob
 */
async function handleTokenDownload(
  token: string,
  request: NextRequest
): Promise<NextResponse> {
  // Verify token
  const payload = verifyDownloadToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired download token' },
      { status: 401 }
    );
  }

  // Find the replay
  const replay = replaysData.find(r => r.id === payload.replayId);

  if (!replay || !replay.downloadUrl) {
    return NextResponse.json(
      { error: 'Replay not found' },
      { status: 404 }
    );
  }

  // Get client IP for rate limiting
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const isFree = replay.isFree || false;

  // Apply rate limiting
  const rateLimit = checkRateLimit(
    `download:${clientIp}:${isFree ? 'free' : 'premium'}`,
    {
      maxRequests: isFree ? 20 : 50, // Free: 20/hr, Premium: 50/hr
      windowSeconds: 3600, // 1 hour
      blockDurationSeconds: 300, // Block for 5 minutes if exceeded
    }
  );

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter,
        resetAt: rateLimit.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': (isFree ? 20 : 50).toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
        },
      }
    );
  }

  // Add rate limit headers
  const downloadUrl = getDownloadUrl(replay.downloadUrl);

  return NextResponse.redirect(downloadUrl, {
    headers: {
      'X-RateLimit-Limit': (isFree ? 20 : 50).toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
    },
  });
}
