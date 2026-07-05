export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Delegation from '@/lib/models/Delegation';
import PotentialMatch from '@/lib/models/PotentialMatch';
import Match from '@/lib/models/Match';
import { getSession } from '@/lib/auth';

const decisionSchema = z.object({
  potential_match_id: z.string().min(1),
  action: z.enum(['accept', 'reject']),
});

// POST /api/likes/decision
// A target-side wingman (or the target) accepts or rejects an incoming like.
// One reject does not kill it; any accept promotes it to a pending Match that the two
// actual users then confirm. All-reject (every active target wingman) marks it rejected,
// but a fresh like or accept can revive it.
export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { potential_match_id, action } = parsed.data;
  if (!mongoose.Types.ObjectId.isValid(potential_match_id)) {
    return NextResponse.json({ error: 'Invalid potential_match_id' }, { status: 400 });
  }

  await connectDB();

  const pm = await PotentialMatch.findById(potential_match_id);
  if (!pm) return NextResponse.json({ error: 'Potential match not found' }, { status: 404 });

  const targetId = pm.target_user_id.toString();
  const ownerId = pm.owner_user_id.toString();

  // Only the target or one of their active wingmen may decide. The owner's side (who
  // sent the like) cannot approve their own like.
  const isTarget = session.sub === targetId;
  let isTargetWingman = isTarget;
  if (!isTargetWingman) {
    const delegation = await Delegation.findOne({
      owner_user_id: targetId,
      delegate_user_id: session.sub,
      status: 'active',
    }).lean();
    isTargetWingman = !!delegation;
  }
  if (!isTargetWingman) {
    return NextResponse.json({ error: 'Only the receiving side can decide on this like.' }, { status: 403 });
  }

  // Record this wingman's decision (replace any prior vote from the same wingman).
  pm.decisions = pm.decisions.filter((d) => d.wingman_user_id.toString() !== session.sub);
  pm.decisions.push({
    wingman_user_id: new mongoose.Types.ObjectId(session.sub),
    decision: action,
    decidedAt: new Date(),
  });

  const hasAccept = pm.decisions.some((d) => d.decision === 'accept');

  if (hasAccept) {
    pm.status = 'accepted';
    if (!pm.accepted_by) {
      pm.accepted_by = new mongoose.Types.ObjectId(
        pm.decisions.find((d) => d.decision === 'accept').wingman_user_id
      );
    }
  } else {
    // No accepts. Rejected only once every active target wingman has said no.
    const activeDelegates = await Delegation.find({
      owner_user_id: targetId,
      status: 'active',
    }).select('delegate_user_id').lean();
    const activeIds = new Set(activeDelegates.map((d) => d.delegate_user_id.toString()));
    const rejectedIds = new Set(
      pm.decisions.filter((d) => d.decision === 'reject').map((d) => d.wingman_user_id.toString())
    );
    const everyoneRejected =
      (activeIds.size > 0 && [...activeIds].every((id) => rejectedIds.has(id))) ||
      (activeIds.size === 0 && isTarget && rejectedIds.has(session.sub));
    pm.status = everyoneRejected ? 'rejected' : 'pending';
  }

  // On the first accept, create the pending Match the two users will confirm.
  let matchId = pm.match_id ? pm.match_id.toString() : null;
  if (pm.status === 'accepted' && !pm.match_id) {
    const [a, b] = ownerId < targetId ? [ownerId, targetId] : [targetId, ownerId];
    const ownerIsA = ownerId === a;
    const latestSender = pm.senders[pm.senders.length - 1] || null;
    const ownerMatchedBy = latestSender ? latestSender.wingman_user_id : null;
    const ownerNote = latestSender ? latestSender.comment : null;
    const acceptorOid = new mongoose.Types.ObjectId(session.sub);

    try {
      const match = await Match.findOneAndUpdate(
        { user_a: new mongoose.Types.ObjectId(a), user_b: new mongoose.Types.ObjectId(b) },
        {
          $setOnInsert: {
            user_a: new mongoose.Types.ObjectId(a),
            user_b: new mongoose.Types.ObjectId(b),
            user_a_status: 'pending',
            user_b_status: 'pending',
            // Owner side note+wingman come from the like; target side is the accepting wingman.
            user_a_friend_note: ownerIsA ? ownerNote : null,
            user_b_friend_note: ownerIsA ? null : ownerNote,
            user_a_matched_by: ownerIsA ? ownerMatchedBy : acceptorOid,
            user_b_matched_by: ownerIsA ? acceptorOid : ownerMatchedBy,
          },
        },
        { new: true, upsert: true }
      );
      matchId = match._id.toString();
      pm.match_id = match._id;
    } catch (err) {
      if (err.code !== 11000) throw err;
      const existing = await Match.findOne({
        user_a: new mongoose.Types.ObjectId(a),
        user_b: new mongoose.Types.ObjectId(b),
      }).select('_id').lean();
      if (existing) { matchId = existing._id.toString(); pm.match_id = existing._id; }
    }
  }

  await pm.save();

  return NextResponse.json({
    ok: true,
    status: pm.status,
    myDecision: action,
    matchId,
    // A match now exists as pending — the two actual users confirm it next.
    matchCreated: pm.status === 'accepted' && !!matchId,
  });
}
