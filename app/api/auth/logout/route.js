export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth-cookies';
import { getSession, bumpTokenVersion } from '@/lib/auth';

export async function POST(request) {
  // Invalidate the token server-side (not just clear the cookie) so a captured
  // token can't be replayed after logout. Note: bumps token_version, which signs
  // the user out on all devices.
  const session = await getSession(request);
  if (session?.sub) {
    await bumpTokenVersion(session.sub);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
