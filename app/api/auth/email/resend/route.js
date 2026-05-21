export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import {
  createEmailVerificationPayload,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  sendEmailVerification,
} from '@/lib/email-verification';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  if (user.email_verified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const lastSent = user.email_verification_sent_at ? new Date(user.email_verification_sent_at).getTime() : 0;
  const waitMs = EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - lastSent);
  if (waitMs > 0) {
    return NextResponse.json(
      {
        error: `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting another code.`,
        code: 'EMAIL_VERIFICATION_RATE_LIMITED',
        retryAfterSeconds: Math.ceil(waitMs / 1000),
      },
      { status: 429 }
    );
  }

  const verification = createEmailVerificationPayload(email);
  user.email_verification_code_hash = verification.codeHash;
  user.email_verification_expires_at = verification.expiresAt;
  user.email_verification_sent_at = verification.sentAt;
  await user.save();

  let delivery;
  try {
    delivery = await sendEmailVerification({ to: email, code: verification.code });
  } catch (err) {
    console.error('Email verification resend failed:', err);
    return NextResponse.json(
      { error: 'Could not send verification email. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    ...(delivery?.devCode ? { devVerificationCode: delivery.devCode } : {}),
  });
}
