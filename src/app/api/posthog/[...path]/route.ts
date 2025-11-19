/**
 * PostHog Reverse Proxy
 *
 * This proxy route forwards PostHog requests through our backend to bypass ad blockers.
 * Ad blockers often block requests to analytics services, but won't block requests
 * to our own domain.
 *
 * Path examples:
 * - /api/posthog/decide → https://eu.i.posthog.com/decide
 * - /api/posthog/e → https://eu.i.posthog.com/e
 * - /api/posthog/s → https://eu.i.posthog.com/s
 */

import { NextRequest, NextResponse } from 'next/server';

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  try {
    // Reconstruct the path
    const path = pathSegments.join('/');
    const targetUrl = `${POSTHOG_HOST}/${path}`;

    // Get the request body if it exists
    const body = request.method === 'POST' ? await request.text() : undefined;

    // Forward the request to PostHog
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward user agent to help PostHog with analytics
        'User-Agent': request.headers.get('user-agent') || 'unknown',
      },
      body,
    });

    // Get the response data
    const data = await response.text();

    // Return the response with appropriate headers
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': response.headers.get('cache-control') || 'no-cache',
      },
    });
  } catch (error) {
    console.error('PostHog proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to PostHog' },
      { status: 500 }
    );
  }
}
