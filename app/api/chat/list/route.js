import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Match from '@/lib/models/Match';
import Message from '@/lib/models/Message';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { getBlockedUserIds } from '@/lib/safety/blocking';

function photoUrl(photo, userId) {
  return photo.filename ? `/uploads/${userId}/${photo.filename}` : null;
}

// GET /api/chat/list - get all active chats for current user
export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const userId = new mongoose.Types.ObjectId(session.sub);
  const blocked = await getBlockedUserIds(session.sub);
  const blockedObjectIds = blocked.allBlockedIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // Find all matches where both users have accepted
  const matches = await Match.find({
    $or: [{ user_a: userId }, { user_b: userId }],
    user_a_status: 'accepted',
    user_b_status: 'accepted',
    $and: [
      {
        $or: [
          { status: 'active' },
          { status: { $exists: false } },
          { status: null },
        ],
      },
    ],
    ...(blockedObjectIds.length
      ? {
          user_a: { $nin: blockedObjectIds },
          user_b: { $nin: blockedObjectIds },
        }
      : {}),
  }).sort({ updatedAt: -1 }).lean();

  if (matches.length === 0) {
    return NextResponse.json({ chats: [] });
  }

  // Get the other user IDs
  const otherUserIds = matches.map((m) =>
    m.user_a.toString() === session.sub ? m.user_b : m.user_a
  );

  // Get other user profiles
  const users = await User.find({ _id: { $in: otherUserIds } })
    .select('name first_name photos')
    .lean();

  const userMap = {};
  users.forEach((u) => {
    const uid = u._id.toString();
    const mainPhoto = u.photos?.sort((a, b) => a.position - b.position)?.[0];
    userMap[uid] = {
      _id: uid,
      name: u.name || u.first_name,
      photo: mainPhoto ? photoUrl(mainPhoto, uid) : null,
    };
  });

  // Get last message and unread count for each match
  const chats = await Promise.all(matches.map(async (m) => {
    const otherId = m.user_a.toString() === session.sub ? m.user_b.toString() : m.user_a.toString();

    const lastMessage = await Message.findOne({ match_id: m._id })
      .sort({ createdAt: -1 })
      .lean();

    const unreadCount = await Message.countDocuments({
      match_id: m._id,
      sender_id: { $ne: userId },
      read: false,
    });

    return {
      matchId: m._id.toString(),
      otherUser: userMap[otherId] || { _id: otherId, name: 'Unknown' },
      lastMessage: lastMessage ? {
        content: lastMessage.content,
        isMe: lastMessage.sender_id.toString() === session.sub,
        createdAt: lastMessage.createdAt,
      } : null,
      unreadCount,
      updatedAt: lastMessage?.createdAt || m.createdAt,
    };
  }));

  // Sort by most recent activity
  chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return NextResponse.json({ chats });
}
