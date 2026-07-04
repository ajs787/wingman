export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import InviteCode from '@/lib/models/InviteCode';
import Delegation from '@/lib/models/Delegation';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { maxActiveDelegations, isProTier } from '@/lib/subscription';

const redeemSchema = z.object({
  code: z.string().trim().length(8).regex(/^[A-Z0-9]+$/i),
});

export async function POST(request) {
  const session = await getSession(request);
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

  const [activeDelegations, redeemer] = await Promise.all([
    Delegation.countDocuments({
      delegate_user_id: session.sub,
      status: 'active',
    }),
    User.findById(session.sub).select('subscription_tier').lean(),
  ]);

  const delegationLimit = maxActiveDelegations(redeemer?.subscription_tier);

  if (activeDelegations >= delegationLimit) {
    return NextResponse.json(
      {
        error: isProTier(redeemer?.subscription_tier)
          ? `You can swipe for up to ${delegationLimit} friends at a time. Revoke one first to add another.`
          : `You can swipe for up to ${delegationLimit} friends at a time on the free plan. Upgrade to Wingman Pro to swipe for more, or revoke one first.`,
        code: 'DELEGATION_LIMIT_REACHED',
        limit: delegationLimit,
        upgrade: !isProTier(redeemer?.subscription_tier),
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
