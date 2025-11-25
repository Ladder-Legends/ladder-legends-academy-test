import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { replays as replaysData } from '@/lib/data';
import { hasPermission } from '@/lib/permissions';

/**
 * Secure replay download endpoint that proxies blob storage
 * - Hides actual blob URLs from end users
 * - For FREE content: streams file directly
 * - For PREMIUM content: validates auth and streams file
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

    // For premium content, check authentication
    if (!isFree) {
      const session = await auth();

      if (!hasPermission(session, 'subscribers')) {
        return NextResponse.json(
          { error: 'Unauthorized. This replay requires a subscription.' },
          { status: 403 }
        );
      }
    }

    // Fetch the file from blob storage
    const blobResponse = await fetch(replay.downloadUrl);

    if (!blobResponse.ok) {
      console.error('Failed to fetch blob:', blobResponse.status, blobResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to retrieve replay file' },
        { status: 500 }
      );
    }

    // Get the file content
    const fileBuffer = await blobResponse.arrayBuffer();

    // Extract filename from URL or use replay title
    const urlParts = new URL(replay.downloadUrl).pathname.split('/');
    const blobFilename = urlParts[urlParts.length - 1];
    const filename = blobFilename || `${replay.title.replace(/[^a-zA-Z0-9]/g, '_')}.SC2Replay`;

    // Return the file with proper headers to trigger download
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error in replay download:', error);
    return NextResponse.json(
      {
        error: 'Failed to process download request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
