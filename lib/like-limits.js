export const LIKE_LIMITS_BY_TIER = {
  free: 10,
  premium: null,
  plus: null,
};

const NEW_USER_BOOST_DAYS = 7;
const NEW_USER_BOOST_LIKES = 5;

export function getDailyLikeLimit(user, now = new Date()) {
  const tier = (user?.subscription_tier || 'free').toLowerCase();
  // A tier intentionally mapped to `null` means unlimited — only fall back to
  // the free limit when the tier is genuinely absent from the table. Using `??`
  // here would wrongly turn the unlimited tiers (premium/plus) into 10/day.
  const tierLimit = Object.prototype.hasOwnProperty.call(LIKE_LIMITS_BY_TIER, tier)
    ? LIKE_LIMITS_BY_TIER[tier]
    : LIKE_LIMITS_BY_TIER.free;

  if (tierLimit === null) return null;

  let dailyLimit = tierLimit;

  if (typeof user?.daily_like_limit_override === 'number' && user.daily_like_limit_override >= 0) {
    dailyLimit = user.daily_like_limit_override;
  }

  if (user?.createdAt) {
    const ageMs = now.getTime() - new Date(user.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays <= NEW_USER_BOOST_DAYS) {
      dailyLimit += NEW_USER_BOOST_LIKES;
    }
  }

  if (user?.like_boost_until) {
    const boostUntil = new Date(user.like_boost_until);
    if (!Number.isNaN(boostUntil.getTime()) && boostUntil > now) {
      dailyLimit += NEW_USER_BOOST_LIKES;
    }
  }

  return dailyLimit;
}

export function getNextResetAt(lastResetAt, now = new Date()) {
  const resetBase = lastResetAt ? new Date(lastResetAt) : now;
  return new Date(resetBase.getTime() + 24 * 60 * 60 * 1000);
}

export async function refreshLikeQuotaIfNeeded(UserModel, userId) {
  const now = new Date();
  const user = await UserModel.findById(userId).select('subscription_tier daily_like_limit_override like_boost_until likes_remaining last_like_reset createdAt').lean();
  if (!user) return null;

  const dailyLimit = getDailyLikeLimit(user, now);

  if (dailyLimit === null) {
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        likes_remaining: null,
        last_like_reset: now,
      },
    });
    return {
      unlimited: true,
      likesRemaining: null,
      dailyLimit: null,
      resetAt: null,
    };
  }

  const lastReset = user.last_like_reset ? new Date(user.last_like_reset) : null;
  const hoursSinceReset = lastReset ? (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60) : Infinity;
  const needsReset = !lastReset || hoursSinceReset >= 24 || typeof user.likes_remaining !== 'number';

  if (needsReset) {
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        likes_remaining: dailyLimit,
        last_like_reset: now,
      },
    });
    return {
      unlimited: false,
      likesRemaining: dailyLimit,
      dailyLimit,
      resetAt: getNextResetAt(now, now),
    };
  }

  return {
    unlimited: false,
    likesRemaining: user.likes_remaining,
    dailyLimit,
    resetAt: getNextResetAt(lastReset, now),
  };
}
