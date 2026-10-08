import { Link } from 'react-router-dom';
import { SITE, OPENING_HOURS } from '@/constants/content';
import { PageHeader, Card, Divider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Contact" subtitle="We're here to help you get started" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card padded>
          <h3 className="text-base font-semibold text-ink">Get in touch</h3>
          <Divider className="my-4" />
          <div className="flex flex-col gap-3">
            <a href={SITE.phoneHref} className="flex items-center gap-3 rounded-lg border border-ink/[0.08] p-3 hover:bg-ink/[0.03]">
              <Phone className="h-4 w-4 text-ink/50" />
              <span className="text-[13px] text-ink">{SITE.phone}</span>
            </a>
            <a href={`mailto:${SITE.email}`} className="flex items-center gap-3 rounded-lg border border-ink/[0.08] p-3 hover:bg-ink/[0.03]">
              <Mail className="h-4 w-4 text-ink/50" />
              <span className="text-[13px] text-ink">{SITE.email}</span>
            </a>
            <a href={SITE.mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-ink/[0.08] p-3 hover:bg-ink/[0.03]">
              <MapPin className="h-4 w-4 text-ink/50" />
              <span className="text-[13px] text-ink">{SITE.address}</span>
            </a>
            <a href={`https://wa.me/${SITE.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-ink/[0.08] p-3 hover:bg-ink/[0.03]">
              <MessageCircle className="h-4 w-4 text-ink/50" />
              <span className="text-[13px] text-ink">Chat on WhatsApp</span>
            </a>
          </div>
        </Card>
        <Card padded>
          <h3 className="text-base font-semibold text-ink">Opening hours</h3>
          <Divider className="my-4" />
          <div className="flex flex-col gap-3">
            {OPENING_HOURS.map((h) => (
              <div key={h.day} className="flex items-center justify-between rounded-lg border border-ink/[0.08] p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-ink/50" />
                  <span className="text-[13px] text-ink">{h.day}</span>
                </div>
                <span className="text-[13px] text-ink/70">{h.open} – {h.close}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button as={Link} to="/join" className="w-full justify-center">Book free trial</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
