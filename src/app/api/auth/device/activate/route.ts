import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deviceCodeStore } from '@/lib/device-code-store';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to activate a device' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { user_code } = body;

    if (!user_code || typeof user_code !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user_code' },
        { status: 400 }
      );
    }

    // Find device code by user_code
    const code = await deviceCodeStore.get(user_code.toUpperCase());

    console.log('[DEVICE AUTH] Looking up code:', user_code.toUpperCase());
    console.log('[DEVICE AUTH] Found code:', code ? 'YES' : 'NO');

    if (!code || code.user_code !== user_code.toUpperCase()) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Check if expired
    if (code.expires_at < new Date()) {
      code.status = 'expired';
      return NextResponse.json(
        { error: 'Code has expired. Please generate a new code in the app.' },
        { status: 410 }
      );
    }

    // Check if already used
    if (code.status !== 'pending') {
      return NextResponse.json(
        { error: 'Code has already been used' },
        { status: 400 }
      );
    }

    console.log('[DEVICE AUTH] session.user:', session.user);
    console.log('[DEVICE AUTH] session.user.discordId:', (session.user as any).discordId);

    // Create updated code with proper Date objects
    const updatedCode = {
      ...code,
      status: 'authorized' as const,
      user_id: (session.user as any).discordId, // Use discordId, not id
      authorized_at: new Date(),
      created_at: new Date(code.created_at),
      expires_at: new Date(code.expires_at),
      user_data: {
        id: (session.user as any).discordId, // Use discordId, not id
        username: session.user.name || session.user.email || 'Unknown User',
        avatar_url: session.user.image || '',
      },
    };

    console.log('[DEVICE AUTH] updatedCode.user_id:', updatedCode.user_id);
    console.log('[DEVICE AUTH] updatedCode.user_data:', updatedCode.user_data);

    // Update the store
    await deviceCodeStore.set(updatedCode.device_code, updatedCode);

    return NextResponse.json({
      success: true,
      message: 'Device activated successfully! You can now return to the app.',
    });
  } catch (error) {
    console.error('Error activating device:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An error occurred while activating your device' },
      { status: 500 }
    );
  }
}
