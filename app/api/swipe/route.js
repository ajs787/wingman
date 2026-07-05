export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Swipe from '@/lib/models/Swipe';
import Delegation from '@/lib/models/Delegation';
import PotentialMatch from '@/lib/models/PotentialMatch';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { refreshLikeQuotaIfNeeded, getNextResetAt } from '@/lib/like-limits';
import { isBlockedBetween } from '@/lib/safety/blocking';

const swipeSchema = z.object({
  owner_user_id:  z.string().min(1),
  target_user_id: z.string().min(1),
  direction:      z.enum(['left', 'right']),
  // A like can carry a note: plain, a reply to one of the target's prompts, or a
  // reply to one of the target's photos. Up to 300 characters.
  friend_note:    z.string().max(300).optional(),
  comment_type:   z.enum(['none', 'prompt', 'photo']).optional(),
  comment_ref:    z.string().max(300).optional(),
});

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = swipeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { owner_user_id, target_user_id, direction, friend_note, comment_type, comment_ref } = parsed.data;

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
    const existingOwnerRight = await Swipe.findOne({
      owner_user_id,
      target_user_id,
      direction: 'right',
    }).select('_id').lean();

    if (existingOwnerRight) {
      likesRemainingAfterReserve = null;
      likeResetAt = null;
    } else {
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
  }

  // Insert swipe. Each wingman gets an independent vote for the same owner+target pair.
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

  // A right-swipe is a like: send it to the target's side as a PotentialMatch that
  // their wingmen will review. Match creation is deferred to the receiver's accept
  // (see app/api/likes/decision). Left-swipes are recorded only for feed exclusion.
  let potentialMatchId = null;

  if (direction === 'right') {
    const sender = {
      wingman_user_id: new mongoose.Types.ObjectId(session.sub),
      comment: friend_note || null,
      comment_type: comment_type || 'none',
      comment_ref: comment_ref || null,
      createdAt: new Date(),
    };

    // Upsert the directed (owner -> target) potential match and add this wingman as a
    // sender. Pull any prior sender entry from the same wingman first so re-likes
    // update rather than duplicate. A previously-rejected like reopens as pending.
    await PotentialMatch.updateOne(
      { owner_user_id, target_user_id },
      { $pull: { senders: { wingman_user_id: sender.wingman_user_id } } }
    );
    const pm = await PotentialMatch.findOneAndUpdate(
      { owner_user_id, target_user_id },
      {
        $push: { senders: sender },
        $setOnInsert: { owner_user_id, target_user_id },
      },
      { new: true, upsert: true }
    );
    // Re-open a dead like when a new wingman vouches for it.
    if (pm.status === 'rejected') {
      pm.status = 'pending';
      await pm.save();
    }
    potentialMatchId = pm._id.toString();
  }

  return NextResponse.json({
    swipe: { id: swipe._id.toString(), direction, matched_at: swipe.createdAt },
    // A like no longer matches instantly; it is sent to the receiver's wingmen.
    matched: false,
    sent: direction === 'right',
    potentialMatchId,
    likeQuota: direction === 'right'
      ? {
          likesRemaining: likesRemainingAfterReserve,
          resetAt: likeResetAt,
        }
      : undefined,
  });
}
