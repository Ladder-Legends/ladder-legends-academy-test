import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  console.log('📤 [UPLOAD] Received upload replay request');
  try {
    // Check authentication
    const session = await auth();
    console.log('📤 [UPLOAD] Session:', session ? 'authenticated' : 'not authenticated');

    if (!session || !hasPermission(session, 'coaches')) {
      console.log('❌ [UPLOAD] Permission denied');
      return NextResponse.json(
        { error: 'Unauthorized. Only coaches and owners can upload replay files.' },
        { status: 401 }
      );
    }

    // Get the file from the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('❌ [UPLOAD] No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📁 [UPLOAD] File received:', file.name, 'Size:', file.size, 'bytes');

    // Validate file type
    if (!file.name.endsWith('.SC2Replay')) {
      console.log('❌ [UPLOAD] Invalid file type:', file.name);
      return NextResponse.json(
        { error: 'Invalid file type. Only .SC2Replay files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log('❌ [UPLOAD] File too large:', file.size);
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Check if BLOB token is available
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    console.log('🔑 [UPLOAD] BLOB_READ_WRITE_TOKEN:', blobToken ? 'present' : 'MISSING');

    // Upload to Vercel Blob
    console.log('☁️ [UPLOAD] Uploading to Vercel Blob...');
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    console.log('✅ [UPLOAD] Upload successful:', blob.url);
    return NextResponse.json({
      url: blob.url,
      size: file.size,
      filename: file.name,
    });
  } catch (error) {
    console.error('❌ [UPLOAD] Error uploading replay file:', error);
    console.error('❌ [UPLOAD] Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      {
        error: 'Failed to upload file. Please try again.',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
