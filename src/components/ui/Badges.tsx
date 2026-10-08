import { SCORE_BAND_META, LEAD_STATUS_META, LEAD_SOURCE_META, initials } from '@/constants';
import { scoreBand } from '@/services/leadScoring';
import type { Lead } from '@/types';
import { Badge, ProgressBar } from './Card';

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const meta = SCORE_BAND_META[scoreBand(score)];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-semibold tabular-nums ${meta.pill} ${
        size === 'sm' ? 'h-6 min-w-8 px-1.5 text-[11px]' : 'h-8 min-w-11 px-2 text-sm'
      }`}
      title={`${meta.label} lead — ${score}/100`}
    >
      {score}
    </span>
  );
}

export function ScoreMeter({ score, className = '' }: { score: number; className?: string }) {
  const meta = SCORE_BAND_META[scoreBand(score)];
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink/40">
          Lead score
        </span>
        <span className={`text-[11px] font-semibold ${meta.text}`}>{meta.label}</span>
      </div>
      <ProgressBar value={score} tone={meta.bar} />
      <p className="mt-1.5 text-[12px] tabular-nums text-ink/50">{score} / 100</p>
    </div>
  );
}

export function StatusBadge({ lead }: { lead: Lead }) {
  const meta = LEAD_STATUS_META[lead.status];
  return <Badge style={meta.style} dot>{meta.label}</Badge>;
}

export function SourceBadge({ lead }: { lead: Lead }) {
  const meta = LEAD_SOURCE_META[lead.source];
  return <Badge style={meta.style}>{meta.label}</Badge>;
}

const AVATAR_SIZES = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-[11px]', lg: 'h-11 w-11 text-sm' } as const;

export function Avatar({
  name,
  size = 'md',
  className = '',
}: {
  name: string;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  // Stable per-name tint so the same person keeps the same colour.
  const palette = ['bg-fit-100 text-fit-800', 'bg-sky-100 text-sky-800', 'bg-violet-100 text-violet-800', 'bg-amber-100 text-amber-800'];
  const tint = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_SIZES[size]} ${tint} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
