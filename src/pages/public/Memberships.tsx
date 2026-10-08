import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, Divider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatINR } from '@/constants';
import { Check } from 'lucide-react';

export default function MembershipsPage() {
  const { db } = useApp();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Memberships" subtitle="Flexible plans that scale with your goals" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {db.plans
          .slice()
          .sort((a,b)=>a.sortOrder-b.sortOrder)
          .map((p) => (
            <Card key={p.id} className={p.highlight ? 'ring-2 ring-fit-500/20' : ''}>
              <div className="flex flex-col p-5">
                {p.highlight && <span className="mb-2 inline-flex w-fit rounded-full bg-fit-500/10 px-2 py-0.5 text-[11px] font-medium text-fit-700">Most popular</span>}
                <h3 className="text-base font-semibold text-ink">{p.name}</h3>
                <p className="mt-1 text-[13px] text-ink/55">{p.tagline}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-ink">{formatINR(p.price)}</span>
                  <span className="mb-1 text-[12px] text-ink/45">/{p.durationMonths} month{p.durationMonths>1?'s':''}</span>
                </div>
                <Divider className="my-4" />
                <ul className="flex flex-col gap-2">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-ink/70">
                      <Check className="mt-0.5 h-4 w-4 text-fit-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Button as={Link} to="/join" variant={p.highlight ? 'primary' : 'outline'} className="w-full justify-center">Get started</Button>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
