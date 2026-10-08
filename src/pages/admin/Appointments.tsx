import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useActions } from '@/context/AppContext';
import { format, isSameDay } from 'date-fns';
import { Card, PageHeader, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column, Tabs } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Badges';
import { APPOINTMENT_TYPE_META } from '@/constants';
import { CalendarDays, CheckCircle2, XCircle, Ban, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { addMinutes } from 'date-fns';

type Tab = 'UPCOMING' | 'TODAY' | 'PAST' | 'ALL';

export default function AppointmentsPage() {
  const { db } = useApp();
  const actions = useActions();
  const [tab, setTab] = useState<Tab>('TODAY');
  const [bookOpen, setBookOpen] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const appts = useMemo(() => {
    const now = Date.now();
    return db.appointments
      .map((a) => {
        const at = new Date(a.date + 'T' + a.time);
        return { ...a, at, isPast: at.getTime() < now, isToday: isSameDay(at, new Date()) };
      })
      .sort((a,b)=> a.at.getTime()-b.at.getTime());
  }, [db.appointments]);

  const filtered = useMemo(() => {
    if (tab === 'ALL') return appts;
    if (tab === 'TODAY') return appts.filter((a)=>a.isToday && a.status!=='CANCELLED');
    if (tab === 'UPCOMING') return appts.filter((a)=>!a.isPast && !a.isToday && a.status!=='CANCELLED');
    if (tab === 'PAST') return appts.filter((a)=>a.isPast || a.status==='CANCELLED');
    return appts;
  }, [appts, tab]);

  const counts = useMemo(() => ({
    TODAY: appts.filter((a)=>a.isToday && a.status!=='CANCELLED').length,
    UPCOMING: appts.filter((a)=>!a.isPast && !a.isToday && a.status!=='CANCELLED').length,
    PAST: appts.filter((a)=>a.isPast || a.status==='CANCELLED').length,
    ALL: appts.length,
  }), [appts]);

  const columns: Column<typeof appts[0]>[] = [
    { key:'lead', header:'Lead', render:(a)=>{ const l=db.leads.find(x=>x.id===a.leadId); return l ? (<Link to={`/admin/leads/${l.id}`} className="flex items-center gap-2"><Avatar name={l.name} size="sm"/><span className="truncate font-medium text-ink">{l.name}</span></Link>) : (<span>—</span>);} },
    { key:'type', header:'Type', render:(a)=>{ const m=APPOINTMENT_TYPE_META[a.type]; return (<span>{m.label}</span>);} },
    { key:'time', header:'When', render:(a)=>(<span>{format(a.at,'PPp')}</span>) },
    { key:'staff', header:'Staff', render:(a)=>{ const s=db.team.find(x=>x.id===a.staffId); return s ? (<span className="text-[12px]">{s.name}</span>) : (<span>—</span>);} },
    { key:'status', header:'Status', render:(a)=>(<span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${a.status==='ATTENDED'?'bg-green-50 text-green-700':a.status==='CANCELLED'?'bg-slate-50 text-slate-700':'bg-amber-50 text-amber-700'}`}>{a.status}</span>) },
    { key:'notes', header:'Notes', render:(a)=>(<span className="truncate text-[12px] text-ink/60">{a.notes||'—'}</span>) },
    { key:'actions', header:'Actions', render:(a)=>(<div className="flex justify-end gap-1">
      {a.status!=='ATTENDED' && <Button size="sm" variant="ghost" onClick={()=>actions.setAppointmentStatus(a.id,'ATTENDED')} icon={<CheckCircle2 className="h-3.5 w-3.5"/>}>Attended</Button>}
      {a.status!=='NO_SHOW' && <Button size="sm" variant="ghost" onClick={()=>actions.setAppointmentStatus(a.id,'NO_SHOW')} icon={<XCircle className="h-3.5 w-3.5"/>}>No show</Button>}
      {a.status!=='CANCELLED' && <Button size="sm" variant="ghost" onClick={()=>actions.cancelAppointment(a.id)} icon={<Ban className="h-3.5 w-3.5"/>}>Cancel</Button>}
    </div>) },
  ];

  return (
    <div>
      <PageHeader title="Appointments" subtitle="Trials and consultations" action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>setView(v=>v==='list'?'calendar':'list')} icon={<CalendarDays className="h-4 w-4"/>}>{view==='list'?'Calendar':'List'}</Button><Button size="sm" onClick={()=>setBookOpen(true)} icon={<Plus className="h-4 w-4"/>}>Book appointment</Button></div>}/>
      <Card padded>
        <Tabs tabs={[{value:'TODAY',label:'Today',count:counts.TODAY},{value:'UPCOMING',label:'Upcoming',count:counts.UPCOMING},{value:'PAST',label:'Past',count:counts.PAST},{value:'ALL',label:'All',count:counts.ALL}]} active={tab} onChange={(v)=>setTab(v as Tab)}/>
        {view==='list' ? <DataTable columns={columns} rows={filtered} rowKey={(r)=>r.id} empty={<EmptyState title="No appointments" message="Book a trial to fill the calendar."/>}/> : <CalendarView appts={appts}/>}
      </Card>
      <BookModal open={bookOpen} onClose={()=>setBookOpen(false)}/>
    </div>
  );
}

function CalendarView({appts}:{appts:Array<any>}) {
  const today = new Date();
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(today); d.setDate(today.getDate()+i); return d; });
  return (
    <div className="mt-3 grid grid-cols-7 gap-2">
      {days.map(d=>{ const list=appts.filter(a=>isSameDay(a.at,d)); return (
        <div key={d.toISOString()} className="flex min-h-[160px] flex-col rounded-md border border-ink/[0.08] bg-white">
          <div className="border-b border-ink/[0.06] px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-ink/60">{format(d,'EEE dd')}</div>
          <div className="flex flex-col gap-1 p-1">
            {list.map(a=>{ const m=APPOINTMENT_TYPE_META[a.type as keyof typeof APPOINTMENT_TYPE_META]; return (
              <div key={a.id} className="rounded-sm bg-ink/[0.04] px-1 py-0.5 text-[11px] leading-tight">
                <div className="font-medium text-ink">{format(a.at,'HH:mm')}</div>
                <div className="truncate text-ink/60">{m.label}</div>
              </div>
            );})}
            {list.length===0 && <div className="p-2 text-center text-[11px] text-ink/30">No bookings</div>}
          </div>
        </div>
      );})}
    </div>
  );
}

function BookModal({open,onClose}:{open:boolean;onClose:()=>void}){
  const {db}=useApp(); const actions=useActions();
  const [leadId,setLeadId]=useState(db.leads[0]?.id||'');
  const [staff,setStaff]=useState(db.team[0]?.id||'');
  const [type,setType]=useState<any>('FREE_TRIAL');
  const [date,setDate]=useState(format(new Date(),'yyyy-MM-dd'));
  const [time,setTime]=useState(format(addMinutes(new Date(),30),'HH:mm'));
  const [notes,setNotes]=useState('');
  function submit(){ if(!leadId||!staff) return; actions.bookAppointment(leadId,{type,date,time,staffId:staff,notes:notes.trim()||undefined}); onClose(); setNotes(''); }
  return(<Modal open={open} onClose={onClose} title="Book appointment" footer={<Button onClick={submit}>Book</Button>}>
    <div className="flex flex-col gap-3">
      <Select label="Lead" required value={leadId} onChange={e=>setLeadId(e.target.value)} options={db.leads.map(l=>({value:l.id,label:l.name}))}/>
      <Select label="Staff" required value={staff} onChange={e=>setStaff(e.target.value)} options={db.team.map(t=>({value:t.id,label:t.name}))}/>
      <Select label="Type" value={type} onChange={e=>setType(e.target.value)} options={Object.entries(APPOINTMENT_TYPE_META).map(([v,l])=>({value:v,label:l.label}))}/>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
        <Input label="Time" type="time" value={time} onChange={e=>setTime(e.target.value)}/>
      </div>
      <Textarea label="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/>
    </div>
  </Modal>);
}
