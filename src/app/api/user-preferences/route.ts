import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { put, head } from '@vercel/blob';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types/user-preferences';

/**
 * GET /api/user-preferences
 * Retrieve user preferences from Vercel blob storage
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.discordId;
    const blobUrl = `user-preferences/${userId}.json`;

    try {
      // Check if preferences exist
      const blobInfo = await head(blobUrl);

      if (blobInfo) {
        // Fetch existing preferences
        const response = await fetch(blobInfo.url);
        const preferences: UserPreferences = await response.json();

        return NextResponse.json(preferences);
      }
    } catch {
      // Blob doesn't exist, return defaults
      console.log('No existing preferences found, returning defaults');
    }

    // Return default preferences
    const defaultPreferences: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      userId,
    };

    return NextResponse.json(defaultPreferences);
  } catch (error) {
    console.error('Failed to get user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve user preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user-preferences
 * Save user preferences to Vercel blob storage
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.discordId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.discordId;
    const body = await request.json();

    // Validate preferences
    const preferences: UserPreferences = {
      userId,
      timezone: body.timezone || DEFAULT_USER_PREFERENCES.timezone,
      timezoneSource: body.timezoneSource || DEFAULT_USER_PREFERENCES.timezoneSource,
      updatedAt: new Date().toISOString(),
    };

    // Save to Vercel blob
    const blobUrl = `user-preferences/${userId}.json`;
    const blob = await put(blobUrl, JSON.stringify(preferences, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return NextResponse.json({
      success: true,
      preferences,
      blobUrl: blob.url,
    });
  } catch (error) {
    console.error('Failed to save user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save user preferences' },
      { status: 500 }
    );
  }
}
