import { TESTIMONIALS } from '@/constants/content';
import { PageHeader, Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Badges';
import { TrendingUp } from 'lucide-react';

export default function TestimonialsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Stories" subtitle="Real results from real members" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <Card key={t.name} padded>
            <p className="text-[13px] leading-relaxed text-ink/80">“{t.quote}”</p>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-fit-500/[0.06] px-3 py-2">
              <TrendingUp className="h-4 w-4 text-fit-500" />
              <span className="text-[12px] font-medium text-fit-700">{t.result}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-ink/[0.06] pt-4">
              <Avatar name={t.name} size="sm" />
              <div>
                <p className="text-[13px] font-medium text-ink">{t.name}</p>
                <p className="text-[12px] text-ink/45">{t.role}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}