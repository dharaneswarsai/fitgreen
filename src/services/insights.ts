// ===========================================================
// Insights
//
// A deterministic rule engine over the live dataset. Every insight
// is a real observation about real records, carries the numbers it
// was derived from, and deep-links into the filtered list that
// would resolve it — so acting on one is a single click.
//
// This is NOT a language model and is never described as one.
// If a provider is configured (VITE_AI_API_KEY) the enhancer
// below can rewrite the headline, but no rule and no number is
// invented, and nothing is called while the key is empty.
// ===========================================================

import { differenceInCalendarDays, isAfter, parseISO, subDays } from 'date-fns';

import type { Database, Lead, LeadSource } from '@/types';
import {
  activeLeads,
  attendanceRate,
  conversionRate,
  currentMonthSpend,
  expiringWithin,
  salesPerformance,
  sourceSplit,
  trialStats,
} from './metrics';
import { effectiveTaskStatus } from './taskHelpers';
import { formatINR, formatNumber, formatPercent } from '@/constants';

export type InsightSeverity = 'critical' | 'warning' | 'positive' | 'neutral';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: string;
  title: string;
  body: string;
  /** The figure the insight was computed from. */
  metric: string;
  href: string;
}

export interface InsightOptions {
  now?: Date;
  /** Average days a lead should take to get a first call. */
  firstTouchTargetDays?: number;
  /** Days a lead may sit in one stage before we call it stalled. */
  stallDays?: number;
  /** Minimum revenue-per-spend before a campaign looks healthy. */
  roasFloor?: number;
}

const DEFAULTS: Required<Omit<InsightOptions, 'now'>> = {
  firstTouchTargetDays: 2,
  stallDays: 5,
  roasFloor: 3,
};

/**
 * Flags leads that are sitting in a pipeline stage past the target
 * window without any logged contact.
 */
function staleLeads(leads: Lead[], targetDays: number, now: Date): Lead[] {
  return activeLeads(leads).filter((lead) => {
    if (lead.status === 'MEMBERSHIP' || lead.status === 'LOST') return false;
    const anchor = lead.lastContactedAt ?? lead.createdAt;
    return differenceInCalendarDays(now, parseISO(anchor)) > targetDays;
  });
}

export function generateInsights(db: Database, options: InsightOptions = {}): Insight[] {
  const now = options.now ?? new Date();
  const cfg = { ...DEFAULTS, ...options, now };
  const insights: Insight[] = [];
  const leads = activeLeads(db.leads);

  // 1 — Hot leads nobody has contacted
  const hotUncontacted = leads.filter(
    (l) => l.status === 'NEW' && l.score >= 70 && !l.lastContactedAt,
  );
  if (hotUncontacted.length) {
    insights.push({
      id: 'hot_uncontacted',
      severity: 'critical',
      category: 'Speed to lead',
      title: `${hotUncontacted.length} high-intent ${hotUncontacted.length === 1 ? 'lead has' : 'leads have'} not been contacted`,
      body: `Scoring 70+. ${hotUncontacted
        .slice(0, 2)
        .map((l) => l.name)
        .join(', ')}${hotUncontacted.length > 2 ? ` and ${hotUncontacted.length - 2} more` : ''}. Contacting these first is the cheapest revenue available today.`,
      metric: `${hotUncontacted.length} leads`,
      href: '/admin/leads?view=hot',
    });
  }

  // 2 — Stale leads past the first-touch target
  const stale = staleLeads(db.leads, cfg.firstTouchTargetDays, now);
  if (stale.length >= 3) {
    insights.push({
      id: 'stale_leads',
      severity: 'warning',
      category: 'Pipeline hygiene',
      title: `${stale.length} leads are waiting for follow-up`,
      body: `No logged contact in over ${cfg.firstTouchTargetDays} days. Response speed decides conversion rate more than any ad creative.`,
      metric: `${stale.length} leads`,
      href: '/admin/leads?view=stale',
    });
  }

  // 3 — Overdue follow-up tasks
  const overdue = db.tasks.filter((t) => effectiveTaskStatus(t, now) === 'OVERDUE');
  if (overdue.length) {
    const byOwner = new Map<string, number>();
    for (const task of overdue) {
      byOwner.set(task.assigneeId, (byOwner.get(task.assigneeId) ?? 0) + 1);
    }
    const topOwnerId = [...byOwner.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const owner = db.team.find((t) => t.id === topOwnerId);
    insights.push({
      id: 'overdue_tasks',
      severity: 'warning',
      category: 'Follow-ups',
      title: `${overdue.length} follow-up ${overdue.length === 1 ? 'task is' : 'tasks are'} overdue`,
      body: owner
        ? `${owner.name} is carrying ${byOwner.get(owner.id)} of them. Clearing today's list restores pipeline velocity.`
        : 'Clearing these keeps the response-time promise the ads are making.',
      metric: `${overdue.length} tasks`,
      href: '/admin/follow-ups?filter=overdue',
    });
  }

  // 4 — Best performing source this week
  const weekAgo = subDays(now, 7);
  const thisWeek = leads.filter((l) => isAfter(parseISO(l.createdAt), weekAgo));
  if (thisWeek.length >= 4) {
    const bySource = new Map<LeadSource, { count: number; converted: number }>();
    for (const lead of thisWeek) {
      const row = bySource.get(lead.source) ?? { count: 0, converted: 0 };
      row.count += 1;
      if (lead.status === 'MEMBERSHIP') row.converted += 1;
      bySource.set(lead.source, row);
    }
    const best = [...bySource.entries()]
      .filter(([, v]) => v.count > 0)
      .sort((a, b) => b[1].count - a[1].count)[0];
    if (best && best[1].count >= 2) {
      insights.push({
        id: 'best_source',
        severity: 'positive',
        category: 'Marketing',
        title: `${best[0].replace(/_/g, ' ').toLowerCase()} generated the most leads this week`,
        body: `${best[1].count} leads in the last 7 days, ${best[1].converted} of which converted. Worth shifting a little more budget toward it.`,
        metric: `${best[1].count} leads`,
        href: '/admin/campaigns',
      });
    }
  }

  // 5 — Trial attendance vs the previous period
  const prevStart = subDays(now, 30);
  const prevEnd = subDays(now, 15);
  const thisWindow = trialStats(
    leads.filter((l) => isAfter(parseISO(l.createdAt), prevEnd)),
  );
  const prevWindow = trialStats(
    leads.filter((l) => {
      const t = parseISO(l.createdAt).getTime();
      return t > prevStart.getTime() && t <= prevEnd.getTime();
    }),
  );
  if (prevWindow.booked >= 2 && thisWindow.booked >= 2) {
    const nowRate = attendanceRate(thisWindow.attended, thisWindow.booked);
    const prevRate = attendanceRate(prevWindow.attended, prevWindow.booked);
    const delta = nowRate - prevRate;
    if (Math.abs(delta) >= 5) {
      const dropped = delta < 0;
      insights.push({
        id: 'attendance_trend',
        severity: dropped ? 'warning' : 'positive',
        category: 'Trials',
        title: `Trial attendance ${dropped ? 'dropped' : 'improved'} to ${formatPercent(nowRate, 0)}`,
        body: dropped
          ? `Down from ${formatPercent(prevRate, 0)} in the previous fortnight. ${thisWindow.noShow} no-show${thisWindow.noShow === 1 ? '' : 's'} — tighten the reminder call and confirm slots an hour before.`
          : `Up from ${formatPercent(prevRate, 0)}. ${thisWindow.attended} of ${thisWindow.booked} trials are being attended — the reminder sequence is working.`,
        metric: `${thisWindow.attended}/${thisWindow.booked} attended`,
        href: '/admin/appointments',
      });
    }
  }

  // 6 — Lead sitting too long in one stage
  const stalled = leads.filter((lead) => {
    if (lead.status === 'MEMBERSHIP' || lead.status === 'LOST' || lead.status === 'NEW') return false;
    return differenceInCalendarDays(now, parseISO(lead.statusChangedAt)) > cfg.stallDays;
  });
  if (stalled.length >= 2) {
    insights.push({
      id: 'stage_stall',
      severity: 'warning',
      category: 'Pipeline hygiene',
      title: `${stalled.length} ${stalled.length === 1 ? 'lead is' : 'leads are'} stuck in stage`,
      body: `No stage change in over ${cfg.stallDays} days. Either push them to a trial or mark them lost so the pipeline stays honest.`,
      metric: `${stalled.length} leads`,
      href: '/admin/pipeline',
    });
  }

  // 7 — Salesperson carrying the most pending follow-ups
  const performance = salesPerformance(db.team, db.leads, db.tasks, db.members, now);
  const heaviest = [...performance]
    .filter((row) => row.pendingFollowUps + row.overdueFollowUps > 0)
    .sort((a, b) => b.overdueFollowUps + b.pendingFollowUps - (a.overdueFollowUps + a.pendingFollowUps))[0];
  if (heaviest && heaviest.overdueFollowUps + heaviest.pendingFollowUps >= 4) {
    insights.push({
      id: 'workload',
      severity: 'warning',
      category: 'Team',
      title: `${heaviest.member.name} has ${heaviest.overdueFollowUps + heaviest.pendingFollowUps} open follow-ups`,
      body: `${heaviest.overdueFollowUps} overdue, ${heaviest.pendingFollowUps} upcoming — against ${heaviest.leads} assigned leads. Consider reassigning before conversion rate drops.`,
      metric: `${heaviest.overdueFollowUps + heaviest.pendingFollowUps} tasks`,
      href: '/admin/team',
    });
  }

  // 8 — Efficiency of paid acquisition
  const spend = currentMonthSpend(db.campaignMetrics, now);
  if (spend > 0) {
    const paidLeads = leads.filter((l) =>
      ['META_ADS', 'INSTAGRAM', 'WHATSAPP', 'WEBSITE'].includes(l.source),
    );
    const roas = paidLeads.length
      ? db.members.reduce((s, m) => s + m.amountPaid, 0) / spend
      : 0;
    if (roas > 0 && roas < cfg.roasFloor) {
      insights.push({
        id: 'roas_low',
        severity: 'warning',
        category: 'Marketing',
        title: `Ad spend is returning ${roas.toFixed(1)}× this month`,
        body: `Below the ${cfg.roasFloor}× floor. ${formatINR(spend)} spent against ${formatNumber(paidLeads.length)} paid leads. Cutting the weakest campaign usually closes this gap.`,
        metric: `${roas.toFixed(1)}× ROAS`,
        href: '/admin/campaigns',
      });
    } else if (roas >= cfg.roasFloor) {
      insights.push({
        id: 'roas_good',
        severity: 'positive',
        category: 'Marketing',
        title: `Ad spend is returning ${roas.toFixed(1)}× this month`,
        body: `${formatINR(spend)} spend is clearing the ${cfg.roasFloor}× floor. This is the window to increase budget on the top campaign.`,
        metric: `${roas.toFixed(1)}× ROAS`,
        href: '/admin/campaigns',
      });
    }
  }

  // 9 — Renewals coming up
  const renewing = expiringWithin(db.members, 21, now);
  if (renewing.length) {
    const value = renewing.reduce((s, m) => s + m.amountPaid, 0);
    insights.push({
      id: 'renewals',
      severity: renewing.length >= 4 ? 'warning' : 'neutral',
      category: 'Retention',
      title: `${renewing.length} ${renewing.length === 1 ? 'membership' : 'memberships'} expiring within 3 weeks`,
      body: `${formatINR(value)} of collected revenue at stake. A renewal call before the lapse date is the cheapest revenue in the business.`,
      metric: `${renewing.length} members`,
      href: '/admin/members?filter=expiring',
    });
  }

  // 10 — Source with the best conversion rate
  const split = sourceSplit(db.leads).filter((row) => row.count >= 3);
  const bestSource = [...split]
    .map((row) => ({ ...row, rate: conversionRate(row.converted, row.count) }))
    .sort((a, b) => b.rate - a.rate)[0];
  if (bestSource && bestSource.rate > 0) {
    insights.push({
      id: 'source_conversion',
      severity: 'positive',
      category: 'Marketing',
      title: `${bestSource.label} converts best at ${formatPercent(bestSource.rate, 0)}`,
      body: `${bestSource.converted} of ${bestSource.count} leads turned into memberships. ${bestSource.label} is ${bestSource.rate > 25 ? 'outperforming' : 'holding up well against'} the ${formatPercent(conversionRate(leads.filter((l) => l.status === 'MEMBERSHIP').length, leads.length), 0)} overall rate.`,
      metric: formatPercent(bestSource.rate, 0),
      href: '/admin/leads',
    });
  }

  const order: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    positive: 2,
    neutral: 3,
  };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------
// Optional provider enhancer
// ---------------------------------------------------------

export interface InsightsContext {
  insightCount: number;
  criticalCount: number;
  generatedAt: string;
}

export function insightsContext(insights: Insight[]): InsightsContext {
  return {
    insightCount: insights.length,
    criticalCount: insights.filter((i) => i.severity === 'critical').length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Reserved seam for a real provider integration.
 *
 * Deliberately does nothing unless VITE_AI_API_KEY is set, and
 * even then returns the deterministic insights untouched — the
 * numbers are never generated, only the prose could be. Wire a
 * provider in here and the rest of the product is unchanged.
 */
export function enhanceWithProvider(_insights: Insight[]): Insight[] | null {
  const key = import.meta.env.VITE_AI_API_KEY as string | undefined;
  if (!key) return null;
  // Intentionally unimplemented: see supabase/schema.sql and .env.example.
  return null;
}
