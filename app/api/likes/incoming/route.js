export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Delegation from '@/lib/models/Delegation';
import PotentialMatch from '@/lib/models/PotentialMatch';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

function photoUrl(photo, userId) {
  return photo?.filename ? `/uploads/${userId}/${photo.filename}` : null;
}

function displayName(user) {
  return user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Someone';
}

function mainPhoto(user) {
  const uid = user?._id?.toString();
  const first = (user?.photos ?? []).slice().sort((a, b) => a.position - b.position)[0];
  return uid && first ? photoUrl(first, uid) : null;
}

// The owner (O) is the person being proposed to the target (C) — serialize them as the
// candidate the target's wingmen are reviewing.
function serializeCandidate(user) {
  const uid = user._id.toString();
  const sortedPhotos = (user.photos ?? []).slice().sort((a, b) => a.position - b.position);
  return {
    _id: uid,
    name: user.name,
    first_name: user.first_name,
    last_name: user.last_name,
    age: user.show_age !== false ? user.age : null,
    school: user.show_school !== false ? user.school : null,
    year: user.year,
    major: user.major,
    majors: user.majors ?? [],
    photos: sortedPhotos.map((p) => ({ position: p.position, url: photoUrl(p, uid), prompt: p.prompt, prompt_answer: p.prompt_answer })),
    prompts: sortedPhotos.filter((p) => p.prompt).map((p) => ({ prompt: p.prompt, prompt_answer: p.prompt_answer })),
  };
}

function briefUser(user) {
  return user ? { _id: user._id.toString(), name: displayName(user), photo: mainPhoto(user) } : null;
}

// GET /api/likes/incoming?ownerId=<targetUserId>
// Likes SENT to this user, for their wingmen (or the user) to review and accept/reject.
// `ownerId` is the account whose incoming likes we want — i.e. the potential match target.
export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('ownerId');
  if (!targetId) return NextResponse.json({ error: 'ownerId required' }, { status: 400 });
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return NextResponse.json({ error: 'Invalid ownerId format' }, { status: 400 });
  }

  await connectDB();

  // Only the target themselves or one of their active wingmen may view incoming likes.
  if (session.sub !== targetId) {
    const delegation = await Delegation.findOne({
      owner_user_id: targetId,
      delegate_user_id: session.sub,
      status: 'active',
    }).lean();
    if (!delegation) {
      return NextResponse.json({ error: 'No active delegation for this profile.' }, { status: 403 });
    }
  }

  const rows = await PotentialMatch.find({
    target_user_id: targetId,
    status: { $in: ['pending', 'accepted'] },
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!rows.length) return NextResponse.json({ incoming: [] });

  // Gather every user we need to hydrate: the owners (candidates) plus every wingman.
  const ownerIds = rows.map((r) => r.owner_user_id.toString());
  const wingmanIds = rows.flatMap((r) => [
    ...r.senders.map((s) => s.wingman_user_id?.toString()),
    ...r.decisions.map((d) => d.wingman_user_id?.toString()),
    r.accepted_by?.toString(),
  ]).filter(Boolean);

  const allIds = [...new Set([...ownerIds, ...wingmanIds])]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const users = await User.find({ _id: { $in: allIds } })
    .select('name first_name last_name email age school year major majors show_age show_school photos hidden')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const incoming = rows
    .filter((r) => {
      const owner = userMap.get(r.owner_user_id.toString());
      return owner && owner.name && !owner.hidden;
    })
    .map((r) => {
      const owner = userMap.get(r.owner_user_id.toString());
      return {
        _id: r._id.toString(),
        status: r.status,
        candidate: serializeCandidate(owner),
        senders: r.senders.map((s) => ({
          wingman: briefUser(userMap.get(s.wingman_user_id?.toString())),
          comment: s.comment || null,
          comment_type: s.comment_type || 'none',
          comment_ref: s.comment_ref || null,
          at: s.createdAt,
        })),
        decisions: r.decisions.map((d) => ({
          wingman: briefUser(userMap.get(d.wingman_user_id?.toString())),
          decision: d.decision,
          at: d.decidedAt,
        })),
        acceptedBy: r.accepted_by ? briefUser(userMap.get(r.accepted_by.toString())) : null,
        matchId: r.match_id ? r.match_id.toString() : null,
        // What this viewer (if a wingman) already decided, for UI state.
        myDecision: r.decisions.find((d) => d.wingman_user_id?.toString() === session.sub)?.decision || null,
        updatedAt: r.updatedAt,
      };
    });

  return NextResponse.json({ incoming });
}
