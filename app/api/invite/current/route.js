import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import InviteCode from '@/lib/models/InviteCode';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  // Get the latest invite code for this user
  const code = await InviteCode.findOne({
    owner_user_id: session.sub,
    expires_at: { $gt: new Date() },
  }).sort({ created_at: -1 });

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
      expires_at: code.expires_at,
      created_at: code.created_at,
    },
  });
}
