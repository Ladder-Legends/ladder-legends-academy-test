import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isOwner } from '@/lib/permissions';
import { list as listBlobs, del as deleteBlob } from '@vercel/blob';
import Mux from '@mux/mux-node';

// Import data files
import videosData from '@/data/videos.json';
import replaysData from '@/data/replays.json';
import buildOrdersData from '@/data/build-orders.json';
import masterclassesData from '@/data/masterclasses.json';
import eventsData from '@/data/events.json';
import coachesData from '@/data/coaches.json';

interface StaleAssets {
  muxAssets: Array<{ playbackId: string; assetId: string }>;
  blobReplays: Array<{ url: string; pathname: string }>;
  brokenReplayRefs: Array<{ id: string; title: string; field: string; missingId: string }>;
  brokenBuildOrderRefs: Array<{ id: string; title: string; field: string; missingId: string }>;
  brokenMasterclassRefs: Array<{ id: string; title: string; field: string; missingId: string }>;
  staleEvents: Array<{ id: string; title: string; reason: string }>;
}

async function checkMuxAssets(): Promise<Array<{ playbackId: string; assetId: string }>> {
  const staleAssets: Array<{ playbackId: string; assetId: string }> = [];

  try {
    const mux = new Mux({
      tokenId: process.env.MUX_API_KEY!,
      tokenSecret: process.env.MUX_SECRET!,
    });

    // Get all Mux assets
    const response = await mux.video.assets.list({ limit: 100 });
    const assets = Array.isArray(response) ? response : response.data || [];

    // Get all playback IDs from videos.json
    const usedPlaybackIds = new Set(
      videosData
        .filter((v) => v.muxPlaybackId)
        .map((v) => v.muxPlaybackId)
    );

    // Check each asset
    for (const asset of assets) {
      const playbackIds = asset.playback_ids || [];
      const hasUsedPlaybackId = playbackIds.some((p: { id: string }) => usedPlaybackIds.has(p.id));

      if (!hasUsedPlaybackId && playbackIds.length > 0) {
        staleAssets.push({
          playbackId: playbackIds[0].id,
          assetId: asset.id,
        });
      }
    }
  } catch (error) {
    console.error('Error checking Mux assets:', error);
  }

  return staleAssets;
}

async function checkBlobReplays(): Promise<Array<{ url: string; pathname: string }>> {
  const staleReplays: Array<{ url: string; pathname: string }> = [];

  try {
    // Get all blobs
    const { blobs } = await listBlobs();

    // Get all blob URLs from replays.json (check downloadUrl for blob storage URLs)
    const usedBlobUrls = new Set(
      replaysData
        .filter((r) => r.downloadUrl && r.downloadUrl.includes('blob.vercel-storage.com'))
        .map((r) => r.downloadUrl)
    );

    // Check each blob
    for (const blob of blobs) {
      if (!usedBlobUrls.has(blob.url)) {
        staleReplays.push({
          url: blob.url,
          pathname: blob.pathname,
        });
      }
    }
  } catch (error) {
    console.error('Error checking blob replays:', error);
  }

  return staleReplays;
}

function checkBrokenReferences(): {
  replays: Array<{ id: string; title: string; field: string; missingId: string }>;
  buildOrders: Array<{ id: string; title: string; field: string; missingId: string }>;
  masterclasses: Array<{ id: string; title: string; field: string; missingId: string }>;
} {
  const brokenReplays: Array<{ id: string; title: string; field: string; missingId: string }> = [];
  const brokenBuildOrders: Array<{ id: string; title: string; field: string; missingId: string }> = [];
  const brokenMasterclasses: Array<{ id: string; title: string; field: string; missingId: string }> = [];

  // Create lookup sets
  const coachIds = new Set(coachesData.map((c) => c.id));
  const videoIds = new Set(videosData.map((v) => v.id));

  // Check replays
  for (const replay of replaysData) {
    const coachId = (replay as { coachId?: string }).coachId;
    if (coachId && !coachIds.has(coachId)) {
      brokenReplays.push({
        id: replay.id,
        title: replay.title,
        field: 'coachId',
        missingId: coachId,
      });
    }
  }

  // Check build orders
  for (const buildOrder of buildOrdersData) {
    const coachId = (buildOrder as { coachId?: string }).coachId;
    if (coachId && !coachIds.has(coachId)) {
      brokenBuildOrders.push({
        id: buildOrder.id,
        title: buildOrder.name,
        field: 'coachId',
        missingId: coachId,
      });
    }
    const videoId = (buildOrder as { videoId?: string }).videoId;
    if (videoId && !videoIds.has(videoId)) {
      brokenBuildOrders.push({
        id: buildOrder.id,
        title: buildOrder.name,
        field: 'videoId',
        missingId: videoId,
      });
    }
  }

  // Check masterclasses
  for (const masterclass of masterclassesData) {
    const coachId = (masterclass as { coachId?: string }).coachId;
    if (coachId && !coachIds.has(coachId)) {
      brokenMasterclasses.push({
        id: masterclass.id,
        title: masterclass.title,
        field: 'coachId',
        missingId: coachId,
      });
    }
    const videoId = (masterclass as { videoId?: string }).videoId;
    if (videoId && !videoIds.has(videoId)) {
      brokenMasterclasses.push({
        id: masterclass.id,
        title: masterclass.title,
        field: 'videoId',
        missingId: videoId,
      });
    }
  }

  return {
    replays: brokenReplays,
    buildOrders: brokenBuildOrders,
    masterclasses: brokenMasterclasses,
  };
}

function checkStaleEvents(): Array<{ id: string; title: string; reason: string }> {
  const staleEvents: Array<{ id: string; title: string; reason: string }> = [];
  const now = new Date();

  for (const event of eventsData) {
    if (!event.recurring?.enabled) {
      // Non-recurring event - check if past
      const eventDate = new Date(`${event.date}T${event.time}`);
      if (eventDate < now) {
        staleEvents.push({
          id: event.id,
          title: event.title,
          reason: `Past event (${event.date})`,
        });
      }
    } else {
      // Recurring event - check if past end date
      const endDate = (event.recurring as { endDate?: string }).endDate;
      if (endDate) {
        const endDateTime = new Date(endDate);
        if (endDateTime < now) {
          staleEvents.push({
            id: event.id,
            title: event.title,
            reason: `Recurring series ended (${endDate})`,
          });
        }
      }
    }
  }

  return staleEvents;
}

// GET /api/admin/checkup - Run checkup and return stale assets
export async function GET() {
  const session = await auth();

  // Only owners can access this endpoint
  if (!isOwner(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const [muxAssets, blobReplays] = await Promise.all([
      checkMuxAssets(),
      checkBlobReplays(),
    ]);

    const brokenRefs = checkBrokenReferences();
    const staleEvents = checkStaleEvents();

    const staleAssets: StaleAssets = {
      muxAssets,
      blobReplays,
      brokenReplayRefs: brokenRefs.replays,
      brokenBuildOrderRefs: brokenRefs.buildOrders,
      brokenMasterclassRefs: brokenRefs.masterclasses,
      staleEvents,
    };

    return NextResponse.json(staleAssets);
  } catch (error) {
    console.error('Error running checkup:', error);
    return NextResponse.json(
      { error: 'Failed to run checkup' },
      { status: 500 }
    );
  }
}

// POST /api/admin/checkup - Clean up stale assets
export async function POST(request: NextRequest) {
  const session = await auth();

  // Only owners can access this endpoint
  if (!isOwner(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { assets } = body as { assets: StaleAssets };

    const results = {
      deletedMuxAssets: 0,
      deletedBlobReplays: 0,
      errors: [] as string[],
    };

    // Delete Mux assets
    if (assets.muxAssets.length > 0) {
      const mux = new Mux({
        tokenId: process.env.MUX_API_KEY!,
        tokenSecret: process.env.MUX_SECRET!,
      });

      for (const asset of assets.muxAssets) {
        try {
          await mux.video.assets.delete(asset.assetId);
          results.deletedMuxAssets++;
        } catch (error) {
          results.errors.push(`Failed to delete Mux asset ${asset.playbackId}: ${error}`);
        }
      }
    }

    // Delete blob replays
    if (assets.blobReplays.length > 0) {
      for (const replay of assets.blobReplays) {
        try {
          await deleteBlob(replay.url);
          results.deletedBlobReplays++;
        } catch (error) {
          results.errors.push(`Failed to delete blob ${replay.pathname}: ${error}`);
        }
      }
    }

    // Note: Broken references and stale events should be handled via the normal commit workflow
    // They need to be removed from the JSON files and committed to GitHub

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error cleaning up assets:', error);
    return NextResponse.json(
      { error: 'Failed to clean up assets' },
      { status: 500 }
    );
  }
}
