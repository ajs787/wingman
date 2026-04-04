// OAuth callback no longer used — auth is handled via /api/auth/login
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}
