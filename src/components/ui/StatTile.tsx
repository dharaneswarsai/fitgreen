import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatPercent } from '@/constants';
import { Card } from './Card';

export function StatTile({
  label,
  value,
  sublabel,
  change,
  icon,
  href,
}: {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  /** Percentage change vs the previous period. */
  change?: number;
  icon?: ReactNode;
  href?: string;
}) {
  const body = (
    <Card className={`h-full transition-colors ${href ? 'hover:border-ink/25' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium text-ink/50">{label}</p>
        {icon ? <span className="text-ink/25">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-ink">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {change !== undefined ? <ChangePill change={change} /> : null}
        {sublabel ? <span className="text-[12px] text-ink/45">{sublabel}</span> : null}
      </div>
    </Card>
  );

  return href ? (
    <Link to={href} className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-fit-500/40">
      {body}
    </Link>
  ) : (
    body
  );
}

export function ChangePill({ change }: { change: number }) {
  const flat = Math.abs(change) < 0.05;
  const up = change > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  // Down is not always bad, but the caller controls tone via `goodWhenDown`
  // where it matters; here the colour follows direction only.
  const tone = flat
    ? 'bg-ink/[0.06] text-ink/50'
    : up
      ? 'bg-fit-50 text-fit-700'
      : 'bg-red-50 text-red-600';

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${tone}`}>
      <Icon className="h-3 w-3" />
      {flat ? '0%' : formatPercent(Math.abs(change), 0)}
    </span>
  );
}
