// ===========================================================
// Notifications
//
// Two kinds, deliberately separated:
//
//   1. Events  — persisted once when something happens (a lead
//      arrives, a trial is booked, a membership is sold). They
//      carry a read/unread flag and form an audit history.
//
//   2. Alerts  — derived live from current state (an overdue
//      task, a trial in an hour, a membership about to lapse).
//      Never persisted, so reloading the app cannot pile up
//      hundreds of duplicate alerts.
// ===========================================================

import { differenceInCalendarDays, differenceInMinutes, parseISO } from 'date-fns';

import type {
  AppNotification,
  Database,
  NotificationKind,
} from '@/types';
import { newId } from '@/lib/id';
import { isEffectiveOverdue } from './taskHelpers';
import { MEMBER_STATUS_META, memberStatus } from '@/constants';

export interface AlertItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  severity: 'info' | 'warn' | 'critical';
}

export function createNotification(input: {
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  recipientId?: string | null;
}): AppNotification {
  const now = new Date().toISOString();
  return {
    id: newId('ntf'),
    createdAt: now,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    recipientId: input.recipientId ?? null,
    read: false,
  };
}

// ---------------------------------------------------------
// Live alerts
// ---------------------------------------------------------

const TRIAL_SOON_MINUTES = 120;
const RENEWAL_WINDOW_DAYS = 14;
export function deriveAlerts(db: Database | null | undefined, now = new Date()): AlertItem[] {
  if (!db) return [];
  const alerts: AlertItem[] = [];

  // Overdue follow-ups
  for (const task of db.tasks) {
    if (!isEffectiveOverdue(task, now)) continue;
    const lead = db.leads.find((l) => l.id === task.leadId);
    const owner = db.team.find((t) => t.id === task.assigneeId);
    const hoursLate = Math.max(1, Math.round((now.getTime() - new Date(task.dueAt).getTime()) / 36e5));
    alerts.push({
      id: `alert_overdue_${task.id}`,
      kind: 'FOLLOW_UP_OVERDUE',
      title: `Overdue: ${task.title}`,
      body: `${lead?.name ?? 'Unknown lead'} — ${hoursLate}h late${owner ? ` · ${owner.name}` : ''}`,
      href: task.leadId ? `/admin/leads/${task.leadId}` : '/admin/follow-ups',
      severity: 'critical',
    });
  }

  // Hot leads nobody has spoken to
  for (const lead of db.leads) {
    if (lead.archivedAt) continue;
    if (lead.status !== 'NEW' || lead.score < 70) continue;
    alerts.push({
      id: `alert_hot_${lead.id}`,
      kind: 'HIGH_INTENT_LEAD',
      title: `Hot lead waiting — ${lead.name}`,
      body: `Score ${lead.score} and still no contact. ${lead.phone}`,
      href: `/admin/leads/${lead.id}`,
      severity: 'critical',
    });
  }

  // Trials starting soon
  for (const appt of db.appointments) {
    if (appt.status === 'CANCELLED' || appt.status === 'ATTENDED') continue;
    const startsAt = parseISO(`${appt.date}T${appt.time}:00`);
    const mins = differenceInMinutes(startsAt, now);
    if (mins < 0 || mins > TRIAL_SOON_MINUTES) continue;
    const lead = db.leads.find((l) => l.id === appt.leadId);
    const staff = db.team.find((t) => t.id === appt.staffId);
    alerts.push({
      id: `alert_trial_${appt.id}`,
      kind: 'TRIAL_REMINDER',
      title: mins <= 60 ? `Trial in ${mins} min` : 'Trial starting soon',
      body: `${lead?.name ?? 'Lead'} at ${appt.time}${staff ? ` with ${staff.name}` : ''}`,
      href: appt.leadId ? `/admin/leads/${appt.leadId}` : '/admin/appointments',
      severity: 'info',
    });
  }

  // Trials that nobody marked attended
  for (const appt of db.appointments) {
    if (appt.status !== 'ATTENDED') continue;
    const lead = db.leads.find((l) => l.id === appt.leadId);
    if (!lead || lead.status === 'MEMBERSHIP' || lead.status === 'LOST') continue;
    if (lead.status !== 'TRIAL_BOOKED') continue;
    alerts.push({
      id: `alert_attend_${appt.id}`,
      kind: 'TRIAL_ATTENDED',
      title: `Trial done — ${lead.name}`,
      body: 'Mark the outcome and close the membership.',
      href: `/admin/leads/${lead.id}`,
      severity: 'warn',
    });
  }

  // Renewals
  for (const member of db.members) {
    const days = differenceInCalendarDays(parseISO(member.expiryDate), now);
    if (days > RENEWAL_WINDOW_DAYS) continue;
    const state = memberStatus(member, now);
    alerts.push({
      id: `alert_member_${member.id}`,
      kind: 'MEMBER_EXPIRING',
      title: days < 0 ? `Expired: ${member.name}` : `${member.name} expires in ${days}d`,
      body:
        days < 0
          ? 'Renewal needed.'
          : `${MEMBER_STATUS_META[state].label} — worth a renewal call.`,
      href: '/admin/members',
      severity: days < 0 ? 'critical' : 'warn',
    });
  }

  const order = { critical: 0, warn: 1, info: 2 } as const;
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------
// Read state
// ---------------------------------------------------------

export function unreadEventCount(notifications: AppNotification[] | undefined | null): number {
  if (!notifications) return 0;
  return notifications.filter((n) => !n.read).length;
}
