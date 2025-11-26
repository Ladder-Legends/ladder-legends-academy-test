/**
 * API Route: /api/my-replays/manifest-version
 *
 * Lightweight endpoint to check manifest version for uploader synchronization.
 * This endpoint is edge-cached to minimize Vercel compute costs.
 *
 * The uploader should call this frequently (every 5 min) to detect when
 * it needs to re-sync its local hash cache. Full hash checking is only
 * needed when:
 * 1. manifest_version increases (server-side cleanup occurred)
 * 2. New local replay files are detected
 *
 * Response is ~50 bytes, edge-cached for 60 seconds with stale-while-revalidate.
 */
import { NextRequest, NextResponse } from 'next/server';
import { hashManifestManager } from '@/lib/replay-hash-manifest';
import { authenticateRequest, isAuthError, checkPermission } from '@/lib/api-auth';

// Edge cache configuration - cache for 24 hours (manifest rarely changes)
// Invalidate manually via Vercel Dashboard or deploy when needed
export const revalidate = 86400; // 24 hours
export const dynamic = 'force-dynamic'; // Required because we use request.headers

export async function GET(request: NextRequest) {
  try {
    // Authenticate request (bearer token for desktop uploader)
    const authResult = await authenticateRequest(request.headers.get('authorization'));
    if (isAuthError(authResult)) {
      console.log('❌ [MANIFEST-VERSION] Auth failed:', authResult.error);
      return NextResponse.json(
        { error: authResult.error },
        {
          status: authResult.status,
          headers: {
            // Don't cache auth failures
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const { discordId, roles } = authResult;

    // Verify subscriber permission
    if (!await checkPermission(roles, 'subscribers')) {
      console.log('❌ [MANIFEST-VERSION] Permission denied - no subscriber role');
      return NextResponse.json(
        {
          error: 'Subscription required',
          message: 'Replay uploads require an active Ladder Legends subscription.',
        },
        {
          status: 403,
          headers: {
            // Don't cache permission failures for long
            'Cache-Control': 'private, max-age=60',
          },
        }
      );
    }

    // Get manifest version (lightweight blob read)
    const manifestVersion = await hashManifestManager.getManifestVersion(discordId);

    console.log(`✅ [MANIFEST-VERSION] User ${discordId} version: ${manifestVersion}`);

    return NextResponse.json(
      {
        manifest_version: manifestVersion,
        checked_at: new Date().toISOString(),
      },
      {
        headers: {
          // Edge cache for 24 hours, allow serving stale for 7 days while revalidating
          // Manifest version rarely changes (only on bulk cleanup operations)
          // To invalidate: redeploy or use Vercel Dashboard → Settings → Data Cache → Purge
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
          // Vary by authorization header so different users get different cached responses
          'Vary': 'Authorization',
        },
      }
    );
  } catch (error) {
    console.error('❌ [MANIFEST-VERSION] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get manifest version' },
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
