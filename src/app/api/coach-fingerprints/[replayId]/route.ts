/**
 * API Route: /api/coach-fingerprints/[replayId]
 *
 * Fetches fingerprint data for coach replays from Vercel Blob storage.
 * Coach fingerprints are stored separately from replays.json to avoid
 * bloating the static bundle during build.
 *
 * Storage location: coach-fingerprints/{replayId}.json
 *
 * Response format:
 * {
 *   "main": { ...ReplayFingerprint for winner },
 *   "all": { "PlayerName": { ...ReplayFingerprint }, ... }
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

// Cache fingerprints for 1 hour (they rarely change)
export const revalidate = 3600;

interface CoachFingerprint {
  main: unknown | null;
  all: Record<string, unknown>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ replayId: string }> }
) {
  try {
    const { replayId } = await params;

    if (!replayId) {
      return NextResponse.json(
        { error: 'Replay ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 [COACH-FINGERPRINT] Fetching fingerprint for: ${replayId}`);

    // Construct the blob path
    const blobPath = `coach-fingerprints/${replayId}.json`;

    // List blobs to find the exact URL (since we don't store it)
    const { blobs } = await list({
      prefix: blobPath,
      limit: 1,
    });

    if (blobs.length === 0) {
      console.log(`❌ [COACH-FINGERPRINT] Not found: ${blobPath}`);
      return NextResponse.json(
        {
          error: 'Fingerprint not found',
          message: `No fingerprint data exists for replay: ${replayId}. Run the re-metrics script to generate fingerprints.`,
          replay_id: replayId,
        },
        {
          status: 404,
          headers: {
            // Cache 404s for 5 minutes to avoid repeated lookups
            'Cache-Control': 'public, s-maxage=300',
          },
        }
      );
    }

    const blob = blobs[0];

    // Fetch the fingerprint data from blob storage
    const response = await fetch(blob.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status}`);
    }

    const fingerprint: CoachFingerprint = await response.json();

    console.log(
      `✅ [COACH-FINGERPRINT] Found fingerprint for ${replayId}: ${Object.keys(fingerprint.all || {}).length} players`
    );

    return NextResponse.json(fingerprint, {
      headers: {
        // Cache for 1 hour, serve stale for 24h while revalidating
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('❌ [COACH-FINGERPRINT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fingerprint' },
      {
        status: 500,
        headers: {
          // Don't cache errors
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
