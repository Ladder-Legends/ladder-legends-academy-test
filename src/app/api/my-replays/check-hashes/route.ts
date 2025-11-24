/**
 * API Route: /api/my-replays/check-hashes
 * Check which replay hashes the server hasn't seen yet
 */
import { NextRequest, NextResponse } from 'next/server';
import { hashManifestManager } from '@/lib/replay-hash-manifest';
import { authenticateRequest, isAuthError, checkPermission } from '@/lib/api-auth';

interface HashInput {
  hash: string;
  filename: string;
  filesize: number;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request (bearer token only for this endpoint, but helper handles both)
    const authResult = await authenticateRequest(request.headers.get('authorization'));
    if (isAuthError(authResult)) {
      console.log('❌ [CHECK-HASHES] Auth failed:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { discordId, roles } = authResult;
    console.log('✅ [CHECK-HASHES] Authenticated:', { discordId, authMethod: authResult.authMethod });

    // Verify subscriber permission
    if (!await checkPermission(roles, 'subscribers')) {
      console.log('❌ [CHECK-HASHES] Permission denied - no subscriber role');
      return NextResponse.json(
        {
          error: 'Subscription required',
          message: 'Replay uploads require an active Ladder Legends subscription.'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { hashes } = body;

    if (!Array.isArray(hashes)) {
      return NextResponse.json(
        { error: 'hashes must be an array' },
        { status: 400 }
      );
    }

    // Validate hash format
    for (const h of hashes as HashInput[]) {
      if (!h.hash || typeof h.hash !== 'string') {
        return NextResponse.json(
          { error: 'Each hash object must have a "hash" string field' },
          { status: 400 }
        );
      }
      if (!h.filename || typeof h.filename !== 'string') {
        return NextResponse.json(
          { error: 'Each hash object must have a "filename" string field' },
          { status: 400 }
        );
      }
      if (typeof h.filesize !== 'number') {
        return NextResponse.json(
          { error: 'Each hash object must have a "filesize" number field' },
          { status: 400 }
        );
      }
    }

    console.log(`📊 [CHECK-HASHES] User ${discordId} checking ${hashes.length} hashes`);

    const newHashes = await hashManifestManager.checkHashes(discordId, hashes);

    const response = {
      new_hashes: newHashes,
      existing_count: hashes.length - newHashes.length,
      total_submitted: hashes.length,
    };

    console.log(`✅ [CHECK-HASHES] Response: ${newHashes.length} new, ${response.existing_count} existing`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [CHECK-HASHES] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check hashes' },
      { status: 500 }
    );
  }
}
