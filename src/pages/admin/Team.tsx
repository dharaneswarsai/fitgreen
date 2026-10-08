import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, EmptyState, Divider } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Badges';
import { TEAM_ROLE_META } from '@/constants';
import { salesPerformance } from '@/services/metrics';
import { formatINR, formatNumber } from '@/constants';

export default function TeamPage() {
  const { db } = useApp();
  const perf = useMemo(
    () => salesPerformance(db.team, db.leads, db.tasks, db.members, new Date()),
    [db.team, db.leads, db.tasks, db.members],
  );

  return (
    <div>
      <PageHeader title="Team" subtitle="Who is on the floor and how each is performing" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {db.team.map((m) => {
          const role = TEAM_ROLE_META[m.role];
          const row = perf.find((p) => p.member.id === m.id);
          const assignedLeads = db.leads.filter((l) => l.assignedToId === m.id && !l.archivedAt).length;
          const openTasks = db.tasks.filter((t) => t.assigneeId === m.id && t.status === 'PENDING').length;
          return (
            <Card key={m.id} padded>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} size="lg" />
                  <div>
                    <h3 className="text-base font-semibold text-ink">{m.name}</h3>
                    <p className="text-[13px] text-ink/55">{role?.label ?? m.role}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    m.active ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  {m.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <Divider className="my-4" />
              <div className="flex flex-col gap-1 text-[12px] text-ink/55">
                <span>{m.email}</span>
                <span>{m.phone}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat label="Assigned leads" value={formatNumber(assignedLeads)} />
                <MiniStat label="Open follow-ups" value={formatNumber(openTasks)} />
                <MiniStat label="Conversions" value={formatNumber(row?.conversions ?? 0)} />
                <MiniStat label="Revenue" value={formatINR(row?.revenue ?? 0)} />
              </div>
            </Card>
          );
        })}
      </div>
      {db.team.length === 0 && <EmptyState title="No team members" message="Add staff to assign leads and follow-ups." />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/[0.06] px-3 py-2">
      <p className="text-[11px] text-ink/45">{label}</p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}