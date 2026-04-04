import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Match from '@/lib/models/Match';
import Delegation from '@/lib/models/Delegation';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

function photoUrl(photo, userId) {
  return photo.filename ? `/uploads/${userId}/${photo.filename}` : null;
}

function serializeUser(u) {
  const uid = u._id.toString();
  return {
    _id: uid,
    name: u.name,
    first_name: u.first_name,
    last_name: u.last_name,
    age: u.age,
    school: u.school,
    year: u.year,
    major: u.major,
    majors: u.majors,
    personality_answer: u.personality_answer,
    photos: (u.photos ?? [])
      .sort((a, b) => a.position - b.position)
      .map((ph) => ({
        position: ph.position,
        url: photoUrl(ph, uid),
        prompt: ph.prompt,
        prompt_answer: ph.prompt_answer,
      })),
    prompts: (u.photos ?? [])
      .filter((ph) => ph.prompt)
      .sort((a, b) => a.position - b.position)
      .map((ph) => ({ prompt: ph.prompt, prompt_answer: ph.prompt_answer })),
  };
}

// GET /api/matches?ownerId=<mongoId>
export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get('ownerId');
  if (!ownerId) return NextResponse.json({ error: 'ownerId required' }, { status: 400 });

  // Validate ownerId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(ownerId)) {
    return NextResponse.json({ error: 'Invalid ownerId format' }, { status: 400 });
  }

  await connectDB();

  // Permission check: must be owner or active delegate
  const isOwner = session.sub === ownerId;
  let hasPermission = isOwner;

  if (!hasPermission) {
    const delegation = await Delegation.findOne({
      owner_user_id: ownerId,
      delegate_user_id: session.sub,
      status: 'active',
    });
    hasPermission = !!delegation;
  }

  if (!hasPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ownerOid = new mongoose.Types.ObjectId(ownerId);

  const matchRows = await Match.find({
    $or: [{ user_a: ownerOid }, { user_b: ownerOid }],
  }).sort({ createdAt: -1 }).lean();

  if (matchRows.length === 0) return NextResponse.json({ matches: [] });

  const otherIds = matchRows.map((m) =>
    m.user_a.toString() === ownerId ? m.user_b : m.user_a
  );

  const profiles = await User.find({ _id: { $in: otherIds } })
    .select('name first_name last_name age school year major majors personality_answer photos')
    .lean();

  const profileMap = {};
  profiles.forEach((p) => { profileMap[p._id.toString()] = serializeUser(p); });

  // Get delegate profiles for matchedBy
  const delegateIds = matchRows.flatMap((m) => [
    m.user_a_matched_by?.toString(),
    m.user_b_matched_by?.toString(),
  ]).filter(Boolean);
  const uniqueDelegateIds = [...new Set(delegateIds)];

  const delegates = uniqueDelegateIds.length
    ? await User.find({ _id: { $in: uniqueDelegateIds } }).select('name photos').lean()
    : [];
  const delegateMap = {};
  delegates.forEach((d) => {
    const uid = d._id.toString();
    const mainPhoto = d.photos?.sort((a, b) => a.position - b.position)?.[0];
    delegateMap[uid] = {
      name: d.name,
      photo: mainPhoto ? photoUrl(mainPhoto, uid) : null,
    };
  });

  const matches = matchRows.map((m) => {
    const isUserA = m.user_a.toString() === ownerId;
    const otherId = isUserA ? m.user_b.toString() : m.user_a.toString();

    // Get status and friend note for this user
    const myStatus = isUserA ? m.user_a_status : m.user_b_status;
    const otherStatus = isUserA ? m.user_b_status : m.user_a_status;
    const friendNote = isUserA ? m.user_a_friend_note : m.user_b_friend_note;
    const matchedById = isUserA ? m.user_a_matched_by?.toString() : m.user_b_matched_by?.toString();

    return {
      _id: m._id.toString(),
      matchedAt: m.createdAt,
      profile: profileMap[otherId] ?? { _id: otherId },
      friendNote: friendNote || null,
      myStatus: myStatus || 'pending',
      otherStatus: otherStatus || 'pending',
      canChat: myStatus === 'accepted' && otherStatus === 'accepted',
      matchedBy: matchedById ? delegateMap[matchedById] ?? null : null,
    };
  });

  return NextResponse.json({ matches });
}
