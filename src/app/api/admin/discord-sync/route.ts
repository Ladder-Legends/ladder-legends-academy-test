/**
 * Discord Event Sync API Route
 *
 * Provides bi-directional sync between local events and Discord scheduled events.
 * Requires owner-level authentication.
 *
 * POST /api/admin/discord-sync
 * Body: { action: 'check' | 'auto-sync' | 'apply-resolutions', resolutions?: { [eventId]: 'keep_discord' | 'keep_local' | 'skip' } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  fetchDiscordEvents,
  detectConflicts,
  readLocalEvents,
  writeLocalEvents,
  transformDiscordToLocal,
  createDiscordEvent,
  updateDiscordEvent,
  autoSync,
  type EventConflict,
  type LocalEvent,
} from '@/services/discord-sync.service';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1386735340517195959';

/**
 * Check for conflicts between local and Discord events
 */
async function handleCheck(): Promise<NextResponse> {
  try {
    const discordEvents = await fetchDiscordEvents(DISCORD_BOT_TOKEN, DISCORD_GUILD_ID);
    const localEvents = readLocalEvents();
    const conflicts = detectConflicts(localEvents, discordEvents);

    return NextResponse.json({
      success: true,
      conflicts,
      message: conflicts.length > 0
        ? `Found ${conflicts.length} conflict(s)`
        : 'No conflicts found',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check for conflicts',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * Auto-sync: Import all Discord events that don't exist locally
 */
async function handleAutoSync(): Promise<NextResponse> {
  try {
    const result = await autoSync(DISCORD_BOT_TOKEN, DISCORD_GUILD_ID);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to auto-sync events',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * Apply user's conflict resolutions
 */
async function handleApplyResolutions(
  resolutions: Record<string, 'keep_discord' | 'keep_local' | 'skip'>
): Promise<NextResponse> {
  try {
    const discordEvents = await fetchDiscordEvents(DISCORD_BOT_TOKEN, DISCORD_GUILD_ID);
    const localEvents = readLocalEvents();
    const conflicts = detectConflicts(localEvents, discordEvents);

    const updatedLocalEvents = [...localEvents];
    const localById = new Map(updatedLocalEvents.map((e, i) => [e.id, i]));
    const errors: string[] = [];

    for (const conflict of conflicts) {
      const id = conflict.localEvent?.id || conflict.discordEvent?.id || '';
      const resolution = resolutions[id];

      if (!resolution || resolution === 'skip') continue;

      try {
        if (resolution === 'keep_discord' && conflict.discordEvent) {
          // Import from Discord to local
          const transformedEvent = transformDiscordToLocal(conflict.discordEvent);

          const index = localById.get(id);
          if (index !== undefined) {
            // Update existing
            updatedLocalEvents[index] = transformedEvent;
          } else {
            // Add new
            updatedLocalEvents.push(transformedEvent);
          }
        } else if (resolution === 'keep_local' && conflict.localEvent) {
          // Sync to Discord (create/update)
          if (conflict.type === 'missing_discord') {
            // Create new event in Discord
            const createdEvent = await createDiscordEvent(
              DISCORD_BOT_TOKEN,
              DISCORD_GUILD_ID,
              conflict.localEvent
            );

            // Update local event with Discord ID if different
            if (createdEvent.id !== conflict.localEvent.id) {
              const index = localById.get(conflict.localEvent.id);
              if (index !== undefined) {
                updatedLocalEvents[index] = {
                  ...conflict.localEvent,
                  id: createdEvent.id,
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          } else if (conflict.type === 'mismatch') {
            // Update existing Discord event
            await updateDiscordEvent(
              DISCORD_BOT_TOKEN,
              DISCORD_GUILD_ID,
              id,
              conflict.localEvent
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to resolve ${id}: ${message}`);
      }
    }

    // Write updated events
    writeLocalEvents(updatedLocalEvents);

    return NextResponse.json({
      success: errors.length === 0,
      message: errors.length === 0
        ? 'All resolutions applied successfully'
        : `Applied with ${errors.length} error(s)`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to apply resolutions',
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Check if user is owner (hardcoded owner IDs)
  const ownerIds = ['363533762576908290']; // Draknas
  if (!ownerIds.includes(session.user.id)) {
    return NextResponse.json(
      { success: false, message: 'Forbidden: Owner access required' },
      { status: 403 }
    );
  }

  if (!DISCORD_BOT_TOKEN) {
    return NextResponse.json(
      { success: false, message: 'Discord bot token not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { action, resolutions } = body;

    switch (action) {
      case 'check':
        return handleCheck();

      case 'auto-sync':
        return handleAutoSync();

      case 'apply-resolutions':
        if (!resolutions || typeof resolutions !== 'object') {
          return NextResponse.json(
            { success: false, message: 'Invalid resolutions provided' },
            { status: 400 }
          );
        }
        return handleApplyResolutions(resolutions);

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: message,
      },
      { status: 500 }
    );
  }
}
