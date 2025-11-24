/**
 * API Route: /api/my-replays
 * Handles replay upload, analysis, and storage for logged-in users
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SC2ReplayAPIClient } from '@/lib/sc2reader-client';
import { hashManifestManager } from '@/lib/replay-hash-manifest';
import { storeReplayFile, deleteReplayFile } from '@/lib/replay-file-storage';
import crypto from 'crypto';
import type { Session } from 'next-auth';

// Configure route to handle file uploads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for replay processing

// Import both KV implementations
import * as realKV from '@/lib/replay-kv';
import * as mockKV from '@/lib/replay-kv-mock';

// Use mock KV in development if real KV is not configured (supports both local dev and Vercel naming)
const USE_MOCK_KV = !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_KV_REST_API_URL);

// Select the appropriate KV module
const kvModule = USE_MOCK_KV ? mockKV : realKV;

const {
  saveReplay,
  getUserReplays,
  deleteReplay,
  getUserSettings,
  createUserSettings,
  updateUserSettings,
} = kvModule;

import type { UserReplayData } from '@/lib/replay-types';
import { nanoid } from 'nanoid';

// Log which KV implementation is being used
if (USE_MOCK_KV) {
  console.log('🔧 [DEV] Using mock in-memory KV storage');
} else {
  console.log('✅ [PROD] Using Vercel KV storage');
}

// Initialize sc2reader client
const sc2readerClient = new SC2ReplayAPIClient();

/**
 * GET /api/my-replays
 * Fetch all replays for the logged-in user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const replays = await getUserReplays(session.user.discordId);

    return NextResponse.json({ replays });
  } catch (error) {
    console.error('Error fetching replays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replays' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/my-replays
 * Upload and analyze a new replay
 *
 * Query params:
 * - target_build_id: Optional build ID to compare against
 * - player_name: Optional player name to analyze
 *
 * SECURITY: Requires subscriber role - replay uploads are a premium feature
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[MY-REPLAYS] POST request received');
    console.log('[MY-REPLAYS] Content-Type:', request.headers.get('content-type'));
    console.log('[MY-REPLAYS] Content-Length:', request.headers.get('content-length'));

    // Check for bearer token first (for desktop app), fall back to session (for web)
    let discordId: string | undefined;
    let userRoles: string[] = [];

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Desktop app with bearer token
      const token = authHeader.substring(7);
      const jwtSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

      try {
        const { verify } = await import('jsonwebtoken');
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
      } catch (error) {
        console.error('[MY-REPLAYS] JWT verification error:', error);
        if (error instanceof Error) {
          console.error('[MY-REPLAYS] Error name:', error.name);
          console.error('[MY-REPLAYS] Error message:', error.message);
          if (error.name === 'TokenExpiredError') {
            return NextResponse.json({ error: 'Unauthorized: Token expired' }, { status: 401 });
          }
          if (error.name === 'JsonWebTokenError') {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
          }
        }
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // Web app with session cookie
      const session = await auth();
      if (!session?.user?.discordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      discordId = session.user.discordId;
      userRoles = session.user.roles || [];
    }

    // CRITICAL SECURITY CHECK: Verify subscriber role
    // Replay uploads are a premium feature requiring subscription
    const { hasPermission } = await import('@/lib/permissions');

    // Create a minimal session object for permission check
    // Type assertion is safe here because hasPermission only reads user.roles
    const permissionCheck: Session = {
      user: {
        roles: userRoles
      }
    } as Session;

    if (!hasPermission(permissionCheck, 'subscribers')) {
      return NextResponse.json(
        {
          error: 'Subscription required',
          message: 'Replay uploads require an active Ladder Legends subscription. Visit https://ladderlegends.academy/subscribe to upgrade.'
        },
        { status: 403 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const targetBuildId = searchParams.get('target_build_id');
    const playerName = searchParams.get('player_name');
    const gameType = searchParams.get('game_type');
    const region = searchParams.get('region'); // NA, EU, KR, CN

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.SC2Replay')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .SC2Replay files are allowed.' },
        { status: 400 }
      );
    }

    // Read file once into buffer for reuse (file streams can only be consumed once)
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log('📊 Calculated hash:', hash);

    // Store filename for later use
    const replayFilename = file.name;

    // Create a reusable Blob from buffer for sc2reader API calls
    const createReplayBlob = () => new Blob([buffer], { type: 'application/octet-stream' });

    // Generate unique replay ID first (needed for file storage path)
    const replayId = nanoid();

    // Store replay file in Vercel Blob (so users can download later)
    console.log('📦 Storing replay file...');
    let blobUrl: string | undefined;
    try {
      blobUrl = await storeReplayFile(discordId, replayId, replayFilename, buffer);
    } catch (err) {
      console.warn('⚠️ Failed to store replay file (continuing without):', err);
    }

    // Extract fingerprints for ALL players
    console.log('📊 Extracting fingerprints for all players...');
    const allPlayersData = await sc2readerClient.extractAllPlayersFingerprints(
      createReplayBlob(),
      playerName || undefined,
      replayFilename
    );

    // Determine which player is the uploader
    const suggestedPlayer = allPlayersData.suggested_player || playerName || null;

    // Get the fingerprint for the suggested player (for backwards compatibility)
    const fingerprint = suggestedPlayer && allPlayersData.player_fingerprints[suggestedPlayer]
      ? allPlayersData.player_fingerprints[suggestedPlayer]
      : Object.values(allPlayersData.player_fingerprints)[0];

    // Track player names for detection
    if (playerName) {
      let settings = await getUserSettings(discordId);
      if (!settings) {
        settings = await createUserSettings(discordId);
      }

      const isConfirmed = (settings.confirmed_player_names || []).includes(playerName);

      if (!isConfirmed) {
        const possibleNames = settings.possible_player_names || {};
        possibleNames[playerName] = (possibleNames[playerName] || 0) + 1;
        settings.possible_player_names = possibleNames;
        await updateUserSettings(settings);
        console.log(`📝 Tracked possible player name: ${playerName} (count: ${possibleNames[playerName]})`);
      }
    }

    // Detect build (using suggested player)
    console.log('🔍 Detecting build...');
    const detection = await sc2readerClient.detectBuild(
      createReplayBlob(),
      suggestedPlayer || undefined,
      replayFilename
    );

    // Compare to target build (use detected build if no target specified)
    let comparison = null;
    const buildToCompare = targetBuildId || detection?.build_id;

    if (buildToCompare) {
      console.log(`📈 Comparing to build: ${buildToCompare}${!targetBuildId ? ' (auto-detected)' : ''}...`);
      comparison = await sc2readerClient.compareReplay(
        createReplayBlob(),
        buildToCompare,
        suggestedPlayer || undefined,
        replayFilename
      );
    }

    // Create replay data object with all players' data
    const replayData: UserReplayData = {
      id: replayId,
      discord_user_id: discordId,
      uploaded_at: new Date().toISOString(),
      filename: file.name,
      blob_url: blobUrl,
      game_type: gameType || undefined,
      region: region || undefined,
      player_name: suggestedPlayer || undefined,
      target_build_id: buildToCompare || undefined,
      detection,
      comparison,
      // New: All players' fingerprints
      player_fingerprints: allPlayersData.player_fingerprints,
      suggested_player: suggestedPlayer,
      game_metadata: allPlayersData.game_metadata,
      // Legacy: Single player fingerprint (backwards compatibility)
      fingerprint,
    };

    // Save to KV
    console.log('💾 Saving to KV...');
    await saveReplay(replayData);

    // Save hash to manifest
    console.log('💾 Saving hash to manifest...');
    await hashManifestManager.addHash(
      discordId,
      hash,
      file.name,
      file.size,
      replayData.id
    );

    console.log('✅ Replay uploaded, analyzed, and hash saved successfully');

    return NextResponse.json({
      success: true,
      replay: replayData,
    });
  } catch (error) {
    console.error('Error uploading replay:', error);

    const message = error instanceof Error ? error.message : 'Failed to upload replay';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/my-replays
 * Update replay notes, tags, or target build
 * 
 * Body:
 * - replay_id: ID of replay to update
 * - notes: Optional notes
 * - tags: Optional tags array
 * - target_build_id: Optional build ID to compare against
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { replay_id, notes, tags, target_build_id } = body;

    if (!replay_id) {
      return NextResponse.json(
        { error: 'replay_id is required' },
        { status: 400 }
      );
    }

    // TODO: Fetch existing replay, update fields, and save
    // For now, just return success
    console.log(`Updating replay ${replay_id}:`, { notes, tags, target_build_id });

    return NextResponse.json({
      success: true,
      message: 'Replay updated successfully',
    });
  } catch (error) {
    console.error('Error updating replay:', error);
    return NextResponse.json(
      { error: 'Failed to update replay' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/my-replays
 * Delete a replay
 *
 * Query params:
 * - replay_id: ID of replay to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const replayId = searchParams.get('replay_id');

    if (!replayId) {
      return NextResponse.json(
        { error: 'replay_id is required' },
        { status: 400 }
      );
    }

    // Get replay first to check for blob URL
    const { getReplay } = kvModule;
    const replay = await getReplay(session.user.discordId, replayId);

    // Delete the blob file if it exists
    if (replay?.blob_url) {
      try {
        await deleteReplayFile(replay.blob_url);
      } catch (err) {
        console.warn('⚠️ Failed to delete replay file:', err);
      }
    }

    await deleteReplay(session.user.discordId, replayId);

    return NextResponse.json({
      success: true,
      message: 'Replay deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting replay:', error);
    return NextResponse.json(
      { error: 'Failed to delete replay' },
      { status: 500 }
    );
  }
}
