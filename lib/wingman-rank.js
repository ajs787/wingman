import mongoose from 'mongoose';
import PotentialMatch from '@/lib/models/PotentialMatch';
import Match from '@/lib/models/Match';
import { badgesForStats } from '@/lib/badges';

// Wingman rank / Matchmaker Card: swipers whose sent likes get accepted (and turn
// into real matches) score higher; swipers whose likes get rejected score lower.
// Computed live from PotentialMatch outcomes so there are no counters to drift out
// of sync.
//
// Scoring:
//   +10  a like you sent was accepted by the other side's wingmen
//   +15  bonus when that match was confirmed by BOTH actual users
//   -4   a like you sent was rejected by every wingman on the other side
//   +5   assist: you were the accepting wingman and the match was confirmed
// Pending likes don't count either way. Score floors at 0.
export const RANK_POINTS = { accepted: 10, confirmed: 15, rejected: -4, assist: 5 };

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// The progression ladder (matches the gamification design). `level` is the rung
// (1–5), `min` is the Cupid Score at which the tier unlocks. Highest first.
export const RANK_TIERS = [
  { level: 5, min: 275, tier: 'Campus Legend' },
  { level: 4, min: 150, tier: 'Cupid' },
  { level: 3, min: 75,  tier: 'Matchmaker' },
  { level: 2, min: 25,  tier: 'Wingman' },
  { level: 1, min: 0,   tier: 'Rookie' },
];

export function tierForScore(score) {
  return RANK_TIERS.find((t) => score >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1];
}

// Current tier + how far to the next one — the "2 more to level up" progress bar.
export function tierProgress(score) {
  const current = tierForScore(score);
  const next = RANK_TIERS.filter((t) => t.min > current.min).sort((a, b) => a.min - b.min)[0] || null;
  if (!next) {
    return { tier: current.tier, tierLevel: current.level, nextTier: null, pointsToNext: 0, progress: 1 };
  }
  const span = next.min - current.min;
  const into = score - current.min;
  return {
    tier: current.tier,
    tierLevel: current.level,
    nextTier: next.tier,
    pointsToNext: Math.max(0, next.min - score),
    progress: span > 0 ? Number(Math.min(1, Math.max(0, into / span)).toFixed(3)) : 0,
  };
}

// Most intros landed within any rolling 7-day window — powers momentum copy and
// the Hat Trick badge. `times` is a list of Date-ish accept timestamps.
export function bestRollingWeek(times) {
  const t = (times ?? [])
    .map((d) => new Date(d).getTime())
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  let best = 0;
  let start = 0;
  for (let end = 0; end < t.length; end++) {
    while (t[end] - t[start] > WEEK_MS) start++;
    best = Math.max(best, end - start + 1);
  }
  return best;
}

function emptyStats() {
  // `acceptTimes` is internal scratch (stripped before returning).
  return { sent: 0, accepted: 0, rejected: 0, pending: 0, confirmedMatches: 0, assists: 0, acceptTimes: [] };
}

// When did this potential match become accepted? Earliest 'accept' decision wins;
// fall back to the doc's updatedAt. Null if it isn't accepted.
function acceptedAtOf(pm) {
  if (pm.status !== 'accepted') return null;
  const accepts = (pm.decisions ?? [])
    .filter((d) => d.decision === 'accept' && d.decidedAt)
    .map((d) => new Date(d.decidedAt).getTime())
    .filter((n) => !Number.isNaN(n));
  if (accepts.length) return new Date(Math.min(...accepts));
  return pm.updatedAt ? new Date(pm.updatedAt) : null;
}

// Compute stats for a set of wingman user ids. Returns Map<idString, card>.
export async function computeWingmanStats(wingmanIds) {
  const idStrings = [...new Set(wingmanIds.map(String))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  const stats = new Map(idStrings.map((id) => [id, emptyStats()]));
  if (!idStrings.length) return stats;

  const oids = idStrings.map((id) => new mongoose.Types.ObjectId(id));

  // Every potential match one of these wingmen touched, as sender or acceptor.
  const pms = await PotentialMatch.find({
    $or: [
      { 'senders.wingman_user_id': { $in: oids } },
      { accepted_by: { $in: oids } },
    ],
  })
    .select('senders decisions status accepted_by match_id updatedAt')
    .lean();

  // Bulk-load the matches so we can tell which ones both users confirmed.
  const matchIds = pms.map((pm) => pm.match_id).filter(Boolean);
  const matches = matchIds.length
    ? await Match.find({ _id: { $in: matchIds } })
        .select('user_a_status user_b_status')
        .lean()
    : [];
  const confirmedMatchIds = new Set(
    matches
      .filter((m) => m.user_a_status === 'accepted' && m.user_b_status === 'accepted')
      .map((m) => m._id.toString())
  );

  for (const pm of pms) {
    const confirmed = pm.match_id && confirmedMatchIds.has(pm.match_id.toString());
    const acceptedAt = acceptedAtOf(pm);

    // Sender credit: every tracked wingman who sent this like shares its outcome.
    for (const sender of pm.senders ?? []) {
      const wid = sender.wingman_user_id?.toString();
      const s = wid && stats.get(wid);
      if (!s) continue;
      s.sent += 1;
      if (pm.status === 'accepted') {
        s.accepted += 1;
        if (confirmed) s.confirmedMatches += 1;
        if (acceptedAt) s.acceptTimes.push(acceptedAt);
      } else if (pm.status === 'rejected') {
        s.rejected += 1;
      } else {
        s.pending += 1;
      }
    }

    // Assist credit: the accepting wingman, when the match went the distance.
    const acceptorId = pm.accepted_by?.toString();
    if (acceptorId && confirmed) {
      const s = stats.get(acceptorId);
      if (s) {
        s.assists += 1;
        if (acceptedAt) s.acceptTimes.push(acceptedAt);
      }
    }
  }

  for (const [id, s] of stats) {
    const { acceptTimes, ...counts } = s;
    const score = Math.max(
      0,
      counts.accepted * RANK_POINTS.accepted +
        counts.confirmedMatches * RANK_POINTS.confirmed +
        counts.rejected * RANK_POINTS.rejected +
        counts.assists * RANK_POINTS.assist
    );
    const decided = counts.accepted + counts.rejected;

    const card = {
      ...counts,
      score,
      // The hero number: couples you personally got talking — whether you sent the
      // vouch that landed or you were the wingman who accepted it.
      couplesSparked: counts.confirmedMatches + counts.assists,
      // The instant, vanity-friendly counter: every vouch you've ever sent.
      sparks: counts.sent,
      // Most intros landed in any 7-day window (momentum + Hat Trick).
      bestWeekCount: bestRollingWeek(acceptTimes),
      // Laplace-smoothed so 1-for-1 doesn't outrank 9-for-10.
      acceptRate: Number(((counts.accepted + 1) / (decided + 2)).toFixed(3)),
      ...tierProgress(score),
    };
    card.badges = badgesForStats(card);
    stats.set(id, card);
  }

  return stats;
}
