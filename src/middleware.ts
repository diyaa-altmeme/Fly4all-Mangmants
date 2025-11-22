
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUserFromSession } from '@/app/(auth)/actions';

const protectedRoutes = ['/dashboard', '/clients', '/bookings', '/visas', '/subscriptions', '/accounts', '/reports', '/settings', '/users', '/profile', '/hr', '/segments', '/exchanges', '/profit-sharing', '/finance-tools', '/system', '/templates', '/notifications', '/support'];
const clientRoutes = ['/clients/', '/profile'];
const authRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin'];

export async function middleware(request: NextRequest) {
  const user = await getCurrentUserFromSession();
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isClientRoute = clientRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.includes(pathname);
  const isLandingPage = pathname === '/';

  if (!user) {
    // If not logged in and trying to access a protected route, redirect to login
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    // Allow access to public and auth routes
    return NextResponse.next();
  }

  // At this point, user is logged in
  const isClient = 'isClient' in user && user.isClient;
  const isAdminOrEmployee = !isClient;
  
  if (isClient) {
     // If a client tries to access a non-client, non-public route, redirect them to their profile
    if (!isClientRoute) {
        return NextResponse.redirect(new URL(`/clients/${user.id}`, request.url));
    }
  }

  if (isAdminOrEmployee) {
      // If an employee/admin is on an auth route or the landing page, redirect to dashboard
      if (isAuthRoute || isLandingPage) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
      }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
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
    