export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import User from '@/lib/models/User';
import Report from '@/lib/models/Report';
import { reportSchema } from '@/lib/safety/validation';
import { buildEvidenceSnapshot, deriveReportPriority, incrementSafetyCounters } from '@/lib/safety/reporting';
import { createBlock } from '@/lib/safety/blocking';
import { runModerationAutomation } from '@/lib/safety/automation';

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const reporterId = String(session.sub);
  const { reportedUserId, reason, details, matchId, conversationId, autoBlock } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(reportedUserId)) {
    return NextResponse.json({ error: 'Invalid reported user id' }, { status: 400 });
  }

  if (reportedUserId === reporterId) {
    return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 });
  }

  if (matchId && !mongoose.Types.ObjectId.isValid(matchId)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  if (conversationId && !mongoose.Types.ObjectId.isValid(conversationId)) {
    return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });
  }

  await connectDB();

  const reportedUser = await User.findById(reportedUserId).select('_id').lean();
  if (!reportedUser) {
    return NextResponse.json({ error: 'Reported user does not exist' }, { status: 404 });
  }

  const [evidence, priority] = await Promise.all([
    buildEvidenceSnapshot({ reportedUserId, conversationId }),
    deriveReportPriority({ reason, details, reportedUserId }),
  ]);

  const report = await Report.create({
    reporterId,
    reportedUserId,
    reason,
    details,
    matchId: matchId || null,
    conversationId: conversationId || null,
    status: priority === 'urgent' ? 'in_review' : 'open',
    priority,
    evidence,
    autoBlock: !!autoBlock,
  });

  await incrementSafetyCounters({
    reportedUserId,
    reporterId,
  });

  if (autoBlock) {
    await createBlock({
      blockerId: reporterId,
      blockedId: reportedUserId,
      reason: 'Auto-block selected during report.',
    });
  }

  const automation = await runModerationAutomation(String(report._id));

  return NextResponse.json({
    success: true,
    reportId: String(report._id),
    priority: report.priority,
    status: report.status,
    automation,
  });
}
