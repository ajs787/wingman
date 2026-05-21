export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Report from '@/lib/models/Report';
import User from '@/lib/models/User';
import UserSafetyProfile from '@/lib/models/UserSafetyProfile';
import { requireAdminUser } from '@/lib/safety/admin';
import { adminReportQuerySchema } from '@/lib/safety/validation';

export async function GET(request) {
  const admin = await requireAdminUser(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { searchParams } = new URL(request.url);
  const parsed = adminReportQuerySchema.safeParse({
    status: searchParams.get('status') || undefined,
    priority: searchParams.get('priority') || undefined,
    reason: searchParams.get('reason') || undefined,
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 20,
    search: searchParams.get('search') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  await connectDB();

  const { status, priority, reason, page, limit, search } = parsed.data;
  const query = {};

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (reason) query.reason = reason;

  if (search) {
    const text = search.trim();
    if (mongoose.Types.ObjectId.isValid(text)) {
      query.$or = [{ reportedUserId: text }, { reporterId: text }];
    } else {
      const users = await User.find({
        $or: [{ name: { $regex: text, $options: 'i' } }, { first_name: { $regex: text, $options: 'i' } }],
      })
        .select('_id')
        .limit(50)
        .lean();
      query.reportedUserId = { $in: users.map((u) => u._id) };
    }
  }

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(query),
  ]);

  const reportedIds = Array.from(new Set(rows.map((r) => String(r.reportedUserId))));
  const reporterIds = Array.from(new Set(rows.map((r) => String(r.reporterId))));

  const [reportedUsers, safetyProfiles] = await Promise.all([
    User.find({ _id: { $in: reportedIds } }).select('name first_name age school').lean(),
    UserSafetyProfile.find({ userId: { $in: reportedIds } }).select('userId riskScore flags moderationStatus').lean(),
  ]);

  const userMap = new Map(reportedUsers.map((u) => [String(u._id), u]));
  const safetyMap = new Map(safetyProfiles.map((s) => [String(s.userId), s]));

  const reports = rows.map((row) => {
    const reported = userMap.get(String(row.reportedUserId));
    const safety = safetyMap.get(String(row.reportedUserId));

    return {
      _id: String(row._id),
      createdAt: row.createdAt,
      reporterId: String(row.reporterId),
      reportedUserId: String(row.reportedUserId),
      reason: row.reason,
      status: row.status,
      priority: row.priority,
      adminNotes: row.adminNotes,
      reportedUser: reported
        ? {
            name: reported.name || reported.first_name || null,
            age: reported.age || null,
            school: reported.school || null,
          }
        : null,
      riskScore: safety?.riskScore ?? 0,
      flags: safety?.flags ?? [],
      moderationStatus: safety?.moderationStatus ?? 'clear',
      automationApplied: (safety?.flags?.length || 0) > 0 || (safety?.riskScore || 0) >= 25,
    };
  });

  return NextResponse.json({
    reports,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    meta: {
      distinctReportedUsers: reportedIds.length,
      distinctReporters: reporterIds.length,
    },
  });
}
