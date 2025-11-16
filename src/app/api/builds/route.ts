/**
 * API Route: /api/builds
 * Get list of available learned builds from sc2reader API
 */
import { NextResponse } from 'next/server';
import { SC2ReplayAPIClient } from '@/lib/sc2reader-client';

const sc2readerClient = new SC2ReplayAPIClient();

/**
 * GET /api/builds
 * Fetch all available learned builds
 */
export async function GET() {
  try {
    const builds = await sc2readerClient.listBuilds();

    return NextResponse.json({ builds });
  } catch (error) {
    console.error('Error fetching builds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch builds' },
      { status: 500 }
    );
  }
}
