// removed unused import
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp, useActions, useVisibleLeads } from '@/context/AppContext';
import type { Lead } from '@/types';
import {
  LEAD_GOAL_META,
  LEAD_SOURCE_META,
  WORKOUT_TIME_META,
  summarize,
} from '@/constants';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, EmptyState } from '@/components/ui/Card';
import { DataTable, type Column, Tabs } from '@/components/ui/DataTable';
import { Avatar, ScoreBadge, StatusBadge, SourceBadge } from '@/components/ui/Badges';
import { Modal, Drawer } from '@/components/ui/Overlay';
import { Input, Select } from '@/components/ui/Field';
import { Plus, Download, Search, Archive, RotateCcw, UserPlus, ArrowRight } from 'lucide-react';

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'TRIAL_BOOKED', label: 'Trial' },
  { value: 'TRIAL_ATTENDED', label: 'Attended' },
  { value: 'MEMBERSHIP', label: 'Members' },
  { value: 'LOST', label: 'Lost' },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]['value'];

function csvEscape(v: unknown) {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportLeadsCSV(leads: Lead[]) {
  const headers = [
    'id',
    'name',
    'phone',
    'email',
    'goal',
    'workoutTime',
    'program',
    'message',
    'source',
    'status',
    'score',
    'assignedToId',
    'requestedTrial',
    'nextFollowUpAt',
    'lastContactedAt',
    'statusChangedAt',
    'lostReason',
    'archivedAt',
    'createdAt',
  ];
  const rows = leads.map((l) => [
    l.id,
    l.name,
    l.phone,
    l.email,
    l.goal,
    l.workoutTime,
    l.program,
    l.message,
    l.source,
    l.status,
    l.score,
    l.assignedToId,
    l.requestedTrial ? 'true' : 'false',
    l.nextFollowUpAt,
    l.lastContactedAt,
    l.statusChangedAt,
    l.lostReason,
    l.archivedAt,
    l.createdAt,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitgreen-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const { db } = useApp();
  const actions = useActions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const visible = useVisibleLeads();

  const [tab, setTab] = useState<StatusTab>((searchParams.get('status') as StatusTab) || 'ALL');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLead, setAssignLead] = useState<Lead | null>(null);

  const leads = useMemo(() => {
    let list = [...visible];
    if (tab !== 'ALL') list = list.filter((l) => l.status === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [visible, tab, search]);

  const teamOptions = useMemo(
    () =>
      db.team.map((t) => ({
        value: t.id,
        label: t.name,
      })),
    [db.team],
  );

  const columns: Column<Lead>[] = [
    {
      key: 'lead',
      header: 'Lead',
      render: (l) => (
        <Link to={`/admin/leads/${l.id}`} className="flex items-center gap-2">
          <Avatar name={l.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-ink">{l.name}</span>
            <span className="truncate text-[11px] text-ink/45">{summarize(l.message || '', 40)}</span>
          </span>
        </Link>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (l) => <span className="tabular-nums">{l.phone}</span>,
    },
    {
      key: 'goal',
      header: 'Goal',
      render: (l) => <span>{l.goal.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      render: (l) => <SourceBadge lead={l} />,
    },
    {
      key: 'score',
      header: 'Score',
      render: (l) => <ScoreBadge score={l.score} size="sm" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => <StatusBadge lead={l} />,
    },
    {
      key: 'assigned',
      header: 'Assigned',
      render: (l) =>
        l.assignedToId ? (
          <span className="flex items-center gap-1.5">
            <Avatar name={db.team.find((t) => t.id === l.assignedToId)?.name || ''} size="sm" />
            <span className="truncate text-[12px]">
              {db.team.find((t) => t.id === l.assignedToId)?.name?.split(' ')[0]}
            </span>
          </span>
        ) : (
          <span className="text-[12px] text-ink/40">Unassigned</span>
        ),
    },
    {
      key: 'next',
      header: 'Next follow-up',
      render: (l) =>
        l.nextFollowUpAt ? (
          <span className="text-[12px]">{new Date(l.nextFollowUpAt).toLocaleString()}</span>
        ) : (
          <span className="text-[12px] text-ink/40">—</span>
        ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (l) => <span className="text-[12px]">{new Date(l.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setAssignLead(l);
              setAssignOpen(true);
            }}
            icon={<UserPlus className="h-3.5 w-3.5" />}
          >
            Assign
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/leads/${l.id}`);
            }}
            icon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Open
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.archiveLead(l.id, !l.archivedAt);
            }}
            icon={l.archivedAt ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          >
            {l.archivedAt ? 'Restore' : 'Archive'}
          </Button>
        </div>
      ),
    },
  ];

  function updateTab(t: StatusTab) {
    setTab(t);
    const sp = new URLSearchParams(searchParams);
    if (t === 'ALL') sp.delete('status');
    else sp.set('status', t);
    setSearchParams(sp);
  }

  function updateSearch(q: string) {
    setSearch(q);
    const sp = new URLSearchParams(searchParams);
    if (q.trim()) sp.set('q', q.trim());
    else sp.delete('q');
    setSearchParams(sp);
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="All inbound enquiries, scored and ready for follow-up"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportLeadsCSV(leads)} icon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Add lead
            </Button>
          </div>
        }
      />
      <Card padded>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={STATUS_TABS.map((t) => ({ value: t.value, label: t.label, count: t.value === 'ALL' ? visible.length : visible.filter((l) => l.status === t.value).length }))}
            active={tab}
            onChange={(v) => updateTab(v as StatusTab)}
          />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <Input
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search name, phone, email, source..."
                className="h-9 w-64 pl-9"
              />
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={leads}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/admin/leads/${r.id}`)}
          empty={<EmptyState title="No leads found" message="Try adjusting filters or add a new lead." />}
        />
      </Card>
      <CreateLeadDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <AssignLeadModal lead={assignLead} open={assignOpen} onClose={() => { setAssignOpen(false); setAssignLead(null); }} teamOptions={teamOptions} />
    </div>
  );
}

function CreateLeadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const actions = useActions();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState('');
  const [workoutTime, setWorkoutTime] = useState('');
  const [program, setProgram] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('WEBSITE');
  const [requestedTrial, setRequestedTrial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(''); setPhone(''); setEmail(''); setGoal(''); setWorkoutTime(''); setProgram(''); setMessage(''); setSource('WEBSITE'); setRequestedTrial(true); setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = actions.createManualLead({
      name,
      phone,
      email: email.trim() || null,
      goal: goal as any,
      workoutTime: workoutTime as any,
      program: program.trim() || null,
      message: message.trim() || null,
      source: source as any,
      requestedTrial,
    });
    setSubmitting(false);
    if (res.ok) { reset(); onClose(); }
    else setError(res.error || 'Failed to create lead');
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add lead" subtitle="Create a lead manually">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" required value={name} onChange={(e)=>setName(e.target.value)} />
          <Input label="Phone" required value={phone} onChange={(e)=>setPhone(e.target.value)} />
        </div>
        <Input label="Email (optional)" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Goal" required value={goal} onChange={(e)=>setGoal(e.target.value)} options={[
            {value:'',label:'Select goal'},
            ...Object.entries(LEAD_GOAL_META).map(([v,l])=>({value:v,label:l.label})),
          ]} />
          <Select label="Preferred time" required value={workoutTime} onChange={(e)=>setWorkoutTime(e.target.value)} options={[
            {value:'',label:'Select time'},
            ...Object.entries(WORKOUT_TIME_META).map(([v,l])=>({value:v,label:l.label})),
          ]} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Program (optional)" value={program} onChange={(e)=>setProgram(e.target.value)} options={[
            {value:'',label:'Let us recommend'},
            ...Array.from(new Set(['Fat Loss Lab','Strength Foundations','Athlete Engine','Everyday Strong','Personal Training'])).map(p=>({value:p,label:p})),
          ]} />
          <Select label="Source" value={source} onChange={(e)=>setSource(e.target.value)} options={Object.entries(LEAD_SOURCE_META).map(([v,l])=>({value:v,label:l.label}))} />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={()=>{reset();onClose();}} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}>Create lead</Button>
        </div>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </form>
    </Drawer>
  );
}

function AssignLeadModal({ lead, open, onClose, teamOptions }: { lead: Lead|null, open:boolean, onClose:()=>void, teamOptions:Array<{value:string,label:string}> }) {
  const actions = useActions();
  const [assignee, setAssignee] = useState('');
  useMemo(()=>{ if(lead) setAssignee(lead.assignedToId||''); },[lead]);
  function submit() {
    if(!lead) return;
    actions.assignLead(lead.id, assignee||null);
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Assign lead" footer={<Button onClick={submit} disabled={!lead}>Save</Button>}>
      <div className="flex flex-col gap-3">
        <Select label="Salesperson" value={assignee} onChange={(e)=>setAssignee(e.target.value)} options={[{value:'',label:'Unassigned'},...teamOptions]} />
      </div>
    </Modal>
  );
}
