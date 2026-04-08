import { ModerationStatusBadge } from '@/components/admin/moderation-status-badge';

export function ActionHistoryTimeline({ actions }) {
  if (!actions?.length) {
    return <p className="text-sm text-slate-500">No moderation actions yet.</p>;
  }

  return (
    <div className="space-y-4">
      {actions.map((action) => (
        <div key={action._id} className="relative border-l border-slate-200 pl-4">
          <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400" />
          <div className="flex items-center gap-2">
            <ModerationStatusBadge status={action.actionType} />
            <span className="text-xs text-slate-500">{new Date(action.createdAt).toLocaleString()}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">{action.reason}</p>
          {action.notes ? <p className="mt-1 text-sm text-slate-600">{action.notes}</p> : null}
          <p className="mt-1 text-xs text-slate-500">
            {action.isAutomated ? 'Automated action' : 'Admin action'} by {action.performedBy}
          </p>
        </div>
      ))}
    </div>
  );
}
