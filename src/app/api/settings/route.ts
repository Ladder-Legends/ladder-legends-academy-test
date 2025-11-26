/**
 * API Route: /api/settings
 * Handles user settings including confirmed player names
 * Supports both session auth (browser) and JWT auth (uploader app)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verify } from 'jsonwebtoken';

// Import both KV implementations
import * as realKV from '@/lib/replay-kv';
import * as mockKV from '@/lib/replay-kv-mock';

// Use mock KV in development if real KV is not configured (supports both local dev and Vercel naming)
const USE_MOCK_KV = !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_KV_REST_API_URL);

// Select the appropriate KV module
const kvModule = USE_MOCK_KV ? mockKV : realKV;

const {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
} = kvModule;

/**
 * Authenticate request via session (browser) or JWT bearer token (uploader)
 */
async function authenticateRequest(request: NextRequest): Promise<string | null> {
  // Try bearer token first (for uploader app)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const jwtSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

    try {
      const decoded = verify(token, jwtSecret) as {
        userId: string;
        type: string;
      };

      if (decoded.type === 'uploader' || decoded.type === 'refresh') {
        return decoded.userId;
      }
    } catch (error) {
      console.error('[SETTINGS] JWT verification failed:', error);
      return null;
    }
  }

  // Fall back to session auth (for browser)
  const session = await auth();
  return session?.user?.discordId || null;
}

/**
 * GET /api/settings
 * Fetch user settings
 */
export async function GET(request: NextRequest) {
  try {
    const discordId = await authenticateRequest(request);

    if (!discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await getUserSettings(discordId);

    // Create settings if they don't exist
    if (!settings) {
      settings = await createUserSettings(discordId);
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
    const discordId = await authenticateRequest(request);

    if (!discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, player_name } = body;

    let settings = await getUserSettings(discordId);
    if (!settings) {
      settings = await createUserSettings(discordId);
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
    } else if (action === 'remove_confirmed_name') {
      // Remove from confirmed names
      settings.confirmed_player_names = settings.confirmed_player_names.filter(
        (name: string) => name !== player_name
      );

      await updateUserSettings(settings);

      return NextResponse.json({
        success: true,
        message: 'Player name removed',
        settings,
      });
    } else if (action === 'clear_all_possible_names') {
      // Clear all possible/suggested names
      settings.possible_player_names = {};

      await updateUserSettings(settings);

      return NextResponse.json({
        success: true,
        message: 'All suggestions cleared',
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
