
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const publicPaths = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/'];
  const isPublicPath = publicPaths.some(path => pathname === path);

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

  // Verification of the cookie is now implicitly handled by server actions and pages
  // that use `getCurrentUserFromSession`. If the cookie is invalid, they will return null,
  // and the client-side AuthProvider will redirect to login. This prevents middleware
  // from needing to import the admin SDK, which can cause bundling issues.
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
