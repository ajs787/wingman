export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { emailSchema } from '@/lib/validations';
import {
  createEmailVerificationPayload,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  sendEmailVerification,
} from '@/lib/email-verification';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// Generic response used for every outcome so the endpoint never reveals whether
// an email is registered (prevents account enumeration).
function genericOk(extra = {}) {
  return NextResponse.json({
    ok: true,
    message: 'If an account exists for that email, a reset code is on its way.',
    ...extra,
  });
}

export async function POST(request) {
  const rl = rateLimit(`pwreset-request:${clientIp(request)}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many reset requests. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();

  // Format errors are safe to surface (they don't leak account existence).
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  await connectDB();
  const user = await User.findOne({ email });

  // No account, or a Google-only account (no password to reset): say nothing.
  if (!user || !user.password_hash) {
    return genericOk();
  }

  // Respect the shared resend cooldown, but keep the response generic.
  const lastSent = user.email_verification_sent_at
    ? new Date(user.email_verification_sent_at).getTime()
    : 0;
  if (Date.now() - lastSent < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) {
    return genericOk();
  }

  const verification = createEmailVerificationPayload(email);
  user.email_verification_code_hash = verification.codeHash;
  user.email_verification_expires_at = verification.expiresAt;
  user.email_verification_sent_at = verification.sentAt;
  await user.save();

  let delivery;
  try {
    delivery = await sendEmailVerification({ to: email, code: verification.code, purpose: 'reset' });
  } catch (err) {
    console.error('Password reset email send failed:', err);
    return NextResponse.json(
      { error: 'Could not send the reset email. Please try again.' },
      { status: 500 }
    );
  }

  // In dev with no Resend key configured, surface the code so the flow is testable.
  return genericOk(delivery?.devCode ? { devResetCode: delivery.devCode } : {});
}
