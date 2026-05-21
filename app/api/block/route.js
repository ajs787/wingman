export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import User from '@/lib/models/User';
import { blockSchema } from '@/lib/safety/validation';
import { createBlock } from '@/lib/safety/blocking';

export async function POST(request) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = blockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const blockerId = String(session.sub);
  const { blockedUserId, reason } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(blockedUserId)) {
    return NextResponse.json({ error: 'Invalid blocked user id' }, { status: 400 });
  }

  if (blockedUserId === blockerId) {
    return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });
  }

  await connectDB();

  const target = await User.findById(blockedUserId).select('_id').lean();
  if (!target) {
    return NextResponse.json({ error: 'Target user does not exist' }, { status: 404 });
  }

  const result = await createBlock({
    blockerId,
    blockedId: blockedUserId,
    reason,
  });

  return NextResponse.json({
    success: true,
    alreadyBlocked: result.alreadyBlocked,
    blockId: String(result.block._id),
  });
}
