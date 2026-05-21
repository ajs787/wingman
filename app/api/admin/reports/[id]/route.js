export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Report from '@/lib/models/Report';
import User from '@/lib/models/User';
import Message from '@/lib/models/Message';
import UserSafetyProfile from '@/lib/models/UserSafetyProfile';
import ModerationAction from '@/lib/models/ModerationAction';
import { requireAdminUser } from '@/lib/safety/admin';
import { adminPatchReportSchema } from '@/lib/safety/validation';

export async function GET(request, context) {
  const admin = await requireAdminUser(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const reportId = context.params.id;
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
  }

  await connectDB();

  const report = await Report.findById(reportId).lean();
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const [reportedUser, reporter, safety, priorReports, actions, evidenceMessages] = await Promise.all([
    User.findById(report.reportedUserId).select('name first_name last_name age school year majors photos personality_answer hidden account_status').lean(),
    User.findById(report.reporterId).select('name first_name').lean(),
    UserSafetyProfile.findOne({ userId: report.reportedUserId }).lean(),
    Report.find({ reportedUserId: report.reportedUserId }).sort({ createdAt: -1 }).limit(20).lean(),
    ModerationAction.find({ userId: report.reportedUserId }).sort({ createdAt: -1 }).limit(50).lean(),
    report.conversationId
      ? Message.find({ match_id: report.conversationId }).sort({ createdAt: -1 }).limit(30).lean()
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    report: {
      ...report,
      _id: String(report._id),
      reporterId: String(report.reporterId),
      reportedUserId: String(report.reportedUserId),
      matchId: report.matchId ? String(report.matchId) : null,
      conversationId: report.conversationId ? String(report.conversationId) : null,
    },
    reportedUser,
    reporter: reporter
      ? {
          _id: String(reporter._id),
          name: reporter.name || reporter.first_name || null,
        }
      : null,
    safetyProfile: safety,
    priorReports: priorReports.map((r) => ({
      _id: String(r._id),
      reason: r.reason,
      status: r.status,
      priority: r.priority,
      createdAt: r.createdAt,
    })),
    actionHistory: actions.map((a) => ({
      _id: String(a._id),
      actionType: a.actionType,
      reason: a.reason,
      notes: a.notes,
      performedBy: a.performedBy,
      isAutomated: a.isAutomated,
      createdAt: a.createdAt,
    })),
    evidenceMessages: evidenceMessages.map((m) => ({
      _id: String(m._id),
      senderId: String(m.sender_id),
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}

export async function PATCH(request, context) {
  const admin = await requireAdminUser(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const reportId = context.params.id;
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = adminPatchReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  await connectDB();

  const update = {};
  if (parsed.data.status) update.status = parsed.data.status;
  if (typeof parsed.data.adminNotes === 'string') update.adminNotes = parsed.data.adminNotes;

  const report = await Report.findByIdAndUpdate(reportId, { $set: update }, { new: true }).lean();
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  return NextResponse.json({ success: true, report });
}
