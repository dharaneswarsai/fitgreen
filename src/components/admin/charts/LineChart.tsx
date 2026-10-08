import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from '../../ui/Card';

interface Point {
  date: string;
  value: number;
  label?: string;
}

export function LineChartCard({ title, data, color = '#00A650' }: { title: string; data: Point[]; color?: string }) {
  return (
    <Card padded className="h-72">
      <h4 className="text-[13px] font-medium text-ink/70">{title}</h4>
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.08)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(17,17,17,0.55)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(17,17,17,0.55)' }} width={36} />
            <Tooltip formatter={(v: unknown) => [typeof v === 'number' ? v : 0, '']} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
