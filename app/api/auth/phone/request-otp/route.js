export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import OTP from '@/lib/models/OTP';
import { phoneSchema } from '@/lib/validations';
import { generateOTP, hashOTP, normalizeUSPhone, PHONE_OTP_RESEND_COOLDOWN_MS, sendOTP } from '@/lib/phone-otp';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export async function POST(request) {
  const rl = rateLimit(`otp-request:${clientIp(request)}`, { limit: 4, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone_number } = body;

  // Validate phone format
  try {
    phoneSchema.parse(phone_number);
  } catch (err) {
    return NextResponse.json(
      { error: 'Please enter a valid US phone number' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const fullPhone = normalizeUSPhone(phone_number);
    if (!fullPhone) {
      return NextResponse.json(
        { error: 'Please enter a valid US phone number' },
        { status: 400 }
      );
    }

    const existing = await OTP.findOne({ phone_number: fullPhone }).lean();
    const lastSent = existing?.last_sent_at || existing?.created_at;
    if (lastSent) {
      const waitMs = PHONE_OTP_RESEND_COOLDOWN_MS - (Date.now() - new Date(lastSent).getTime());
      if (waitMs > 0) {
        return NextResponse.json(
          {
            error: `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting another code.`,
            code: 'OTP_RATE_LIMITED',
            retryAfterSeconds: Math.ceil(waitMs / 1000),
          },
          { status: 429 }
        );
      }
    }

    const code = generateOTP();
    const codeHash = hashOTP(fullPhone, code);
    const now = new Date();

    const otpRecord = await OTP.findOneAndUpdate(
      { phone_number: fullPhone },
      {
        $set: {
          code_hash: codeHash,
          attempts: 0,
          last_sent_at: now,
          created_at: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let delivery;
    try {
      delivery = await sendOTP({ to: fullPhone, code });
    } catch (err) {
      await OTP.deleteOne({ _id: otpRecord._id }).catch(() => {});
      throw err;
    }

    return NextResponse.json({
      ok: true,
      message: 'OTP sent to your phone number',
      ...(delivery?.devCode ? { devOtp: delivery.devCode } : {}),
    });
  } catch (err) {
    console.error('OTP request error:', err);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
