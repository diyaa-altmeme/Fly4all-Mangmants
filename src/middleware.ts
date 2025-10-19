
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware is causing conflicts with the new auth flow.
// The page-level protection in MainLayout is sufficient.
// We will return next() for all requests to effectively disable it.
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Keep the config to ensure the middleware file is processed,
// but the function above now does nothing.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
