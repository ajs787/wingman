export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth-cookies';
import { loginSchema } from '@/lib/validations';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export async function POST(request) {
  const rl = rateLimit(`login:${clientIp(request)}`, { limit: 8, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many login attempts. Please wait a minute and try again.' }, { status: 429 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  // Validate using Zod schema
  const validationResult = loginSchema.safeParse({ email, password });
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json(
      { error: 'No account found with that email. Please sign up first.' },
      { status: 401 }
    );
  }

  if (!user.password_hash) {
    return NextResponse.json(
      { error: 'This account uses Google Sign-In. Please use that option instead.' },
      { status: 401 }
    );
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  if (!user.email_verified) {
    return NextResponse.json(
      {
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email,
      },
      { status: 403 }
    );
  }

  if (user.account_status === 'suspended' || user.account_status === 'banned') {
    return NextResponse.json(
      { error: 'This account is not currently available.' },
      { status: 403 }
    );
  }

  const netid = user.netid;
  const token = signToken({ sub: user._id.toString(), email, netid, tv: user.token_version || 0 });

  const response = NextResponse.json({
    ok: true,
    userId: user._id.toString(),
    netid,
    email,
    hasProfile: !!user.name,
    sessionToken: token,
  });

  setSessionCookie(response, token);

  return response;
}
