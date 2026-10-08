import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { format } from 'date-fns';
import { PageHeader, Card, EmptyState } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { campaignTotals } from '@/services/metrics';
import { formatINR } from '@/constants';

export default function CampaignsPage() {
  const { db } = useApp();

  const rows = useMemo(
    () =>
      db.campaigns
        .map((c) => {
          // campaignTotals owns attribution, so this table cannot drift
          // from the Leads screen or from the seeded daily metrics.
          const t = campaignTotals(c, db.campaignMetrics, db.leads, db.members);
          return {
            ...t,
            id: c.id,
            start: new Date(c.startDate),
            end: c.endDate ? new Date(c.endDate) : null,
          };
        })
        .sort((a, b) => b.spend - a.spend || new Date(b.campaign.startDate).getTime() - new Date(a.campaign.startDate).getTime()),
    [db.campaigns, db.campaignMetrics, db.leads, db.members],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          spend: acc.spend + r.spend,
          revenue: acc.revenue + r.attributedRevenue,
          leads: acc.leads + r.leads,
          memberships: acc.memberships + r.memberships,
        }),
        { spend: 0, revenue: 0, leads: 0, memberships: 0 },
      ),
    [rows],
  );

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (r) => (
        <div>
          <p className="font-medium text-ink">{r.campaign.name}</p>
          <p className="text-[11px] text-ink/40">{r.campaign.objective}</p>
        </div>
      ),
    },
    { key: 'platform', header: 'Platform', render: (r) => <span>{r.campaign.platform}</span> },
    {
      key: 'period',
      header: 'Period',
      render: (r) => (
        <span>
          {format(r.start, 'MMM d, yyyy')} — {r.end ? format(r.end, 'MMM d, yyyy') : 'ongoing'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            r.campaign.status === 'ACTIVE'
              ? 'bg-green-50 text-green-700'
              : r.campaign.status === 'PAUSED'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-slate-50 text-slate-700'
          }`}
        >
          {r.campaign.status}
        </span>
      ),
    },
    { key: 'spend', header: 'Spend', render: (r) => <span className="tabular-nums">{formatINR(r.spend)}</span> },
    { key: 'leads', header: 'Leads', render: (r) => <span className="tabular-nums">{r.leads}</span> },
    { key: 'cpl', header: 'CPL', render: (r) => <span className="tabular-nums">{formatINR(r.cpl)}</span> },
    { key: 'ctr', header: 'CTR', render: (r) => <span className="tabular-nums">{r.ctr.toFixed(2)}%</span> },
    { key: 'members', header: 'Members', render: (r) => <span className="tabular-nums">{r.memberships}</span> },
    { key: 'revenue', header: 'Revenue', render: (r) => <span className="tabular-nums">{formatINR(r.attributedRevenue)}</span> },
    {
      key: 'roas',
      header: 'ROAS',
      render: (r) => (
        <span className={`tabular-nums font-medium ${r.roas >= 3 ? 'text-green-700' : r.roas >= 1 ? 'text-ink' : r.roas > 0 ? 'text-amber-700' : 'text-ink/40'}`}>
          {r.spend > 0 ? `${r.roas.toFixed(2)}x` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Spend, attribution and return per campaign" />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total spend" value={formatINR(totals.spend)} sublabel="Across all campaigns" />
        <StatTile label="Attributed revenue" value={formatINR(totals.revenue)} sublabel="From campaign leads" />
        <StatTile
          label="Blended ROAS"
          value={totals.spend > 0 ? `${(totals.revenue / totals.spend).toFixed(2)}x` : '—'}
          sublabel="Revenue ÷ spend"
        />
        <StatTile label="Campaign leads" value={totals.leads} sublabel={`${totals.memberships} converted`} />
      </div>
      <Card padded>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          empty={<EmptyState title="No campaigns" message="Campaign spend and attribution appear once daily metrics exist." />}
        />
      </Card>
    </div>
  );
}