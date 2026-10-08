import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, Divider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { SITE, OPENING_HOURS } from '@/constants/content';
import { HOT_SCORE_THRESHOLD } from '@/constants';
import { RotateCcw, Database, ShieldCheck, Info } from 'lucide-react';

export default function SettingsPage() {
  const { db, backend, viewer, resetDemo } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    await resetDemo();
    setResetting(false);
    setConfirmOpen(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Demo configuration and gym details" />

      <Card padded>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-ink/50" />
          <h3 className="text-[14px] font-semibold text-ink">Data &amp; backend</h3>
        </div>
        <Divider className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Storage backend" value={backend === 'supabase' ? 'Supabase' : 'Browser (localStorage)'} />
          <Row label="Demo persona" value={viewer === 'ADMIN' ? 'Owner (all leads)' : viewer === 'SALES_MANAGER' ? 'Sales manager' : 'Sales exec (assigned only)'} />
          <Row label="Leads" value={String(db.leads.length)} />
          <Row label="Members" value={String(db.members.length)} />
          <Row label="Open follow-ups" value={String(db.tasks.filter((t) => t.status === 'PENDING').length)} />
          <Row label="Appointments" value={String(db.appointments.length)} />
        </div>
        <Divider className="my-4" />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)} icon={<RotateCcw className="h-4 w-4" />}>
            Reset demo data
          </Button>
          <span className="text-[12px] text-ink/45">Restores the deterministic seed. All local changes are discarded.</span>
        </div>
      </Card>

      <Card padded>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-ink/50" />
          <h3 className="text-[14px] font-semibold text-ink">Lead scoring</h3>
        </div>
        <Divider className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Hot threshold" value={`${HOT_SCORE_THRESHOLD} points`} />
          <Row label="Bands" value="Cold 0–34 · Warm 35–64 · Hot 65–100" />
        </div>
        <p className="mt-3 flex items-start gap-2 text-[12px] text-ink/50">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Scores are computed deterministically from the lead record, so the same lead always scores the same.
        </p>
      </Card>

      <Card padded>
        <h3 className="text-[14px] font-semibold text-ink">Gym details</h3>
        <Divider className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Name" value={SITE.legalName} />
          <Row label="Phone" value={SITE.phone} />
          <Row label="WhatsApp" value={SITE.whatsapp} />
          <Row label="Email" value={SITE.email} />
          <Row label="Address" value={SITE.address} />
          <Row label="Hours" value={OPENING_HOURS.map((h) => `${h.day}: ${h.open}–${h.close}`).join(' · ')} />
        </div>
        <p className="mt-3 text-[12px] text-ink/45">
          Edit these in <code className="rounded bg-ink/[0.05] px-1">src/constants/content.ts</code>. They drive the public site copy.
        </p>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button onClick={handleReset} loading={resetting}>
              Reset
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink/70">
          This clears every change made in the demo — new leads, moved stages, booked trials and converted memberships — and restores
          the original seeded dataset. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-ink/45">{label}</p>
      <p className="mt-0.5 text-[13px] text-ink">{value}</p>
    </div>
  );
}