import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth-token';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('session_token')?.value;

  const verified = token ? await verifyToken(token) : null;

  // 1. If trying to access admin routes
  if (path.startsWith('/admin')) {
    if (!verified) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    if (verified.role !== 'ADMIN') {
      // Normal user trying to access admin
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 2. If trying to access user dashboard routes
  if (path.startsWith('/dashboard')) {
    if (!verified) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    if (verified.role === 'ADMIN') {
      // Admin trying to access normal dashboard -> redirect to admin dashboard
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // 3. If authenticated user tries to access login/register
  if (path === '/login' || path === '/register') {
    if (verified) {
      if (verified.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/register'],
};
