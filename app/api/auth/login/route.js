import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  // Validate using Zod schema
  const validationResult = loginSchema.safeParse({ email, password });
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json(
      { error: 'No account found with that email. Please sign up first.' },
      { status: 401 }
    );
  }

  if (!user.password_hash) {
    return NextResponse.json(
      { error: 'This account uses Google Sign-In. Please use that option instead.' },
      { status: 401 }
    );
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const netid = user.netid;
  const token = signToken({ sub: user._id.toString(), email, netid });

  const response = NextResponse.json({
    ok: true,
    userId: user._id.toString(),
    netid,
    email,
    hasProfile: !!user.name,
  });

  response.cookies.set('penguin_session', token, {
    httpOnly: true,
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
    sameSite: 'lax',
  });

  return response;
}
