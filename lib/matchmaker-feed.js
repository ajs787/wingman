import mongoose from 'mongoose';
import PotentialMatch from '@/lib/models/PotentialMatch';
import User from '@/lib/models/User';

export function photoUrl(photo, userId) {
  return photo?.url || (photo?.filename ? `/uploads/${userId}/${photo.filename}` : null);
}

export function displayName(user) {
  return (
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    'Wingman'
  );
}

export function mainPhoto(user) {
  const uid = user?._id?.toString();
  const first = (user?.photos ?? []).slice().sort((a, b) => a.position - b.position)[0];
  return uid && first ? photoUrl(first, uid) : null;
}

// The "You called it" feed: the most recent couples a wingman helped create — as
// the sender whose vouch landed ('vouch') or the wingman who accepted ('assist').
export async function getRecentWins(userId, limit = 8) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return [];
  const meOid = new mongoose.Types.ObjectId(userId);

  const pms = await PotentialMatch.find({
    status: 'accepted',
    $or: [{ 'senders.wingman_user_id': meOid }, { accepted_by: meOid }],
  })
    .select('owner_user_id target_user_id accepted_by updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  if (!pms.length) return [];

  const ids = new Set();
  for (const pm of pms) {
    ids.add(pm.owner_user_id.toString());
    ids.add(pm.target_user_id.toString());
  }
  const users = await User.find({
    _id: { $in: [...ids].map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select('name first_name last_name email photos')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const person = (id) => {
    const u = userMap.get(id);
    return { _id: id, name: displayName(u), photo: mainPhoto(u) };
  };

  return pms.map((pm) => ({
    potential_match_id: pm._id.toString(),
    role: pm.accepted_by?.toString() === userId ? 'assist' : 'vouch',
    at: pm.updatedAt,
    // The couple you got talking.
    owner: person(pm.owner_user_id.toString()),
    target: person(pm.target_user_id.toString()),
  }));
}
