/**
 * API Route: /api/my-replays/check-hashes
 * Check which replay hashes the server hasn't seen yet
 */
import { NextRequest, NextResponse } from 'next/server';
import { hashManifestManager } from '@/lib/replay-hash-manifest';
import { verify } from 'jsonwebtoken';
import type { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    // Extract bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🔐 [CHECK-HASHES] Auth header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'MISSING');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [CHECK-HASHES] Missing or invalid bearer token');
      return NextResponse.json({ error: 'Unauthorized: Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

    let discordId: string;
    let userRoles: string[] = [];
    try {
      const decoded = verify(token, jwtSecret) as {
        userId: string;
        type: string;
        roles?: string[];
      };

      if (decoded.type !== 'uploader') {
        return NextResponse.json({ error: 'Unauthorized: Invalid token type' }, { status: 401 });
      }

      discordId = decoded.userId;
      userRoles = decoded.roles || [];
      console.log('✅ [CHECK-HASHES] JWT decoded successfully:', { discordId, userRoles, type: decoded.type });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          return NextResponse.json({ error: 'Unauthorized: Token expired' }, { status: 401 });
        }
        if (error.name === 'JsonWebTokenError') {
          return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRITICAL SECURITY CHECK: Verify subscriber role
    // Checking replay hashes requires subscription (part of replay upload feature)
    const { hasPermission } = await import('@/lib/permissions');

    const permissionCheck: Session = {
      user: {
        roles: userRoles
      }
    } as Session;

    const hasSubscriberPermission = hasPermission(permissionCheck, 'subscribers');
    console.log('🔒 [CHECK-HASHES] Permission check:', { hasSubscriberPermission, userRoles });

    if (!hasSubscriberPermission) {
      console.log('❌ [CHECK-HASHES] Permission denied - no subscriber role');
      return NextResponse.json(
        {
          error: 'Subscription required',
          message: 'Replay uploads require an active Ladder Legends subscription. Visit https://ladderlegends.academy/subscribe to upgrade.'
        },
        { status: 403 }
      );
    }

    console.log('✅ [CHECK-HASHES] Permission granted - proceeding with hash check');

    const body = await request.json();
    const { hashes } = body;

    if (!Array.isArray(hashes)) {
      return NextResponse.json(
        { error: 'hashes must be an array' },
        { status: 400 }
      );
    }

    // Validate hash format
    for (const h of hashes) {
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

    const newHashes = await hashManifestManager.checkHashes(
      discordId,
      hashes
    );

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
