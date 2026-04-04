import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';
import { emailSchema } from '@/lib/validations';

const client = new OAuth2Client('379185107870-dnihr4sldvtrs9i38uim0aj61u8rp6n1.apps.googleusercontent.com');

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
      audience: '379185107870-dnihr4sldvtrs9i38uim0aj61u8rp6n1.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return NextResponse.json({ error: 'Email not provided by Google.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();

    // Validate .edu email
    try {
      emailSchema.parse(emailLower);
    } catch (err) {
      return NextResponse.json(
        { error: 'Email must be from a college domain (.edu).' },
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
        name: name || undefined,
      });
      isNewUser = true;
    }

    const token = signToken({
      sub: user._id.toString(),
      email: emailLower,
      netid: user.netid
    });

    const response = NextResponse.json({
      ok: true,
      userId: user._id.toString(),
      netid: user.netid,
      email: emailLower,
      hasProfile: !!user.name && user.photos?.length > 0,
    });

    response.cookies.set('penguin_session', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
    });

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
