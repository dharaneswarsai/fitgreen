import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Users, CalendarCheck, Trophy } from 'lucide-react';
import { SITE, TRUST_POINTS } from '@/constants/content';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center rounded-full border border-fit-200 bg-fit-50 px-3 py-0.5 text-[11px] font-medium text-fit-700">
              {SITE.memberCount.toLocaleString('en-IN')} members &bull; {SITE.yearsOpen} years
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              {SITE.tagline}
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/60">
              Get stronger, leaner, and more consistent with a simple process: capture your goal,
              book a free trial, show up, and start seeing results.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button as={Link} to="/join" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                Book a free trial
              </Button>
              <Button as={Link} to="/programs" variant="outline" size="lg">
                View programs
              </Button>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              <li className="flex items-center gap-2 text-[13px] text-ink/60">
                <CheckCircle2 className="h-4 w-4 text-fit-500" />
                Free trial in 30 mins
              </li>
              <li className="flex items-center gap-2 text-[13px] text-ink/60">
                <CalendarCheck className="h-4 w-4 text-fit-500" />
                Flexible morning/eve slots
              </li>
              <li className="flex items-center gap-2 text-[13px] text-ink/60">
                <Trophy className="h-4 w-4 text-fit-500" />
                Coaches who actually coach
              </li>
            </ul>
          </div>

          <div className="relative hidden md:block">
            <Card padded className="overflow-hidden p-0">
              <div className="relative h-80 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(0,166,80,0.16),rgba(255,255,255,1)_70%)]" />
              <div className="absolute inset-0 flex items-end p-6">
                <Card className="w-full bg-white/95 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.08em] text-ink/40">Live members</p>
                      <p className="text-2xl font-semibold tabular-nums text-ink">
                        {SITE.memberCount.toLocaleString('en-IN')}+
                      </p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fit-500 text-white">
                      <Users className="h-4 w-4" />
                    </span>
                  </div>
                </Card>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-ink/[0.08] bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {TRUST_POINTS.map((t) => (
            <Card key={t} className="flex items-center justify-center px-3 py-4 text-center">
              <p className="text-[12px] font-medium text-ink/70">{t}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Ready to start your first session?
          </h2>
          <p className="mt-2 text-[15px] text-ink/55">
            Fill 30 seconds and we'll get you on the floor this week.
          </p>
          <div className="mt-5 flex justify-center">
            <Button as={Link} to="/join" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Book a free trial
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
