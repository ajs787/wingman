"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge } from '@/components/admin/priority-badge';
import { ModerationStatusBadge } from '@/components/admin/moderation-status-badge';

const STATUS_OPTIONS = ['all', 'open', 'in_review', 'resolved', 'dismissed'];
const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'urgent'];
const REASON_OPTIONS = ['all', 'harassment', 'spam', 'fake_profile', 'inappropriate_content', 'underage', 'hate_speech', 'scam', 'other'];

export function ReportsQueue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('all');
  const [reason, setReason] = useState('all');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (priority !== 'all') params.set('priority', priority);
    if (reason !== 'all') params.set('reason', reason);
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', '50');
    return params.toString();
  }, [status, priority, reason, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/admin/reports?${queryString}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setRows([]);
          return;
        }
        setRows(data.reports || []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Report Queue</CardTitle>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Input placeholder="Search user id or name" value={search} onChange={(e) => setSearch(e.target.value)} />

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Reason" /></SelectTrigger>
            <SelectContent>
              {REASON_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? <p className="text-sm text-slate-500">Loading reports...</p> : null}
        {!loading && !rows.length ? <p className="text-sm text-slate-500">No reports found for current filters.</p> : null}

        <div className="space-y-3">
          {rows.map((row) => (
            <Link key={row._id} href={`/admin/reports/${row._id}`} className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={row.priority} />
                <ModerationStatusBadge status={row.moderationStatus} />
                <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</span>
                <span className="text-xs text-slate-500">report #{row._id.slice(-6)}</span>
              </div>

              <div className="mt-2 grid gap-1 text-sm md:grid-cols-2">
                <p><span className="text-slate-500">Reported user:</span> {row.reportedUser?.name || row.reportedUserId}</p>
                <p><span className="text-slate-500">Reporter:</span> {row.reporterId}</p>
                <p><span className="text-slate-500">Reason:</span> {row.reason.replace('_', ' ')}</p>
                <p><span className="text-slate-500">Status:</span> {row.status.replace('_', ' ')}</p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-1">risk {row.riskScore}</span>
                {(row.flags || []).slice(0, 4).map((flag) => (
                  <span key={flag} className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{flag}</span>
                ))}
                {row.automationApplied ? (
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">automation active</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
