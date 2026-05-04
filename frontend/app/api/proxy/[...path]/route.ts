import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function getBackendBaseUrl() {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.VERCEL ? 'https://intelliml-backend.onrender.com' : 'http://127.0.0.1:8000')
  );
}

function buildTargetUrl(pathParts: string[], search: string) {
  const path = pathParts.join('/');
  return `${getBackendBaseUrl()}/${path}${search}`;
}

async function forward(request: NextRequest, pathParts: string[]) {
  const targetUrl = buildTargetUrl(pathParts, request.nextUrl.search);
  const contentType = request.headers.get('content-type');
  const auth = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');

  const headers = new Headers();
  if (contentType) headers.set('content-type', contentType);
  if (auth) headers.set('authorization', auth);
  if (apiKey) headers.set('x-api-key', apiKey);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // Use the request body stream directly to avoid loading the whole file into memory
    // and to bypass potential Next.js body size limits for arrayBuffer().
    init.body = request.body;
    // @ts-expect-error - 'duplex' is required when body is a stream in some environments
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    console.error(`[Proxy] Fetch error to ${targetUrl}:`, error);
    return new Response(
      JSON.stringify({
        detail: 'Backend service unavailable or connection timeout',
        target: targetUrl,
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get('content-type');
  if (upstreamContentType) {
    responseHeaders.set('content-type', upstreamContentType);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(request, path);
}
