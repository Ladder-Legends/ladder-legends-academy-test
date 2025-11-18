import { NextRequest } from 'next/server';
import { sign } from 'jsonwebtoken';
import { deviceCodeStore } from '@/lib/device-code-store';

// Disable response caching for SSE
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const device_code = searchParams.get('device_code');

  if (!device_code) {
    return new Response(
      JSON.stringify({ error: 'missing_device_code' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check if device code exists
  const code = deviceCodeStore.get(device_code);
  if (!code) {
    return new Response(
      JSON.stringify({ error: 'invalid_device_code' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      const sendEvent = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Check if already authorized or expired
      const currentCode = deviceCodeStore.get(device_code);
      if (!currentCode) {
        sendEvent({ error: 'invalid_device_code' });
        controller.close();
        return;
      }

      if (currentCode.expires_at < new Date()) {
        sendEvent({ status: 'expired' });
        controller.close();
        return;
      }

      if (currentCode.status === 'denied') {
        sendEvent({ status: 'denied' });
        controller.close();
        return;
      }

      if (currentCode.status === 'authorized' && currentCode.user_id && currentCode.user_data) {
        // Generate tokens
        const jwtSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'your-secret-key';

        const access_token = sign(
          {
            userId: currentCode.user_id,
            type: 'uploader',
          },
          jwtSecret,
          { expiresIn: '1h' }
        );

        const refresh_token = sign(
          {
            userId: currentCode.user_id,
            type: 'refresh',
          },
          jwtSecret,
          { expiresIn: '30d' }
        );

        sendEvent({
          status: 'authorized',
          access_token,
          refresh_token,
          token_type: 'Bearer',
          expires_in: 3600,
          user: currentCode.user_data,
        });

        // Clean up
        deviceCodeStore.delete(device_code);
        deviceCodeStore.delete(currentCode.user_code);
        controller.close();
        return;
      }

      // Send pending status
      sendEvent({ status: 'pending' });

      // Subscribe to status changes
      const unsubscribe = deviceCodeStore.subscribe(device_code, (updatedCode) => {
        if (updatedCode.status === 'authorized' && updatedCode.user_id && updatedCode.user_data) {
          // Generate tokens
          const jwtSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'your-secret-key';

          const access_token = sign(
            {
              userId: updatedCode.user_id,
              type: 'uploader',
            },
            jwtSecret,
            { expiresIn: '1h' }
          );

          const refresh_token = sign(
            {
              userId: updatedCode.user_id,
              type: 'refresh',
            },
            jwtSecret,
            { expiresIn: '30d' }
          );

          sendEvent({
            status: 'authorized',
            access_token,
            refresh_token,
            token_type: 'Bearer',
            expires_in: 3600,
            user: updatedCode.user_data,
          });

          // Clean up
          deviceCodeStore.delete(device_code);
          deviceCodeStore.delete(updatedCode.user_code);
          unsubscribe();
          controller.close();
        } else if (updatedCode.status === 'denied') {
          sendEvent({ status: 'denied' });
          unsubscribe();
          controller.close();
        } else if (updatedCode.status === 'expired') {
          sendEvent({ status: 'expired' });
          unsubscribe();
          controller.close();
        }
      });

      // Set up expiration timer
      const expiresIn = currentCode.expires_at.getTime() - Date.now();
      const expirationTimer = setTimeout(() => {
        sendEvent({ status: 'expired' });
        unsubscribe();
        controller.close();
      }, expiresIn);

      // Clean up on client disconnect
      req.signal.addEventListener('abort', () => {
        clearTimeout(expirationTimer);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
