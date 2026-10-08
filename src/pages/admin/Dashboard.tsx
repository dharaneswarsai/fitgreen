import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  dashboardKpis,
  funnelStages,
  leadsOverTime,
  revenueByMonth,
  sourceSplit,
  salesPerformance,
  bucketTasks,
} from '@/services/metrics';
import { StatTile } from '@/components/ui/StatTile';
import { Card, PageHeader, Divider } from '@/components/ui/Card';
import { formatINR, formatNumber, formatPercent } from '@/constants';
import { LineChartCard } from '@/components/admin/charts/LineChart';
import { DonutChart } from '@/components/admin/charts/DonutChart';
import { BarChartCard } from '@/components/admin/charts/BarChart';
import { FunnelChart } from '@/components/admin/charts/FunnelChart';
// Icons used in future if needed; removed unused to satisfy lint/typecheck
// import { CheckCircle2, CalendarCheck, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/Card';

export default function DashboardPage() {
  const { db } = useApp();
  const kpis = useMemo(
    () => dashboardKpis(db.leads, db.members, db.campaignMetrics, db.tasks),
    [db.leads, db.members, db.campaignMetrics, db.tasks],
  );
  const funnel = useMemo(() => funnelStages(db.leads), [db.leads]);
  const funnelWithPct = useMemo(() => {
    const total = Math.max(1, funnel[0]?.count ?? 1);
    return funnel.map((f) => ({ status: f.status, count: f.count, percent: (f.count / total) * 100 }));
  }, [funnel]);
  const lot = useMemo(() => leadsOverTime(db.leads, 30).map((r) => ({ date: r.date, value: r.leads })), [db.leads]);
  const rot = useMemo(() => revenueByMonth(db.members, 12).map((r) => ({ date: r.month, value: r.revenue })), [db.members]);
  const src = useMemo(() => sourceSplit(db.leads).map((r) => ({ name: r.label, value: r.count })), [db.leads]);
  const sales = useMemo(
    () =>
      salesPerformance(db.team, db.leads, db.tasks, db.members).map((r) => ({
        name: r.member.name,
        leads: r.leads,
        qualified: r.qualified,
        trials: r.trials,
        conversions: r.conversions,
        revenue: r.revenue,
      })),
    [db.team, db.leads, db.tasks, db.members],
  );
  const tasksBuckets = useMemo(() => bucketTasks(db.tasks.filter((t) => t.status !== 'COMPLETED')), [db.tasks]);
  const recent = useMemo(
    () =>
      [...db.activities]
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .slice(0, 10),
    [db.activities],
  );

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live performance for the FITGREEN growth engine" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total leads" value={formatNumber(kpis.totalLeads)} sublabel="Active (non-archived)" href="/admin/leads" />
        <StatTile label="New leads (7d)" value={formatNumber(kpis.newLeadsThisWeek)} href="/admin/leads" />
        <StatTile label="Qualified" value={formatNumber(kpis.qualifiedLeads)} href="/admin/pipeline" />
        <StatTile label="Trials booked" value={formatNumber(kpis.trialsBooked)} href="/admin/appointments" />
        <StatTile label="Trials attended" value={formatNumber(kpis.trialsAttended)} href="/admin/appointments" />
        <StatTile label="Active members" value={formatNumber(kpis.activeMembers)} href="/admin/members" />
        <StatTile label="Memberships" value={formatNumber(kpis.memberships)} href="/admin/members" />
        <StatTile label="Revenue" value={formatINR(kpis.revenue)} href="/admin/members" />
        <StatTile label="Ad spend (mo)" value={formatINR(kpis.adSpend)} href="/admin/campaigns" />
        <StatTile label="CPL (paid)" value={formatINR(kpis.cpl)} href="/admin/campaigns" />
        <StatTile label="Conversion rate" value={formatPercent(kpis.conversionRate, 1)} href="/admin/analytics" />
        <StatTile label="ROAS" value={`${kpis.roas.toFixed(2)}x`} href="/admin/campaigns" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <LineChartCard title="Leads over last 30 days" data={lot} />
        <LineChartCard title="Revenue by month (12m)" data={rot} color="#111111" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <FunnelChart data={funnelWithPct} />
        <DonutChart data={src} />
      </div>

      <div className="mt-6">
        <BarChartCard data={sales} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card padded>
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-ink/70">Overdue follow-ups</h4>
            <Link to="/admin/follow-ups" className="text-[12px] text-fit-600 hover:underline">View all</Link>
          </div>
          <Divider className="my-3" />
          {tasksBuckets.overdue.length === 0 ? (
            <EmptyState title="No overdue follow-ups" message="All tasks are on track." />
          ) : (
            <ul className="flex flex-col gap-2">
              {tasksBuckets.overdue.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-ink/[0.08] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{t.title}</p>
                    <p className="text-[11px] text-ink/45">{new Date(t.dueAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">OVERDUE</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded>
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-medium text-ink/70">Recent activity</h4>
            <span className="text-[12px] text-ink/40">Latest 10</span>
          </div>
          <Divider className="my-3" />
          {recent.length === 0 ? (
            <EmptyState title="No activity yet" message="Actions will appear here as your team works leads." />
          ) : (
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {recent.map((a) => (
                <li key={a.id} className="flex items-start gap-2 rounded-lg border border-ink/[0.08] px-3 py-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-fit-500" />
                  <div className="min-w-0">
                    <p className="text-[13px] text-ink">{a.summary}</p>
                    {a.body ? <p className="truncate text-[12px] text-ink/45">{a.body}</p> : null}
                    <p className="text-[11px] text-ink/40">{new Date(a.occurredAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
