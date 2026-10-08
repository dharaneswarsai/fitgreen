import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, Divider } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { FunnelChart } from '@/components/admin/charts/FunnelChart';
import { LineChartCard } from '@/components/admin/charts/LineChart';
import { BarChartCard } from '@/components/admin/charts/BarChart';
import { DonutChart } from '@/components/admin/charts/DonutChart';
import { dashboardKpis, funnelStages, sourceSplit, salesPerformance } from '@/services/metrics';
import { formatINR, formatNumber } from '@/constants';

export default function AnalyticsPage() {
  const { db } = useApp();
  const m = useMemo(() => {
    const kpis = dashboardKpis(db.leads, db.members, db.campaignMetrics, db.tasks);
    const funnel = funnelStages(db.leads);
    const sources = sourceSplit(db.leads);
    const byDay = Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(29-i)); return {date:d.toISOString().slice(0,10),count:db.leads.filter(l=>l.createdAt.slice(0,10)===d.toISOString().slice(0,10)).length}; });
    const sales = salesPerformance(db.team, db.leads, db.tasks, db.members, new Date());
    return { kpis, funnel, sources, byDay, sales };
  }, [db]);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Performance across leads, sales and revenue" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total leads" value={formatNumber(m.kpis.totalLeads)} sublabel="All enquiries" />
        <StatTile label="Conversion rate" value={(m.kpis.conversionRate).toFixed(1) + '%'} sublabel="Lead → Member" />
        <StatTile label="Members" value={formatNumber(m.kpis.activeMembers)} sublabel="Active members" />
        <StatTile label="Revenue" value={formatINR(m.kpis.revenue)} sublabel="Total collected" />
      </div>
      <Card padded>
        <h3 className="text-[14px] font-semibold text-ink">Funnel</h3>
        <Divider className="my-3" />
        <FunnelChart data={m.funnel.map((s: any) => ({ status: s.status, count: s.count }))} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded>
          <h3 className="text-[14px] font-semibold text-ink">Leads by source</h3>
          <Divider className="my-3" />
          <DonutChart data={m.sources.map((s: any) => ({ name: s.label, value: s.count }))} />
        </Card>
        <Card padded>
          <h3 className="text-[14px] font-semibold text-ink">Leads per day (30d)</h3>
          <Divider className="my-3" />
          <LineChartCard title="Leads per day (30d)" data={m.byDay.map((d: any) => ({ date: d.date, value: d.count }))} />
        </Card>
      </div>
      <Card padded>
        <h3 className="text-[14px] font-semibold text-ink">Sales performance (top sellers)</h3>
        <Divider className="my-3" />
        <BarChartCard data={m.sales.slice(0, 6).map((s: any) => ({ name: db.team.find((t) => t.id === s.salespersonId)?.name || s.salespersonId, leads: s.leads, qualified: s.qualified, trials: s.trials, conversions: s.conversions, revenue: s.revenue }))} />
      </Card>
    </div>
  );
}
