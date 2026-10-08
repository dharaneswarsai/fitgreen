import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp, useActions, useLead } from '@/context/AppContext';
import type { ActivityType, LeadStatus, TaskType, TaskPriority, AppointmentType } from '@/types';
import {
  LEAD_GOAL_META,
  WORKOUT_TIME_META,
  ACTIVITY_META,
  TASK_TYPE_META,
  TASK_PRIORITY_META,
  APPOINTMENT_TYPE_META,
  PIPELINE_ORDER,
  formatINR,
  summarize,
} from '@/constants';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, Divider, EmptyState } from '@/components/ui/Card';
import { Avatar, ScoreBadge, StatusBadge, SourceBadge, ScoreMeter } from '@/components/ui/Badges';
import { Modal } from '@/components/ui/Overlay';
import { Input, Select, Textarea } from '@/components/ui/Field';
import {
  Phone,
  Mail,
  MessageCircle,
  CalendarPlus,
  ClipboardList,
  UserPlus,
  ArrowRightLeft,
  Archive,
  RotateCcw,
  CheckCircle2,
  XCircle,
  NotebookPen,
} from 'lucide-react';
import { addHours, addMinutes, format } from 'date-fns';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const lead = useLead(id);
  const { db } = useApp();
  const actions = useActions();

  const [logOpen, setLogOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);

  const activities = useMemo(
    () => (lead ? db.activities.filter((a) => a.leadId === lead.id).sort((a,b)=>new Date(b.occurredAt).getTime()-new Date(a.occurredAt).getTime()) : []),
    [db.activities, lead],
  );
  const tasks = useMemo(
    () => (lead ? db.tasks.filter((t) => t.leadId === lead.id).sort((a,b)=>new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()) : []),
    [db.tasks, lead],
  );
  const appts = useMemo(
    () => (lead ? db.appointments.filter((a) => a.leadId === lead.id).sort((a,b)=>new Date(b.date+'T'+b.time).getTime()-new Date(a.date+'T'+a.time).getTime()) : []),
    [db.appointments, lead],
  );

  if (!lead) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold text-ink">Lead not found</h1>
        <p className="mt-1 text-sm text-ink/55">The lead you're looking for doesn't exist or was archived.</p>
        <Button as={Link} to="/admin/leads" className="mt-4" variant="outline">Back to leads</Button>
      </div>
    );
  }

  const owner = lead.assignedToId ? db.team.find((t)=>t.id===lead.assignedToId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.name}
        subtitle={`${lead.source.replace(/_/g,' ')} • ${new Date(lead.createdAt).toLocaleString()}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={()=>setLogOpen(true)} icon={<NotebookPen className="h-4 w-4"/>}>Log contact</Button>
            <Button variant="outline" size="sm" onClick={()=>setTaskOpen(true)} icon={<ClipboardList className="h-4 w-4"/>}>Create follow-up</Button>
            <Button variant="outline" size="sm" onClick={()=>setTrialOpen(true)} icon={<CalendarPlus className="h-4 w-4"/>}>Book trial</Button>
            <Button variant="outline" size="sm" onClick={()=>setAssignOpen(true)} icon={<UserPlus className="h-4 w-4"/>}>Assign</Button>
            <Button variant="outline" size="sm" onClick={()=>setStageOpen(true)} icon={<ArrowRightLeft className="h-4 w-4"/>}>Move stage</Button>
            <Button size="sm" onClick={()=>setConvertOpen(true)} icon={<CheckCircle2 className="h-4 w-4"/>}>Convert to member</Button>
            <Button variant="ghost" size="sm" onClick={()=>actions.archiveLead(lead.id,!lead.archivedAt)} icon={lead.archivedAt?<RotateCcw className="h-4 w-4"/>:<Archive className="h-4 w-4"/>}>{lead.archivedAt?'Restore':'Archive'}</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card padded className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={lead.name} size="lg"/>
              <div>
                <h2 className="text-base font-semibold text-ink">{lead.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge lead={lead}/>
                  <SourceBadge lead={lead}/>
                  <ScoreBadge score={lead.score}/>
                  {owner && <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink/70">{owner.name}</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lead.phone && <a className="inline-flex items-center gap-2 rounded-md border border-ink/[0.08] px-2.5 py-1.5 text-[12px] text-ink/70 hover:bg-ink/[0.03]" href={`tel:${lead.phone}`}><Phone className="h-4 w-4"/>{lead.phone}</a>}
              {lead.email && <a className="inline-flex items-center gap-2 rounded-md border border-ink/[0.08] px-2.5 py-1.5 text-[12px] text-ink/70 hover:bg-ink/[0.03]" href={`mailto:${lead.email}`}><Mail className="h-4 w-4"/>{lead.email}</a>}
              {lead.phone && <a className="inline-flex items-center gap-2 rounded-md border border-ink/[0.08] px-2.5 py-1.5 text-[12px] text-ink/70 hover:bg-ink/[0.03]" href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4"/>WhatsApp</a>}
            </div>
          </div>
          <Divider className="my-4"/>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[12px] text-ink/40">Goal</p>
              <p className="mt-0.5 text-[13px] text-ink">{LEAD_GOAL_META[lead.goal].label}</p>
            </div>
            <div>
              <p className="text-[12px] text-ink/40">Preferred time</p>
              <p className="mt-0.5 text-[13px] text-ink">{WORKOUT_TIME_META[lead.workoutTime].label}</p>
            </div>
            <div>
              <p className="text-[12px] text-ink/40">Program</p>
              <p className="mt-0.5 text-[13px] text-ink">{lead.program || '—'}</p>
            </div>
            <div>
              <p className="text-[12px] text-ink/40">Requested trial</p>
              <p className="mt-0.5 text-[13px] text-ink">{lead.requestedTrial ? 'Yes' : 'No'}</p>
            </div>
            {lead.message && <div className="sm:col-span-2">
              <p className="text-[12px] text-ink/40">Message</p>
              <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink/80">{lead.message}</p>
            </div>}
            {lead.lostReason && <div className="sm:col-span-2">
              <p className="text-[12px] text-ink/40">Lost reason</p>
              <p className="mt-0.5 text-[13px] text-ink">{lead.lostReason}</p>
            </div>}
          </div>
        </Card>
        <Card padded>
          <ScoreMeter score={lead.score}/>
          <Divider className="my-4"/>
          <div className="flex flex-col gap-2 text-[12px] text-ink/50">
            <div className="flex justify-between"><span>Status changed</span><span>{new Date(lead.statusChangedAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Last contacted</span><span>{lead.lastContactedAt?new Date(lead.lastContactedAt).toLocaleString():'—'}</span></div>
            <div className="flex justify-between"><span>Next follow-up</span><span>{lead.nextFollowUpAt?new Date(lead.nextFollowUpAt).toLocaleString():'—'}</span></div>
            <div className="flex justify-between"><span>Archived</span><span>{lead.archivedAt?'Yes':'No'}</span></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded>
          <h3 className="text-[14px] font-semibold text-ink">Timeline</h3>
          <Divider className="my-3"/>
          {activities.length===0 ? <EmptyState title="No activity yet" message="Log a contact to start the timeline."/> : (
            <ul className="flex flex-col gap-3">
              {activities.map(a=>{const m=ACTIVITY_META[a.type];return(
                <li key={a.id} className="flex gap-3 rounded-lg border border-ink/[0.08] p-3">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60">{m.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{a.summary}</p>
                    {a.body && <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-ink/60">{a.body}</p>}
                    <p className="mt-1 text-[11px] text-ink/40">{new Date(a.occurredAt).toLocaleString()}</p>
                  </div>
                </li>
              );})}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card padded>
            <h3 className="text-[14px] font-semibold text-ink">Follow-ups</h3>
            <Divider className="my-3"/>
            {tasks.length===0 ? <EmptyState title="No follow-ups" message="Create a follow-up to stay on track."/> : (
              <ul className="flex flex-col gap-2">
                {tasks.map(t=>{
                  const tm=TASK_TYPE_META[t.type];
                  const due=new Date(t.dueAt); const overdue=due.getTime()<Date.now() && t.status==='PENDING';
                  return(
                    <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-ink/[0.08] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{t.title}</p>
                        <p className="mt-0.5 text-[12px] text-ink/50">{tm.label} • {format(due,'PPp')}</p>
                        {t.notes && <p className="mt-1 text-[12px] text-ink/60">{summarize(t.notes,60)}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink/70">{t.priority}</span>
                        {overdue && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">OVERDUE</span>}
                        <div className="mt-1 flex gap-1">
                          {t.status==='PENDING' ? <Button size="sm" variant="ghost" onClick={()=>actions.completeTask(t.id)} icon={<CheckCircle2 className="h-3.5 w-3.5"/>}>Complete</Button> : <Button size="sm" variant="ghost" onClick={()=>actions.reopenTask(t.id)} icon={<RotateCcw className="h-3.5 w-3.5"/>}>Reopen</Button>}
                          <Button size="sm" variant="ghost" onClick={()=>actions.deleteTask(t.id)} icon={<XCircle className="h-3.5 w-3.5"/>}>Delete</Button>
                        </div>
                      </div>
                    </li>
                  );})}
              </ul>
            )}
          </Card>

          <Card padded>
            <h3 className="text-[14px] font-semibold text-ink">Appointments</h3>
            <Divider className="my-3"/>
            {appts.length===0 ? <EmptyState title="No appointments" message="Book a trial to get on the calendar."/> : (
              <ul className="flex flex-col gap-2">
                {appts.map(a=>{
                  const tm=APPOINTMENT_TYPE_META[a.type];
                  const at=new Date(a.date+'T'+a.time);
                  return(
                    <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-ink/[0.08] p-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink">{tm.label}</p>
                        <p className="mt-0.5 text-[12px] text-ink/50">{format(at,'PPp')} • {a.staffId ? db.team.find(t=>t.id===a.staffId)?.name : 'Unassigned'}</p>
                        {a.notes && <p className="mt-1 text-[12px] text-ink/60">{summarize(a.notes,60)}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink/70">{a.status}</span>
                        <div className="mt-1 flex flex-wrap justify-end gap-1">
                          {a.status!=='ATTENDED' && <Button size="sm" variant="ghost" onClick={()=>actions.setAppointmentStatus(a.id,'ATTENDED')}>Attended</Button>}
                          {a.status!=='NO_SHOW' && <Button size="sm" variant="ghost" onClick={()=>actions.setAppointmentStatus(a.id,'NO_SHOW')}>No show</Button>}
                          {a.status!=='CANCELLED' && <Button size="sm" variant="ghost" onClick={()=>actions.cancelAppointment(a.id)}>Cancel</Button>}
                        </div>
                      </div>
                    </li>
                  );})}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <LogContactModal leadId={lead.id} open={logOpen} onClose={()=>setLogOpen(false)}/>
      <TaskModal leadId={lead.id} open={taskOpen} onClose={()=>setTaskOpen(false)}/>
      <TrialModal leadId={lead.id} open={trialOpen} onClose={()=>setTrialOpen(false)}/>
      <ConvertMemberModal leadId={lead.id} open={convertOpen} onClose={()=>setConvertOpen(false)}/>
      <AssignModal leadId={lead.id} open={assignOpen} onClose={()=>setAssignOpen(false)}/>
      <MoveStageModal leadId={lead.id} open={stageOpen} onClose={()=>setStageOpen(false)}/>
    </div>
  );
}

function LogContactModal({leadId,open,onClose}:{leadId:string;open:boolean;onClose:()=>void}){
  const actions=useActions(); const {db}=useApp();
  const [type,setType]=useState<ActivityType>('CALL'); const [summary,setSummary]=useState(''); const [body,setBody]=useState(''); const [author,setAuthor]=useState<string|null>(null);
  function submit(){ if(!summary.trim()) return; actions.logContact(leadId,{type,summary:summary.trim(),body:body.trim()||undefined,authorId:author}); onClose(); setSummary(''); setBody(''); }
  return(<Modal open={open} onClose={onClose} title="Log contact" footer={<Button onClick={submit}>Save</Button>}>
    <div className="flex flex-col gap-3">
      <Select label="Type" value={type} onChange={e=>setType(e.target.value as any)} options={[{value:'CALL',label:'Call'},{value:'WHATSAPP',label:'WhatsApp'},{value:'EMAIL',label:'Email'},{value:'MEETING',label:'Meeting'},{value:'NOTE',label:'Note'}]}/>
      <Input label="Summary" required value={summary} onChange={e=>setSummary(e.target.value)} placeholder="e.g. Called, interested in trial"/>
      <Textarea label="Notes (optional)" value={body} onChange={e=>setBody(e.target.value)} rows={3}/>
      <Select label="Author (optional)" value={author||''} onChange={e=>setAuthor(e.target.value||null)} options={[{value:'',label:'Unassigned'},...db.team.map(t=>({value:t.id,label:t.name}))]}/>
    </div>
  </Modal>);
}

function TaskModal({leadId,open,onClose}:{leadId:string;open:boolean;onClose:()=>void}){
  const actions=useActions(); const {db}=useApp();
  const [type,setType]=useState<TaskType>('CALL'); const [priority,setPriority]=useState<TaskPriority>('MEDIUM'); const [title,setTitle]=useState(''); const [notes,setNotes]=useState(''); const [dueDate,setDueDate]=useState(format(new Date(),'yyyy-MM-dd')); const [dueTime,setDueTime]=useState(format(addHours(new Date(),2),'HH:mm')); const [assignee,setAssignee]=useState(db.team[0]?.id||'');
  function submit(){ if(!title.trim()||!assignee) return; const due=new Date(dueDate+'T'+dueTime); actions.createTask({leadId,assigneeId:assignee,type,title:title.trim(),notes:notes.trim()||undefined,dueAt:due.toISOString(),priority}); onClose(); setTitle(''); setNotes(''); }
  return(<Modal open={open} onClose={onClose} title="Create follow-up" footer={<Button onClick={submit}>Create</Button>}>
    <div className="flex flex-col gap-3">
      <Input label="Title" required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Call back tomorrow"/>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Type" value={type} onChange={e=>setType(e.target.value as any)} options={Object.entries(TASK_TYPE_META).map(([v,l])=>({value:v,label:l.label}))}/>
        <Select label="Priority" value={priority} onChange={e=>setPriority(e.target.value as any)} options={Object.entries(TASK_PRIORITY_META).map(([v,l])=>({value:v,label:l.label}))}/>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Due date" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
        <Input label="Due time" type="time" value={dueTime} onChange={e=>setDueTime(e.target.value)}/>
      </div>
      <Select label="Assignee" required value={assignee} onChange={e=>setAssignee(e.target.value)} options={db.team.map(t=>({value:t.id,label:t.name}))}/>
      <Textarea label="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/>
    </div>
  </Modal>);
}

function TrialModal({leadId,open,onClose}:{leadId:string;open:boolean;onClose:()=>void}){
  const actions=useActions(); const {db}=useApp();
  const [type,setType]=useState<AppointmentType>('FREE_TRIAL'); const [date,setDate]=useState(format(new Date(),'yyyy-MM-dd')); const [time,setTime]=useState(format(addMinutes(new Date(),30),'HH:mm')); const [staff,setStaff]=useState(db.team[0]?.id||''); const [notes,setNotes]=useState('');
  function submit(){ if(!staff) return; actions.bookAppointment(leadId,{type,date,time,staffId:staff,notes:notes.trim()||undefined}); onClose(); setNotes(''); }
  return(<Modal open={open} onClose={onClose} title="Book trial/appointment" footer={<Button onClick={submit}>Book</Button>}>
    <div className="flex flex-col gap-3">
      <Select label="Type" value={type} onChange={e=>setType(e.target.value as any)} options={Object.entries(APPOINTMENT_TYPE_META).map(([v,l])=>({value:v,label:l.label}))}/>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
        <Input label="Time" type="time" value={time} onChange={e=>setTime(e.target.value)}/>
      </div>
      <Select label="Staff" required value={staff} onChange={e=>setStaff(e.target.value)} options={db.team.map(t=>({value:t.id,label:t.name}))}/>
      <Textarea label="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/>
    </div>
  </Modal>);
}

function ConvertMemberModal({leadId,open,onClose}:{leadId:string;open:boolean;onClose:()=>void}){
  const actions=useActions(); const {db}=useApp();
  const [planId,setPlanId]=useState(db.plans[0]?.id||''); const [startDate,setStartDate]=useState(format(new Date(),'yyyy-MM-dd')); const [amount,setAmount]=useState(db.plans[0]?.price||0); const [mode,setMode]=useState<'CASH'|'UPI'|'CARD'|'BANK_TRANSFER'>('UPI');
  useMemo(()=>{ const p=db.plans.find(x=>x.id===planId); if(p) setAmount(p.price); },[planId,db.plans]);
  function submit(){ if(amount<=0) return; actions.convertToMember(leadId,{planId,startDate,amountPaid:amount,paymentMode:mode}); onClose(); }
  return(<Modal open={open} onClose={onClose} title="Convert to member" footer={<Button onClick={submit} disabled={amount<=0}>Convert</Button>}>
    <div className="flex flex-col gap-3">
      <Select label="Membership plan" value={planId} onChange={e=>setPlanId(e.target.value)} options={db.plans.map(p=>({value:p.id,label:`${p.name} — ${formatINR(p.price)}/${p.durationMonths}m`}))}/>
      <Input label="Start date" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/>
      <Input label="Amount paid (₹)" type="number" min={1} step={1} value={amount} onChange={e=>setAmount(Number(e.target.value))}/>
      <Select label="Payment mode" value={mode} onChange={e=>setMode(e.target.value as any)} options={[{value:'UPI',label:'UPI'},{value:'CARD',label:'Card'},{value:'CASH',label:'Cash'},{value:'BANK_TRANSFER',label:'Bank Transfer'}]}/>
    </div>
  </Modal>);
}

function AssignModal({leadId,open,onClose}:{leadId:string;open:boolean;onClose:()=>void}){
  const actions=useActions(); const {db}=useApp();
  const lead=db.leads.find(l=>l.id===leadId);
  const [assignee,setAssignee]=useState(lead?.assignedToId||'');
  useMemo(()=>{ const l=db.leads.find(x=>x.id===leadId); setAssignee(l?.assignedToId||''); },[leadId,db.leads]);
  function submit(){ actions.assignLead(leadId,assignee||null); onClose(); }
  return(<Modal open={open} onClose={onClose} title="Assign lead" footer={<Button onClick={submit}>Save</Button>}>
    <Select label="Salesperson" value={assignee} onChange={e=>setAssignee(e.target.value)} options={[{value:'',label:'Unassigned'},...db.team.map(t=>({value:t.id,label:t.name}))]}/>
  </Modal>);
}

function MoveStageModal({leadId,open,onClose}:{leadId:string;open:boolean;onClose:()=>void}){
  const actions=useActions(); const {db}=useApp();
  const lead=db.leads.find(l=>l.id===leadId);
  const [status,setStatus]=useState<LeadStatus>(lead?.status||'NEW'); const [lostReason,setLostReason]=useState('');
  useMemo(()=>{ const l=db.leads.find(x=>x.id===leadId); setStatus(l?.status||'NEW'); setLostReason(l?.lostReason||''); },[leadId,db.leads]);
  function submit(){ actions.moveLeadStage(leadId,status,status==='LOST'?lostReason||undefined:undefined); onClose(); }
  const showLost=status==='LOST';
  return(<Modal open={open} onClose={onClose} title="Move stage" footer={<Button onClick={submit} disabled={showLost && !lostReason.trim()}>Update</Button>}>
    <div className="flex flex-col gap-3">
      <Select label="Stage" value={status} onChange={e=>setStatus(e.target.value as LeadStatus)} options={PIPELINE_ORDER.map(s=>({value:s,label:s.replace(/_/g,' ')}))}/>
      {showLost && <Select label="Lost reason" required value={lostReason} onChange={e=>setLostReason(e.target.value)} options={[
        {value:'',label:'Select reason'},
        {value:'Price',label:'Price'},
        {value:'Not Interested',label:'Not Interested'},
        {value:'Joined Competitor',label:'Joined Competitor'},
        {value:'No Response',label:'No Response'},
        {value:'Location',label:'Location'},
        {value:'Timing',label:'Timing'},
        {value:'Other',label:'Other'},
      ]}/>}
    </div>
  </Modal>);
}
