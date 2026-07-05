import mongoose from 'mongoose';
import PotentialMatch from '@/lib/models/PotentialMatch';
import Match from '@/lib/models/Match';

// Wingman rank: swipers whose sent likes get accepted (and turn into real matches)
// score higher; swipers whose likes get rejected score lower. Computed live from
// PotentialMatch outcomes so there are no counters to drift out of sync.
//
// Scoring:
//   +10  a like you sent was accepted by the other side's wingmen
//   +15  bonus when that match was confirmed by BOTH actual users
//   -4   a like you sent was rejected by every wingman on the other side
//   +5   assist: you were the accepting wingman and the match was confirmed
// Pending likes don't count either way. Score floors at 0.
export const RANK_POINTS = { accepted: 10, confirmed: 15, rejected: -4, assist: 5 };

export const RANK_TIERS = [
  { min: 120, tier: 'Legendary Cupid' },
  { min: 60,  tier: 'Certified Matchmaker' },
  { min: 20,  tier: 'Solid Wing' },
  { min: 0,   tier: 'Rookie' },
];

export function tierForScore(score) {
  return RANK_TIERS.find((t) => score >= t.min)?.tier ?? 'Rookie';
}

function emptyStats() {
  return { sent: 0, accepted: 0, rejected: 0, pending: 0, confirmedMatches: 0, assists: 0 };
}

// Compute stats for a set of wingman user ids. Returns Map<idString, stats+score>.
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
    .select('senders decisions status accepted_by match_id')
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

    // Sender credit: every tracked wingman who sent this like shares its outcome.
    for (const sender of pm.senders ?? []) {
      const wid = sender.wingman_user_id?.toString();
      const s = wid && stats.get(wid);
      if (!s) continue;
      s.sent += 1;
      if (pm.status === 'accepted') {
        s.accepted += 1;
        if (confirmed) s.confirmedMatches += 1;
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
      if (s) s.assists += 1;
    }
  }

  for (const [id, s] of stats) {
    const score = Math.max(
      0,
      s.accepted * RANK_POINTS.accepted +
        s.confirmedMatches * RANK_POINTS.confirmed +
        s.rejected * RANK_POINTS.rejected +
        s.assists * RANK_POINTS.assist
    );
    const decided = s.accepted + s.rejected;
    stats.set(id, {
      ...s,
      score,
      tier: tierForScore(score),
      // Laplace-smoothed so 1-for-1 doesn't outrank 9-for-10.
      acceptRate: Number(((s.accepted + 1) / (decided + 2)).toFixed(3)),
    });
  }

  return stats;
}
