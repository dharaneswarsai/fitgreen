import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useActions } from '@/context/AppContext';
import type {} from '@/types';
import { format, isToday, isPast, addDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, EmptyState } from '@/components/ui/Card';
import { DataTable, type Column, Tabs } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Badges';
import { TASK_TYPE_META, TASK_PRIORITY_META } from '@/constants';
import { CheckCircle2, RotateCcw, XCircle, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Input, Select, Textarea } from '@/components/ui/Field';

type Tab = 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'ALL';

export default function FollowUpsPage() {
  const { db } = useApp();
  const actions = useActions();
  const [tab, setTab] = useState<Tab>('OVERDUE');
  const [taskOpen, setTaskOpen] = useState(false);

  const tasks = useMemo(() => {
    return db.tasks
      .map((t) => {
        const due = new Date(t.dueAt);
        const overdue = t.status === 'PENDING' && isPast(due) && !isToday(due);
        return { ...t, due, overdue };
      })
      .sort((a,b)=> a.due.getTime()-b.due.getTime());
  }, [db.tasks]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => {
      if (tab === 'ALL') return true;
      if (tab === 'COMPLETED') return t.status === 'COMPLETED';
      if (tab === 'OVERDUE') return t.status === 'PENDING' && t.due.getTime() < now && !isToday(t.due);
      if (tab === 'TODAY') return t.status === 'PENDING' && isToday(t.due);
      if (tab === 'UPCOMING') return t.status === 'PENDING' && t.due.getTime() >= addDays(new Date(),1).setHours(0,0,0,0) && !isToday(t.due);
      return true;
    });
  }, [tasks, tab]);

  const counts = useMemo(() => ({
    OVERDUE: tasks.filter((t)=>t.status==='PENDING' && t.due.getTime()<Date.now() && !isToday(t.due)).length,
    TODAY: tasks.filter((t)=>t.status==='PENDING' && isToday(t.due)).length,
    UPCOMING: tasks.filter((t)=>t.status==='PENDING' && t.due.getTime()>=addDays(new Date(),1).setHours(0,0,0,0) && !isToday(t.due)).length,
    COMPLETED: tasks.filter((t)=>t.status==='COMPLETED').length,
    ALL: tasks.length,
  }), [tasks]);

  const columns: Column<typeof filtered[0]>[] = [
    { key:'lead', header:'Lead', render:(t)=>{ const l=db.leads.find(x=>x.id===t.leadId); return l ? (<Link to={`/admin/leads/${l.id}`} className="flex items-center gap-2"><Avatar name={l.name} size="sm"/><span className="truncate font-medium text-ink">{l.name}</span></Link>) : (<span>—</span>);} },
    { key:'type', header:'Type', render:(t)=>{ const m=TASK_TYPE_META[t.type]; return (<span>{m.label}</span>);} },
    { key:'title', header:'Title', render:(t)=>(<span className="truncate">{t.title}</span>) },
    { key:'due', header:'Due', render:(t)=>(<span className={t.overdue?'text-red-600':isToday(t.due)?'text-amber-700':'text-ink/70'}>{format(t.due,'PPp')}</span>) },
    { key:'priority', header:'Priority', render:(t)=> (<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t.priority}</span>) },
    { key:'assignee', header:'Assignee', render:(t)=>{ const m=db.team.find(x=>x.id===t.assigneeId); return m ? (<div className="flex items-center gap-1.5"><Avatar name={m.name} size="sm"/><span className="text-[12px]">{m.name.split(' ')[0]}</span></div>) : (<span>—</span>);} },
    { key:'status', header:'Status', render:(t)=>(<span className="text-[12px]">{t.status}</span>) },
    { key:'actions', header:'Actions', render:(t)=>(<div className="flex justify-end gap-1">{t.status==='PENDING'?<Button size="sm" variant="ghost" onClick={()=>actions.completeTask(t.id)} icon={<CheckCircle2 className="h-3.5 w-3.5"/>}>Complete</Button>:<Button size="sm" variant="ghost" onClick={()=>actions.reopenTask(t.id)} icon={<RotateCcw className="h-3.5 w-3.5"/>}>Reopen</Button>}<Button size="sm" variant="ghost" onClick={()=>actions.deleteTask(t.id)} icon={<XCircle className="h-3.5 w-3.5"/>}>Delete</Button></div>) },
  ];

  return (
    <div>
      <PageHeader title="Follow-ups" subtitle="Track overdue, today and upcoming tasks" action={<Button size="sm" onClick={()=>setTaskOpen(true)} icon={<Plus className="h-4 w-4"/>}>New follow-up</Button>}/>
      <Card padded>
        <Tabs tabs={[{value:'OVERDUE',label:'Overdue',count:counts.OVERDUE},{value:'TODAY',label:'Today',count:counts.TODAY},{value:'UPCOMING',label:'Upcoming',count:counts.UPCOMING},{value:'COMPLETED',label:'Completed',count:counts.COMPLETED},{value:'ALL',label:'All',count:counts.ALL}]} active={tab} onChange={(v)=>setTab(v as Tab)}/>
        <DataTable columns={columns} rows={filtered} rowKey={(r)=>r.id} empty={<EmptyState title="No follow-ups" message="Create a follow-up to stay on top of leads."/>}/>
      </Card>
      <QuickTaskModal open={taskOpen} onClose={()=>setTaskOpen(false)}/>
    </div>
  );
}

function QuickTaskModal({open,onClose}:{open:boolean;onClose:()=>void}){
  const {db}=useApp(); const actions=useActions();
  const [leadId,setLeadId]=useState(db.leads[0]?.id||'');
  const [assignee,setAssignee]=useState(db.team[0]?.id||'');
  const [type,setType]=useState<any>('CALL'); const [priority,setPriority]=useState<any>('MEDIUM');
  const [title,setTitle]=useState(''); const [notes,setNotes]=useState('');
  const [dueDate,setDueDate]=useState(format(new Date(),'yyyy-MM-dd')); const [dueTime,setDueTime]=useState(format(addDays(new Date(),0),'HH:mm'));
  function submit(){ if(!leadId||!assignee||!title.trim()) return; const due=new Date(dueDate+'T'+dueTime); actions.createTask({leadId,assigneeId:assignee,type,title:title.trim(),notes:notes.trim()||undefined,dueAt:due.toISOString(),priority}); onClose(); setTitle(''); setNotes(''); }
  return(<Modal open={open} onClose={onClose} title="New follow-up" footer={<Button onClick={submit}>Create</Button>}>
    <div className="flex flex-col gap-3">
      <Select label="Lead" required value={leadId} onChange={e=>setLeadId(e.target.value)} options={db.leads.map(l=>({value:l.id,label:l.name}))}/>
      <Select label="Assignee" required value={assignee} onChange={e=>setAssignee(e.target.value)} options={db.team.map(t=>({value:t.id,label:t.name}))}/>
      <Input label="Title" required value={title} onChange={e=>setTitle(e.target.value)}/>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Type" value={type} onChange={e=>setType(e.target.value)} options={Object.entries(TASK_TYPE_META).map(([v,l])=>({value:v,label:l.label}))}/>
        <Select label="Priority" value={priority} onChange={e=>setPriority(e.target.value)} options={Object.entries(TASK_PRIORITY_META).map(([v,l])=>({value:v,label:l.label}))}/>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Due date" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
        <Input label="Due time" type="time" value={dueTime} onChange={e=>setDueTime(e.target.value)}/>
      </div>
      <Textarea label="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/>
    </div>
  </Modal>);
}
