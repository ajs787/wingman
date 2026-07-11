export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import OTP from '@/lib/models/OTP';
import { signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth-cookies';
import { phoneOTPSchema } from '@/lib/validations';
import { isOTPValid, normalizeUSPhone, PHONE_OTP_TTL_MS } from '@/lib/phone-otp';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export async function POST(request) {
  const rl = rateLimit(`otp-verify:${clientIp(request)}`, { limit: 8, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone_number, otp } = body;

  // Validate input
  try {
    phoneOTPSchema.parse({ phone_number, otp });
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid phone number or OTP format' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const fullPhone = normalizeUSPhone(phone_number);
    if (!fullPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number or OTP format' },
        { status: 400 }
      );
    }

    const otpRecord = await OTP.findOne({ phone_number: fullPhone });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      );
    }

    const createdAt = new Date(otpRecord.created_at).getTime();
    if (!createdAt || Date.now() - createdAt > PHONE_OTP_TTL_MS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      );
    }

    if (!isOTPValid({ phoneNumber: fullPhone, code: otp, codeHash: otpRecord.code_hash })) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return NextResponse.json(
          { error: 'Too many failed attempts. Please request a new OTP.' },
          { status: 400 }
        );
      }
      await otpRecord.save();
      return NextResponse.json(
        { error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      );
    }

    // The account is created at signup (email + password + phone). Verifying the
    // OTP activates it. No auto-created phone-only accounts.
    const user = await User.findOne({ phone_number: fullPhone });
    if (!user) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: 'No account found for this phone number. Please sign up first.' },
        { status: 404 }
      );
    }
    if (!user.phone_verified) {
      user.phone_verified = true;
      user.phone_verified_at = new Date();
      await user.save();
    }

    if (user.account_status === 'suspended' || user.account_status === 'banned') {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: 'This account is not currently available.' },
        { status: 403 }
      );
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    // Create session token
    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      netid: user.netid,
      tv: user.token_version || 0,
    });

    const response = NextResponse.json({
      ok: true,
      userId: user._id.toString(),
      netid: user.netid,
      email: user.email,
      phone_number: user.phone_number,
      hasProfile: !!user.name,
      sessionToken: token,
    });

    setSessionCookie(response, token);

    return response;
  } catch (err) {
    console.error('OTP verification error:', err);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
