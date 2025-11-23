
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Note: This middleware is simplified to only check for the presence of a session cookie.
// The actual validation of the cookie and fetching the user is handled in the AuthProvider
// and on the server-side where `firebase-admin` can be safely used.

const protectedRoutes = ['/dashboard', '/clients', '/bookings', '/visas', '/subscriptions', '/accounts', '/reports', '/settings', '/users', '/profile', '/hr', '/segments', '/exchanges', '/profit-sharing', '/finance-tools', '/system', '/templates', '/notifications', '/support'];
const clientRoutes = ['/clients/', '/profile'];
const authRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin'];

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // If no session cookie and trying to access a protected route, redirect to login
  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // Allow the request to proceed
  return NextResponse.next();
}

// See "Matching Paths" to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
