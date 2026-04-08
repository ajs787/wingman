import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdminUser } from '@/lib/safety/admin';
import { adminModerationActionSchema } from '@/lib/safety/validation';
import { executeAdminModerationAction } from '@/lib/safety/admin-actions';
import Report from '@/lib/models/Report';

export async function POST(request) {
  const admin = await requireAdminUser(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = adminModerationActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { userId, reportId, actionType, reason, notes } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  if (reportId && !mongoose.Types.ObjectId.isValid(reportId)) {
    return NextResponse.json({ error: 'Invalid reportId' }, { status: 400 });
  }

  await connectDB();

  const action = await executeAdminModerationAction({
    userId,
    reportId,
    actionType,
    reason,
    notes,
    performedBy: admin.user.id,
  });

  if (reportId && ['dismiss_report'].includes(actionType)) {
    await Report.updateOne({ _id: reportId }, { $set: { status: 'dismissed' } });
  }

  if (reportId && ['warn', 'hide_profile', 'suspend', 'ban', 'mark_safe'].includes(actionType)) {
    await Report.updateOne(
      { _id: reportId, status: { $in: ['open', 'in_review'] } },
      { $set: { status: 'resolved' } }
    );
  }

  return NextResponse.json({
    success: true,
    action: {
      _id: String(action._id),
      userId: String(action.userId),
      reportId: action.reportId ? String(action.reportId) : null,
      actionType: action.actionType,
      reason: action.reason,
      performedBy: action.performedBy,
      isAutomated: action.isAutomated,
      createdAt: action.createdAt,
    },
  });
}
