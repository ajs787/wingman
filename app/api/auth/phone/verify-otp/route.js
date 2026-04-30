import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import OTP from '@/lib/models/OTP';
import { signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth-cookies';
import { phoneOTPSchema } from '@/lib/validations';

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

    // Normalize phone number
    const normalized = phone_number.replace(/\D/g, '').slice(-10);
    const fullPhone = '+1' + normalized;

    // Find OTP record
    const otpRecord = await OTP.findOne({ phone_number: fullPhone });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if OTP matches
    if (otpRecord.code !== otp) {
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

    // OTP verified — find or create user
    let user = await User.findOne({ phone_number: fullPhone });

    if (!user) {
      // Create new user with phone-only auth
      const netid = `phone_${normalized}`;
      user = await User.create({
        netid,
        email: `${netid}@wingman.local`,
        phone_number: fullPhone,
        password_hash: null, // Phone auth only
      });
    }

    // Delete used OTP
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
