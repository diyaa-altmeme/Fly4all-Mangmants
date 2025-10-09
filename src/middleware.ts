import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // المسارات العامة التي لا تحتاج مصادقة
  const publicPaths = ['/login', '/api/auth', '/auth/forgot-password'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // إذا كان المسار عام، اسمح بالدخول
  if (isPublicPath) {
    // إذا كان مسجل دخول ويحاول الوصول لصفحة تسجيل الدخول، وجهه للوحة التحكم
    if (pathname.startsWith('/login') && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // إذا لم يكن لديه جلسة، وجهه لصفحة تسجيل الدخول
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ToDo: Add role/permission based checks here in the future if needed
  // For example:
  // if (pathname.startsWith('/admin') && decodedToken.role !== 'admin') {
  //   return NextResponse.redirect(new URL('/unauthorized', request.url));
  // }

  // اسمح بالمرور
  return NextResponse.next();
}

// حدد المسارات التي يجب تطبيق Middleware عليها
export const config = {
  matcher: [
    /*
     * مطابقة جميع المسارات عدا:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
