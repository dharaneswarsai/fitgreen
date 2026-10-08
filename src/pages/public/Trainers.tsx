import { TRAINERS } from '@/constants/content';
import { PageHeader, Card, Divider } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Badges';

export default function TrainersPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Trainers" subtitle="Coaches who keep you accountable" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRAINERS.map((t) => (
          <Card key={t.name} padded>
            <div className="flex items-center gap-3">
              <Avatar name={t.name} size="lg" />
              <div>
                <h3 className="text-base font-semibold text-ink">{t.name}</h3>
                <p className="text-[13px] text-ink/55">{t.specialty}</p>
              </div>
            </div>
            <Divider className="my-4" />
            <p className="text-[13px] leading-relaxed text-ink/70">{t.bio}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px]">{t.experience} experience</span>
              <div className="flex flex-wrap gap-1.5">
                {t.credentials.map((c, i) => (
                  <span key={i} className="rounded-full bg-fit-500/10 px-2 py-0.5 text-[11px] text-fit-700">{c}</span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
