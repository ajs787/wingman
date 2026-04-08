import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Swipe from '@/lib/models/Swipe';
import Delegation from '@/lib/models/Delegation';
import Match from '@/lib/models/Match';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { refreshLikeQuotaIfNeeded, getNextResetAt } from '@/lib/like-limits';
import { isBlockedBetween } from '@/lib/safety/blocking';

const swipeSchema = z.object({
  owner_user_id:  z.string().min(1),
  target_user_id: z.string().min(1),
  direction:      z.enum(['left', 'right']),
  friend_note:    z.string().max(200).optional(),
});

export async function POST(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = swipeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { owner_user_id, target_user_id, direction, friend_note } = parsed.data;

  if (owner_user_id === session.sub) {
    return NextResponse.json({ error: 'You cannot swipe for yourself.' }, { status: 400 });
  }
  if (target_user_id === owner_user_id) {
    return NextResponse.json({ error: 'Owner cannot swipe on themselves.' }, { status: 400 });
  }
  if (target_user_id === session.sub) {
    return NextResponse.json({ error: 'You cannot swipe on yourself as a candidate.' }, { status: 400 });
  }

  await connectDB();

  const delegation = await Delegation.findOne({
    owner_user_id,
    delegate_user_id: session.sub,
    status: 'active',
  });

  if (!delegation) {
    return NextResponse.json({ error: 'No active delegation. Cannot swipe.' }, { status: 403 });
  }

  const [ownerBlocked, delegateBlocked] = await Promise.all([
    isBlockedBetween(owner_user_id, target_user_id),
    isBlockedBetween(session.sub, target_user_id),
  ]);

  if (ownerBlocked || delegateBlocked) {
    return NextResponse.json({ error: 'This profile is unavailable.' }, { status: 403 });
  }

  let reservedLike = false;
  let likesRemainingAfterReserve = null;
  let likeResetAt = null;

  if (direction === 'right') {
    const quotaState = await refreshLikeQuotaIfNeeded(User, owner_user_id);
    if (!quotaState) {
      return NextResponse.json({ error: 'Owner not found.' }, { status: 404 });
    }

    likeResetAt = quotaState.resetAt;

    if (!quotaState.unlimited) {
      const reserved = await User.findOneAndUpdate(
        { _id: owner_user_id, likes_remaining: { $gt: 0 } },
        { $inc: { likes_remaining: -1 } },
        { new: true }
      ).select('likes_remaining last_like_reset').lean();

      if (!reserved) {
        const ownerState = await User.findById(owner_user_id).select('likes_remaining last_like_reset').lean();
        return NextResponse.json(
          {
            error: 'Daily like limit reached. Try again after reset.',
            code: 'LIKE_LIMIT_REACHED',
            likesRemaining: ownerState?.likes_remaining ?? 0,
            resetAt: ownerState?.last_like_reset ? getNextResetAt(ownerState.last_like_reset).toISOString() : null,
          },
          { status: 429 }
        );
      }

      reservedLike = true;
      likesRemainingAfterReserve = reserved.likes_remaining;
      likeResetAt = reserved.last_like_reset ? getNextResetAt(reserved.last_like_reset).toISOString() : null;
    }
  }

  // Insert swipe (unique on owner+target)
  let swipe;
  try {
    swipe = await Swipe.create({
      owner_user_id,
      delegate_user_id: session.sub,
      target_user_id,
      direction,
      friend_note: friend_note || null,
    });
  } catch (err) {
    if (reservedLike) {
      await User.findByIdAndUpdate(owner_user_id, { $inc: { likes_remaining: 1 } });
    }

    if (err.code === 11000) {
      return NextResponse.json({ message: 'Already swiped on this profile.', alreadySwiped: true });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  let matched = false;

  if (direction === 'right') {
    // Check for reciprocal right-swipe
    const reciprocal = await Swipe.findOne({
      owner_user_id: target_user_id,
      target_user_id: owner_user_id,
      direction: 'right',
    });

    if (reciprocal) {
      // Create match — ordered pair by consistent string comparison
      const a = owner_user_id < target_user_id ? owner_user_id : target_user_id;
      const b = owner_user_id < target_user_id ? target_user_id : owner_user_id;
      const isOwnerUserA = owner_user_id === a;

      // Convert to ObjectIds for consistent storage
      const aOid = new mongoose.Types.ObjectId(a);
      const bOid = new mongoose.Types.ObjectId(b);
      const sessionOid = new mongoose.Types.ObjectId(session.sub);

      try {
        await Match.create({
          user_a: aOid,
          user_b: bOid,
          user_a_status: 'pending',
          user_b_status: 'pending',
          ...(isOwnerUserA ? {
            user_a_friend_note: friend_note || null,
            user_a_matched_by: sessionOid,
            user_b_friend_note: reciprocal.friend_note || null,
            user_b_matched_by: reciprocal.delegate_user_id,
          } : {
            user_b_friend_note: friend_note || null,
            user_b_matched_by: sessionOid,
            user_a_friend_note: reciprocal.friend_note || null,
            user_a_matched_by: reciprocal.delegate_user_id,
          }),
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
      }

      matched = true;
    }
  }

  return NextResponse.json({
    swipe: { id: swipe._id.toString(), direction, matched_at: swipe.createdAt },
    matched,
    likeQuota: direction === 'right'
      ? {
          likesRemaining: likesRemainingAfterReserve,
          resetAt: likeResetAt,
        }
      : undefined,
  });
}
