import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Match from '@/lib/models/Match';
import Message from '@/lib/models/Message';
import InviteCode from '@/lib/models/InviteCode';
import Delegation from '@/lib/models/Delegation';
import Swipe from '@/lib/models/Swipe';
import { getSession } from '@/lib/auth';
import { clearSessionCookie } from '@/lib/auth-cookies';

const settingsSchema = z.object({
  hidden: z.boolean().optional(),
  show_age: z.boolean().optional(),
  show_school: z.boolean().optional(),
});

// GET /api/account — get account settings
export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.sub).lean();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    settings: {
      hidden: user.hidden ?? false,
      show_age: user.show_age ?? true,
      show_school: user.show_school ?? true,
    },
  });
}

// PUT /api/account — update account settings
export async function PUT(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(
    session.sub,
    { $set: parsed.data },
    { new: true }
  ).lean();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    settings: {
      hidden: user.hidden ?? false,
      show_age: user.show_age ?? true,
      show_school: user.show_school ?? true,
    },
  });
}

// DELETE /api/account — delete account and all associated data
export async function DELETE(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.sub;

  await connectDB();

  // Delete all user data
  await Promise.all([
    // Delete user's matches (where they are either user_a or user_b)
    Match.deleteMany({ $or: [{ user_a: userId }, { user_b: userId }] }),
    // Delete user's messages
    Message.deleteMany({ sender_id: userId }),
    // Delete user's invite codes
    InviteCode.deleteMany({ owner_id: userId }),
    // Delete delegations (both as owner and delegate)
    Delegation.deleteMany({ $or: [{ owner_user_id: userId }, { delegate_user_id: userId }] }),
    // Delete user's swipes
    Swipe.deleteMany({ $or: [{ owner_user_id: userId }, { delegate_user_id: userId }, { target_user_id: userId }] }),
    // Delete the user
    User.findByIdAndDelete(userId),
  ]);

  // Clear the auth cookie
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  return response;
}
