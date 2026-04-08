import { requireServerAdmin } from '@/lib/safety/server-admin';
import { ReportsQueue } from '@/components/admin/reports-queue';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  await requireServerAdmin();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Internal Trust & Safety</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Moderation Report Queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review user reports, inspect risk signals, and apply moderation actions.
          </p>
        </header>

        <ReportsQueue />
      </div>
    </div>
  );
}
