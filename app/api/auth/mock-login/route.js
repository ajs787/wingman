import { NextResponse } from 'next/server';

export async function POST(request) {
  const { email } = await request.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const netid = email.trim().toLowerCase().split('@')[0];
  const response = NextResponse.json({ ok: true, netid });
  response.cookies.set('wingru_user', JSON.stringify({ email: email.trim().toLowerCase(), netid }), {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
  });
  return response;
}
