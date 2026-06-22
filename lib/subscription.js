import { getDailyLikeLimit } from '@/lib/like-limits';
import { BASIC_MAX_ACTIVE_DELEGATIONS } from '@/lib/constants';

// Internal subscription tiers stored on the user. `premium` and `plus` both
// unlock the user-facing "Wingman Pro" experience.
export const PRO_TIERS = ['premium', 'plus'];

export function isProTier(tier) {
  return PRO_TIERS.includes(String(tier || '').toLowerCase());
}

export const PRO_MAX_ACTIVE_DELEGATIONS = 25;

export function maxActiveDelegations(tier) {
  return isProTier(tier) ? PRO_MAX_ACTIVE_DELEGATIONS : BASIC_MAX_ACTIVE_DELEGATIONS;
}

// User-facing plans shown on the upgrade screen.
export const PLANS = {
  free: {
    id: 'free',
    name: 'Wingman Basic',
    priceLabel: 'Free',
    tagline: 'Set your friends loose.',
    benefits: [
      `Swipe for up to ${BASIC_MAX_ACTIVE_DELEGATIONS} friends`,
      '10 likes per day for each friend',
      'Mutual match approval',
      'Unlimited chat with your matches',
    ],
  },
  pro: {
    id: 'premium',
    name: 'Wingman Pro',
    priceLabel: '$9.99/mo',
    tagline: 'Give your whole crew superpowers.',
    benefits: [
      'Unlimited likes for every friend',
      'See everyone who already liked your friend',
      `Swipe for up to ${PRO_MAX_ACTIVE_DELEGATIONS} friends`,
      'Full compatibility breakdown on each profile',
      'Weekly Spotlight boost for your friends',
      'Priority matchmaking in the deck',
    ],
  },
};

// Build the status object returned by the API and consumed across the app.
export function buildSubscriptionStatus(user) {
  const tier = String(user?.subscription_tier || 'free').toLowerCase();
  const pro = isProTier(tier);
  const dailyLimit = getDailyLikeLimit(user);

  return {
    tier,
    isPro: pro,
    planId: pro ? PLANS.pro.id : PLANS.free.id,
    planName: pro ? PLANS.pro.name : PLANS.free.name,
    benefits: pro ? PLANS.pro.benefits : PLANS.free.benefits,
    maxActiveDelegations: maxActiveDelegations(tier),
    dailyLikeLimit: dailyLimit, // null === unlimited
    proSince: user?.pro_since ?? null,
  };
}
