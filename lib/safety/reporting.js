import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Message from '@/lib/models/Message';
import Report from '@/lib/models/Report';
import UserSafetyProfile from '@/lib/models/UserSafetyProfile';
import { getInitialPriority } from '@/lib/safety/priority';

function photoUrl(photo, userId) {
  return photo?.filename ? `/uploads/${userId}/${photo.filename}` : null;
}

export async function buildEvidenceSnapshot(params) {
  const { reportedUserId, conversationId } = params;

  const reported = await User.findById(reportedUserId)
    .select('name first_name last_name age personality_answer school year majors photos')
    .lean();

  let messageSnapshots = [];
  if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
    const rows = await Message.find({ match_id: conversationId })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    messageSnapshots = rows.reverse().map((m) => ({
      messageId: String(m._id),
      senderId: String(m.sender_id),
      content: String(m.content || ''),
      createdAt: new Date(m.createdAt).toISOString(),
    }));
  }

  const uid = String(reported?._id || reportedUserId);
  const images = (reported?.photos || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((p) => photoUrl(p, uid))
    .filter(Boolean);

  return {
    messageSnapshots,
    imageUrls: images,
    profileSnapshot: reported
      ? {
          userId: uid,
          name: reported.name || null,
          first_name: reported.first_name || null,
          last_name: reported.last_name || null,
          age: reported.age ?? null,
          bio: null,
          personality_answer: reported.personality_answer || null,
          photos: images,
          school: reported.school || null,
          year: reported.year || null,
          majors: reported.majors || [],
        }
      : null,
  };
}

export async function deriveReportPriority(params) {
  const { reason, details, reportedUserId } = params;

  const recentReports = await Report.find({
    reportedUserId,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  })
    .select('reason createdAt')
    .lean();

  const repeatedReasonCount = recentReports.filter((r) => r.reason === reason).length;

  return getInitialPriority({
    reason,
    details,
    priorRecentCount: recentReports.length,
    repeatedReasonCount,
  });
}

export async function incrementSafetyCounters(params) {
  const { reportedUserId, reporterId } = params;

  await UserSafetyProfile.updateOne(
    { userId: reportedUserId },
    {
      $setOnInsert: { userId: reportedUserId, moderationStatus: 'clear' },
      $inc: { totalReportsReceived: 1, openReportsCount: 1 },
      $set: { lastReportedAt: new Date() },
    },
    { upsert: true }
  );

  await UserSafetyProfile.updateOne(
    { userId: reporterId },
    {
      $setOnInsert: { userId: reporterId, moderationStatus: 'clear' },
      $inc: { totalReportsSubmitted: 1 },
    },
    { upsert: true }
  );
}
