import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_API_KEY!,
  tokenSecret: process.env.MUX_SECRET!,
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
    const signature = request.headers.get('mux-signature');

    // Verify webhook signature if webhook secret is configured
    if (process.env.MUX_WEBHOOK_SECRET && signature) {
      try {
        // Mux.webhooks.verifyHeader uses the signature to verify the webhook
        const event = Mux.webhooks.unwrap(body, signature, process.env.MUX_WEBHOOK_SECRET);
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

async function handleWebhookEvent(event: any) {
  console.log('Received Mux webhook:', event.type, event.data);

  switch (event.type) {
    case 'video.asset.ready':
      // Video is ready for playback
      const readyAsset = event.data;
      console.log('Video ready:', {
        assetId: readyAsset.id,
        playbackId: readyAsset.playback_ids?.[0]?.id,
        duration: readyAsset.duration,
      });

      // TODO: Update your database/JSON file with the asset information
      // For now, we just log it. You can add logic here to update videos.json
      // or trigger a GitHub commit via the CMS
      break;

    case 'video.asset.errored':
      // Video processing failed
      const erroredAsset = event.data;
      console.error('Video processing failed:', {
        assetId: erroredAsset.id,
        errors: erroredAsset.errors,
      });

      // TODO: Mark the video as errored in your database/JSON file
      break;

    case 'video.upload.asset_created':
      // Upload completed and asset was created
      const upload = event.data;
      console.log('Upload completed:', {
        uploadId: upload.id,
        assetId: upload.asset_id,
      });

      // The asset is now created but may still be processing
      // Wait for video.asset.ready before marking as ready for playback
      break;

    case 'video.asset.created':
      // Asset was created (may still be processing)
      const createdAsset = event.data;
      console.log('Asset created:', {
        assetId: createdAsset.id,
        status: createdAsset.status,
      });
      break;

    default:
      console.log('Unhandled webhook event:', event.type);
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}
