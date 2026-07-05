export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Delegation from '@/lib/models/Delegation';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { computeWingmanStats } from '@/lib/wingman-rank';

function photoUrl(photo, userId) {
  return photo?.filename ? `/uploads/${userId}/${photo.filename}` : null;
}
function displayName(user) {
  return user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Wingman';
}
function mainPhoto(user) {
  const uid = user?._id?.toString();
  const first = (user?.photos ?? []).slice().sort((a, b) => a.position - b.position)[0];
  return uid && first ? photoUrl(first, uid) : null;
}

// GET /api/wingman/rank            -> the caller's own rank card
// GET /api/wingman/rank?ownerId=O  -> leaderboard of O's active wingmen (visible to O
//                                     and to O's wingmen), best score first
export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get('ownerId');

  await connectDB();

  if (!ownerId) {
    const stats = await computeWingmanStats([session.sub]);
    return NextResponse.json({ rank: stats.get(session.sub) });
  }

  if (!mongoose.Types.ObjectId.isValid(ownerId)) {
    return NextResponse.json({ error: 'Invalid ownerId format' }, { status: 400 });
  }

  // Leaderboard is scoped to an owner's crew: only the owner or an active wingman
  // of that owner can see it.
  const delegations = await Delegation.find({
    owner_user_id: ownerId,
    status: 'active',
  }).select('delegate_user_id').lean();
  const wingmanIds = delegations.map((d) => d.delegate_user_id.toString());

  const isOwner = session.sub === ownerId;
  if (!isOwner && !wingmanIds.includes(session.sub)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!wingmanIds.length) return NextResponse.json({ leaderboard: [] });

  const [stats, users] = await Promise.all([
    computeWingmanStats(wingmanIds),
    User.find({ _id: { $in: wingmanIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      .select('name first_name last_name email photos')
      .lean(),
  ]);
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const leaderboard = wingmanIds
    .map((id) => {
      const u = userMap.get(id);
      return {
        wingman: { _id: id, name: displayName(u), photo: mainPhoto(u) },
        ...(stats.get(id) || {}),
        isMe: id === session.sub,
      };
    })
    .sort((a, b) => (b.score - a.score) || (b.acceptRate - a.acceptRate) || (b.sent - a.sent));

  return NextResponse.json({ leaderboard });
}
