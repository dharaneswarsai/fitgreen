import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from '../../ui/Card';

interface BarDatum {
  name: string;
  leads: number;
  qualified: number;
  trials: number;
  conversions: number;
  revenue: number;
}

export function BarChartCard({ data }: { data: BarDatum[] }) {
  return (
    <Card padded className="h-80">
      <h4 className="text-[13px] font-medium text-ink/70">Sales performance</h4>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(17,17,17,0.55)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(17,17,17,0.55)' }} width={36} />
            <Tooltip formatter={(v: unknown) => [typeof v === 'number' ? v : 0, '']} />
            <Bar dataKey="leads" fill="#111111" radius={[4,4,0,0]} />
            <Bar dataKey="qualified" fill="#63CD90" radius={[4,4,0,0]} />
            <Bar dataKey="trials" fill="#00A650" radius={[4,4,0,0]} />
            <Bar dataKey="conversions" fill="#3D3D3D" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
