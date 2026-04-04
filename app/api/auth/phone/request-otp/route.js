import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import OTP from '@/lib/models/OTP';
import { phoneSchema } from '@/lib/validations';

// Helper to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to send SMS (placeholder — integrate with Twilio/etc.)
async function sendSMS(phoneNumber, code) {
  // TODO: Integrate with Twilio or another SMS service
  // For now, log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${phoneNumber}: ${code}`);
  }
  // In production, send via SMS gateway
  return true;
}

export async function POST(request) {
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

    // Normalize phone number (remove formatting)
    const normalized = phone_number.replace(/\D/g, '').slice(-10);
    const fullPhone = '+1' + normalized;

    // Generate OTP
    const code = generateOTP();

    // Delete any existing OTP for this phone (cleanup)
    await OTP.deleteMany({ phone_number: fullPhone });

    // Create new OTP record
    await OTP.create({
      phone_number: fullPhone,
      code,
      attempts: 0,
    });

    // Send via SMS
    await sendSMS(fullPhone, code);

    return NextResponse.json({
      ok: true,
      message: 'OTP sent to your phone number',
    });
  } catch (err) {
    console.error('OTP request error:', err);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
