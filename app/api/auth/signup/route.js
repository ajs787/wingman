import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth-cookies';
import { signupSchema } from '@/lib/validations';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  // Validate using Zod schema
  const validationResult = signupSchema.safeParse({ email, password });
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  await connectDB();

  // Use email as netid to guarantee uniqueness
  const netid = email;
  const password_hash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await User.create({ email, netid, password_hash });
  } catch (err) {
    // Log the FULL error for debugging
    console.error('=== SIGNUP ERROR ===');
    console.error('Email attempted:', email);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Key pattern:', JSON.stringify(err.keyPattern));
    console.error('Key value:', JSON.stringify(err.keyValue));
    console.error('Full error:', err);
    console.error('====================');

    // Handle duplicate key errors
    if (err.code === 11000) {
      const keyPattern = err.keyPattern || {};

      // If netid collision (from old data with different netid format)
      if (keyPattern.netid && !keyPattern.email) {
        try {
          const uniqueNetid = `${email}_${Date.now()}`;
          user = await User.create({ email, netid: uniqueNetid, password_hash });
        } catch (retryErr) {
          console.error('Retry also failed:', retryErr);
          if (retryErr.code === 11000) {
            return NextResponse.json(
              { error: 'Email already in use.' },
              { status: 409 }
            );
          }
          throw retryErr;
        }
      } else {
        // Email duplicate
        return NextResponse.json(
          { error: 'Email already in use.' },
          { status: 409 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Server error. Please try again.' },
        { status: 500 }
      );
    }
  }

  const token = signToken({ sub: user._id.toString(), email, netid: user.netid });

  const response = NextResponse.json({
    ok: true,
    userId: user._id.toString(),
    netid: user.netid,
    email,
    hasProfile: false,
  });

  setSessionCookie(response, token);

  return response;
}
