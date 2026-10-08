import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useActions } from '@/context/AppContext';
import type { Lead, LeadStatus } from '@/types';
import { PIPELINE_ORDER } from '@/constants';
import { Card, PageHeader, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, ScoreBadge, StatusBadge, SourceBadge } from '@/components/ui/Badges';
import { Modal } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Field';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function PipelinePage() {
  const { db } = useApp();
  const actions = useActions();
  const [lostModal, setLostModal] = useState<{ leadId: string; from: LeadStatus } | null>(null);
  const [lostReason, setLostReason] = useState('');

  const grouped = useMemo(() => {
    const g = Object.fromEntries(PIPELINE_ORDER.map((s) => [s, [] as Lead[]]));
    for (const l of db.leads) {
      if (l.archivedAt) continue;
      if (g[l.status]) g[l.status].push(l);
    }
    for (const s of PIPELINE_ORDER) g[s].sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    return g;
  }, [db.leads]);

  function move(leadId: string, from: LeadStatus, to: LeadStatus) {
    if (to === from) return;
    if (to === 'LOST') {
      setLostModal({ leadId, from });
      return;
    }
    actions.moveLeadStage(leadId, to);
  }

  function confirmLost() {
    if (!lostModal || !lostReason.trim()) return;
    actions.moveLeadStage(lostModal.leadId, 'LOST', lostReason.trim());
    setLostModal(null);
    setLostReason('');
  }

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Drag-lead style stage movement (keyboard + buttons)" action={<Button size="sm" icon={<Plus className="h-4 w-4"/>} onClick={()=>{}}>Add lead</Button>} />
      <div className="grid gap-4 overflow-x-auto md:grid-cols-3 xl:grid-cols-7">
        {PIPELINE_ORDER.map((s) => (
          <Card key={s} className="min-h-[70vh] min-w-[240px]">
            <div className="flex items-center justify-between border-b border-ink/[0.06] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold uppercase tracking-wide text-ink/70">{s.replace(/_/g,' ')}</span>
                <span className="rounded-full bg-ink/[0.06] px-1.5 py-0.5 text-[11px]">{grouped[s].length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {grouped[s].length === 0 && <EmptyState title="No leads" message=""/>}
              {grouped[s].map((l) => {
                const idx = PIPELINE_ORDER.indexOf(l.status);
                const prev = idx>0?PIPELINE_ORDER[idx-1]:null;
                const next = idx<PIPELINE_ORDER.length-1?PIPELINE_ORDER[idx+1]:null;
                return (
                  <div key={l.id} className="flex flex-col gap-2 rounded-md border border-ink/[0.08] bg-white p-2 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/admin/leads/${l.id}`} className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Avatar name={l.name} size="sm"/>
                          <span className="truncate text-[13px] font-medium text-ink">{l.name}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <ScoreBadge score={l.score} size="sm"/>
                          <SourceBadge lead={l} />
                        </div>
                      </Link>
                      <StatusBadge lead={l}/>
                    </div>
                    <div className="flex items-center justify-between">
                      {prev ? <Button size="sm" variant="outline" icon={<ChevronLeft className="h-3.5 w-3.5"/>} onClick={()=>move(l.id,l.status,prev)}>Back</Button> : <span/>}
                      {next ? <Button size="sm" variant="outline" onClick={()=>move(l.id,l.status,next)}>Next <ChevronRight className="h-3.5 w-3.5"/></Button> : <span/>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!lostModal} onClose={()=>{setLostModal(null);setLostReason('');}} title="Lost reason" footer={<Button onClick={confirmLost} disabled={!lostReason.trim()}>Move to Lost</Button>}>
        <Select label="Reason" required value={lostReason} onChange={e=>setLostReason(e.target.value)} options={[
          {value:'',label:'Select reason'},
          {value:'Price',label:'Price'},
          {value:'Not Interested',label:'Not Interested'},
          {value:'Joined Competitor',label:'Joined Competitor'},
          {value:'No Response',label:'No Response'},
          {value:'Location',label:'Location'},
          {value:'Timing',label:'Timing'},
          {value:'Other',label:'Other'},
        ]}/>
      </Modal>
    </div>
  );
}
