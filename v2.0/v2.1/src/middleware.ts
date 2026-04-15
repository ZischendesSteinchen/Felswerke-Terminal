import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('felswerke-session')?.value;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth');

  // Verify session token if present
  const session = token ? await verifySessionToken(token) : null;

  // Allow unauthenticated access to login page and auth API
  if (!session && !isLoginPage && !isAuthApi) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login page
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
