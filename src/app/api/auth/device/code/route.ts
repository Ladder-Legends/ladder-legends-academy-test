import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { deviceCodeStore, DeviceCode } from '@/lib/device-code-store';

// Generate user-friendly code (no confusing characters)
function generateUserCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0, I/1/l
  let code = '';

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
    if (i === 3) code += '-'; // Add dash in middle
  }

  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id } = body;

    if (client_id !== 'ladder-legends-uploader') {
      return NextResponse.json(
        { error: 'invalid_client' },
        { status: 400 }
      );
    }

    // Check KV configuration
    const hasKvRestApiUrl = !!process.env.KV_REST_API_URL;
    const hasUpstashKvUrl = !!process.env.UPSTASH_REDIS_KV_REST_API_URL;
    console.log('[DEVICE CODE] KV configuration:', {
      hasKvRestApiUrl,
      hasUpstashKvUrl,
      configured: hasKvRestApiUrl || hasUpstashKvUrl,
    });

    // Generate codes
    const device_code = uuidv4();
    const user_code = generateUserCode();
    const expires_in = 900; // 15 minutes
    const expires_at = new Date(Date.now() + expires_in * 1000);

    // Store device code
    const codeData: DeviceCode = {
      device_code,
      user_code,
      status: 'pending',
      created_at: new Date(),
      expires_at,
    };

    console.log('[DEVICE CODE] About to store device code:', user_code);
    await deviceCodeStore.set(device_code, codeData);
    console.log('[DEVICE CODE] Successfully stored device code:', user_code);
    // user_code is also stored automatically by the set method

    // Build verification URI from request origin in development, env var in production
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || 'https://ladderlegendsacademy.com';

    return NextResponse.json({
      device_code,
      user_code,
      verification_uri: `${baseUrl}/activate?code=${user_code}`,
      expires_in,
      interval: 5, // Poll every 5 seconds
    });
  } catch (error) {
    console.error('[DEVICE CODE] Error generating device code:', error);
    console.error('[DEVICE CODE] Error details:', {
      name: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'internal_error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
