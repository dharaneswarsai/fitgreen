import { Card } from '../../ui/Card';

interface FunnelStep {
  status: string;
  count: number;
  percent?: number;
}

export function FunnelChart({ data }: { data: FunnelStep[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card padded className="h-72">
      <h4 className="text-[13px] font-medium text-ink/70">Pipeline funnel</h4>
      <div className="mt-4 flex h-52 flex-col justify-between">
        {data.map((d) => {
          const w = Math.max(12, (d.count / max) * 100);
          return (
            <div key={d.status} className="flex items-center gap-3">
              <span className="w-28 truncate text-[12px] text-ink/55">{d.status}</span>
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]">
                  <div className="h-full rounded-full bg-fit-500 transition-[width]" style={{ width: `${w}%` }} />
                </div>
              </div>
              <span className="w-16 text-right text-[12px] tabular-nums text-ink/60">
                {d.count}
                {d.percent !== undefined ? ` · ${d.percent.toFixed(0)}%` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
