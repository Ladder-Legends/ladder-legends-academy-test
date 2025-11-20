/**
 * API Route: /api/settings
 * Handles user settings including confirmed player names
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Use mock KV in development if real KV is not configured (supports both local dev and Vercel naming)
const USE_MOCK_KV = !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_KV_REST_API_URL);

// Import the appropriate KV module dynamically
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic import needed for mock selection
const kvModule = USE_MOCK_KV
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/lib/replay-kv-mock')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/lib/replay-kv');

const {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
} = kvModule;

/**
 * GET /api/settings
 * Fetch user settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await getUserSettings(session.user.discordId);

    // Create settings if they don't exist
    if (!settings) {
      settings = await createUserSettings(session.user.discordId);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings
 * Update user settings
 *
 * Body:
 * - action: "confirm_player_name" | "reject_player_name" | "update"
 * - player_name: (for confirm/reject actions)
 * - Other settings fields for "update" action
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, player_name } = body;

    let settings = await getUserSettings(session.user.discordId);
    if (!settings) {
      settings = await createUserSettings(session.user.discordId);
    }

    // Ensure player name fields exist (for backwards compatibility)
    if (!settings.confirmed_player_names) {
      settings.confirmed_player_names = [];
    }
    if (!settings.possible_player_names) {
      settings.possible_player_names = {};
    }

    if (action === 'confirm_player_name') {
      // Add to confirmed names if not already there
      if (!settings.confirmed_player_names.includes(player_name)) {
        settings.confirmed_player_names.push(player_name);
      }
      // Remove from possible names
      delete settings.possible_player_names[player_name];

      await updateUserSettings(settings);

      return NextResponse.json({
        success: true,
        message: 'Player name confirmed',
        settings,
      });
    } else if (action === 'reject_player_name') {
      // Remove from possible names
      delete settings.possible_player_names[player_name];

      await updateUserSettings(settings);

      return NextResponse.json({
        success: true,
        message: 'Player name rejected',
        settings,
      });
    } else {
      // General update
      Object.assign(settings, body);
      await updateUserSettings(settings);

      return NextResponse.json({
        success: true,
        message: 'Settings updated',
        settings,
      });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
