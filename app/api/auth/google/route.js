export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth-cookies';
import { emailSchema } from '@/lib/validations';

// Google client ID is public (it ships to the browser), but keep it in env so it
// can differ per environment / be rotated without a code change.
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  '379185107870-dnihr4sldvtrs9i38uim0aj61u8rp6n1.apps.googleusercontent.com';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { idToken } = body;
  if (!idToken) {
    return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
  }

  try {
    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return NextResponse.json({ error: 'Email not provided by Google.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();

    // Validate email format (any domain is accepted).
    try {
      emailSchema.parse(emailLower);
    } catch (err) {
      return NextResponse.json(
        { error: 'That Google account has an invalid email address.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    let user = await User.findOne({ email: emailLower });
    let isNewUser = false;

    if (!user) {
      // Create new user with Google auth (no password_hash)
      user = await User.create({
        email: emailLower,
        netid: email.split('@')[0],
        password_hash: null,
        email_verified: true,
        email_verified_at: new Date(),
        name: name || undefined,
      });
      isNewUser = true;
    } else if (!user.email_verified) {
      user.email_verified = true;
      user.email_verified_at = new Date();
      user.email_verification_code_hash = null;
      user.email_verification_expires_at = null;
      user.email_verification_sent_at = null;
      await user.save();
    }

    if (user.account_status === 'suspended' || user.account_status === 'banned') {
      return NextResponse.json(
        { error: 'This account is not currently available.' },
        { status: 403 }
      );
    }

    const token = signToken({
      sub: user._id.toString(),
      email: emailLower,
      netid: user.netid,
      tv: user.token_version || 0,
    });

    const response = NextResponse.json({
      ok: true,
      userId: user._id.toString(),
      netid: user.netid,
      email: emailLower,
      hasProfile: !!user.name && user.photos?.length > 0,
      sessionToken: token,
    });

    setSessionCookie(response, token);

    return response;
  } catch (err) {
    // Google token verification failed
    if (err.message && err.message.includes('Token used too late')) {
      return NextResponse.json({ error: 'Token has expired.' }, { status: 401 });
    }
    if (err.message && err.message.includes('audience')) {
      return NextResponse.json({ error: 'Invalid token for this application.' }, { status: 401 });
    }
    console.error('Google token verification error:', err);
    return NextResponse.json({ error: 'Failed to verify Google token.' }, { status: 401 });
  }
}
