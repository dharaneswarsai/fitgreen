import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChartColumn,
  CheckSquare,
  ExternalLink,
  Kanban,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  UserCog,
  Users,
  BadgeCheck,
  RotateCcw,
  X,
} from 'lucide-react';
import { NAV_SECTIONS, TEAM_ROLE_META } from '@/constants';
import { useApp } from '@/context/AppContext';
import { activeLeads, bucketTasks } from '@/services/metrics';
import type { TeamRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Badges';
import { Drawer } from '@/components/ui/Overlay';
import { Badge, Divider } from '@/components/ui/Card';
import { ToastHost } from '@/components/ui/ToastHost';

const ICONS = {
  'layout-dashboard': LayoutDashboard,
  chart: ChartColumn,
  users: Users,
  kanban: Kanban,
  'check-square': CheckSquare,
  calendar: CalendarDays,
  'badge-check': BadgeCheck,
  megaphone: Megaphone,
  'user-cog': UserCog,
  bell: Bell,
  settings: Settings,
} as const;

type IconName = keyof typeof ICONS;

export function AdminLayout() {
  const { db, viewer, setViewer, alerts, unreadCount, resetDemo, backend } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileNav(false);
    setBellOpen(false);
  }, [location.pathname]);

  // "/" focuses search, the way every other dashboard behaves.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!roleOpen) return;
    const handler = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setRoleOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [roleOpen]);

  const badges = useMemo(() => {
    const open = activeLeads(db.leads ?? []);
    const tasks = bucketTasks((db.tasks ?? []).filter((t) => t.status !== 'COMPLETED'));
    return {
      leadCount: open.length,
      taskCount: tasks.overdue.length + tasks.today.length,
      notificationCount: unreadCount,
    } as const;
  }, [db.leads, db.tasks, unreadCount]);

  const viewerMember =
    viewer === 'ADMIN' ? null : db.team.find((t) => t.role === viewer) ?? null;

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/admin/leads?q=${encodeURIComponent(query)}`);
  }

  const nav = (
    <nav className="flex flex-col gap-5 px-3">
      {NAV_SECTIONS.map((group) => (
        <div key={group.section}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/35">
            {group.section}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon as IconName] ?? LayoutDashboard;
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-ink text-white'
                        : 'text-ink/65 hover:bg-ink/[0.05] hover:text-ink'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 ? (
                    <span className="rounded-full bg-fit-500 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink/[0.08] bg-white lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-ink/[0.08] px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fit-500 text-[11px] font-bold text-white">
            FG
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">FITGREEN</span>
          <span className="ml-auto rounded bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-ink/50">
            Admin
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">{nav}</div>
        <div className="border-t border-ink/[0.08] p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink/60 transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            <ExternalLink className="h-4 w-4" />
            View public site
          </Link>
        </div>
      </aside>

      {/* Mobile nav drawer */}
      {mobileNav ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} aria-hidden="true" />
          <div className="relative flex h-full w-64 flex-col bg-white">
            <div className="flex h-14 items-center justify-between border-b border-ink/[0.08] px-4">
              <span className="text-[15px] font-semibold text-ink">FITGREEN</span>
              <Button variant="ghost" size="sm" onClick={() => setMobileNav(false)} icon={<X className="h-4 w-4" />}>
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">{nav}</div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ink/[0.08] bg-white/90 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
            icon={<Menu className="h-4 w-4" />}
          >
            <span className="sr-only">Menu</span>
          </Button>

          <form onSubmit={submitSearch} className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              aria-label="Search leads"
              className="h-9 w-full rounded-lg border border-ink/10 bg-ink/[0.03] pl-9 pr-10 text-[13px] text-ink placeholder:text-ink/35 focus:border-fit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fit-500/15"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-ink/10 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink/40">
              /
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <Badge
              className="hidden sm:inline-flex"
              style={
                backend === 'supabase'
                  ? { bg: 'bg-fit-50', text: 'text-fit-700', border: 'border-fit-200', dot: 'bg-fit-500' }
                  : { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' }
              }
              dot
            >
              {backend === 'supabase' ? 'Supabase' : 'Local demo'}
            </Badge>

            <button
              type="button"
              aria-label={`Notifications (${unreadCount} unread)`}
              onClick={() => setBellOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 transition-colors hover:bg-ink/[0.05] hover:text-ink"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fit-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-fit-500" />
                </span>
              ) : null}
            </button>

            {/* Demo persona switcher */}
            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setRoleOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={roleOpen}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-ink/[0.05]"
              >
                {viewerMember ? (
                  <Avatar name={viewerMember.name} size="sm" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    FG
                  </span>
                )}
                <span className="hidden text-left sm:block">
                  <span className="block text-[12px] font-medium leading-tight text-ink">
                    {viewerMember ? viewerMember.name.split(' ')[0] : 'Owner'}
                  </span>
                  <span className="block text-[10px] leading-tight text-ink/45">
                    {TEAM_ROLE_META[viewer].label}
                  </span>
                </span>
              </button>

              {roleOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-xl"
                >
                  <div className="border-b border-ink/[0.08] px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">
                      Demo role
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-ink/50">
                      Switch persona to see how the dashboard changes. Data is never modified.
                    </p>
                  </div>
                  <div className="p-1.5">
                    {(['ADMIN', 'SALES_MANAGER', 'SALES_EXEC'] as TeamRole[]).map((role) => {
                      const person = db.team.find((t) => t.role === role);
                      const on = role === viewer;
                      return (
                        <button
                          key={role}
                          type="button"
                          role="menuitemradio"
                          aria-checked={on}
                          onClick={() => {
                            setViewer(role);
                            setRoleOpen(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                            on ? 'bg-fit-50' : 'hover:bg-ink/[0.04]'
                          }`}
                        >
                          <Avatar name={person?.name ?? 'Owner'} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-ink">
                              {person?.name ?? 'Gym Owner'}
                            </span>
                            <span className="block text-[11px] text-ink/50">
                              {TEAM_ROLE_META[role].label}
                            </span>
                          </span>
                          {on ? <span className="h-1.5 w-1.5 rounded-full bg-fit-500" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <Divider />
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRoleOpen(false);
                        navigate('/');
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] text-ink/65 transition-colors hover:bg-ink/[0.04] hover:text-ink"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Public website
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleOpen(false);
                        void resetDemo();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] text-ink/65 transition-colors hover:bg-ink/[0.04] hover:text-ink"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset demo data
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] text-ink/30"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out (demo)
                      <span className="ml-auto text-[10px]">n/a</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Notification panel */}
      <Drawer
        open={bellOpen}
        onClose={() => setBellOpen(false)}
        title="Notifications"
        subtitle={`${alerts.length} item${alerts.length === 1 ? '' : 's'} need attention`}
        footer={
          <Button variant="outline" onClick={() => setBellOpen(false)}>
            Close
          </Button>
        }
      >
        {alerts.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink/45">
            Nothing needs attention right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  to={alert.href}
                  onClick={() => setBellOpen(false)}
                  className="flex gap-3 rounded-xl border border-ink/[0.08] p-3 transition-colors hover:border-ink/20 hover:bg-ink/[0.02]"
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      alert.severity === 'critical'
                        ? 'bg-red-500'
                        : alert.severity === 'warn'
                          ? 'bg-amber-500'
                          : 'bg-ink/25'
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{alert.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink/55">
                      {alert.body}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Drawer>

      <ToastHost />
    </div>
  );
}
