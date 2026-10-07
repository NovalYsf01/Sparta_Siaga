import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './lib/runtime-config';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  const publicPaths = ['/login', '/api/auth/login', '/brand', '/_next'];
  if (publicPaths.some(p => pathname.startsWith(p)) || pathname.endsWith('.png') || pathname.endsWith('.jpg')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('siaga_session')?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const jwtSecret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(sessionToken, jwtSecret);
    if (!payload || !payload.id) {
      throw new Error("Invalid session payload");
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
