export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import InviteCode from '@/lib/models/InviteCode';
import { getSession } from '@/lib/auth';
import { generateInviteCode } from '@/lib/utils';

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  // Keep a single outstanding code per user: drop any previous unredeemed one.
  await InviteCode.deleteMany({
    owner_user_id: session.sub,
    uses: 0,
  });

  // No expiry — the code stays valid until it's redeemed once.
  const invite = await InviteCode.create({
    code: generateInviteCode(),
    owner_user_id: session.sub,
    max_uses: 1,
    uses: 0,
  });

  return NextResponse.json({
    invite: {
      id: invite._id.toString(),
      code: invite.code,
      max_uses: invite.max_uses,
      uses: invite.uses,
    },
  });
}
