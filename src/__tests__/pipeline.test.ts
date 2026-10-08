import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/lib/seed';
import { computeLeadScore, scoreBand } from '@/services/leadScoring';
import { memberStatus } from '@/constants';
import {
  attendanceRate,
  bucketTasks,
  campaignTotals,
  conversionRate,
  cpl,
  effectiveTaskStatus,
  funnelStages,
  roas,
  salesPerformance,
  sourceSplit,
  totalRevenue,
  trialStats,
} from '@/services/metrics';
import { deriveAlerts } from '@/services/notifications';
import { generateInsights } from '@/services/insights';
import {
  bookAppointment,
  completeTask,
  convertToMember,
  findDuplicate,
  moveLeadStage,
  pickAssignee,
  setAppointmentStatus,
  submitPublicLead,
} from '@/services/leadWorkflow';
import { PIPELINE_ORDER } from '@/constants';
import { addHours } from 'date-fns';

describe('seed integrity', () => {
  const db = buildSeed();

  it('produces the promised demo volume', () => {
    expect(db.leads.length).toBeGreaterThanOrEqual(25);
    expect(db.members.length).toBeGreaterThanOrEqual(10);
    expect(db.appointments.length).toBeGreaterThanOrEqual(15);
    expect(db.campaigns.length).toBeGreaterThanOrEqual(3);
    expect(db.team.length).toBe(3);
    expect(db.plans.length).toBeGreaterThanOrEqual(3);
    expect(db.activities.length).toBeGreaterThan(50);
    expect(db.tasks.length).toBeGreaterThan(20);
  });

  it('is deterministic across calls', () => {
    const again = buildSeed();
    expect(JSON.stringify(again.leads)).toBe(JSON.stringify(db.leads));
  });

  it('keeps the funnel monotonic', () => {
    const stages = funnelStages(db.leads);
    for (let i = 1; i < stages.length; i += 1) {
      expect(stages[i].count).toBeLessThanOrEqual(stages[i - 1].count);
    }
  });

  it('has one member per converted lead, and no more', () => {
    const converted = db.leads.filter((l) => l.status === 'MEMBERSHIP');
    expect(db.members.length).toBe(converted.length);
    for (const member of db.members) {
      expect(converted.some((l) => l.id === member.leadId)).toBe(true);
    }
  });

  it('gives every member a real expiry date and revenue', () => {
    for (const member of db.members) {
      expect(member.amountPaid).toBeGreaterThan(0);
      expect(new Date(member.expiryDate).getTime()).not.toBeNaN();
      expect(new Date(member.startDate).getTime()).not.toBeNaN();
    }
    expect(totalRevenue(db.members)).toBeGreaterThan(0);
  });

  it('stores scores that match the scoring service', () => {
    for (const lead of db.leads) {
      expect(lead.score).toBe(computeLeadScore(lead, db.appointments).score);
    }
  });

  it('has leads, members and appointments at every status', () => {
    for (const status of PIPELINE_ORDER) {
      expect(db.leads.some((l) => l.status === status)).toBe(true);
    }
    for (const status of ['SCHEDULED', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELLED'] as const) {
      expect(db.appointments.some((a) => a.status === status)).toBe(true);
    }
  });

  it('covers every lead source', () => {
    for (const source of ['WEBSITE', 'META_ADS', 'INSTAGRAM', 'WHATSAPP', 'REFERRAL', 'MANUAL'] as const) {
      expect(db.leads.some((l) => l.source === source)).toBe(true);
    }
  });

  it('reconciles campaign lead counts against the CRM', () => {
    // Every paid lead must be counted exactly once in campaign metrics.
    const metricsLeadTotal = db.campaignMetrics.reduce((s, m) => s + m.leads, 0);
    const paidLeads = db.leads.filter(
      (l) => l.source !== 'REFERRAL' && l.source !== 'MANUAL',
    ).length;
    expect(metricsLeadTotal).toBe(paidLeads);
  });

  it('produces plausible business metrics', () => {
    const open = db.leads.filter((l) => l.status !== 'LOST' && !l.archivedAt);
    const rate = conversionRate(
      open.filter((l) => l.status === 'MEMBERSHIP').length,
      open.length,
    );
    expect(rate).toBeGreaterThan(5);
    expect(rate).toBeLessThan(80);

    const trials = trialStats(db.leads);
    expect(attendanceRate(trials.attended, trials.booked)).toBeGreaterThan(30);
    expect(trials.attended).toBeLessThanOrEqual(trials.booked);
  });

  it('includes members that are expiring and lapsed', () => {
    const states = db.members.map((m) => memberStatus(m));
    expect(states).toContain('ACTIVE');
    expect(states).toContain('EXPIRED');
  });

  it('has both overdue and pending follow-ups', () => {
    const buckets = bucketTasks(db.tasks);
    expect(buckets.overdue.length).toBeGreaterThan(0);
    expect(buckets.today.length + buckets.upcoming.length).toBeGreaterThan(0);
    expect(buckets.completed.length).toBeGreaterThan(0);
  });

  it('resolves every foreign key', () => {
    const leadIds = new Set(db.leads.map((l) => l.id));
    const memberIds = new Set(db.team.map((t) => t.id));
    const planIds = new Set(db.plans.map((p) => p.id));

    for (const task of db.tasks) {
      expect(leadIds.has(task.leadId)).toBe(true);
      expect(memberIds.has(task.assigneeId)).toBe(true);
    }
    for (const appt of db.appointments) {
      expect(leadIds.has(appt.leadId)).toBe(true);
      expect(memberIds.has(appt.staffId)).toBe(true);
    }
    for (const act of db.activities) expect(leadIds.has(act.leadId)).toBe(true);
    for (const member of db.members) {
      expect(leadIds.has(member.leadId)).toBe(true);
      expect(planIds.has(member.planId)).toBe(true);
    }
    const campaignIds = new Set(db.campaigns.map((c) => c.id));
    for (const metric of db.campaignMetrics) expect(campaignIds.has(metric.campaignId)).toBe(true);
  });

  it('derives live alerts and insights without throwing', () => {
    const alerts = deriveAlerts(db);
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBeGreaterThan(0);
    for (const alert of alerts) {
      expect(alert.href.startsWith('/admin')).toBe(true);
      expect(alert.title.length).toBeGreaterThan(0);
    }

    const insights = generateInsights(db);
    expect(insights.length).toBeGreaterThan(0);
    for (const insight of insights) {
      expect(insight.href.startsWith('/admin')).toBe(true);
      expect(insight.metric.length).toBeGreaterThan(0);
    }
    // Deterministic: same input, same output.
    expect(generateInsights(db)).toEqual(insights);
  });

  it('reports a sales leaderboard for the whole team', () => {
    const rows = salesPerformance(db.team, db.leads, db.tasks, db.members);
    expect(rows.length).toBe(db.team.length);
    for (const row of rows) expect(row.leads).toBeGreaterThanOrEqual(0);
  });

  it('breaks down leads by source', () => {
    const split = sourceSplit(db.leads);
    expect(split.length).toBeGreaterThan(3);
    expect(split.reduce((s, r) => s + r.count, 0)).toBe(
      db.leads.filter((l) => !l.archivedAt).length,
    );
  });
});

describe('end-to-end workflow', () => {
  it('runs the demo flow: capture → assign → follow-up → trial → attendance → membership → revenue', () => {
    let db = buildSeed();
    const revenueBefore = totalRevenue(db.members);
    const membershipsBefore = db.members.length;

    // 1 — a prospect submits the public form
    const submitted = submitPublicLead(db, {
      name: 'Demo Prospect',
      phone: '+91 90000 11111',
      email: 'demo.prospect@example.com',
      goal: 'WEIGHT_LOSS',
      workoutTime: 'EVENING',
      program: 'Fat Loss Lab',
      message: 'What are your membership fees? I want to join this week.',
      source: 'WEBSITE',
      requestedTrial: true,
    });
    expect(submitted.ok).toBe(true);
    db = submitted.db;

    const lead = db.leads.find((l) => l.name === 'Demo Prospect');
    expect(lead).toBeDefined();
    expect(lead!.status).toBe('NEW');
    // 65 is the maximum reachable before a trial is booked
    // (goal 10 + phone 10 + program 10 + intent 15 + trial request 20),
    // and 65 is the HOT threshold — so a pricing-ready lead is hot at intake.
    expect(lead!.score).toBe(65);
    expect(scoreBand(lead!.score)).toBe('HOT');
    expect(lead!.assignedToId).toBeTruthy();

    // 2 — an auto follow-up already exists
    const autoTask = db.tasks.find((t) => t.leadId === lead!.id);
    expect(autoTask).toBeDefined();
    expect(autoTask!.assigneeId).toBe(lead!.assignedToId);

    // 3 — the salesperson completes it
    const completed = completeTask(db, autoTask!.id);
    expect(completed.ok).toBe(true);
    db = completed.db;
    expect(db.tasks.find((t) => t.id === autoTask!.id)!.status).toBe('COMPLETED');

    // 4 — qualify, then book a trial
    const qualified = moveLeadStage(db, lead!.id, 'CONTACTED');
    db = qualified.db;
    const qualifiedResult = moveLeadStage(db, lead!.id, 'QUALIFIED');
    db = qualifiedResult.db;
    expect(db.leads.find((l) => l.id === lead!.id)!.status).toBe('QUALIFIED');

    const booked = bookAppointment(db, lead!.id, {
      date: '2030-01-15',
      time: '18:00',
      staffId: lead!.assignedToId!,
      type: 'FREE_TRIAL',
    });
    expect(booked.ok).toBe(true);
    db = booked.db;
    expect(db.leads.find((l) => l.id === lead!.id)!.status).toBe('TRIAL_BOOKED');
    // A reminder was created in the same transaction.
    expect(db.tasks.some((t) => t.leadId === lead!.id && t.type === 'TRIAL_REMINDER')).toBe(true);

    // 5 — mark the trial attended
    const appt = db.appointments.find((a) => a.leadId === lead!.id)!;
    const attended = setAppointmentStatus(db, appt.id, 'ATTENDED');
    expect(attended.ok).toBe(true);
    db = attended.db;
    expect(db.appointments.find((a) => a.id === appt.id)!.attendedAt).toBeTruthy();
    expect(db.leads.find((l) => l.id === lead!.id)!.status).toBe('TRIAL_ATTENDED');

    // 6 — convert, which is what records revenue
    const plan = db.plans.find((p) => p.highlight)!;
    const converted = convertToMember(db, lead!.id, {
      planId: plan.id,
      startDate: '2030-01-16',
      amountPaid: plan.price,
      paymentMode: 'UPI',
    });
    expect(converted.ok).toBe(true);
    db = converted.db;

    const member = db.members.find((m) => m.leadId === lead!.id)!;
    expect(member).toBeDefined();
    expect(member.amountPaid).toBe(plan.price);
    expect(db.leads.find((l) => l.id === lead!.id)!.status).toBe('MEMBERSHIP');
    expect(totalRevenue(db.members)).toBe(revenueBefore + plan.price);
    expect(db.members.length).toBe(membershipsBefore + 1);

    // 7 — all open follow-ups closed automatically on conversion
    expect(db.tasks.filter((t) => t.leadId === lead!.id && t.status === 'PENDING')).toHaveLength(0);

    // 8 — the timeline records the whole journey
    const timeline = db.activities.filter((a) => a.leadId === lead!.id);
    const types = new Set(timeline.map((a) => a.type));
    expect(types.has('NOTE')).toBe(true);
    expect(types.has('STATUS_CHANGE')).toBe(true);
    expect(types.has('TRIAL')).toBe(true);
    expect(types.has('CONVERSION')).toBe(true);

    // 9 — the funnel still holds after the mutation
    const stages = funnelStages(db.leads);
    for (let i = 1; i < stages.length; i += 1) {
      expect(stages[i].count).toBeLessThanOrEqual(stages[i - 1].count);
    }
  });
});

describe('workflow guardrails', () => {
  it('rejects a duplicate submission for the same phone', () => {
    const db = buildSeed();
    // Dedupe is a 48h window, so the collision must be a recent enquiry —
    // someone re-submitting a month later is a legitimate new enquiry.
    const recent = new Date().getTime() - 48 * 36e5;
    const existing = db.leads.find(
      (l) => !l.archivedAt && l.status !== 'LOST' && new Date(l.createdAt).getTime() > recent,
    )!;
    const dup = submitPublicLead(db, {
      name: 'Someone Else',
      phone: existing.phone,
      email: 'other@example.com',
      goal: 'FITNESS',
      workoutTime: 'MORNING',
      program: null,
      message: 'hello',
      source: 'WEBSITE',
      requestedTrial: false,
    });
    expect(dup.ok).toBe(false);
    expect(dup.error).toMatch(/already have/i);
    expect(findDuplicate(db, existing.phone)).toBeTruthy();
  });

  it('refuses to double-convert a lead', () => {
    const db = buildSeed();
    const converted = db.leads.find((l) => l.status === 'MEMBERSHIP')!;
    const plan = db.plans[0];
    const result = convertToMember(db, converted.id, {
      planId: plan.id,
      startDate: '2030-02-01',
      amountPaid: plan.price,
      paymentMode: 'CASH',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/already a member/i);
  });

  it('refuses a zero or negative payment', () => {
    const db = buildSeed();
    const lead = db.leads.find((l) => l.status === 'TRIAL_ATTENDED')!;
    const result = convertToMember(db, lead.id, {
      planId: db.plans[0].id,
      startDate: '2030-02-01',
      amountPaid: 0,
      paymentMode: 'CASH',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses to book a trial for a lost lead', () => {
    const db = buildSeed();
    const lost = db.leads.find((l) => l.status === 'LOST')!;
    const result = bookAppointment(db, lost.id, {
      date: '2030-03-01',
      time: '10:00',
      staffId: db.team[0].id,
      type: 'FREE_TRIAL',
    });
    expect(result.ok).toBe(false);
  });

  it('never mutates the database it was given', () => {
    const db = buildSeed();
    const snapshot = JSON.stringify(db);
    const lead = db.leads.find((l) => l.status === 'NEW')!;
    moveLeadStage(db, lead.id, 'CONTACTED');
    submitPublicLead(db, {
      name: 'X Y',
      phone: '+91 91111 22222',
      email: 'x@y.com',
      goal: 'STRENGTH',
      workoutTime: 'MORNING',
      program: null,
      message: 'price please',
      source: 'WEBSITE',
      requestedTrial: false,
    });
    convertToMember(db, lead.id, {
      planId: db.plans[0].id,
      startDate: '2030-01-01',
      amountPaid: db.plans[0].price,
      paymentMode: 'CASH',
    });
    expect(JSON.stringify(db)).toBe(snapshot);
  });

  it('assigns to the least loaded rep', () => {
    const db = buildSeed();
    const assignee = pickAssignee(db)!;
    expect(assignee).toBeTruthy();
    const openByRep = db.team.map((t) =>
      db.leads.filter(
        (l) => l.assignedToId === t.id && !['MEMBERSHIP', 'LOST'].includes(l.status),
      ).length,
    );
    // The invariant that matters: nobody else is carrying less open work.
    expect(db.leads.filter(
      (l) => l.assignedToId === assignee.id && !['MEMBERSHIP', 'LOST'].includes(l.status),
    ).length).toBe(Math.min(...openByRep));
  });

  it('creates the first follow-up due within the hour for a trial request', () => {
    const db = buildSeed();
    const result = submitPublicLead(db, {
      name: 'Urgent Buyer',
      phone: '+91 94444 55555',
      email: 'urgent@example.com',
      goal: 'MUSCLE_GAIN',
      workoutTime: 'WEEKEND',
      program: 'Athlete Engine',
      message: 'I want to join and book a free trial for this weekend.',
      source: 'INSTAGRAM',
      requestedTrial: true,
    });
    const lead = result.db.leads.find((l) => l.name === 'Urgent Buyer')!;
    const task = result.db.tasks.find((t) => t.leadId === lead.id)!;
    const minutes = (new Date(task.dueAt).getTime() - Date.now()) / 60000;
    expect(minutes).toBeLessThanOrEqual(31);
    // 65 = HOT threshold, so the auto follow-up must be raised to HIGH.
    expect(lead.score).toBe(65);
    expect(scoreBand(lead.score)).toBe('HOT');
    expect(task.priority).toBe('HIGH');
  });

  it('keeps a low-intent enquiry at MEDIUM priority', () => {
    const db = buildSeed();
    const result = submitPublicLead(db, {
      name: 'Idle Browser',
      phone: '+91 97777 88888',
      email: null,
      goal: 'GENERAL',
      workoutTime: 'EVENING',
      program: null,
      message: 'just looking around',
      source: 'WEBSITE',
      requestedTrial: false,
    });
    const lead = result.db.leads.find((l) => l.name === 'Idle Browser')!;
    const task = result.db.tasks.find((t) => t.leadId === lead.id)!;
    expect(lead.score).toBe(10); // goal only, no phone, no program, no intent
    expect(scoreBand(lead.score)).toBe('COLD');
    expect(task.priority).toBe('MEDIUM');
  });
});

describe('ratios are safe at the edges', () => {
  it('handles zero and missing denominators', () => {
    expect(cpl(0, 0)).toBe(0);
    expect(cpl(1000, 0)).toBe(1000);
    expect(cpl(1000, 10)).toBe(100);
    expect(roas(500, 0)).toBe(0);
    expect(roas(1000, 500)).toBe(2);
    expect(conversionRate(0, 0)).toBe(0);
    expect(attendanceRate(0, 0)).toBe(0);
  });

  it('treats a completed task as completed regardless of its due date', () => {
    const db = buildSeed();
    const done = db.tasks.find((t) => t.status === 'COMPLETED')!;
    expect(effectiveTaskStatus(done)).toBe('COMPLETED');
    const pending = db.tasks.find((t) => t.status === 'PENDING')!;
    const past = { ...pending, dueAt: addHours(new Date(), -5).toISOString() };
    expect(effectiveTaskStatus(past)).toBe('OVERDUE');
    expect(effectiveTaskStatus({ ...past, status: 'COMPLETED' as const })).toBe('COMPLETED');
  });
});

describe('campaign attribution', () => {
  const db = buildSeed();

  it('splits paid leads across campaigns exactly once', () => {
    const paidSources = new Set(db.campaigns.map((c) => c.source));
    const attributed = db.leads.filter((l) => paidSources.has(l.source) && !l.archivedAt);
    const summed = db.campaigns.reduce(
      (sum, c) => sum + campaignTotals(c, db.campaignMetrics, db.leads, db.members).leads,
      0,
    );
    // Daily metrics are generated per campaign source, so the campaign
    // screen must reconcile with the Leads screen rather than double count.
    expect(summed).toBe(attributed.length);
  });

  it('never attributes referral or manual leads to a campaign', () => {
    for (const c of db.campaigns) {
      expect(['REFERRAL', 'MANUAL']).not.toContain(c.source);
    }
    const unattributed = db.leads.filter(
      (l) => l.source === 'REFERRAL' || l.source === 'MANUAL',
    ).length;
    expect(unattributed).toBeGreaterThan(0);
  });

  it('reports spend, revenue and roas from real rows', () => {
    for (const c of db.campaigns) {
      const t = campaignTotals(c, db.campaignMetrics, db.leads, db.members);
      expect(t.spend).toBeGreaterThan(0);
      expect(t.impressions).toBeGreaterThanOrEqual(t.clicks);
      expect(t.attributedRevenue).toBeGreaterThanOrEqual(0);
      expect(t.cpl).toBeCloseTo(t.spend / t.leads, 6);
      expect(t.memberships).toBeLessThanOrEqual(t.leads);
    }
  });

  it('reconciles campaign revenue with membership revenue', () => {
    const attributed = db.campaigns.reduce(
      (sum, c) => sum + campaignTotals(c, db.campaignMetrics, db.leads, db.members).attributedRevenue,
      0,
    );
    // Attribution covers campaign-sourced leads only, so it can never
    // exceed what the whole gym collected.
    expect(attributed).toBeLessThanOrEqual(totalRevenue(db.members));
  });
});
