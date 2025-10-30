import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import FormDataNode from 'form-data';

const SC2READER_API_URL = process.env.SC2READER_API_URL || 'http://localhost:8000';
const SC2READER_API_KEY = process.env.SC2READER_API_KEY || 'your-secret-key-change-this';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Analyze an SC2 replay file using the Flask API
 *
 * This endpoint acts as a proxy to the Flask API, keeping the API key secure
 * on the server side and requiring authentication from the user.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !hasPermission(session, 'coaches')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only coaches and owners can analyze replay files.' },
        { status: 401 }
      );
    }

    // Get the file from the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.SC2Replay')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .SC2Replay files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Forward the request to the Flask API
    // Use form-data package and convert to buffer for proper multipart handling
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const apiFormData = new FormDataNode();
    apiFormData.append('file', buffer, {
      filename: file.name,
      contentType: 'application/octet-stream',
    });

    // Convert form-data stream to buffer
    const formDataBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      apiFormData.on('data', (chunk: Buffer) => chunks.push(chunk));
      apiFormData.on('end', () => resolve(Buffer.concat(chunks)));
      apiFormData.on('error', reject);
    });

    // Get the headers from form-data (includes boundary)
    const headers = apiFormData.getHeaders();

    // Create a Blob from the buffer (Blob is part of BodyInit)
    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(formDataBuffer);
    const blob = new Blob([uint8Array], {
      type: headers['content-type'],
    });

    const response = await fetch(`${SC2READER_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'X-API-Key': SC2READER_API_KEY,
        'Content-Type': headers['content-type'], // Use exact Content-Type with boundary
      },
      body: blob,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed with replay analyzer API' },
          { status: 502 }
        );
      } else if (response.status === 422) {
        return NextResponse.json(
          { error: 'Failed to parse replay file', detail: errorData.detail || 'The replay may be corrupted' },
          { status: 422 }
        );
      } else {
        return NextResponse.json(
          { error: 'Failed to analyze replay', detail: errorData.detail || errorData.error },
          { status: 502 }
        );
      }
    }

    const analysisData = await response.json();

    return NextResponse.json(analysisData);
  } catch (error) {
    console.error('Error analyzing replay file:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze replay file. Please try again.',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
