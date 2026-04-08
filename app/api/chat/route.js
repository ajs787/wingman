import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Match from '@/lib/models/Match';
import Message from '@/lib/models/Message';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { isBlockedBetween } from '@/lib/safety/blocking';

function photoUrl(photo, userId) {
  return photo.filename ? `/uploads/${userId}/${photo.filename}` : null;
}

// GET /api/chat?matchId=<matchId>
export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });

  await connectDB();

  const match = await Match.findById(matchId);
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const userId = session.sub;
  const isUserA = match.user_a.toString() === userId;
  const isUserB = match.user_b.toString() === userId;

  if (!isUserA && !isUserB) {
    return NextResponse.json({ error: 'Not your match' }, { status: 403 });
  }

  // Check if both users have accepted
  if (match.user_a_status !== 'accepted' || match.user_b_status !== 'accepted') {
    return NextResponse.json({ error: 'Match not yet accepted by both users' }, { status: 403 });
  }

  if (match.status === 'blocked' || match.status === 'inactive') {
    return NextResponse.json({ error: 'Conversation unavailable' }, { status: 403 });
  }

  const otherId = isUserA ? match.user_b : match.user_a;
  const blocked = await isBlockedBetween(userId, otherId.toString());
  if (blocked) {
    return NextResponse.json({ error: 'Conversation unavailable' }, { status: 403 });
  }

  // Get messages
  const messages = await Message.find({ match_id: matchId })
    .sort({ createdAt: 1 })
    .lean();

  // Mark messages from other user as read
  await Message.updateMany(
    { match_id: matchId, sender_id: otherId, read: false },
    { read: true }
  );

  // Get other user's profile
  const otherUser = await User.findById(otherId)
    .select('name first_name photos')
    .lean();

  const otherProfile = otherUser ? {
    _id: otherUser._id.toString(),
    name: otherUser.name || otherUser.first_name,
    photo: otherUser.photos?.sort((a, b) => a.position - b.position)?.[0]
      ? photoUrl(otherUser.photos[0], otherUser._id.toString())
      : null,
  } : null;

  return NextResponse.json({
    messages: messages.map((m) => ({
      _id: m._id.toString(),
      content: m.content,
      senderId: m.sender_id.toString(),
      isMe: m.sender_id.toString() === userId,
      createdAt: m.createdAt,
    })),
    otherUser: otherProfile,
  });
}

// POST /api/chat - send a message
export async function POST(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { matchId, content } = body;
  if (!matchId || !content?.trim()) {
    return NextResponse.json({ error: 'matchId and content required' }, { status: 400 });
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  await connectDB();

  const match = await Match.findById(matchId);
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const userId = session.sub;
  const isUserA = match.user_a.toString() === userId;
  const isUserB = match.user_b.toString() === userId;

  if (!isUserA && !isUserB) {
    return NextResponse.json({ error: 'Not your match' }, { status: 403 });
  }

  // Check if both users have accepted
  if (match.user_a_status !== 'accepted' || match.user_b_status !== 'accepted') {
    return NextResponse.json({ error: 'Match not yet accepted by both users' }, { status: 403 });
  }

  if (match.status === 'blocked' || match.status === 'inactive') {
    return NextResponse.json({ error: 'Cannot send messages in this conversation' }, { status: 403 });
  }

  const otherId = isUserA ? match.user_b.toString() : match.user_a.toString();
  const blocked = await isBlockedBetween(userId, otherId);
  if (blocked) {
    return NextResponse.json({ error: 'Cannot send messages in this conversation' }, { status: 403 });
  }

  const message = await Message.create({
    match_id: matchId,
    sender_id: userId,
    content: content.trim(),
  });

  return NextResponse.json({
    message: {
      _id: message._id.toString(),
      content: message.content,
      senderId: message.sender_id.toString(),
      isMe: true,
      createdAt: message.createdAt,
    },
  });
}
