/**
 * API Route: /api/my-replays
 * Handles replay upload, analysis, and storage for logged-in users
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { authenticateRequest, isAuthError, checkPermission } from '@/lib/api-auth';
import { SC2ReplayAPIClient } from '@/lib/sc2reader-client';
import { hashManifestManager } from '@/lib/replay-hash-manifest';
import { storeReplayFile, deleteReplayFile } from '@/lib/replay-file-storage';
import crypto from 'crypto';

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
  createIndexEntry,
  addToReplayIndex,
  removeFromReplayIndex,
} = kvModule;

import type { UserReplayData, ReplayFingerprint, MetricsResponse } from '@/lib/replay-types';
import { nanoid } from 'nanoid';

// Log which KV implementation is being used (only once at startup)
if (typeof global !== 'undefined') {
  const globalWithFlag = global as typeof globalThis & { __kvLogShown?: boolean };
  if (!globalWithFlag.__kvLogShown) {
    console.log(USE_MOCK_KV
      ? '🔧 [DEV] Using mock in-memory KV storage'
      : '✅ [PROD] Using Vercel KV storage');
    globalWithFlag.__kvLogShown = true;
  }
}

// Initialize sc2reader client
const sc2readerClient = new SC2ReplayAPIClient();

/**
 * Store replay with transaction-like semantics
 * If any storage step fails, roll back previous steps
 */
async function storeReplayWithRollback(
  discordId: string,
  replayId: string,
  filename: string,
  buffer: Buffer,
  hash: string,
  fileSize: number,
  replayData: UserReplayData
): Promise<{ blobUrl?: string }> {
  let blobUrl: string | undefined;
  let kvSaved = false;
  let indexUpdated = false;

  try {
    // Step 1: Store blob file
    console.log('📦 [STORE] Step 1/4: Storing replay file in Blob...');
    try {
      blobUrl = await storeReplayFile(discordId, replayId, filename, buffer);
      replayData.blob_url = blobUrl;
    } catch (err) {
      // Blob storage is optional - continue without it
      console.warn('⚠️ [STORE] Blob storage failed (continuing):', err);
    }

    // Step 2: Save to KV
    console.log('💾 [STORE] Step 2/4: Saving replay metadata to KV...');
    await saveReplay(replayData);
    kvSaved = true;

    // Step 3: Update replay index
    console.log('📇 [STORE] Step 3/4: Updating replay index...');
    try {
      const indexEntry = createIndexEntry(replayData);
      await addToReplayIndex(discordId, indexEntry);
      indexUpdated = true;
    } catch (err) {
      // Index update failure is non-critical - log and continue
      console.warn('⚠️ [STORE] Index update failed (continuing):', err);
    }

    // Step 4: Save hash to manifest
    console.log('💾 [STORE] Step 4/4: Saving hash to manifest...');
    await hashManifestManager.addHash(discordId, hash, filename, fileSize, replayId);

    console.log('✅ [STORE] All storage steps completed successfully');
    return { blobUrl };

  } catch (error) {
    console.error('❌ [STORE] Storage failed, initiating rollback...', error);

    // Rollback Step 3: Remove from index if it was updated
    if (indexUpdated) {
      try {
        console.log('🔄 [ROLLBACK] Removing from replay index...');
        await removeFromReplayIndex(discordId, replayId);
      } catch (rollbackErr) {
        console.error('⚠️ [ROLLBACK] Failed to remove from index:', rollbackErr);
      }
    }

    // Rollback Step 2: Delete KV entry if it was saved
    if (kvSaved) {
      try {
        console.log('🔄 [ROLLBACK] Deleting KV entry...');
        await deleteReplay(discordId, replayId);
      } catch (rollbackErr) {
        console.error('⚠️ [ROLLBACK] Failed to delete KV entry:', rollbackErr);
      }
    }

    // Rollback Step 1: Delete blob if it was stored
    if (blobUrl) {
      try {
        console.log('🔄 [ROLLBACK] Deleting blob file...');
        await deleteReplayFile(blobUrl);
      } catch (rollbackErr) {
        console.error('⚠️ [ROLLBACK] Failed to delete blob:', rollbackErr);
      }
    }

    throw error;
  }
}

/**
 * Track player name for auto-detection (only after successful upload)
 */
async function trackPlayerName(discordId: string, playerName: string): Promise<void> {
  let settings = await getUserSettings(discordId);
  if (!settings) {
    settings = await createUserSettings(discordId);
  }

  const isConfirmed = (settings.confirmed_player_names || []).includes(playerName);
  if (isConfirmed) return;

  const possibleNames = settings.possible_player_names || {};
  possibleNames[playerName] = (possibleNames[playerName] || 0) + 1;
  settings.possible_player_names = possibleNames;
  await updateUserSettings(settings);
  console.log(`📝 Tracked possible player name: ${playerName} (count: ${possibleNames[playerName]})`);
}

/**
 * GET /api/my-replays
 * Fetch all replays for the logged-in user
 */
export async function GET(_request: NextRequest) {
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
 * - game_type: Game type classification
 * - region: Player region (NA, EU, KR, CN)
 *
 * SECURITY: Requires subscriber role - replay uploads are a premium feature
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[MY-REPLAYS] POST request received');

    // === AUTHENTICATION ===
    const authResult = await authenticateRequest(request.headers.get('authorization'));
    if (isAuthError(authResult)) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { discordId, roles } = authResult;

    if (!await checkPermission(roles, 'subscribers')) {
      return NextResponse.json({
        error: 'Subscription required',
        message: 'Replay uploads require an active Ladder Legends subscription.'
      }, { status: 403 });
    }

    // === PARSE REQUEST ===
    const { searchParams } = new URL(request.url);
    const targetBuildId = searchParams.get('target_build_id');
    const playerName = searchParams.get('player_name');
    const gameType = searchParams.get('game_type');
    const region = searchParams.get('region');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.name.endsWith('.SC2Replay')) {
      return NextResponse.json({ error: 'Invalid file type. Only .SC2Replay files are allowed.' }, { status: 400 });
    }

    // === PREPARE DATA ===
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const replayId = nanoid();
    const createReplayBlob = () => new Blob([buffer], { type: 'application/octet-stream' });

    console.log(`📊 [ANALYZE] Starting analysis for ${file.name} (hash: ${hash.substring(0, 8)}...)`);

    // === ANALYSIS PHASE (read-only, no side effects) ===
    // Use unified /metrics endpoint which returns both coaching metrics and fingerprint data
    const metricsResponse = await sc2readerClient.extractMetrics(
      createReplayBlob(),
      playerName || undefined,
      file.name
    ) as MetricsResponse;

    // Transform metrics response to player_fingerprints format for storage
    const player_fingerprints: Record<string, ReplayFingerprint> = {};
    for (const [_pid, playerData] of Object.entries(metricsResponse.players)) {
      if (playerData.fingerprint) {
        player_fingerprints[playerData.name] = playerData.fingerprint;
      }
    }

    const suggestedPlayer = metricsResponse.suggested_player || playerName || null;
    const fingerprint = suggestedPlayer && player_fingerprints[suggestedPlayer]
      ? player_fingerprints[suggestedPlayer]
      : Object.values(player_fingerprints)[0];

    const detection = await sc2readerClient.detectBuild(
      createReplayBlob(),
      suggestedPlayer || undefined,
      file.name
    );

    const buildToCompare = targetBuildId || detection?.build_id;
    let comparison = null;
    if (buildToCompare) {
      console.log(`📈 [ANALYZE] Comparing to build: ${buildToCompare}`);
      comparison = await sc2readerClient.compareReplay(
        createReplayBlob(),
        buildToCompare,
        suggestedPlayer || undefined,
        file.name
      );
    }

    // === BUILD REPLAY DATA ===
    const replayData: UserReplayData = {
      id: replayId,
      discord_user_id: discordId,
      uploaded_at: new Date().toISOString(),
      filename: file.name,
      game_type: gameType || undefined,
      region: region || undefined,
      player_name: suggestedPlayer || undefined,
      target_build_id: buildToCompare || undefined,
      detection,
      comparison,
      player_fingerprints,
      suggested_player: suggestedPlayer,
      game_metadata: {
        map: metricsResponse.map_name,
        duration: metricsResponse.duration,
        game_date: metricsResponse.game_metadata.game_date,
        game_type: metricsResponse.game_metadata.game_type,
        category: metricsResponse.game_metadata.category,
        patch: metricsResponse.game_metadata.patch,
        // Extract winner/loser from all_players
        winner: metricsResponse.all_players.find(p => p.result === 'Win')?.name || null,
        loser: metricsResponse.all_players.find(p => p.result === 'Loss')?.name || null,
      },
      fingerprint,
    };

    // === STORAGE PHASE (with transaction rollback) ===
    await storeReplayWithRollback(
      discordId,
      replayId,
      file.name,
      buffer,
      hash,
      file.size,
      replayData
    );

    // === POST-SUCCESS SIDE EFFECTS ===
    // Track player name only after successful storage
    if (playerName) {
      try {
        await trackPlayerName(discordId, playerName);
      } catch (err) {
        // Non-critical - log but don't fail the request
        console.warn('⚠️ Failed to track player name:', err);
      }
    }

    console.log('✅ [MY-REPLAYS] Upload complete');
    return NextResponse.json({ success: true, replay: replayData });

  } catch (error) {
    console.error('❌ [MY-REPLAYS] Upload failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload replay';
    return NextResponse.json({ error: message }, { status: 500 });
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

    const discordId = session.user.discordId;

    // Get replay first to check for blob URL
    const { getReplay } = kvModule;
    const replay = await getReplay(discordId, replayId);

    // Delete the blob file if it exists
    if (replay?.blob_url) {
      try {
        await deleteReplayFile(replay.blob_url);
      } catch (err) {
        console.warn('⚠️ Failed to delete replay file:', err);
      }
    }

    // Delete from KV
    await deleteReplay(discordId, replayId);

    // Remove from replay index
    try {
      await removeFromReplayIndex(discordId, replayId);
    } catch (err) {
      // Index update failure is non-critical
      console.warn('⚠️ Failed to remove from replay index:', err);
    }

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
