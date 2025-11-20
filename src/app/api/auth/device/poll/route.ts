import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { deviceCodeStore } from '@/lib/device-code-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const device_code = searchParams.get('device_code');

    if (!device_code) {
      return NextResponse.json(
        { error: 'missing_device_code' },
        { status: 400 }
      );
    }

    console.log('[DEVICE POLL] Looking up device_code:', device_code);

    // Find device code
    const code = await deviceCodeStore.get(device_code);

    console.log('[DEVICE POLL] Found code:', code ? 'YES' : 'NO');
    console.log('[DEVICE POLL] Code status:', code?.status);
    console.log('[DEVICE POLL] Code expires_at type:', typeof code?.expires_at);
    console.log('[DEVICE POLL] Code expires_at value:', code?.expires_at);

    if (!code) {
      return NextResponse.json(
        { error: 'invalid_device_code' },
        { status: 404 }
      );
    }

    // Check if expired
    if (code.expires_at < new Date()) {
      console.log('[DEVICE POLL] Code is expired');
      code.status = 'expired';
      return NextResponse.json(
        { error: 'expired_token', message: 'Device code has expired' },
        { status: 410 }
      );
    }

    console.log('[DEVICE POLL] Code not expired, checking status...');

    // Check status
    if (code.status === 'pending') {
      console.log('[DEVICE POLL] Status is pending');
      return NextResponse.json(
        { error: 'authorization_pending', message: "User hasn't authorized yet" },
        { status: 428 }
      );
    }

    if (code.status === 'denied') {
      console.log('[DEVICE POLL] Status is denied');
      return NextResponse.json(
        { error: 'access_denied', message: 'User denied authorization' },
        { status: 403 }
      );
    }

    console.log('[DEVICE POLL] Checking if authorized with user data...');
    console.log('[DEVICE POLL] code.status:', code.status);
    console.log('[DEVICE POLL] code.user_id:', code.user_id);
    console.log('[DEVICE POLL] code.user_data:', code.user_data);

    if (code.status === 'authorized' && code.user_id && code.user_data) {
      console.log('[DEVICE POLL] Generating tokens...');
      // Generate tokens
      const jwtSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

      // Include roles in JWT for permission checks
      const userRoles = code.user_data.roles || [];
      console.log('[DEVICE POLL] Including roles in JWT:', userRoles);

      const access_token = sign(
        {
          userId: code.user_id,
          type: 'uploader',
          roles: userRoles, // Include roles for hasPermission() checks
        },
        jwtSecret,
        { expiresIn: '1h' }
      );

      const refresh_token = sign(
        {
          userId: code.user_id,
          type: 'refresh',
          roles: userRoles, // Include roles in refresh token too
        },
        jwtSecret,
        { expiresIn: '30d' }
      );

      console.log('[DEVICE POLL] Tokens generated, cleaning up...');

      // Clean up device code
      await deviceCodeStore.delete(device_code, code.user_code);

      console.log('[DEVICE POLL] Returning success response');

      return NextResponse.json({
        access_token,
        refresh_token,
        token_type: 'Bearer',
        expires_in: 3600,
        user: code.user_data,
      });
    }

    console.log('[DEVICE POLL] Fell through to unknown_error');
    return NextResponse.json(
      { error: 'unknown_error' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error polling device authorization:', error);
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    );
  }
}
