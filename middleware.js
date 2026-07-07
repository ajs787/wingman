import { NextResponse } from 'next/server';

// Legal pages must be reachable without auth — App Store Connect and Apple's
// reviewers need to load the privacy policy and terms without an account.
const PUBLIC_PATHS = ['/', '/login', '/privacy', '/terms'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const user = request.cookies.get('wingman_session')?.value;
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
