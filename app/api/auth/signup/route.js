export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import OTP from '@/lib/models/OTP';
import { signupSchema } from '@/lib/validations';
import { generateOTP, hashOTP, normalizeUSPhone, sendOTP } from '@/lib/phone-otp';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// Sign up with any email + password + a US phone number. The account is created
// unverified and must be activated by verifying the phone via OTP
// (POST /api/auth/phone/verify-otp). One phone number per account.
export async function POST(request) {
  const rl = rateLimit(`signup:${clientIp(request)}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many sign-up attempts. Please wait a minute and try again.' }, { status: 429 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = (body.password || '').trim();
  const phone_number = (body.phone_number || '').trim();

  const parsed = signupSchema.safeParse({ email, password, phone_number });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const fullPhone = normalizeUSPhone(phone_number);
  if (!fullPhone) {
    return NextResponse.json({ error: 'Please enter a valid US phone number.' }, { status: 400 });
  }

  await connectDB();

  // One phone per account. A fully-registered (phone-verified) match is rejected;
  // an abandoned, never-verified signup with the same phone or email is cleared so
  // the person can start over.
  const [byPhone, byEmail] = await Promise.all([
    User.findOne({ phone_number: fullPhone }),
    User.findOne({ email }),
  ]);
  if (byPhone?.phone_verified) {
    return NextResponse.json({ error: 'That phone number is already registered.' }, { status: 409 });
  }
  if (byEmail?.phone_verified) {
    return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 });
  }
  const staleIds = [byPhone?._id, byEmail?._id].filter(Boolean);
  if (staleIds.length) {
    await User.deleteMany({ _id: { $in: staleIds }, phone_verified: { $ne: true } });
  }

  const password_hash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await User.create({
      email,
      netid: email, // email is unique; use it as the netid
      password_hash,
      email_verified: true, // email is just an identifier now; phone is the gate
      email_verified_at: new Date(),
      phone_number: fullPhone,
      phone_verified: false,
      account_status: 'active',
    });
  } catch (err) {
    if (err.code === 11000) {
      const dupPhone = err.keyPattern?.phone_number;
      return NextResponse.json(
        { error: dupPhone ? 'That phone number is already registered.' : 'That email is already in use.' },
        { status: 409 }
      );
    }
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }

  // Generate + send the phone OTP the user will verify next.
  const code = generateOTP();
  const now = new Date();
  await OTP.findOneAndUpdate(
    { phone_number: fullPhone },
    { $set: { code_hash: hashOTP(fullPhone, code), attempts: 0, last_sent_at: now, created_at: now } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let delivery;
  try {
    delivery = await sendOTP({ to: fullPhone, code });
  } catch (err) {
    // Roll back the account and OTP so the phone/email aren't locked.
    await User.findByIdAndDelete(user._id).catch(() => {});
    await OTP.deleteOne({ phone_number: fullPhone }).catch(() => {});
    console.error('OTP send failed:', err);
    return NextResponse.json({ error: 'Could not send the verification code. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId: user._id.toString(),
    email,
    phone_number: fullPhone,
    hasProfile: false,
    requiresPhoneVerification: true,
    ...(delivery?.devOtp ? { devOtp: delivery.devOtp } : {}),
  });
}
