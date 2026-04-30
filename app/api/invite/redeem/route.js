import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import InviteCode from '@/lib/models/InviteCode';
import Delegation from '@/lib/models/Delegation';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { BASIC_MAX_ACTIVE_DELEGATIONS } from '@/lib/constants';

const redeemSchema = z.object({
  code: z.string().min(1).max(20),
});

export async function POST(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid code format' }, { status: 422 });

  await connectDB();
  const invite = await InviteCode.findOne({ code: parsed.data.code.toUpperCase() });

  if (!invite) return NextResponse.json({ error: 'Invalid invite code.' }, { status: 404 });

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite code has expired.' }, { status: 410 });
  }

  if (invite.uses >= invite.max_uses) {
    return NextResponse.json({ error: 'This invite code has already been used.' }, { status: 410 });
  }

  if (invite.owner_user_id.toString() === session.sub) {
    return NextResponse.json({ error: 'You cannot be your own wingman.' }, { status: 400 });
  }

  const activeDelegations = await Delegation.countDocuments({
    delegate_user_id: session.sub,
    status: 'active',
  });

  if (activeDelegations >= BASIC_MAX_ACTIVE_DELEGATIONS) {
    return NextResponse.json(
      {
        error: `You can swipe for up to ${BASIC_MAX_ACTIVE_DELEGATIONS} friends at a time on the basic version. Revoke one first to add another.`,
        code: 'DELEGATION_LIMIT_REACHED',
        limit: BASIC_MAX_ACTIVE_DELEGATIONS,
      },
      { status: 403 }
    );
  }

  // Create or reactivate delegation
  await Delegation.findOneAndUpdate(
    { owner_user_id: invite.owner_user_id, delegate_user_id: session.sub },
    { $set: { status: 'active' } },
    { upsert: true, new: true }
  );

  invite.uses += 1;
  await invite.save();

  const owner = await User.findById(invite.owner_user_id).select('name netid').lean();

  return NextResponse.json({
    success: true,
    owner: owner ? { id: owner._id.toString(), name: owner.name, netid: owner.netid } : null,
  });
}
