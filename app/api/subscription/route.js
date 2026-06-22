export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { buildSubscriptionStatus, PLANS } from '@/lib/subscription';
import { getDailyLikeLimit } from '@/lib/like-limits';

// GET /api/subscription — current plan, benefits, and quota
export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.sub).lean();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    subscription: buildSubscriptionStatus(user),
    plans: { free: PLANS.free, pro: PLANS.pro },
  });
}

const actionSchema = z.object({
  action: z.enum(['activate', 'cancel']),
});

// POST /api/subscription — activate or cancel Wingman Pro.
//
// NOTE: This is a DEMO entitlement toggle. Real billing must be wired to a
// payment provider (Stripe Billing or Apple In-App Purchase for iOS) and this
// endpoint should only flip the tier after a verified purchase/webhook.
export async function POST(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  await connectDB();
  const now = new Date();

  if (parsed.data.action === 'activate') {
    // Unlimited likes for Pro — null signals "no quota" to the like-limit logic.
    const user = await User.findByIdAndUpdate(
      session.sub,
      {
        $set: {
          subscription_tier: 'premium',
          pro_since: now,
          likes_remaining: null,
          last_like_reset: now,
        },
      },
      { new: true }
    ).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      demo: true,
      subscription: buildSubscriptionStatus(user),
    });
  }

  // Cancel — return to the free tier and restore a fresh daily quota.
  const current = await User.findById(session.sub).select('createdAt').lean();
  if (!current) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const freshLimit = getDailyLikeLimit({ subscription_tier: 'free', createdAt: current.createdAt }, now);

  const user = await User.findByIdAndUpdate(
    session.sub,
    {
      $set: {
        subscription_tier: 'free',
        pro_since: null,
        likes_remaining: freshLimit,
        last_like_reset: now,
      },
    },
    { new: true }
  ).lean();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    subscription: buildSubscriptionStatus(user),
  });
}
