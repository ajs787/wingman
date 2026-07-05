export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Delegation from '@/lib/models/Delegation';
import PotentialMatch from '@/lib/models/PotentialMatch';
import WingmanMessage from '@/lib/models/WingmanMessage';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

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

// Which side of the potential match is this user a wingman for? Returns 'owner',
// 'target', or null if they have no standing to see the thread.
async function resolveSide(pm, userId) {
  const ownerId = pm.owner_user_id.toString();
  const targetId = pm.target_user_id.toString();
  if (userId === ownerId) return 'owner';
  if (userId === targetId) return 'target';
  const delegations = await Delegation.find({
    delegate_user_id: userId,
    owner_user_id: { $in: [pm.owner_user_id, pm.target_user_id] },
    status: 'active',
  }).select('owner_user_id').lean();
  const owns = new Set(delegations.map((d) => d.owner_user_id.toString()));
  if (owns.has(ownerId)) return 'owner';
  if (owns.has(targetId)) return 'target';
  return null;
}

async function loadPm(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return PotentialMatch.findById(id);
}

// GET /api/likes/:id/thread — messages between the two sides' wingmen, oldest first.
export async function GET(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const pm = await loadPm(params.id);
  if (!pm) return NextResponse.json({ error: 'Potential match not found' }, { status: 404 });

  const side = await resolveSide(pm, session.sub);
  if (!side) return NextResponse.json({ error: 'Not a wingman for this match.' }, { status: 403 });

  const rows = await WingmanMessage.find({ potential_match_id: pm._id })
    .sort({ createdAt: 1 })
    .lean();

  const senderIds = [...new Set(rows.map((r) => r.sender_user_id.toString()))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const users = senderIds.length
    ? await User.find({ _id: { $in: senderIds } }).select('name first_name last_name email photos').lean()
    : [];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const messages = rows.map((r) => {
    const u = userMap.get(r.sender_user_id.toString());
    return {
      _id: r._id.toString(),
      body: r.body,
      side: r.side,
      mine: r.sender_user_id.toString() === session.sub,
      sender: { _id: r.sender_user_id.toString(), name: displayName(u), photo: mainPhoto(u) },
      at: r.createdAt,
    };
  });

  return NextResponse.json({ mySide: side, messages });
}

const postSchema = z.object({ body: z.string().trim().min(1).max(500) });

// POST /api/likes/:id/thread — post a message to the thread.
export async function POST(request, { params }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  await connectDB();
  const pm = await loadPm(params.id);
  if (!pm) return NextResponse.json({ error: 'Potential match not found' }, { status: 404 });

  const side = await resolveSide(pm, session.sub);
  if (!side) return NextResponse.json({ error: 'Not a wingman for this match.' }, { status: 403 });

  const msg = await WingmanMessage.create({
    potential_match_id: pm._id,
    sender_user_id: new mongoose.Types.ObjectId(session.sub),
    side,
    body: parsed.data.body,
  });

  return NextResponse.json({
    ok: true,
    message: { _id: msg._id.toString(), body: msg.body, side, mine: true, at: msg.createdAt },
  });
}
