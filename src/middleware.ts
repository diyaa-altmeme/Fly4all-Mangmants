
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUserFromSession } from '@/lib/auth/actions';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const publicPaths = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path) && (path === '/' ? pathname.length === 1 : true));

  if (isPublicPath) {
    if (pathname.startsWith('/auth/login') && session) {
      // If there's a session, we'll let the client-side AuthProvider handle the redirect to dashboard
      // to avoid middleware-hydration mismatches. The client will see the login page for a split second.
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
