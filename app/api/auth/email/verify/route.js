export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth-cookies';
import { isEmailVerificationCodeValid } from '@/lib/email-verification';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request) {
  const rl = rateLimit(`email-verify:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid verification code.' }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const code = parsed.data.code.trim();

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  if (user.email_verified) {
    if (user.account_status === 'suspended' || user.account_status === 'banned') {
      return NextResponse.json(
        { error: 'This account is not currently available.' },
        { status: 403 }
      );
    }

    const token = signToken({ sub: user._id.toString(), email, netid: user.netid, tv: user.token_version || 0 });
    const response = NextResponse.json({
      ok: true,
      userId: user._id.toString(),
      netid: user.netid,
      email,
      hasProfile: !!user.name,
      sessionToken: token,
      alreadyVerified: true,
    });
    setSessionCookie(response, token);
    return response;
  }

  const valid = isEmailVerificationCodeValid({
    email,
    code,
    codeHash: user.email_verification_code_hash,
    expiresAt: user.email_verification_expires_at,
  });

  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid or expired verification code.', code: 'INVALID_EMAIL_VERIFICATION_CODE' },
      { status: 400 }
    );
  }

  user.email_verified = true;
  user.email_verified_at = new Date();
  user.email_verification_code_hash = null;
  user.email_verification_expires_at = null;
  user.email_verification_sent_at = null;
  await user.save();

  if (user.account_status === 'suspended' || user.account_status === 'banned') {
    return NextResponse.json(
      { error: 'This account is not currently available.' },
      { status: 403 }
    );
  }

  const token = signToken({ sub: user._id.toString(), email, netid: user.netid, tv: user.token_version || 0 });
  const response = NextResponse.json({
    ok: true,
    userId: user._id.toString(),
    netid: user.netid,
    email,
    hasProfile: !!user.name,
    sessionToken: token,
  });

  setSessionCookie(response, token);
  return response;
}
