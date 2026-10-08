import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Instagram, Mail, MapPin, Menu, Phone, X } from 'lucide-react';
import { SITE, OPENING_HOURS } from '@/constants/content';
import { Button } from '@/components/ui/Button';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/programs', label: 'Programs' },
  { to: '/trainers', label: 'Trainers' },
  { to: '/memberships', label: 'Memberships' },
  { to: '/testimonials', label: 'Stories' },
  { to: '/contact', label: 'Contact' },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-ink/[0.08] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fit-500 text-[12px] font-bold text-white">
              FG
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">{SITE.name}</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-fit-600' : 'text-ink/65 hover:text-ink'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <a
              href={SITE.phoneHref}
              className="hidden items-center gap-1.5 text-[13px] font-medium text-ink/60 transition-colors hover:text-ink lg:flex"
            >
              <Phone className="h-3.5 w-3.5" />
              {SITE.phone}
            </a>
            <Button to="/join" as={Link} className="hidden sm:inline-flex" size="sm">
              Book a free trial
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              icon={open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            >
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>

        {open ? (
          <nav className="border-t border-ink/[0.08] bg-white px-4 py-3 md:hidden">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-fit-50 text-fit-700' : 'text-ink/70'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Button to="/join" as={Link} className="mt-2 w-full" size="sm">
              Book a free trial
            </Button>
          </nav>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-24 border-t border-ink/[0.08] bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fit-500 text-[12px] font-bold text-white">
                FG
              </span>
              <span className="text-lg font-semibold tracking-tight">{SITE.name}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{SITE.tagline}</p>
            <p className="mt-4 text-[13px] text-white/45">
              {SITE.memberCount.toLocaleString('en-IN')} members · {SITE.yearsOpen} years
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Explore</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[13px] text-white/60 transition-colors hover:text-fit-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Opening hours</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {OPENING_HOURS.map((h) => (
                <li key={h.day} className="flex justify-between gap-3 text-[13px] text-white/60">
                  <span>{h.day}</span>
                  <span className="tabular-nums text-white/45">
                    {h.open} – {h.close}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Visit us</h3>
            <ul className="mt-3 flex flex-col gap-3 text-[13px] text-white/60">
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fit-400" />
                <span>{SITE.address}</span>
              </li>
              <li>
                <a href={SITE.phoneHref} className="flex gap-2 transition-colors hover:text-fit-400">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fit-400" />
                  {SITE.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="flex gap-2 transition-colors hover:text-fit-400">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fit-400" />
                  {SITE.email}
                </a>
              </li>
              <li className="flex gap-2">
                <Instagram className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fit-400" />
                {SITE.instagram}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-[12px] text-white/40 sm:flex-row sm:px-6">
            <p>
              © {new Date().getFullYear()} {SITE.legalName}. All rights reserved.
            </p>
            <Link to="/admin" className="transition-colors hover:text-fit-400">
              Staff login →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
