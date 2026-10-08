import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, EmptyState } from '@/components/ui/Card';
import { DataTable, type Column, Tabs } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { CheckCheck, ExternalLink } from 'lucide-react';
import type { AppNotification } from '@/types';

type Tab = 'ALL' | 'UNREAD' | 'READ';

export default function NotificationsPage() {
  const { db, markNotificationsRead } = useApp();
  const [tab, setTab] = useState<Tab>('ALL');

  const notifications = useMemo(
    () =>
      db.notifications
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [db.notifications],
  );

  const counts = useMemo(
    () => ({
      ALL: notifications.length,
      UNREAD: notifications.filter((n) => !n.read).length,
      READ: notifications.filter((n) => n.read).length,
    }),
    [notifications],
  );

  const rows = useMemo(
    () => (tab === 'ALL' ? notifications : notifications.filter((n) => (tab === 'UNREAD' ? !n.read : n.read))),
    [notifications, tab],
  );

  const columns: Column<AppNotification>[] = [
    {
      key: 'title',
      header: 'Notification',
      render: (n) => (
        <div className="flex items-start gap-2">
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fit-500" />}
          <div className="min-w-0">
            <p className={`text-[13px] ${n.read ? 'text-ink/65' : 'font-medium text-ink'}`}>{n.title}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink/55">{n.body}</p>
          </div>
        </div>
      ),
    },
    { key: 'kind', header: 'Type', render: (n) => <span className="text-[12px] text-ink/60">{n.kind.replace(/_/g, ' ')}</span> },
    { key: 'when', header: 'When', render: (n) => <span className="text-[12px] text-ink/60">{new Date(n.createdAt).toLocaleString()}</span> },
    {
      key: 'actions',
      header: '',
      render: (n) => (
        <div className="flex justify-end gap-1">
          {n.href && (
            <Link to={n.href} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-ink/65 hover:bg-ink/[0.04]">
              Open <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          {!n.read && (
            <Button size="sm" variant="ghost" onClick={() => markNotificationsRead()}>
              Mark read
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Alerts generated from live lead, follow-up and membership activity"
        action={
          <Button size="sm" variant="outline" onClick={() => markNotificationsRead()} icon={<CheckCheck className="h-4 w-4" />} disabled={counts.UNREAD === 0}>
            Mark all read
          </Button>
        }
      />
      <Card padded>
        <Tabs
          tabs={[
            { value: 'ALL', label: 'All', count: counts.ALL },
            { value: 'UNREAD', label: 'Unread', count: counts.UNREAD },
            { value: 'READ', label: 'Read', count: counts.READ },
          ]}
          active={tab}
          onChange={(v) => setTab(v as Tab)}
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          empty={<EmptyState title="Nothing here yet" message="Notifications appear as leads and follow-ups move through the pipeline." />}
        />
      </Card>
    </div>
  );
}