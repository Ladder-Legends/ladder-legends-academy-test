/**
 * API Route: /api/my-replays/matchup-configs
 * Manages per-matchup configuration (default references)
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
  getUserMatchupConfigs,
  setDefaultReferenceForMatchup,
  getReference,
} = kvModule;

/**
 * GET /api/my-replays/matchup-configs
 *
 * Returns all matchup configurations for the user
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const configs = await getUserMatchupConfigs(discordId);

    // Enrich with reference aliases
    const enrichedConfigs = await Promise.all(
      configs.map(async (config) => {
        if (config.default_reference_id) {
          const ref = await getReference(discordId, config.default_reference_id);
          return {
            ...config,
            default_reference_alias: ref?.alias || null,
          };
        }
        return {
          ...config,
          default_reference_alias: null,
        };
      })
    );

    return NextResponse.json({ configs: enrichedConfigs });

  } catch (error) {
    console.error('Error fetching matchup configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matchup configs' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/my-replays/matchup-configs
 *
 * Set the default reference for a matchup
 *
 * Body:
 * - matchup: The matchup to configure (TvZ, TvP, TvT, etc.)
 * - reference_id: The reference ID to set as default (or null to clear)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const body = await request.json();
    const { matchup, reference_id } = body;

    if (!matchup) {
      return NextResponse.json({ error: 'Matchup is required' }, { status: 400 });
    }

    // Validate matchup format
    const validMatchups = ['TvZ', 'TvP', 'TvT', 'ZvT', 'ZvP', 'ZvZ', 'PvT', 'PvZ', 'PvP'];
    if (!validMatchups.includes(matchup)) {
      return NextResponse.json({
        error: 'Invalid matchup',
        message: `matchup must be one of: ${validMatchups.join(', ')}`
      }, { status: 400 });
    }

    // If reference_id is provided, verify it exists
    if (reference_id) {
      const ref = await getReference(discordId, reference_id);
      if (!ref) {
        return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
      }
      if (ref.matchup !== matchup) {
        return NextResponse.json({
          error: 'Matchup mismatch',
          message: `Reference is for ${ref.matchup}, not ${matchup}`
        }, { status: 400 });
      }
    }

    await setDefaultReferenceForMatchup(discordId, matchup, reference_id);

    return NextResponse.json({
      success: true,
      matchup,
      default_reference_id: reference_id,
    });

  } catch (error) {
    console.error('Error updating matchup config:', error);
    return NextResponse.json(
      { error: 'Failed to update matchup config' },
      { status: 500 }
    );
  }
}
