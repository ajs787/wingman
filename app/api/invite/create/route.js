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

  // Delete old unused codes for this user
  await InviteCode.deleteMany({
    owner_user_id: session.sub,
    uses: 0,
    expires_at: { $lt: new Date() },
  });

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  const invite = await InviteCode.create({
    code,
    owner_user_id: session.sub,
    expires_at: expiresAt,
    max_uses: 1,
    uses: 0,
  });

  return NextResponse.json({
    invite: {
      id: invite._id.toString(),
      code: invite.code,
      expires_at: invite.expires_at,
      max_uses: invite.max_uses,
      uses: invite.uses,
    },
  });
}
