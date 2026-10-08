// ===========================================================
// Business metrics
//
// One place for every number the product shows. The Dashboard,
// Analytics, Campaigns and Team screens all call these functions,
// so a conversion rate can never mean two different things in
// two different pages.
//
// Everything here is a pure function of the dataset plus a
// reference `now`, which keeps it trivially testable.
// ===========================================================

import {
  eachMonthOfInterval,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';

import type {
  Appointment,
  Campaign,
  CampaignMetric,
  FollowUpTask,
  Lead,
  LeadSource,
  LeadStatus,
  Member,
  TeamMember,
} from '@/types';
import { LEAD_SOURCE_META, PIPELINE_ORDER } from '@/constants';
import { effectiveTaskStatus } from './taskHelpers';

/** Channels that cost money to acquire — used for CPL and ROAS framing. */
export const PAID_SOURCES: LeadSource[] = ['META_ADS', 'INSTAGRAM', 'WHATSAPP', 'WEBSITE'];

// ---------------------------------------------------------
// Ratios
// ---------------------------------------------------------

/** Cost per lead. Zero leads with real spend returns the spend itself,
 *  which is the number an owner actually needs to see. */
export function cpl(spend: number, leads: number): number {
  if (leads <= 0) return spend > 0 ? spend : 0;
  return spend / leads;
}

/** Return on ad spend. Undefined-safe: no spend means no ROAS. */
export function roas(revenue: number, spend: number): number {
  if (spend <= 0) return 0;
  return revenue / spend;
}

/** Memberships as a percentage of leads, 0-100. */
export function conversionRate(memberships: number, leads: number): number {
  if (leads <= 0) return 0;
  return (memberships / leads) * 100;
}

/** Trial attendance as a percentage of trials that were booked. */
export function attendanceRate(attended: number, booked: number): number {
  if (booked <= 0) return 0;
  return (attended / booked) * 100;
}

export function safePercentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

// ---------------------------------------------------------
// Lead helpers
// ---------------------------------------------------------

/** Archived leads never count toward pipeline, funnel or revenue. */
export function activeLeads(leads: Lead[]): Lead[] {
  return leads.filter((l) => !l.archivedAt);
}

export function isQualified(lead: Lead): boolean {
  return ['QUALIFIED', 'TRIAL_BOOKED', 'TRIAL_ATTENDED', 'MEMBERSHIP'].includes(lead.status);
}

/**
 * Funnel counts by the highest stage each lead has *reached*.
 * A converted member has demonstrably passed through every earlier
 * stage, so each stage is monotonically less than the one above it.
 */
export function funnelStages(leads: Lead[]): { status: LeadStatus; count: number }[] {
  const open = activeLeads(leads).filter((l) => l.status !== 'LOST');
  const order = PIPELINE_ORDER.filter((s) => s !== 'LOST');
  return order.map((status) => ({
    status,
    count: open.filter((l) => PIPELINE_ORDER.indexOf(l.status) >= PIPELINE_ORDER.indexOf(status))
      .length,
  }));
}

export function qualifiedCount(leads: Lead[]): number {
  return activeLeads(leads).filter(isQualified).length;
}

export function countsByStatus(leads: Lead[]): Record<LeadStatus, number> {
  const out = Object.fromEntries(PIPELINE_ORDER.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const lead of activeLeads(leads)) out[lead.status] += 1;
  return out;
}

export function sourceSplit(
  leads: Lead[],
): { source: LeadSource; label: string; count: number; converted: number }[] {
  const open = activeLeads(leads);
  return (Object.keys(LEAD_SOURCE_META) as LeadSource[])
    .map((source) => ({
      source,
      label: LEAD_SOURCE_META[source].label,
      count: open.filter((l) => l.source === source).length,
      converted: open.filter((l) => l.source === source && l.status === 'MEMBERSHIP').length,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Leads bucketed per day for the trend chart. */
export function leadsOverTime(
  leads: Lead[],
  days: number,
  now = new Date(),
): { date: string; label: string; leads: number; conversions: number }[] {
  const window = eachDayOfInterval({ start: subDays(startOfDay(now), days - 1), end: now });
  return window.map((day) => {
    const stamp = day.getTime();
    const inDay = leads.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= stamp && t < stamp + 86_400_000;
    });
    return {
      date: format(day, 'yyyy-MM-dd'),
      label: format(day, days <= 14 ? 'd MMM' : 'd MMM'),
      leads: inDay.length,
      conversions: inDay.filter((l) => l.status === 'MEMBERSHIP').length,
    };
  });
}

/** Revenue booked per month, by member start date. */
export function revenueByMonth(
  members: Member[],
  months: number,
  now = new Date(),
): { month: string; label: string; revenue: number; members: number }[] {
  const start = startOfMonth(subDays(now, (months - 1) * 30));
  const window = eachMonthOfInterval({ start, end: now });
  return window.map((month) => {
    const inMonth = members.filter((m) => isSameMonth(parseISO(m.startDate), month));
    return {
      month: format(month, 'yyyy-MM'),
      label: format(month, 'MMM'),
      revenue: inMonth.reduce((sum, m) => sum + m.amountPaid, 0),
      members: inMonth.length,
    };
  });
}

/** Cumulative revenue, so the dashboard can plot a rising total. */
export function cumulativeRevenue(
  members: Member[],
  days: number,
  now = new Date(),
): { date: string; label: string; revenue: number; monthly: number }[] {
  const sorted = [...members].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const window = eachDayOfInterval({ start: subDays(startOfDay(now), days - 1), end: now });
  let running = 0;
  let cursor = 0;
  let dayTotal = 0;
  return window.map((day) => {
    const stamp = day.getTime();
    const next = stamp + 86_400_000;
    dayTotal = 0;
    while (cursor < sorted.length && new Date(sorted[cursor].startDate).getTime() < next) {
      running += sorted[cursor].amountPaid;
      dayTotal += sorted[cursor].amountPaid;
      cursor += 1;
    }
    return {
      date: format(day, 'yyyy-MM-dd'),
      label: format(day, 'd MMM'),
      revenue: running,
      monthly: dayTotal,
    };
  });
}

export function totalRevenue(members: Member[]): number {
  return members.reduce((sum, m) => sum + m.amountPaid, 0);
}

export function averageRevenuePerMember(members: Member[]): number {
  return members.length ? totalRevenue(members) / members.length : 0;
}

// ---------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------

/** OVERDUE is derived in taskHelpers and re-exported here for convenience. */
export { effectiveTaskStatus } from './taskHelpers';

export interface TaskBuckets {
  overdue: FollowUpTask[];
  today: FollowUpTask[];
  upcoming: FollowUpTask[];
  completed: FollowUpTask[];
}

export function bucketTasks(tasks: FollowUpTask[], now = new Date()): TaskBuckets {
  const out: TaskBuckets = { overdue: [], today: [], upcoming: [], completed: [] };
  const endToday = endOfDay(now).getTime();
  for (const task of tasks) {
    const state = effectiveTaskStatus(task, now);
    if (state === 'COMPLETED') {
      out.completed.push(task);
      continue;
    }
    const due = new Date(task.dueAt).getTime();
    if (due < startOfDay(now).getTime()) out.overdue.push(task);
    else if (due <= endToday) out.today.push(task);
    else out.upcoming.push(task);
  }
  const byDue = (a: FollowUpTask, b: FollowUpTask) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  out.overdue.sort(byDue);
  out.today.sort(byDue);
  out.upcoming.sort(byDue);
  out.completed.sort((a, b) => byDue(b, a));
  return out;
}

// ---------------------------------------------------------
// Appointments
// ---------------------------------------------------------

export interface AppointmentBuckets {
  upcoming: Appointment[];
  today: Appointment[];
  past: Appointment[];
}

export function isUpcomingAppointment(a: Appointment, now = new Date()): boolean {
  if (a.status === 'ATTENDED' || a.status === 'NO_SHOW' || a.status === 'CANCELLED') return false;
  return !isBefore(`${a.date}T${a.time}:00`, now);
}

export function bucketAppointments(
  appointments: Appointment[],
  now = new Date(),
): AppointmentBuckets {
  const out: AppointmentBuckets = { upcoming: [], today: [], past: [] };
  for (const a of appointments) {
    if (isUpcomingAppointment(a, now)) {
      if (isSameDay(parseISO(a.date), now)) out.today.push(a);
      else out.upcoming.push(a);
    } else {
      out.past.push(a);
    }
  }
  out.today.sort((a, b) => a.time.localeCompare(b.time));
  out.upcoming.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  out.past.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  return out;
}

export function trialStats(leads: Lead[]) {
  const booked = activeLeads(leads).filter((l) =>
    ['TRIAL_BOOKED', 'TRIAL_ATTENDED', 'MEMBERSHIP'].includes(l.status),
  ).length;
  const attended = activeLeads(leads).filter((l) =>
    ['TRIAL_ATTENDED', 'MEMBERSHIP'].includes(l.status),
  ).length;
  return { booked, attended, noShow: booked - attended };
}

// ---------------------------------------------------------
// Sales performance
// ---------------------------------------------------------

export interface SalesPerformanceRow {
  member: TeamMember;
  leads: number;
  qualified: number;
  trials: number;
  trialsAttended: number;
  conversions: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  revenue: number;
  conversionRate: number;
}

export function salesPerformance(
  team: TeamMember[],
  leads: Lead[],
  tasks: FollowUpTask[],
  members: Member[],
  now = new Date(),
): SalesPerformanceRow[] {
  const open = activeLeads(leads);
  return team
    .filter((t) => t.active)
    .map((member) => {
      const mine = open.filter((l) => l.assignedToId === member.id);
      const myTasks = tasks.filter((t) => t.assigneeId === member.id);
      const conversions = mine.filter((l) => l.status === 'MEMBERSHIP').length;
      return {
        member,
        leads: mine.length,
        qualified: mine.filter(isQualified).length,
        trials: mine.filter((l) =>
          ['TRIAL_BOOKED', 'TRIAL_ATTENDED', 'MEMBERSHIP'].includes(l.status),
        ).length,
        trialsAttended: mine.filter((l) =>
          ['TRIAL_ATTENDED', 'MEMBERSHIP'].includes(l.status),
        ).length,
        conversions,
        pendingFollowUps: myTasks.filter((t) => effectiveTaskStatus(t, now) === 'PENDING').length,
        overdueFollowUps: myTasks.filter((t) => effectiveTaskStatus(t, now) === 'OVERDUE').length,
        revenue: members
          .filter((m) => m.salespersonId === member.id)
          .reduce((sum, m) => sum + m.amountPaid, 0),
        conversionRate: conversionRate(conversions, mine.length),
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions);
}

// ---------------------------------------------------------
// Campaigns
// ---------------------------------------------------------

export interface CampaignTotals {
  campaign: Campaign;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  cpl: number;
  ctr: number;
}

/**
 * Leads are attributed through `campaign.source`, which is also the key
 * `campaign_metrics.leads` was generated from. Attributing off
 * `platform` instead would silently disagree with the seeded metrics
 * the moment a platform is fed by more than one source.
 */
export function campaignTotals(
  campaign: Campaign,
  metrics: CampaignMetric[],
  leads: Lead[],
  members: Member[],
): CampaignTotals & { attributedRevenue: number; memberships: number; conversionRate: number; roas: number } {
  const rows = metrics.filter((m) => m.campaignId === campaign.id);
  const spend = rows.reduce((s, m) => s + m.spend, 0);
  const impressions = rows.reduce((s, m) => s + m.impressions, 0);
  const reach = rows.reduce((s, m) => s + m.reach, 0);
  const clicks = rows.reduce((s, m) => s + m.clicks, 0);
  const campaignLeads = rows.reduce((s, m) => s + m.leads, 0);

  const sourceLeads = leads.filter((l) => l.source === campaign.source && !l.archivedAt);
  const memberships = sourceLeads.filter((l) => l.status === 'MEMBERSHIP').length;
  const attributedRevenue = members
    .filter((m) => sourceLeads.some((l) => l.id === m.leadId))
    .reduce((sum, m) => sum + m.amountPaid, 0);

  return {
    campaign,
    spend,
    impressions,
    reach,
    clicks,
    leads: campaignLeads,
    cpl: cpl(spend, campaignLeads),
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    attributedRevenue,
    memberships,
    conversionRate: conversionRate(memberships, campaignLeads),
    roas: roas(attributedRevenue, spend),
  };
}

export function spendBetween(
  metrics: CampaignMetric[],
  start: Date,
  end: Date,
): number {
  const from = startOfDay(start).getTime();
  const to = endOfDay(end).getTime();
  return metrics.reduce((sum, m) => {
    const t = parseISO(m.date).getTime();
    return t >= from && t <= to ? sum + m.spend : sum;
  }, 0);
}

export function currentMonthSpend(metrics: CampaignMetric[], now = new Date()): number {
  const month = eachMonthOfInterval({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });
  return spendBetween(metrics, month[0], now);
}

// ---------------------------------------------------------
// Members
// ---------------------------------------------------------

export function expiringWithin(members: Member[], days: number, now = new Date()): Member[] {
  const from = startOfDay(now).getTime();
  const to = from + days * 86_400_000;
  return members
    .filter((m) => {
      const t = parseISO(m.expiryDate).getTime();
      return t >= from && t <= to;
    })
    .sort((a, b) => parseISO(a.expiryDate).getTime() - parseISO(b.expiryDate).getTime());
}

// ---------------------------------------------------------
// Headline KPI block
// ---------------------------------------------------------

export interface DashboardKpis {
  totalLeads: number;
  newLeadsThisWeek: number;
  qualifiedLeads: number;
  trialsBooked: number;
  trialsAttended: number;
  memberships: number;
  revenue: number;
  adSpend: number;
  cpl: number;
  conversionRate: number;
  roas: number;
  activeMembers: number;
  overdueFollowUps: number;
  pendingFollowUps: number;
}

export function dashboardKpis(
  leads: Lead[],
  members: Member[],
  metrics: CampaignMetric[],
  tasks: FollowUpTask[],
  now = new Date(),
): DashboardKpis {
  const open = activeLeads(leads);
  const weekAgo = subDays(now, 7);
  const trials = trialStats(leads);
  const spend = currentMonthSpend(metrics, now);
  const revenue = totalRevenue(members);
  const buckets = bucketTasks(tasks.filter((t) => t.status !== 'COMPLETED'), now);
  const memberships = open.filter((l) => l.status === 'MEMBERSHIP').length;

  // CPL compares ad spend against leads from paid channels only —
  // a referral produced for free should not dilute the number.
  const paidLeads = open.filter((l) => PAID_SOURCES.includes(l.source)).length;

  return {
    totalLeads: open.length,
    newLeadsThisWeek: open.filter((l) => isAfter(parseISO(l.createdAt), weekAgo)).length,
    qualifiedLeads: qualifiedCount(leads),
    trialsBooked: trials.booked,
    trialsAttended: trials.attended,
    memberships,
    revenue,
    adSpend: spend,
    cpl: cpl(spend, paidLeads),
    conversionRate: conversionRate(memberships, open.length),
    roas: roas(revenue, spend),
    activeMembers: members.filter((m) => parseISO(m.expiryDate).getTime() >= now.getTime()).length,
    overdueFollowUps: buckets.overdue.length,
    pendingFollowUps: buckets.today.length + buckets.upcoming.length,
  };
}
