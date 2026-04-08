import { Badge } from '@/components/ui/badge';

const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.low;
  return <Badge className={style}>{priority}</Badge>;
}
