import type { ReactNode } from 'react';
import type { Style } from '@/constants';

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-ink/10 bg-white ${padded ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[13px] text-ink/55">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink/55">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </header>
  );
}

/** Status pill driven by the shared Style record in constants. */
export function Badge({
  children,
  style,
  dot,
  className = '',
}: {
  children: ReactNode;
  style?: Style;
  dot?: boolean;
  className?: string;
}) {
  if (!style) {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-ink/10 bg-ink/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-ink/70 ${className}`}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} /> : null}
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="text-ink/25">{icon}</div> : null}
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {message ? <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink/55">{message}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = 'bg-fit-500',
  className = '',
}: {
  /** 0–100 */
  value: number;
  tone?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07] ${className}`}>
      <div className={`h-full rounded-full transition-[width] ${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40 ${className}`}>
      {children}
    </p>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-ink/[0.08] ${className}`} />;
}
