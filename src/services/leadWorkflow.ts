// ===========================================================
// Lead workflow — every business transition in the product
//
// Each function is a pure `(db, input) => result` transform. It
// never mutates its input, and it returns a complete new database
// snapshot containing ALL of its side effects together: the status
// change, the follow-up task, the timeline entry and the
// notification.
//
// That shape is what makes the core promise of the product true —
// a lead cannot become "trial booked" without the reminder task
// existing, and revenue can never update without the member
// record that justifies it. The AppContext applies the returned
// snapshot in a single dispatch, so a partially applied workflow
// is not representable.
// ===========================================================

import { addMonths } from 'date-fns';

import type {
  ActivityType,
  Appointment,
  AppointmentStatus,
  AppointmentType,
  Database,
  FollowUpTask,
  Lead,
  LeadActivity,
  LeadGoal,
  LeadSource,
  LeadStatus,
  Member,
  TaskPriority,
  TaskType,
  TeamMember,
  WorkoutTime,
} from '@/types';
import { newId } from '@/lib/id';
import { computeLeadScore } from './leadScoring';
import { createNotification } from './notifications';
import { HOT_SCORE_THRESHOLD, LEAD_STATUS_META, LEAD_GOAL_META } from '@/constants';

export interface WorkflowResult {
  db: Database;
  ok: boolean;
  /** Human-readable outcome, surfaced as a toast. */
  message: string;
  error?: string;
  leadId?: string;
}

function fail(db: Database, message: string): WorkflowResult {
  return { db, ok: false, message: '', error: message };
}

function ok(db: Database, message: string, leadId?: string): WorkflowResult {
  return { db, ok: true, message, leadId };
}

// ---------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------

function stamp(db: Database): Database {
  return {
    ...db,
    team: [...db.team],
    leads: [...db.leads],
    activities: [...db.activities],
    tasks: [...db.tasks],
    appointments: [...db.appointments],
    plans: [...db.plans],
    members: [...db.members],
    campaigns: [...db.campaigns],
    campaignMetrics: [...db.campaignMetrics],
    notifications: [...db.notifications],
  };
}

/** Recomputes a lead's stored score from current inputs. */
/**
 * Recomputes and stores a lead's score. Returns the updated lead so
 * callers can use the new score — it replaces the array entry with a
 * fresh object, so any earlier local reference is stale.
 */
function rescore(next: Database, leadId: string): Lead | null {
  const idx = next.leads.findIndex((l) => l.id === leadId);
  if (idx === -1) return null;
  const lead = next.leads[idx];
  const updated = { ...lead, score: computeLeadScore(lead, next.appointments).score };
  next.leads[idx] = updated;
  return updated;
}

/** Sets a lead's next-follow-up stamp without relying on array position. */
function setNextFollowUp(next: Database, leadId: string, dueAt: string): void {
  const idx = next.leads.findIndex((l) => l.id === leadId);
  if (idx === -1) return;
  next.leads[idx] = { ...next.leads[idx], nextFollowUpAt: dueAt };
}

export function addActivity(
  next: Database,
  input: {
    leadId: string;
    type: ActivityType;
    summary: string;
    body?: string;
    authorId?: string | null;
    occurredAt?: string;
  },
): LeadActivity {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const activity: LeadActivity = {
    id: newId('act'),
    createdAt: occurredAt,
    leadId: input.leadId,
    type: input.type,
    summary: input.summary,
    body: input.body ?? '',
    authorId: input.authorId ?? null,
    occurredAt,
  };
  next.activities.push(activity);
  return activity;
}

export function pushNotification(next: Database, input: Parameters<typeof createNotification>[0]) {
  next.notifications.push(createNotification(input));
}

export function pushTask(
  next: Database,
  input: {
    leadId: string;
    assigneeId: string;
    type: TaskType;
    title: string;
    notes?: string;
    dueAt: string;
    priority?: TaskPriority;
  },
): FollowUpTask {
  const task: FollowUpTask = {
    id: newId('task'),
    createdAt: new Date().toISOString(),
    leadId: input.leadId,
    assigneeId: input.assigneeId,
    type: input.type,
    title: input.title,
    notes: input.notes ?? '',
    dueAt: input.dueAt,
    priority: input.priority ?? 'MEDIUM',
    status: 'PENDING',
    completedAt: null,
  };
  next.tasks.push(task);
  return task;
}

/**
 * Round-robin by workload: the salesperson carrying the fewest
 * open leads (tie-broken by fewest overdue tasks, then by name so
 * the choice is fully deterministic and explainable).
 *
 * This is what makes "the lead is automatically assigned" true
 * the moment someone submits the public form.
 */
export function pickAssignee(db: Database, now = new Date()): TeamMember | null {
  const sales = db.team.filter((t) => t.active);
  if (!sales.length) return null;
  if (sales.length === 1) return sales[0];

  const load = sales.map((member) => {
    const open = db.leads.filter(
      (l) =>
        l.assignedToId === member.id &&
        !l.archivedAt &&
        l.status !== 'MEMBERSHIP' &&
        l.status !== 'LOST',
    ).length;
    const overdue = db.tasks.filter(
      (t) =>
        t.assigneeId === member.id &&
        t.status === 'PENDING' &&
        new Date(t.dueAt).getTime() < now.getTime(),
    ).length;
    return { member, open, overdue };
  });

  load.sort(
    (a, b) =>
      a.open - b.open ||
      a.overdue - b.overdue ||
      a.member.name.localeCompare(b.member.name),
  );
  return load[0].member;
}

// ---------------------------------------------------------
// Lead intake
// ---------------------------------------------------------

export interface LeadInput {
  name: string;
  phone: string;
  /** Optional on the public form — most visitors only leave a phone number. */
  email: string | null;
  goal: LeadGoal;
  workoutTime: WorkoutTime;
  program: string | null;
  message: string | null;
  /** Omitted by the public form, which is a website enquiry by definition. */
  source?: LeadSource;
  requestedTrial: boolean;
}

/** Normalises optional free-text form input into the stored string shape. */
function text(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/** Normalises an optional free-text choice: blank becomes null, not ''. */
function optionalText(value: string | null | undefined): string | null {
  return text(value) || null;
}

/** Rejects a repeat submission of the same phone inside a 48h window. */
export function findDuplicate(db: Database, phone: string, now = new Date()): Lead | null {
  const clean = phone.replace(/\D/g, '').slice(-10);
  if (!clean) return null;
  return (
    db.leads.find((lead) => {
      if (lead.archivedAt) return false;
      if (lead.phone.replace(/\D/g, '').slice(-10) !== clean) return false;
      const age = now.getTime() - new Date(lead.createdAt).getTime();
      return age < 48 * 36e5 && lead.status !== 'LOST';
    }) ?? null
  );
}

/**
 * The public trial form path: capture, score, assign, and hand the
 * salesperson something to do straight away.
 */
export function submitPublicLead(db: Database, input: LeadInput): WorkflowResult {
  const name = text(input.name);
  const phone = text(input.phone);
  if (!name) return fail(db, 'Enter your name so we know who to greet.');
  if (phone.replace(/\D/g, '').length < 10) return fail(db, 'Enter a valid 10-digit phone number.');

  const duplicate = findDuplicate(db, phone);
  if (duplicate) {
    return fail(db, `We already have ${duplicate.name}'s details. Our team will call shortly.`);
  }

  const next = stamp(db);
  const now = new Date();
  const createdAt = now.toISOString();
  const assignee = pickAssignee(next, now);

  const lead: Lead = {
    id: newId('lead'),
    createdAt,
    name,
    phone,
    email: text(input.email),
    goal: input.goal,
    workoutTime: input.workoutTime,
    program: optionalText(input.program),
    message: text(input.message),
    source: input.source ?? 'WEBSITE',
    status: 'NEW',
    score: 0,
    assignedToId: assignee?.id ?? null,
    requestedTrial: input.requestedTrial,
    nextFollowUpAt: null,
    lastContactedAt: null,
    statusChangedAt: createdAt,
    lostReason: null,
    archivedAt: null,
  };
  next.leads.unshift(lead);
  const scored = rescore(next, lead.id) ?? lead;

  addActivity(next, {
    leadId: scored.id,
    type: 'NOTE',
    summary: 'Lead captured from the website',
    body: [
      `Goal: ${LEAD_GOAL_META[scored.goal].label}`,
      scored.program ? `Program: ${scored.program}` : null,
      `Preferred time: ${scored.workoutTime}`,
      scored.message ? `Message: ${scored.message}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    authorId: null,
  });

  // First follow-up so the lead can never sit unattended.
  const dueAt = input.requestedTrial
    ? addMinutes(now, 30).toISOString()
    : addHours(now, 2).toISOString();
  if (assignee) {
    const task = pushTask(next, {
      leadId: scored.id,
      assigneeId: assignee.id,
      type: input.requestedTrial ? 'CALL' : 'WHATSAPP',
      title: input.requestedTrial
        ? `Call ${scored.name} back within 30 minutes`
        : `First contact with ${scored.name}`,
      notes: `Captured via ${scored.source.replace(/_/g, ' ').toLowerCase()}. Score ${scored.score}/100.`,
      dueAt,
      priority: scored.score >= HOT_SCORE_THRESHOLD ? 'HIGH' : 'MEDIUM',
    });
    scored.nextFollowUpAt = task.dueAt;
  }

  pushNotification(next, {
    kind: 'NEW_LEAD',
    title: `New lead — ${scored.name}`,
    body: `${scored.score}/100 · ${scored.source.replace(/_/g, ' ')}${assignee ? ` · assigned to ${assignee.name}` : ''}`,
    href: `/admin/leads/${scored.id}`,
    recipientId: assignee?.id ?? null,
  });

  return ok(
    next,
    assignee
      ? `Lead captured and assigned to ${assignee.name}.`
      : 'Lead captured.',
    scored.id,
  );
}

/** Clears the unread badge on the notification feed. */
export function markNotificationsRead(db: Database): WorkflowResult {
  if (db.notifications.every((n) => n.read)) return fail(db, 'Nothing new to mark as read.');
  const next = stamp(db);
  next.notifications = next.notifications.map((n) => (n.read ? n : { ...n, read: true }));
  return ok(next, 'Notifications marked as read.');
}

/** Admin-created lead. Same scoring/assignment path as the public form. */
export function createManualLead(db: Database, input: LeadInput): WorkflowResult {
  const name = text(input.name);
  const phone = text(input.phone);
  if (!name) return fail(db, 'Enter the lead name.');
  if (phone.replace(/\D/g, '').length < 10) return fail(db, 'Enter a valid 10-digit phone number.');

  const next = stamp(db);
  const now = new Date();
  const createdAt = now.toISOString();
  const assignee = pickAssignee(next, now);

  const lead: Lead = {
    id: newId('lead'),
    createdAt,
    name,
    phone,
    email: text(input.email),
    goal: input.goal,
    workoutTime: input.workoutTime,
    program: optionalText(input.program),
    message: text(input.message),
    source: input.source ?? 'MANUAL',
    status: 'NEW',
    score: 0,
    assignedToId: assignee?.id ?? null,
    requestedTrial: input.requestedTrial,
    nextFollowUpAt: null,
    lastContactedAt: null,
    statusChangedAt: createdAt,
    lostReason: null,
    archivedAt: null,
  };
  next.leads.unshift(lead);
  const scored = rescore(next, lead.id) ?? lead;

  addActivity(next, {
    leadId: scored.id,
    type: 'NOTE',
    summary: 'Lead added manually',
    body: `Goal: ${LEAD_GOAL_META[scored.goal].label}${scored.program ? `\nProgram: ${scored.program}` : ''}${scored.message ? `\nMessage: ${scored.message}` : ''}`,
    authorId: null,
  });

  if (assignee) {
    const task = pushTask(next, {
      leadId: scored.id,
      assigneeId: assignee.id,
      type: 'CALL',
      title: `First contact with ${scored.name}`,
      notes: `Added manually · Score ${scored.score}/100.`,
      dueAt: addHours(now, 2).toISOString(),
      priority: scored.score >= HOT_SCORE_THRESHOLD ? 'HIGH' : 'MEDIUM',
    });
    setNextFollowUp(next, scored.id, task.dueAt);
  }

  pushNotification(next, {
    kind: 'NEW_LEAD',
    title: `New lead — ${scored.name}`,
    body: `${scored.score}/100 · added manually${assignee ? ` · ${assignee.name}` : ''}`,
    href: `/admin/leads/${scored.id}`,
    recipientId: assignee?.id ?? null,
  });

  return ok(next, `Lead ${scored.name} created.`, scored.id);
}

// ---------------------------------------------------------
// Assignment + stage
// ---------------------------------------------------------

export function assignLead(db: Database, leadId: string, assigneeId: string | null): WorkflowResult {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return fail(db, 'Lead not found.');
  const member = db.team.find((t) => t.id === assigneeId) ?? null;

  const next = stamp(db);
  const idx = next.leads.findIndex((l) => l.id === leadId);
  next.leads[idx] = { ...lead, assignedToId: assigneeId };

  addActivity(next, {
    leadId,
    type: 'STATUS_CHANGE',
    summary: member ? `Assigned to ${member.name}` : 'Assignment removed',
    authorId: null,
  });

  if (member) {
    pushNotification(next, {
      kind: 'NEW_LEAD',
      title: `You were assigned ${lead.name}`,
      body: `Score ${lead.score}/100 · ${LEAD_STATUS_META[lead.status].label}`,
      href: `/admin/leads/${leadId}`,
      recipientId: member.id,
    });
  }
  return ok(next, member ? `Assigned to ${member.name}.` : 'Assignment removed.', leadId);
}

export function moveLeadStage(
  db: Database,
  leadId: string,
  status: LeadStatus,
  lostReason?: string,
): WorkflowResult {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return fail(db, 'Lead not found.');
  if (lead.status === status) return fail(db, `${lead.name} is already in that stage.`);

  const next = stamp(db);
  const now = new Date().toISOString();
  const idx = next.leads.findIndex((l) => l.id === leadId);
  next.leads[idx] = {
    ...lead,
    status,
    statusChangedAt: now,
    lostReason: status === 'LOST' ? (lostReason ?? 'Not stated') : null,
  };
  rescore(next, leadId);

  addActivity(next, {
    leadId,
    type: 'STATUS_CHANGE',
    summary: `${LEAD_STATUS_META[lead.status].label} → ${LEAD_STATUS_META[status].label}`,
    body: status === 'LOST' ? `Reason: ${lostReason ?? 'Not stated'}` : '',
    authorId: null,
  });

  // Contacting a lead for the first time is a measurable milestone.
  if (status !== 'NEW' && !lead.lastContactedAt) {
    next.leads[idx] = { ...next.leads[idx], lastContactedAt: now };
  }

  // Reopening a lost lead should give the rep something to do.
  if (status === 'CONTACTED' && lead.status === 'LOST') {
    if (lead.assignedToId) {
      pushTask(next, {
        leadId,
        assigneeId: lead.assignedToId,
        type: 'CALL',
        title: `Re-contact ${lead.name}`,
        notes: 'Lead was moved back out of Lost.',
        dueAt: addHours(new Date(), 4).toISOString(),
        priority: 'HIGH',
      });
    }
  }

  return ok(
    next,
    `${lead.name} moved to ${LEAD_STATUS_META[status].label}.`,
    leadId,
  );
}

export function updateLead(
  db: Database,
  leadId: string,
  patch: Partial<Lead>,
): WorkflowResult {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return fail(db, 'Lead not found.');

  const next = stamp(db);
  const idx = next.leads.findIndex((l) => l.id === leadId);
  next.leads[idx] = { ...lead, ...patch, id: lead.id, createdAt: lead.createdAt };
  rescore(next, leadId);
  return ok(next, `${lead.name} updated.`, leadId);
}

export function archiveLead(db: Database, leadId: string, archived: boolean): WorkflowResult {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return fail(db, 'Lead not found.');
  const next = stamp(db);
  const idx = next.leads.findIndex((l) => l.id === leadId);
  next.leads[idx] = { ...lead, archivedAt: archived ? new Date().toISOString() : null };
  return ok(next, archived ? `${lead.name} archived.` : `${lead.name} restored.`, leadId);
}

/** Logs a call/WhatsApp/email/note and marks the lead as contacted. */
export function logContact(
  db: Database,
  leadId: string,
  input: { type: ActivityType; summary: string; body?: string; authorId: string | null },
): WorkflowResult {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return fail(db, 'Lead not found.');

  const next = stamp(db);
  const now = new Date().toISOString();
  addActivity(next, { ...input, leadId, occurredAt: now });

  const outbound = ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING'].includes(input.type);
  const idx = next.leads.findIndex((l) => l.id === leadId);
  next.leads[idx] = { ...lead, lastContactedAt: outbound ? now : lead.lastContactedAt };

  // The first real outbound touch moves a lead out of New.
  if (outbound && lead.status === 'NEW') {
    next.leads[idx] = { ...next.leads[idx], status: 'CONTACTED', statusChangedAt: now };
    addActivity(next, {
      leadId,
      type: 'STATUS_CHANGE',
      summary: 'New → Contacted',
      body: 'First outbound contact logged.',
      authorId: input.authorId,
    });
  }
  return ok(next, 'Activity logged.', leadId);
}

// ---------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------

export function createTask(
  db: Database,
  input: {
    leadId: string;
    assigneeId: string;
    type: TaskType;
    title: string;
    notes?: string;
    dueAt: string;
    priority: TaskPriority;
  },
): WorkflowResult {
  if (!db.leads.some((l) => l.id === input.leadId)) return fail(db, 'Lead not found.');
  if (!db.team.some((t) => t.id === input.assigneeId)) return fail(db, 'Assignee not found.');

  const next = stamp(db);
  const task = pushTask(next, input);

  const idx = next.leads.findIndex((l) => l.id === input.leadId);
  const lead = next.leads[idx];
  const earliest = [lead.nextFollowUpAt, task.dueAt].filter(Boolean).sort()[0];
  next.leads[idx] = { ...lead, nextFollowUpAt: earliest ?? task.dueAt };

  addActivity(next, {
    leadId: input.leadId,
    type: 'NOTE',
    summary: `Follow-up scheduled — ${input.title}`,
    body: `Due ${new Date(task.dueAt).toLocaleString('en-IN')}`,
    authorId: input.assigneeId,
  });

  return ok(next, 'Follow-up scheduled.', input.leadId);
}

export function completeTask(db: Database, taskId: string): WorkflowResult {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return fail(db, 'Task not found.');
  if (task.status === 'COMPLETED') return fail(db, 'Already completed.');

  const next = stamp(db);
  const now = new Date().toISOString();
  const idx = next.tasks.findIndex((t) => t.id === taskId);
  next.tasks[idx] = { ...task, status: 'COMPLETED', completedAt: now };

  addActivity(next, {
    leadId: task.leadId,
    type: 'NOTE',
    summary: `Follow-up completed — ${task.title}`,
    authorId: task.assigneeId,
    occurredAt: now,
  });

  // Advance the lead's next-follow-up pointer past this task.
  const leadIdx = next.leads.findIndex((l) => l.id === task.leadId);
  if (leadIdx >= 0) {
    const lead = next.leads[leadIdx];
    const remaining = next.tasks
      .filter(
        (t) => t.leadId === lead.id && t.status === 'PENDING' && new Date(t.dueAt) > new Date(now),
      )
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    next.leads[leadIdx] = { ...lead, nextFollowUpAt: remaining[0]?.dueAt ?? null };
  }

  return ok(next, 'Follow-up completed.', task.leadId);
}

export function reopenTask(db: Database, taskId: string): WorkflowResult {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return fail(db, 'Task not found.');
  const next = stamp(db);
  const idx = next.tasks.findIndex((t) => t.id === taskId);
  next.tasks[idx] = { ...task, status: 'PENDING', completedAt: null };
  return ok(next, 'Follow-up reopened.', task.leadId);
}

export function deleteTask(db: Database, taskId: string): WorkflowResult {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return fail(db, 'Task not found.');
  const next = stamp(db);
  next.tasks = next.tasks.filter((t) => t.id !== taskId);
  return ok(next, 'Follow-up deleted.', task.leadId);
}

// ---------------------------------------------------------
// Appointments / trials
// ---------------------------------------------------------

export interface TrialInput {
  date: string;
  time: string;
  staffId: string;
  type: AppointmentType;
  notes?: string;
}

export function bookAppointment(
  db: Database,
  leadId: string,
  input: TrialInput,
): WorkflowResult {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return fail(db, 'Lead not found.');
  if (lead.status === 'MEMBERSHIP') return fail(db, `${lead.name} is already a member.`);
  if (lead.status === 'LOST') return fail(db, `${lead.name} is marked lost. Restore the lead first.`);
  if (!db.team.some((t) => t.id === input.staffId)) return fail(db, 'Staff member not found.');

  const next = stamp(db);
  const appointment: Appointment = {
    id: newId('appt'),
    createdAt: new Date().toISOString(),
    leadId,
    staffId: input.staffId,
    type: input.type,
    date: input.date,
    time: input.time,
    attendedAt: null,
    status: 'SCHEDULED',
    notes: input.notes ?? '',
  };
  next.appointments.push(appointment);
  rescore(next, leadId);

  // Booking a trial is the pipeline transition.
  const leadIdx = next.leads.findIndex((l) => l.id === leadId);
  if (lead.status !== 'TRIAL_ATTENDED') {
    next.leads[leadIdx] = { ...lead, status: 'TRIAL_BOOKED', statusChangedAt: new Date().toISOString() };
    addActivity(next, {
      leadId,
      type: 'STATUS_CHANGE',
      summary: `${LEAD_STATUS_META[lead.status].label} → Trial Booked`,
      authorId: input.staffId,
    });
  }

  addActivity(next, {
    leadId,
    type: 'TRIAL',
    summary: `Trial booked for ${input.date} at ${input.time}`,
    body: input.notes ?? '',
    authorId: input.staffId,
  });

  // Reminder 24h before, so attendance is not left to chance.
  const reminderAt = new Date(`${input.date}T${input.time}:00`);
  reminderAt.setHours(reminderAt.getHours() - 24);
  pushTask(next, {
    leadId,
    assigneeId: input.staffId,
    type: 'TRIAL_REMINDER',
    title: `Remind ${lead.name} about tomorrow's trial`,
    notes: `Trial at ${input.time} on ${input.date}.`,
    dueAt: reminderAt.toISOString(),
    priority: 'HIGH',
  });

  const leadIdx2 = next.leads.findIndex((l) => l.id === leadId);
  const reminderDue = next.tasks
    .filter((t) => t.leadId === leadId && t.status === 'PENDING')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];
  next.leads[leadIdx2] = {
    ...next.leads[leadIdx2],
    nextFollowUpAt: reminderDue?.dueAt ?? next.leads[leadIdx2].nextFollowUpAt,
  };

  pushNotification(next, {
    kind: 'TRIAL_BOOKED',
    title: `Trial booked — ${lead.name}`,
    body: `${input.date} at ${input.time}`,
    href: `/admin/leads/${leadId}`,
    recipientId: input.staffId,
  });

  return ok(next, `Trial booked for ${lead.name} on ${input.date} at ${input.time}.`, leadId);
}

export function setAppointmentStatus(
  db: Database,
  appointmentId: string,
  status: AppointmentStatus,
): WorkflowResult {
  const appt = db.appointments.find((a) => a.id === appointmentId);
  if (!appt) return fail(db, 'Appointment not found.');
  if (appt.status === status) return fail(db, 'Already in that state.');

  const next = stamp(db);
  const now = new Date().toISOString();
  const idx = next.appointments.findIndex((a) => a.id === appointmentId);
  next.appointments[idx] = { ...appt, status, attendedAt: status === 'ATTENDED' ? now : null };

  const lead = next.leads.find((l) => l.id === appt.leadId);
  const leadIdx = next.leads.findIndex((l) => l.id === appt.leadId);

  if (lead && leadIdx >= 0) {
    if (status === 'ATTENDED') {
      // Attendance is the strongest positive signal in the funnel.
      if (lead.status === 'TRIAL_BOOKED' || lead.status === 'QUALIFIED' || lead.status === 'CONTACTED') {
        next.leads[leadIdx] = {
          ...lead,
          status: 'TRIAL_ATTENDED',
          statusChangedAt: now,
          lastContactedAt: now,
        };
        addActivity(next, {
          leadId: lead.id,
          type: 'STATUS_CHANGE',
          summary: `Trial Booked → Trial Attended`,
          authorId: appt.staffId,
        });
      }
      addActivity(next, {
        leadId: lead.id,
        type: 'TRIAL',
        summary: 'Trial session attended',
        body: appt.notes,
        authorId: appt.staffId,
        occurredAt: now,
      });
      pushNotification(next, {
        kind: 'TRIAL_ATTENDED',
        title: `${lead.name} attended their trial`,
        body: 'Time to close the membership.',
        href: `/admin/leads/${lead.id}`,
        recipientId: appt.staffId,
      });
    }

    if (status === 'NO_SHOW') {
      addActivity(next, {
        leadId: lead.id,
        type: 'TRIAL',
        summary: 'Trial no-show',
        body: 'Lead did not attend the scheduled session.',
        authorId: appt.staffId,
        occurredAt: now,
      });
      pushTask(next, {
        leadId: lead.id,
        assigneeId: appt.staffId,
        type: 'CALL',
        title: `Rebook a trial with ${lead.name}`,
        notes: 'They no-showed the last session.',
        dueAt: addHours(new Date(), 3).toISOString(),
        priority: 'HIGH',
      });
      pushNotification(next, {
        kind: 'TRIAL_ATTENDED',
        title: `No-show — ${lead.name}`,
        body: 'A rebook call has been queued.',
        href: `/admin/leads/${lead.id}`,
        recipientId: appt.staffId,
      });
    }

    if (status === 'CANCELLED' && lead.status === 'TRIAL_BOOKED') {
      next.leads[leadIdx] = { ...lead, status: 'QUALIFIED', statusChangedAt: now };
      addActivity(next, {
        leadId: lead.id,
        type: 'STATUS_CHANGE',
        summary: 'Trial Booked → Qualified (trial cancelled)',
        authorId: appt.staffId,
        occurredAt: now,
      });
    }
  }

  rescore(next, appt.leadId);
  return ok(next, `Appointment marked ${status.toLowerCase().replace(/_/g, ' ')}.`, appt.leadId);
}

export function cancelAppointment(db: Database, appointmentId: string): WorkflowResult {
  return setAppointmentStatus(db, appointmentId, 'CANCELLED');
}

// ---------------------------------------------------------
// Membership conversion — the revenue event
// ---------------------------------------------------------

export interface ConversionInput {
  planId: string;
  startDate: string;
  amountPaid: number;
  paymentMode: Member['paymentMode'];
}

export function convertToMember(
  db: Database,
  leadId: string,
  input: ConversionInput,
): WorkflowResult {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return fail(db, 'Lead not found.');

  const plan = db.plans.find((p) => p.id === input.planId);
  if (!plan) return fail(db, 'Membership plan not found.');
  if (db.members.some((m) => m.leadId === leadId)) {
    return fail(db, `${lead.name} is already a member.`);
  }
  if (input.amountPaid <= 0) return fail(db, 'Enter an amount greater than zero.');
  if (!input.startDate) return fail(db, 'Choose a start date.');

  const next = stamp(db);
  const now = new Date().toISOString();

  const start = new Date(`${input.startDate}T00:00:00`);
  const expiry = addMonths(start, plan.durationMonths);

  const member: Member = {
    id: newId('mem'),
    createdAt: now,
    leadId,
    planId: plan.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    salespersonId: lead.assignedToId ?? '',
    source: lead.source,
    startDate: input.startDate,
    expiryDate: expiry.toISOString().slice(0, 10),
    amountPaid: Math.round(input.amountPaid),
    paymentMode: input.paymentMode,
    active: true,
  };
  next.members.push(member);

  const leadIdx = next.leads.findIndex((l) => l.id === leadId);
  next.leads[leadIdx] = { ...lead, status: 'MEMBERSHIP', statusChangedAt: now, nextFollowUpAt: null };
  rescore(next, leadId);

  addActivity(next, {
    leadId,
    type: 'CONVERSION',
    summary: `Converted to ${plan.name}`,
    body: [
      `Amount collected: ₹${member.amountPaid.toLocaleString('en-IN')}`,
      `Term: ${plan.durationMonths} month${plan.durationMonths === 1 ? '' : 's'}`,
      `Valid until ${member.expiryDate}`,
      `Payment: ${member.paymentMode.replace(/_/g, ' ').toLowerCase()}`,
    ].join('\n'),
    authorId: lead.assignedToId,
    occurredAt: now,
  });
  addActivity(next, {
    leadId,
    type: 'STATUS_CHANGE',
    summary: `Trial Attended → Membership`,
    authorId: lead.assignedToId,
    occurredAt: now,
  });

  // Nothing outstanding once they have joined.
  for (let i = 0; i < next.tasks.length; i += 1) {
    if (next.tasks[i].leadId === leadId && next.tasks[i].status === 'PENDING') {
      next.tasks[i] = {
        ...next.tasks[i],
        status: 'COMPLETED',
        completedAt: now,
      };
    }
  }

  pushNotification(next, {
    kind: 'MEMBERSHIP_CONVERTED',
    title: `Membership sold — ${lead.name}`,
    body: `${plan.name} · ₹${member.amountPaid.toLocaleString('en-IN')}`,
    href: `/admin/members`,
    recipientId: lead.assignedToId,
  });

  const summary = `${lead.name} converted to ${plan.name}. ₹${member.amountPaid.toLocaleString('en-IN')} recorded.`;
  return ok(next, summary, leadId);
}

// ---------------------------------------------------------
// Small date helpers (kept local to avoid a util import cycle)
// ---------------------------------------------------------

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
