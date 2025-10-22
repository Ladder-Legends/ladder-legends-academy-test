import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !hasPermission(session, 'coaches')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only coaches and owners can delete replay files.' },
        { status: 401 }
      );
    }

    // Get the URL from the request body
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    // Delete from Vercel Blob
    await del(url);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting replay file:', error);
    // Don't fail if the file doesn't exist or is already deleted
    return NextResponse.json({
      success: true,
      message: 'File deletion completed (file may not have existed)',
    });
  }
}
