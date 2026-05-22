import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './lib/auth-interno';

const CANONICAL_PATH = (p: string) => p.endsWith('/') ? p.slice(0, -1) : p;

const PUBLIC_PATHS = new Set([
  '/interno/login',
  '/api/interno/auth/login',
  '/api/interno/auth/logout',
]);

export async function middleware(req: NextRequest) {
  const pathname = CANONICAL_PATH(req.nextUrl.pathname);

  const isInternalRoute =
    pathname.startsWith('/interno') || pathname.startsWith('/api/interno');

  if (!isInternalRoute) return NextResponse.next();

  // Public paths: skip auth but redirect if already logged in (for login page)
  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === '/interno/login') {
      const session = await getSessionFromRequest(req);
      if (session) {
        const dest = session.role === 'admin' ? '/interno/admin' : '/interno/orpa';
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }
    return NextResponse.next();
  }

  // All other internal routes require authentication
  const session = await getSessionFromRequest(req);
  if (!session) {
    if (pathname.startsWith('/api/interno')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const loginUrl = new URL('/interno/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  if (
    pathname.startsWith('/interno/admin') ||
    pathname.startsWith('/api/interno/admin')
  ) {
    if (session.role !== 'admin') {
      return NextResponse.redirect(new URL('/interno/orpa', req.url));
    }
  }

  // Inject user info into request headers for API routes
  const headers = new Headers(req.headers);
  headers.set('x-user-id', session.sub);
  headers.set('x-user-role', session.role);
  headers.set('x-user-oficina', session.oficina ?? '');
  headers.set('x-user-nombre', session.nombre);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/interno/:path*', '/api/interno/:path*'],
};
