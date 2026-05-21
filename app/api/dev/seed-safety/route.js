export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Report from '@/lib/models/Report';
import UserSafetyProfile from '@/lib/models/UserSafetyProfile';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  await connectDB();

  const users = await User.find({}).select('_id').limit(6).lean();
  if (users.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 users to seed safety data' }, { status: 400 });
  }

  const target = String(users[0]._id);
  const reporters = users.slice(1, 5).map((u) => String(u._id));

  const reasons = ['harassment', 'spam', 'scam', 'hate_speech'];
  const created = [];

  for (let i = 0; i < reporters.length; i += 1) {
    const report = await Report.create({
      reporterId: reporters[i],
      reportedUserId: target,
      reason: reasons[i % reasons.length],
      details: `Seeded safety report #${i + 1}`,
      status: 'open',
      priority: i >= 2 ? 'high' : 'medium',
      evidence: {
        messageSnapshots: [],
        imageUrls: [],
        profileSnapshot: null,
      },
      autoBlock: false,
    });
    created.push(String(report._id));
  }

  await UserSafetyProfile.updateOne(
    { userId: target },
    {
      $setOnInsert: { userId: target },
      $inc: { totalReportsReceived: reporters.length, openReportsCount: reporters.length },
      $set: { lastReportedAt: new Date(), moderationStatus: 'flagged', riskScore: 42, flags: ['repeated_reports'] },
    },
    { upsert: true }
  );

  return NextResponse.json({
    success: true,
    targetUserId: target,
    reportsCreated: created.length,
    reportIds: created,
  });
}
