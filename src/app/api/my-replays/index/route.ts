/**
 * API Route: /api/my-replays/index
 * Returns lightweight replay index for efficient list view
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Import both KV implementations
import * as realKV from '@/lib/replay-kv';
import * as mockKV from '@/lib/replay-kv-mock';

// Use mock KV in development if real KV is not configured
const USE_MOCK_KV = !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_KV_REST_API_URL);
const kvModule = USE_MOCK_KV ? mockKV : realKV;

const {
  getReplayIndex,
  rebuildReplayIndex,
  validateReplayIndex,
} = kvModule;

/**
 * GET /api/my-replays/index
 * Returns lightweight replay index for list view
 *
 * Query params:
 * - rebuild: "true" to force index rebuild
 * - validate: "true" to validate and auto-rebuild if needed
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forceRebuild = searchParams.get('rebuild') === 'true';
    const validate = searchParams.get('validate') === 'true';

    const discordId = session.user.discordId;

    // Force rebuild if requested
    if (forceRebuild) {
      console.log(`🔄 [INDEX] Force rebuilding index for user ${discordId}`);
      const index = await rebuildReplayIndex(discordId);
      return NextResponse.json({
        index,
        rebuilt: true,
        message: 'Index rebuilt successfully'
      });
    }

    // Get existing index
    let index = await getReplayIndex(discordId);

    // Validate and auto-rebuild if needed
    if (validate && index) {
      const isValid = await validateReplayIndex(discordId);
      if (!isValid) {
        console.log(`🔄 [INDEX] Auto-rebuilding invalid index for user ${discordId}`);
        index = await rebuildReplayIndex(discordId);
        return NextResponse.json({
          index,
          rebuilt: true,
          message: 'Index was invalid and has been rebuilt'
        });
      }
    }

    // If no index exists, build it
    if (!index) {
      console.log(`🔄 [INDEX] Creating initial index for user ${discordId}`);
      index = await rebuildReplayIndex(discordId);
      return NextResponse.json({
        index,
        rebuilt: true,
        message: 'Initial index created'
      });
    }

    return NextResponse.json({ index, rebuilt: false });
  } catch (error) {
    console.error('Error fetching replay index:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replay index' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/my-replays/index
 * Force rebuild the replay index
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const index = await rebuildReplayIndex(session.user.discordId);

    return NextResponse.json({
      success: true,
      index,
      message: 'Index rebuilt successfully'
    });
  } catch (error) {
    console.error('Error rebuilding replay index:', error);
    return NextResponse.json(
      { error: 'Failed to rebuild replay index' },
      { status: 500 }
    );
  }
}
