import { Badge } from '@/components/ui/badge';

const STATUS_STYLES = {
  clear: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  flagged: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  under_review: 'bg-orange-100 text-orange-800 border-orange-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  banned: 'bg-zinc-200 text-zinc-800 border-zinc-300',
};

export function ModerationStatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.clear;
  return <Badge className={style}>{String(status || 'clear').replace('_', ' ')}</Badge>;
}
