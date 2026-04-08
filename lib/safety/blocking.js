import mongoose from 'mongoose';
import Block from '@/lib/models/Block';
import Match from '@/lib/models/Match';
import Conversation from '@/lib/models/Conversation';

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

export async function getBlockedUserIds(currentUserId) {
  const currentObjectId = toObjectId(currentUserId);
  const rows = await Block.find({
    $or: [{ blockerId: currentObjectId }, { blockedId: currentObjectId }],
  })
    .select('blockerId blockedId')
    .lean();

  const blockedByMeIds = rows
    .filter((row) => String(row.blockerId) === currentUserId)
    .map((row) => String(row.blockedId));

  const blockedMeIds = rows
    .filter((row) => String(row.blockedId) === currentUserId)
    .map((row) => String(row.blockerId));

  return {
    blockedByMeIds,
    blockedMeIds,
    allBlockedIds: Array.from(new Set([...blockedByMeIds, ...blockedMeIds])),
  };
}

export async function isBlockedBetween(userAId, userBId) {
  const row = await Block.findOne({
    $or: [
      { blockerId: userAId, blockedId: userBId },
      { blockerId: userBId, blockedId: userAId },
    ],
  })
    .select('_id')
    .lean();

  return !!row;
}

export async function applyBlockSideEffects(params) {
  const { blockerId, blockedId, reason } = params;
  const userA = toObjectId(blockerId);
  const userB = toObjectId(blockedId);

  await Match.updateMany(
    {
      $or: [
        { user_a: userA, user_b: userB },
        { user_a: userB, user_b: userA },
      ],
    },
    {
      $set: {
        status: 'blocked',
        blocked_by: userA,
        blocked_reason: reason ?? null,
      },
    }
  );

  await Conversation.updateMany(
    {
      participants: { $all: [userA, userB] },
    },
    {
      $set: {
        status: 'blocked',
        blockedBy: userA,
        blockReason: reason ?? null,
      },
    }
  );
}

export async function createBlock(params) {
  const { blockerId, blockedId, reason } = params;

  const existing = await Block.findOne({ blockerId, blockedId }).select('_id').lean();
  if (existing) {
    return { alreadyBlocked: true, block: existing };
  }

  const block = await Block.create({ blockerId, blockedId, reason: reason?.trim() || null });
  await applyBlockSideEffects({ blockerId, blockedId, reason });

  return { alreadyBlocked: false, block };
}
