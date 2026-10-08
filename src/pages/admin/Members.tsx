import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { format } from 'date-fns';
import { PageHeader, Card, EmptyState } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Badges';
import { formatINR } from '@/constants';
import { Users } from 'lucide-react';

export default function MembersPage() {
  const { db } = useApp();
  const members = useMemo(() => {
    const today = new Date();
    return db.members
      .map((m) => {
        const end = new Date(m.expiryDate);
        const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000*60*60*24)));
        const status: 'ACTIVE'|'EXPIRING'|'EXPIRED' = !m.active || daysLeft <= 0 ? 'EXPIRED' : daysLeft <= 30 ? 'EXPIRING' : 'ACTIVE';
        return { ...m, end, daysLeft, status };
      })
      .sort((a,b)=> new Date(b.startDate).getTime()-new Date(a.startDate).getTime());
  }, [db.members]);

  const columns: Column<typeof members[0]>[] = [
    { key:'member', header:'Member', render:(m)=>{ const l=db.leads.find(x=>x.id===m.leadId); const name=l?.name||m.id; return (<div className="flex items-center gap-2"><Avatar name={name} size="sm"/><span className="truncate font-medium text-ink">{name}</span></div>);} },
    { key:'plan', header:'Plan', render:(m)=>{ const p=db.plans.find(x=>x.id===m.planId); return (<span>{p?.name||'—'}</span>);} },
    { key:'period', header:'Period', render:(m)=>(<span>{format(new Date(m.startDate),'MMM d, yyyy')} — {format(m.end,'MMM d, yyyy')}</span>) },
    { key:'status', header:'Status', render:(m)=>(<span className={`rounded-full px-2 py-0.5 text-[11px] ${m.status==='ACTIVE'?'bg-green-50 text-green-700':m.status==='EXPIRING'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-600'}`}>{m.status}</span>) },
    { key:'amount', header:'Amount paid', render:(m)=>(<span className="tabular-nums">{formatINR(m.amountPaid)}</span>) },
  ];

  return (
    <div>
      <PageHeader title="Members" subtitle="Active, expiring and expired memberships" action={<div className="flex items-center gap-2 text-[12px] text-ink/60"><Users className="h-4 w-4"/> {members.length} total</div>}/>
      <Card padded>
        <DataTable columns={columns} rows={members} rowKey={(r)=>r.id} empty={<EmptyState title="No members yet" message="Convert a lead to create a member record."/>}/>
      </Card>
    </div>
  );
}
