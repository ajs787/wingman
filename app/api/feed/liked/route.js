export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Delegation from '@/lib/models/Delegation';
import Swipe from '@/lib/models/Swipe';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

function photoUrl(photo, userId) {
  return photo?.filename ? `/uploads/${userId}/${photo.filename}` : null;
}

function displayName(user) {
  return user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Friend';
}

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
    gender: user.gender,
    sexuality: user.sexuality,
    looking_for: user.looking_for,
    height: user.height,
    location: user.location,
    job: user.job,
    religion: user.religion,
    photos: sortedPhotos.map((photo) => photoUrl(photo, uid)).filter(Boolean),
    prompts: sortedPhotos
      .filter((photo) => photo.prompt)
      .map((photo) => ({ prompt: photo.prompt, prompt_answer: photo.prompt_answer })),
  };
}

function serializeSwiper(swipe) {
  const delegate = swipe.delegate_user_id;
  const delegateId = delegate?._id?.toString();
  const sortedPhotos = (delegate?.photos ?? []).slice().sort((a, b) => a.position - b.position);

  return {
    _id: delegateId,
    name: displayName(delegate),
    photo: delegateId && sortedPhotos[0] ? photoUrl(sortedPhotos[0], delegateId) : null,
    friend_note: swipe.friend_note || null,
    likedAt: swipe.createdAt,
  };
}

// GET /api/feed/liked?ownerId=<mongoId>
export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get('ownerId');
  if (!ownerId) return NextResponse.json({ error: 'ownerId required' }, { status: 400 });
  if (!mongoose.Types.ObjectId.isValid(ownerId)) {
    return NextResponse.json({ error: 'Invalid ownerId format' }, { status: 400 });
  }

  await connectDB();

  const delegation = await Delegation.findOne({
    owner_user_id: ownerId,
    delegate_user_id: session.sub,
    status: 'active',
  }).lean();

  if (!delegation) {
    return NextResponse.json({ error: 'No active delegation found. Ask the owner to share their code.' }, { status: 403 });
  }

  const likedSwipes = await Swipe.find({
    owner_user_id: ownerId,
    direction: 'right',
  })
    .populate('delegate_user_id', 'name first_name last_name email photos')
    .sort({ createdAt: -1 })
    .lean();

  if (!likedSwipes.length) {
    return NextResponse.json({ liked: [] });
  }

  const targetIds = [...new Set(likedSwipes.map((swipe) => swipe.target_user_id.toString()))];
  const targetObjectIds = targetIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const targets = await User.find({
    _id: { $in: targetObjectIds },
    name: { $ne: null, $exists: true },
    hidden: { $ne: true },
  }).lean();

  const targetMap = new Map(targets.map((target) => [target._id.toString(), target]));
  const grouped = new Map();

  for (const swipe of likedSwipes) {
    const targetId = swipe.target_user_id.toString();
    if (!targetMap.has(targetId)) continue;

    const existing = grouped.get(targetId) || {
      targetId,
      candidate: serializeCandidate(targetMap.get(targetId)),
      swipers: [],
      lastLikedAt: swipe.createdAt,
    };

    existing.swipers.push(serializeSwiper(swipe));
    if (new Date(swipe.createdAt) > new Date(existing.lastLikedAt)) {
      existing.lastLikedAt = swipe.createdAt;
    }
    grouped.set(targetId, existing);
  }

  const liked = [...grouped.values()]
    .sort((a, b) => new Date(b.lastLikedAt) - new Date(a.lastLikedAt))
    .map((row) => ({
      ...row,
      likedCount: row.swipers.length,
    }));

  return NextResponse.json({ liked });
}
