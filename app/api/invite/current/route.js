export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import InviteCode from '@/lib/models/InviteCode';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  // Codes never expire, so "current" means the newest one that hasn't been
  // redeemed yet. Once a friend uses it, the owner generates a fresh one.
  const code = await InviteCode.findOne({
    owner_user_id: session.sub,
    $expr: { $lt: ['$uses', '$max_uses'] },
  }).sort({ createdAt: -1 });

  if (!code) {
    return NextResponse.json({
      code: null,
      message: 'No active invite code. Generate one below.',
    });
  }

  return NextResponse.json({
    code: {
      id: code._id.toString(),
      code: code.code,
      created_at: code.createdAt,
    },
  });
}
