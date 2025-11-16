/**
 * API Route: /api/my-replays
 * Handles replay upload, analysis, and storage for logged-in users
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SC2ReplayAPIClient } from '@/lib/sc2reader-client';
import {
  saveReplay,
  getUserReplays,
  updateReplay,
  deleteReplay,
} from '@/lib/replay-kv';
import type { UserReplayData } from '@/lib/replay-types';
import { nanoid } from 'nanoid';

// Initialize sc2reader client
const sc2readerClient = new SC2ReplayAPIClient();

/**
 * GET /api/my-replays
 * Fetch all replays for the logged-in user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const replays = await getUserReplays(session.user.id);

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
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const targetBuildId = searchParams.get('target_build_id');
    const playerName = searchParams.get('player_name');

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

    // Extract fingerprint
    console.log('📊 Extracting fingerprint...');
    const fingerprint = await sc2readerClient.extractFingerprint(file, playerName || undefined);

    // Detect build
    console.log('🔍 Detecting build...');
    const detection = await sc2readerClient.detectBuild(file, playerName || undefined);

    // Compare to target build if specified
    let comparison = null;
    if (targetBuildId) {
      console.log(`📈 Comparing to build: ${targetBuildId}...`);
      comparison = await sc2readerClient.compareReplay(file, targetBuildId, playerName || undefined);
    }

    // Create replay data object
    const replayData: UserReplayData = {
      id: nanoid(),
      discord_user_id: session.user.id,
      uploaded_at: new Date().toISOString(),
      filename: file.name,
      target_build_id: targetBuildId || undefined,
      detection,
      comparison,
      fingerprint,
    };

    // Save to KV
    console.log('💾 Saving to KV...');
    await saveReplay(replayData);

    console.log('✅ Replay uploaded and analyzed successfully');

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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

    await deleteReplay(session.user.id, replayId);

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
