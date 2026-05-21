export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import OTP from '@/lib/models/OTP';
import { signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth-cookies';
import { phoneOTPSchema } from '@/lib/validations';
import { isOTPValid, normalizeUSPhone, PHONE_OTP_TTL_MS } from '@/lib/phone-otp';

export async function POST(request) {
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

    let user = await User.findOne({ phone_number: fullPhone });

    if (!user) {
      const normalized = fullPhone.slice(-10);
      const netid = `phone_${normalized}`;
      user = await User.create({
        netid,
        email: `${netid}@wingman.local`,
        email_verified: true,
        email_verified_at: new Date(),
        phone_number: fullPhone,
        phone_verified: true,
        phone_verified_at: new Date(),
        password_hash: null, // Phone auth only
      });
    } else if (!user.phone_verified) {
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
      netid: user.netid
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
