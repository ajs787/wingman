import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('wingru_user', '', {
    path: '/',
    httpOnly: true,
    maxAge: 0,
  });
  return response;
}
