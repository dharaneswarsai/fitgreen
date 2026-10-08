import { Link } from 'react-router-dom';
import { PROGRAMS } from '@/constants/content';
import { PageHeader, Card, Divider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, BarChart3 } from 'lucide-react';

export default function ProgramsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Programs" subtitle="Choose the right track for your goal" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PROGRAMS.map((p) => (
          <Card key={p.slug} className="flex flex-col">
            <div className="flex-1 p-5">
              <h3 className="text-base font-semibold text-ink">{p.name}</h3>
              <p className="mt-1 text-[13px] text-ink/55">{p.tagline}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-ink/70">{p.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px]">{p.difficulty}</span>
                <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] flex items-center gap-1"><Clock className="h-3.5 w-3.5"/>{p.duration}</span>
                <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5"/>{p.sessions}</span>
              </div>
              <Divider className="my-4" />
              <ul className="flex flex-col gap-2">
                {p.outcomes.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink/70">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-fit-500" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-ink/[0.06] px-5 py-3">
              <Button as={Link} to="/join" size="sm" className="w-full justify-center">Book free trial</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
