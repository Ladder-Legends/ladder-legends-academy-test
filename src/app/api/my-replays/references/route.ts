/**
 * API Route: /api/my-replays/references
 * Manages user's reference replays for build order comparison
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { authenticateRequest, isAuthError, checkPermission } from '@/lib/api-auth';
import { nanoid } from 'nanoid';
import type { ReferenceReplay, ReplayFingerprint, BuildOrderEvent } from '@/lib/replay-types';

// Import both KV implementations
import * as realKV from '@/lib/replay-kv';
import * as mockKV from '@/lib/replay-kv-mock';

// Use mock KV in development if real KV is not configured
const USE_MOCK_KV = !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_KV_REST_API_URL);

const kvModule = USE_MOCK_KV ? mockKV : realKV;

const {
  getUserReferences,
  getReference,
  getReferencesForMatchup,
  saveReference,
  deleteReference,
  getDefaultReferenceForMatchup,
  setDefaultReferenceForMatchup,
  getReplay,
} = kvModule;

/**
 * GET /api/my-replays/references
 *
 * Query params:
 * - matchup: Filter by matchup (e.g., "TvZ", "TvP")
 * - id: Get a specific reference by ID
 *
 * Returns all references for the user or filtered by matchup
 */
export async function GET(request: NextRequest) {
  try {
    // Support both session and bearer token auth
    const authResult = await authenticateRequest(request.headers.get('authorization'));
    if (isAuthError(authResult)) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { discordId } = authResult;
    const { searchParams } = new URL(request.url);
    const matchup = searchParams.get('matchup');
    const referenceId = searchParams.get('id');

    // Get specific reference by ID
    if (referenceId) {
      const reference = await getReference(discordId, referenceId);
      if (!reference) {
        return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
      }
      return NextResponse.json({ reference });
    }

    // Get references filtered by matchup
    if (matchup) {
      const references = await getReferencesForMatchup(discordId, matchup);
      const defaultRef = await getDefaultReferenceForMatchup(discordId, matchup);
      return NextResponse.json({
        references,
        default_reference_id: defaultRef?.id || null,
      });
    }

    // Get all references
    const references = await getUserReferences(discordId);
    return NextResponse.json({ references });

  } catch (error) {
    console.error('Error fetching references:', error);
    return NextResponse.json(
      { error: 'Failed to fetch references' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/my-replays/references
 *
 * Create a new reference from:
 * - An uploaded replay file
 * - An existing replay from the user's collection
 * - A site build order
 *
 * Body:
 * - alias: User-friendly name for this reference
 * - matchup: Which matchup this applies to (TvZ, TvP, etc.)
 * - source_type: 'uploaded_replay' | 'my_replay' | 'site_build_order' | 'site_replay'
 * - source_id: ID of the source (replay ID, build order ID, blob URL)
 * - fingerprint: Pre-extracted fingerprint data
 * - build_order: Pre-extracted build order events
 * - key_timings: Key timing milestones (optional)
 * - set_as_default: Set this as the default for the matchup (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request.headers.get('authorization'));
    if (isAuthError(authResult)) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { discordId, roles } = authResult;

    // Require subscriber role
    if (!await checkPermission(roles, 'subscribers')) {
      return NextResponse.json({
        error: 'Subscription required',
        message: 'Reference replays require an active subscription.'
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      alias,
      matchup,
      source_type,
      source_id,
      fingerprint,
      build_order,
      key_timings,
      set_as_default,
    } = body;

    // Validate required fields
    if (!alias || !matchup || !source_type || !source_id) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'alias, matchup, source_type, and source_id are required'
      }, { status: 400 });
    }

    // Validate source_type
    const validSourceTypes = ['uploaded_replay', 'my_replay', 'site_build_order', 'site_replay'];
    if (!validSourceTypes.includes(source_type)) {
      return NextResponse.json({
        error: 'Invalid source_type',
        message: `source_type must be one of: ${validSourceTypes.join(', ')}`
      }, { status: 400 });
    }

    // If source is from user's own replays, extract fingerprint and build_order
    let extractedFingerprint: ReplayFingerprint | undefined = fingerprint;
    let extractedBuildOrder: BuildOrderEvent[] | undefined = build_order;

    if (source_type === 'my_replay' && !fingerprint) {
      const replay = await getReplay(discordId, source_id);
      if (!replay) {
        return NextResponse.json({ error: 'Source replay not found' }, { status: 404 });
      }
      extractedFingerprint = replay.fingerprint;
      // Build order would need to be extracted from metrics - for now use empty array
      extractedBuildOrder = [];
    }

    if (!extractedFingerprint) {
      return NextResponse.json({
        error: 'Missing fingerprint',
        message: 'Fingerprint data is required for reference creation'
      }, { status: 400 });
    }

    // Create the reference
    const reference: ReferenceReplay = {
      id: nanoid(),
      user_id: discordId,
      alias,
      matchup,
      source_type,
      source_id,
      fingerprint: extractedFingerprint,
      build_order: extractedBuildOrder || [],
      key_timings: key_timings || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveReference(reference);

    // Optionally set as default for matchup
    if (set_as_default) {
      await setDefaultReferenceForMatchup(discordId, matchup, reference.id);
    }

    console.log(`[REFERENCES] Created reference: ${reference.id} (${alias}) for matchup ${matchup}`);

    return NextResponse.json({
      success: true,
      reference,
    });

  } catch (error) {
    console.error('Error creating reference:', error);
    return NextResponse.json(
      { error: 'Failed to create reference' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/my-replays/references
 *
 * Update an existing reference
 *
 * Body:
 * - id: Reference ID to update
 * - alias: New alias (optional)
 * - set_as_default: Set as default for this matchup (optional)
 * - key_timings: Update key timings (optional)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const body = await request.json();
    const { id, alias, set_as_default, key_timings } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reference ID is required' }, { status: 400 });
    }

    const reference = await getReference(discordId, id);
    if (!reference) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }

    // Update fields
    if (alias !== undefined) {
      reference.alias = alias;
    }
    if (key_timings !== undefined) {
      reference.key_timings = key_timings;
    }

    reference.updated_at = new Date().toISOString();
    await saveReference(reference);

    // Update default if requested
    if (set_as_default === true) {
      await setDefaultReferenceForMatchup(discordId, reference.matchup, reference.id);
    } else if (set_as_default === false) {
      // Check if this is currently the default, and clear it
      const defaultRef = await getDefaultReferenceForMatchup(discordId, reference.matchup);
      if (defaultRef?.id === reference.id) {
        await setDefaultReferenceForMatchup(discordId, reference.matchup, null);
      }
    }

    return NextResponse.json({
      success: true,
      reference,
    });

  } catch (error) {
    console.error('Error updating reference:', error);
    return NextResponse.json(
      { error: 'Failed to update reference' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/my-replays/references
 *
 * Delete a reference
 *
 * Query params:
 * - id: Reference ID to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get('id');

    if (!referenceId) {
      return NextResponse.json({ error: 'Reference ID is required' }, { status: 400 });
    }

    const reference = await getReference(discordId, referenceId);
    if (!reference) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }

    // Check if this is the default for its matchup
    const defaultRef = await getDefaultReferenceForMatchup(discordId, reference.matchup);
    if (defaultRef?.id === referenceId) {
      // Clear the default
      await setDefaultReferenceForMatchup(discordId, reference.matchup, null);
    }

    await deleteReference(discordId, referenceId);

    console.log(`[REFERENCES] Deleted reference: ${referenceId}`);

    return NextResponse.json({
      success: true,
      message: 'Reference deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting reference:', error);
    return NextResponse.json(
      { error: 'Failed to delete reference' },
      { status: 500 }
    );
  }
}
