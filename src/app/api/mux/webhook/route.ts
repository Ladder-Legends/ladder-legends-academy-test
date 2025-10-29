import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Mux from '@mux/mux-node';

// Initialize Mux client with webhook secret for signature verification
const mux = new Mux({
  tokenId: process.env.MUX_API_KEY!,
  tokenSecret: process.env.MUX_SECRET!,
  webhookSecret: process.env.MUX_WEBHOOK_SECRET,
});

/**
 * POST /api/mux/webhook
 * Handles Mux webhook events
 *
 * This endpoint receives notifications from Mux about video processing status.
 * You need to configure this URL in your Mux Dashboard:
 * https://dashboard.mux.com/settings/webhooks
 *
 * Important webhook events:
 * - video.asset.ready: Video is ready for playback
 * - video.asset.errored: Video processing failed
 * - video.upload.asset_created: Upload completed and asset created
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();

    // Verify webhook signature if webhook secret is configured
    if (process.env.MUX_WEBHOOK_SECRET) {
      try {
        // Use mux.webhooks.unwrap to verify signature and parse event
        const event = mux.webhooks.unwrap(body, headersList);
        return handleWebhookEvent(event);
      } catch (error) {
        console.error('Invalid webhook signature:', error);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // If no webhook secret is configured, process without verification
    // WARNING: In production, you should always verify webhooks!
    const event = JSON.parse(body);
    return handleWebhookEvent(event);
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleWebhookEvent(event: unknown) {
  // Type guard for webhook event structure
  if (!event || typeof event !== 'object') {
    console.error('Invalid webhook event:', event);
    return NextResponse.json({ received: false });
  }

  const webhookEvent = event as { type: string; data: Record<string, unknown> };
  console.log('Received Mux webhook:', webhookEvent.type, webhookEvent.data);

  switch (webhookEvent.type) {
    case 'video.asset.ready':
      // Video is ready for playback
      console.log('Video ready:', {
        assetId: webhookEvent.data.id,
        playbackId: (webhookEvent.data.playback_ids as Array<{ id: string }>)?.[0]?.id,
        duration: webhookEvent.data.duration,
      });

      // TODO: Update your database/JSON file with the asset information
      // For now, we just log it. You can add logic here to update videos.json
      // or trigger a GitHub commit via the CMS
      break;

    case 'video.asset.errored':
      // Video processing failed
      console.error('Video processing failed:', {
        assetId: webhookEvent.data.id,
        errors: webhookEvent.data.errors,
      });

      // TODO: Mark the video as errored in your database/JSON file
      break;

    case 'video.upload.asset_created':
      // Upload completed and asset was created
      console.log('Upload completed:', {
        uploadId: webhookEvent.data.id,
        assetId: webhookEvent.data.asset_id,
      });

      // The asset is now created but may still be processing
      // Wait for video.asset.ready before marking as ready for playback
      break;

    case 'video.asset.created':
      // Asset was created (may still be processing)
      console.log('Asset created:', {
        assetId: webhookEvent.data.id,
        status: webhookEvent.data.status,
      });
      break;

    default:
      console.log('Unhandled webhook event:', webhookEvent.type);
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}
