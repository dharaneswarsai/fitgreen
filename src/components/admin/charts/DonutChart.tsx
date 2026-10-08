import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from '../../ui/Card';

interface DonutDatum {
  name: string;
  value: number;
}

export function DonutChart({ data }: { data: DonutDatum[] }) {
  // Simple bar-like representation for compactness; can be swapped to Pie if desired.
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card padded className="h-72">
      <h4 className="text-[13px] font-medium text-ink/70">Lead sources</h4>
      <div className="mt-3 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.08)" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'rgba(17,17,17,0.55)' }} width={80} />
            <Tooltip formatter={(v: unknown) => [typeof v === 'number' ? v : 0, 'Leads']} />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} fill="#00A650" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink/45">
        {data.map((d) => (
          <span key={d.name}>
            {d.name}: {d.value} ({total ? Math.round((d.value / total) * 100) : 0}%)
          </span>
        ))}
      </div>
    </Card>
  );
}
