export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Match from '@/lib/models/Match';
import Delegation from '@/lib/models/Delegation';
import Swipe from '@/lib/models/Swipe';
import PotentialMatch from '@/lib/models/PotentialMatch';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { getBlockedUserIds } from '@/lib/safety/blocking';

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
    hidden_prompt: u.hidden_prompt,
    hidden_prompt_answer: u.hidden_prompt_answer,
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
  const session = await getSession(request);
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
  const blocked = await getBlockedUserIds(ownerId);
  const blockedObjectIds = blocked.allBlockedIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const matchRows = await Match.find({
    status: { $ne: 'blocked' },
    $or: [{ user_a: ownerOid }, { user_b: ownerOid }],
    ...(blockedObjectIds.length
      ? {
          user_a: { $nin: blockedObjectIds },
          user_b: { $nin: blockedObjectIds },
        }
      : {}),
  }).sort({ createdAt: -1 }).lean();

  if (matchRows.length === 0) return NextResponse.json({ matches: [] });

  const otherIds = matchRows.map((m) =>
    m.user_a.toString() === ownerId ? m.user_b : m.user_a
  );

  const profiles = await User.find({ _id: { $in: otherIds } })
    .select('name first_name last_name age school year major majors personality_answer hidden_prompt hidden_prompt_answer photos')
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

  const rightSwipes = await Swipe.find({
    owner_user_id: ownerId,
    target_user_id: { $in: otherIds },
    direction: 'right',
  })
    .populate('delegate_user_id', 'name first_name last_name email photos')
    .sort({ createdAt: -1 })
    .lean();

  const swipersByTarget = {};
  rightSwipes.forEach((swipe) => {
    const targetId = swipe.target_user_id.toString();
    const delegate = swipe.delegate_user_id;
    const delegateId = delegate?._id?.toString();
    const mainPhoto = delegate?.photos?.sort((a, b) => a.position - b.position)?.[0];
    if (!swipersByTarget[targetId]) swipersByTarget[targetId] = [];
    swipersByTarget[targetId].push({
      _id: delegateId,
      name: delegate?.name || [delegate?.first_name, delegate?.last_name].filter(Boolean).join(' ') || delegate?.email || 'Friend',
      photo: delegateId && mainPhoto ? photoUrl(mainPhoto, delegateId) : null,
      friend_note: swipe.friend_note || null,
      likedAt: swipe.createdAt,
    });
  });

  // Per-wingman involvement: for each matched pair, who on THIS user's side sent the
  // like, and who accepted/rejected it. Receiver direction (owner=other, target=me)
  // holds my wingmen's accept/reject decisions; sender direction (owner=me) holds the
  // wingmen who sent the like.
  const otherOids = otherIds
    .map((id) => id.toString())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const potentialMatches = await PotentialMatch.find({
    $or: [
      { owner_user_id: ownerOid, target_user_id: { $in: otherOids } },
      { owner_user_id: { $in: otherOids }, target_user_id: ownerOid },
    ],
  }).lean();

  // Hydrate every wingman referenced by those potential matches.
  const pmWingmanIds = potentialMatches.flatMap((pm) => [
    ...pm.senders.map((s) => s.wingman_user_id?.toString()),
    ...pm.decisions.map((d) => d.wingman_user_id?.toString()),
    pm.accepted_by?.toString(),
  ]).filter(Boolean);
  const uniquePmWingmanIds = [...new Set(pmWingmanIds)].filter((id) => !delegateMap[id]);
  if (uniquePmWingmanIds.length) {
    const extra = await User.find({ _id: { $in: uniquePmWingmanIds } }).select('name photos').lean();
    extra.forEach((d) => {
      const uid = d._id.toString();
      const mainPhotoDoc = d.photos?.slice().sort((a, b) => a.position - b.position)?.[0];
      delegateMap[uid] = { name: d.name, photo: mainPhotoDoc ? photoUrl(mainPhotoDoc, uid) : null };
    });
  }
  const brief = (id) => (id && delegateMap[id] ? { _id: id, ...delegateMap[id] } : (id ? { _id: id } : null));

  // Index potential matches by the other user, split by direction relative to me.
  const wingmenByOther = {};
  potentialMatches.forEach((pm) => {
    const owner = pm.owner_user_id.toString();
    const target = pm.target_user_id.toString();
    const other = owner === ownerId ? target : owner;
    const entry = wingmenByOther[other] || { sent: [], decisions: [], matchedBy: null };
    if (target === ownerId) {
      // I'm the receiver: my wingmen decided on this incoming like.
      entry.decisions = pm.decisions.map((d) => ({ wingman: brief(d.wingman_user_id?.toString()), decision: d.decision, at: d.decidedAt }));
      if (pm.accepted_by) entry.matchedBy = brief(pm.accepted_by.toString());
    } else {
      // I'm the sender: my wingmen sent this like.
      entry.sent = pm.senders.map((s) => ({ wingman: brief(s.wingman_user_id?.toString()), comment: s.comment || null, comment_type: s.comment_type || 'none', comment_ref: s.comment_ref || null, at: s.createdAt }));
      if (!entry.matchedBy && pm.senders.length) entry.matchedBy = brief(pm.senders[pm.senders.length - 1].wingman_user_id?.toString());
    }
    wingmenByOther[other] = entry;
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
      matchedByList: swipersByTarget[otherId] || [],
      // Which of MY wingmen sent the like / accepted / rejected, and who made the match.
      wingmen: wingmenByOther[otherId] || { sent: [], decisions: [], matchedBy: null },
    };
  });

  return NextResponse.json({ matches });
}
