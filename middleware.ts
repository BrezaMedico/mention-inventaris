import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'mention_admin_session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mention-org-session-token-key-2026-secure-32chars'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';
    const token = request.cookies.get(COOKIE_NAME)?.value;

    let isValid = false;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        if (payload?.role === 'ADMIN') {
          isValid = true;
        }
      } catch (err) {
        isValid = false;
      }
    }

    // If on login page and already authenticated, redirect to /admin
    if (isLoginPage && isValid) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // If on protected admin page and not authenticated, redirect to /admin/login
    if (!isLoginPage && !isValid) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
