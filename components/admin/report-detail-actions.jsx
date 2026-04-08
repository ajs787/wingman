"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ACTIONS = [
  { value: 'warn', label: 'Warn User' },
  { value: 'hide_profile', label: 'Hide Profile' },
  { value: 'suspend', label: 'Suspend User' },
  { value: 'ban', label: 'Ban User' },
  { value: 'dismiss_report', label: 'Dismiss Report' },
  { value: 'mark_safe', label: 'Mark Safe' },
];

export function ReportDetailActions({ reportId, userId }) {
  const [reason, setReason] = useState('Reviewed by admin.');
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');

  async function runAction(actionType) {
    setBusy(actionType);
    setMessage('');

    try {
      const res = await fetch('/api/admin/moderation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reportId, actionType, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Action failed.');
        return;
      }

      setMessage(`${actionType} applied.`);
    } catch {
      setMessage('Network error while applying moderation action.');
    } finally {
      setBusy(null);
    }
  }

  async function updateReportStatus(status) {
    setBusy(status);
    setMessage('');

    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes: reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Status update failed.');
        return;
      }

      setMessage(`Report marked ${status}.`);
    } catch {
      setMessage('Network error while updating report status.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Action reason" />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => updateReportStatus('in_review')} disabled={!!busy}>Mark In Review</Button>
        <Button variant="outline" onClick={() => updateReportStatus('resolved')} disabled={!!busy}>Resolve Report</Button>
        <Button variant="outline" onClick={() => updateReportStatus('dismissed')} disabled={!!busy}>Dismiss Report</Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.value}
            variant={action.value === 'ban' || action.value === 'suspend' ? 'destructive' : 'secondary'}
            onClick={() => runAction(action.value)}
            disabled={!!busy}
          >
            {busy === action.value ? 'Working...' : action.label}
          </Button>
        ))}
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
