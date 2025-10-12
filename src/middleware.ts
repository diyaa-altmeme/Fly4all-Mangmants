

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware is causing conflicts with the new auth flow.
// The page-level protection in MainLayout is sufficient.
// We will return next() for all requests to effectively disable it.
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
