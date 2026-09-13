export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth-cookies';
import { emailSchema, passwordSchema, otpSchema } from '@/lib/validations';
import { isEmailVerificationCodeValid } from '@/lib/email-verification';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// Same message for "no such account" and "bad/expired code" so the endpoint
// can't be used to probe which emails are registered.
const INVALID_CODE = 'That code is invalid or has expired. Request a new one.';

export async function POST(request) {
  const rl = rateLimit(`pwreset-confirm:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const code = (body.code || '').trim();
  const password = (body.password || '').trim();

  if (!emailSchema.safeParse(email).success) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 422 });
  }
  if (!otpSchema.safeParse(code).success) {
    return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 422 });
  }
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) {
    return NextResponse.json({ error: pw.error.errors[0].message }, { status: 422 });
  }

  await connectDB();
  const user = await User.findOne({ email });

  if (!user || !user.password_hash || !user.email_verification_code_hash) {
    return NextResponse.json({ error: INVALID_CODE }, { status: 400 });
  }

  const valid = isEmailVerificationCodeValid({
    email,
    code,
    codeHash: user.email_verification_code_hash,
    expiresAt: user.email_verification_expires_at,
  });
  if (!valid) {
    return NextResponse.json({ error: INVALID_CODE }, { status: 400 });
  }

  if (user.account_status === 'suspended' || user.account_status === 'banned') {
    return NextResponse.json(
      { error: 'This account is not currently available.' },
      { status: 403 }
    );
  }

  // Set the new password, consume the code, and confirm email ownership.
  user.password_hash = await bcrypt.hash(password, 12);
  user.email_verified = true;
  user.email_verified_at = user.email_verified_at || new Date();
  user.email_verification_code_hash = null;
  user.email_verification_expires_at = null;
  user.email_verification_sent_at = null;
  // Invalidate every existing session — a reset should log out other devices.
  user.token_version = (user.token_version || 0) + 1;
  await user.save();

  // Log the user in on this device with a fresh token.
  const netid = user.netid;
  const token = signToken({ sub: user._id.toString(), email, netid, tv: user.token_version });

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
