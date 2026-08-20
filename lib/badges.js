// Matchmaker badges — the collectible layer of the progression system.
//
// Every badge is DERIVED from the live-computed wingman stats (see
// lib/wingman-rank.js), never stored, so there are no counters to drift out of
// sync. Badges we can't yet detect from the data we have are shipped as
// `comingSoon: true` — the UI can still render the full collectible set so the
// player sees what's left to earn, but they can never be awarded until the
// feature they depend on exists.

// The catalog. `check(stats)` returns true when the badge is earned; coming-soon
// badges have no check and are never awarded.
export const BADGES = [
  {
    id: 'first_spark',
    name: 'First Spark',
    emoji: '✨',
    desc: 'Your first couple, sparked.',
    how: 'Get one of your vouches accepted.',
    check: (s) => (s.couplesSparked ?? 0) >= 1,
  },
  {
    id: 'serial_cupid',
    name: 'Serial Cupid',
    emoji: '💘',
    desc: 'Five couples talking because of you.',
    how: 'Spark 5 couples.',
    check: (s) => (s.couplesSparked ?? 0) >= 5,
  },
  {
    id: 'the_oracle',
    name: 'The Oracle',
    emoji: '🔮',
    desc: 'You just get people — a hit rate to prove it.',
    how: 'Keep a 60%+ hit rate across 5 or more decided intros.',
    check: (s) => ((s.accepted ?? 0) + (s.rejected ?? 0)) >= 5 && (s.acceptRate ?? 0) >= 0.6,
  },
  {
    id: 'hat_trick',
    name: 'Hat Trick',
    emoji: '🎩',
    desc: 'Three intros landed in a single week.',
    how: 'Land 3 intros within any 7-day window.',
    check: (s) => (s.bestWeekCount ?? 0) >= 3,
  },
  // --- Coming soon: need features/data that don't exist yet. Never awarded. ---
  {
    id: 'cupids_arrow',
    name: "Cupid's Arrow",
    emoji: '🏹',
    desc: 'A vouch that became a real date.',
    how: 'Coming soon — once dates can be confirmed in-app.',
    comingSoon: true,
  },
  {
    id: 'ghost_whisperer',
    name: 'Ghost Whisperer',
    emoji: '👻',
    desc: "You vouched someone who wasn't even on Wingman — they joined and matched.",
    how: 'Coming soon — needs vouch-a-non-user invite attribution.',
    comingSoon: true,
  },
  {
    id: 'perfect_set',
    name: 'Perfect Set',
    emoji: '🎯',
    desc: 'Both people thanked you for the intro.',
    how: 'Coming soon — needs post-match thanks.',
    comingSoon: true,
  },
];

// Public-facing catalog entry (no `check` function leaked to the client).
function present(b, earned) {
  const { check, ...rest } = b;
  return { ...rest, comingSoon: !!b.comingSoon, earned };
}

// Ids of the badges a stats object has earned.
export function earnedBadgeIds(stats = {}) {
  return BADGES.filter((b) => !b.comingSoon && typeof b.check === 'function' && b.check(stats)).map(
    (b) => b.id
  );
}

// The full catalog decorated with earned/locked state for a given stats object.
// Order: earned first (most recently reachable milestones stay visible), then
// still-locked, then coming-soon — but keep catalog order stable within groups.
export function badgesForStats(stats = {}) {
  const earned = new Set(earnedBadgeIds(stats));
  const decorated = BADGES.map((b) => present(b, earned.has(b.id)));
  const rank = (b) => (b.earned ? 0 : b.comingSoon ? 2 : 1);
  return decorated
    .map((b, i) => ({ b, i }))
    .sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i)
    .map((x) => x.b);
}
