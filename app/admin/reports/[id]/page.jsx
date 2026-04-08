import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriorityBadge } from '@/components/admin/priority-badge';
import { ModerationStatusBadge } from '@/components/admin/moderation-status-badge';
import { ActionHistoryTimeline } from '@/components/admin/action-history-timeline';
import { ReportDetailActions } from '@/components/admin/report-detail-actions';
import { requireServerAdmin } from '@/lib/safety/server-admin';
import { connectDB } from '@/lib/mongodb';
import Report from '@/lib/models/Report';
import User from '@/lib/models/User';
import Message from '@/lib/models/Message';
import UserSafetyProfile from '@/lib/models/UserSafetyProfile';
import ModerationAction from '@/lib/models/ModerationAction';

export const dynamic = 'force-dynamic';

async function getReportData(id) {
  await connectDB();

  const report = await Report.findById(id).lean();
  if (!report) return null;

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

  return {
    report: {
      ...report,
      _id: String(report._id),
      reporterId: String(report.reporterId),
      reportedUserId: String(report.reportedUserId),
    },
    reportedUser,
    reporter,
    safetyProfile: safety,
    priorReports,
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
  };
}

export default async function AdminReportDetailPage({ params }) {
  await requireServerAdmin();
  const data = await getReportData(params.id);

  if (!data) notFound();

  const report = data.report;
  const safety = data.safetyProfile;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={report.priority} />
              <ModerationStatusBadge status={safety?.moderationStatus || 'clear'} />
              <span className="text-xs text-slate-500">report #{report._id.slice(-6)}</span>
              <span className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()}</span>
            </div>
            <CardTitle className="text-xl">Report Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-medium">Reported user:</span> {data.reportedUser?.name || report.reportedUserId}</p>
            <p><span className="font-medium">Reporter id:</span> {report.reporterId}</p>
            <p><span className="font-medium">Reason:</span> {report.reason}</p>
            <p><span className="font-medium">Status:</span> {report.status}</p>
            <p><span className="font-medium">Risk score:</span> {safety?.riskScore ?? 0}</p>
            <p><span className="font-medium">Flags:</span> {(safety?.flags || []).join(', ') || 'none'}</p>
            <p className="rounded-xl bg-slate-50 p-3"><span className="font-medium">Details:</span> {report.details}</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evidence Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Profile Snapshot</p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                  {JSON.stringify(report.evidence?.profileSnapshot || null, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Recent Messages</p>
                <div className="mt-2 space-y-2">
                  {(data.evidenceMessages || []).map((m) => (
                    <div key={m._id} className="rounded-lg border border-slate-200 p-2 text-sm">
                      <p className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleString()} • {m.senderId}</p>
                      <p className="mt-1">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Moderation Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportDetailActions reportId={report._id} userId={report.reportedUserId} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prior Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(data.priorReports || []).map((r) => (
                <div key={r._id} className="rounded-lg border border-slate-200 p-2">
                  <p className="font-medium">{r.reason} • {r.priority}</p>
                  <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()} • {r.status}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Action History</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionHistoryTimeline actions={data.actionHistory || []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
