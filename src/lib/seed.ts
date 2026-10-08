// ===========================================================
// Demo seed
//
// Deterministic: a fixed-seed PRNG means every install produces
// the identical dataset, while all dates are generated relative
// to today so the demo always looks current.
//
// Integrity is the important property here. Leads are generated
// first, then appointments and members are DERIVED from the leads
// that reached each stage. Campaign lead counts are derived from
// real leads by source and date. Nothing is generated
// independently, so the funnel is always monotonic and revenue
// always reconciles with the member list.
// ===========================================================

import { addDays, subDays } from 'date-fns';

import type {
  AdPlatform,
  Appointment,
  AppointmentStatus,
  AppointmentType,
  Campaign,
  CampaignMetric,
  Database,
  FollowUpTask,
  Lead,
  LeadActivity,
  LeadGoal,
  LeadSource,
  LeadStatus,
  Member,
  MembershipPlan,
  TaskPriority,
  TaskType,
  TeamMember,
  WorkoutTime,
} from '@/types';
import { EXPIRY_WARNING_DAYS } from '@/constants';
import { PROGRAM_NAMES } from '@/constants/content';
import { computeLeadScore } from '@/services/leadScoring';

// ---------------------------------------------------------
// Deterministic PRNG (mulberry32)
// ---------------------------------------------------------

const SEED_VALUE = 20260114;

function mulberry32(seed: number) {
  let a = seed;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded generator, reset at the start of every buildSeed() call so the
 * demo dataset is byte-identical on every install and every reset.
 */
let currentRandom = mulberry32(SEED_VALUE);

function rand(): number {
  return currentRandom();
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function between(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function chance(probability: number): boolean {
  return rand() < probability;
}

/** Fisher–Yates using the seeded generator. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const NOW = new Date();
const TODAY = ymd(NOW);
const WINDOW_DAYS = 90;

// ---------------------------------------------------------
// Reference data
// ---------------------------------------------------------

const FIRST_NAMES = [
  'Ananya', 'Karthik', 'Meera', 'Vikram', 'Sneha', 'Rohit', 'Divya', 'Siddharth', 'Pooja', 'Arjun',
  'Nikhil', 'Kavya', 'Rahul', 'Ishita', 'Manish', 'Swara', 'Aditya', 'Neha', 'Sandeep', 'Tanvi',
  'Harsh', 'Ritu', 'Gaurav', 'Shruti', 'Naveen', 'Preeti', 'Abhishek', 'Lakshmi', 'Farhan', 'Deepa',
  'Varun', 'Aditi', 'Sameer', 'Rashmi', 'Kunal', 'Megha', 'Yash', 'Sunita', 'Amit', 'Trisha',
  'Nishant', 'Bhavna', 'Rajesh', 'Simran', 'Amitabh', 'Kiran', 'Pallavi', 'Dev', 'Shalini', 'Omkar',
  'Jaya',
];

const LAST_NAMES = [
  'Rao', 'Subramanian', 'Iyer', 'Shetty', 'Nair', 'Sharma', 'Menon', 'Reddy', 'Patel', 'Gupta',
  'Chatterjee', 'Banerjee', 'Kulkarni', 'Desai', 'Joshi', 'Pillai', 'Varghese', 'Mishra',
];

const SOURCES: LeadSource[] = [
  'WEBSITE',
  'META_ADS',
  'INSTAGRAM',
  'WHATSAPP',
  'REFERRAL',
  'MANUAL',
];

const TIMES: WorkoutTime[] = ['EARLY_MORNING', 'MORNING', 'AFTERNOON', 'EVENING', 'WEEKEND'];

/** Messages that read like real enquiries — a mix of high and low intent. */
const MESSAGES_HIGH = [
  'What are your membership fees for the next three months?',
  'Interested in joining. Can you share the price and any joining discount?',
  'I saw your ad. How much does the Pro plan cost?',
  'Please call me back today, I want to start this week.',
  'Looking to join strength training. What plans do you offer?',
  'Is there a free trial this weekend? What time slots do you have?',
  'I want to lose weight before December. What would that cost me?',
  'Can I pay in installments? Send me the details on WhatsApp.',
];

const MESSAGES_MEDIUM = [
  'Just wanted to know more about the trainers and the timings.',
  'I have been looking at gyms in the area for a few weeks.',
  'Do you have parking, and how busy is it in the evenings?',
  'Interested in personal training but not sure how often to start.',
  'Can I try a class before committing to anything?',
  'My wife and I are both interested. Do you have a couple discount?',
];

const MESSAGES_LOW = [
  'Please share more details.',
  'Do you have any offers running currently?',
  'Adding this to my list, will get back to you.',
  'Just checking timings and location.',
  '',
];

// ---------------------------------------------------------
// Team
// ---------------------------------------------------------

const TEAM: TeamMember[] = [
  {
    id: 'tm_arjun',
    createdAt: subDays(NOW, 700).toISOString(),
    authUserId: null,
    name: 'Arjun Nair',
    email: 'arjun@fitgreen.fit',
    phone: '+91 98450 11200',
    role: 'ADMIN',
    colorIndex: 0,
    active: true,
  },
  {
    id: 'tm_priya',
    createdAt: subDays(NOW, 540).toISOString(),
    authUserId: null,
    name: 'Priya Sharma',
    email: 'priya@fitgreen.fit',
    phone: '+91 98450 11201',
    role: 'SALES_MANAGER',
    colorIndex: 2,
    active: true,
  },
  {
    id: 'tm_rahul',
    createdAt: subDays(NOW, 320).toISOString(),
    authUserId: null,
    name: 'Rahul Menon',
    email: 'rahul@fitgreen.fit',
    phone: '+91 98450 11202',
    role: 'SALES_EXEC',
    colorIndex: 1,
    active: true,
  },
];

const SALES_IDS = TEAM.map((t) => t.id);

// ---------------------------------------------------------
// Plans
// ---------------------------------------------------------

const PLANS: MembershipPlan[] = [
  {
    id: 'plan_starter',
    createdAt: subDays(NOW, 700).toISOString(),
    name: 'Starter',
    tagline: 'Full floor access, one programme',
    price: 2499,
    durationMonths: 1,
    features: [
      'Unlimited gym floor access',
      'One guided programme',
      'Body composition scan',
      '4:00 – 10:00 AM weekday access',
    ],
    highlight: false,
    sortOrder: 1,
  },
  {
    id: 'plan_pro',
    createdAt: subDays(NOW, 700).toISOString(),
    name: 'Pro',
    tagline: 'Three programmes plus the trial guarantee',
    price: 4999,
    durationMonths: 3,
    features: [
      'Everything in Starter',
      'All group programmes',
      'Weekly progress review',
      'One personal training session a month',
      'Full 5 AM – 10 PM access',
    ],
    highlight: true,
    sortOrder: 2,
  },
  {
    id: 'plan_elite',
    createdAt: subDays(NOW, 700).toISOString(),
    name: 'Elite',
    tagline: 'Coached, every session',
    price: 7999,
    durationMonths: 12,
    features: [
      'Everything in Pro',
      'Four coached sessions a week',
      'Nutrition guidance',
      'Priority booking and guest passes',
      'Quarterly physique re-scan',
    ],
    highlight: false,
    sortOrder: 3,
  },
  {
    id: 'plan_powerhour',
    createdAt: subDays(NOW, 240).toISOString(),
    name: 'Power Hour',
    tagline: 'Off-peak access for the serious early riser',
    price: 1499,
    durationMonths: 1,
    features: [
      'Weekdays 10:00 AM – 4:00 PM',
      'Unlimited floor access',
      'Strength Foundations included',
      'No commitment — cancel monthly',
    ],
    highlight: false,
    sortOrder: 4,
  },
  {
    id: 'plan_coachs_circle',
    createdAt: subDays(NOW, 180).toISOString(),
    name: "Coach's Circle",
    tagline: 'Small group, eight members maximum',
    price: 14999,
    durationMonths: 12,
    features: [
      'Everything in Elite',
      'Eight members maximum per block',
      'Programme written by the head coach',
      'Monthly one-to-one review',
      'WhatsApp access to your coach',
    ],
    highlight: false,
    sortOrder: 5,
  },
];

// ---------------------------------------------------------
// Leads
// ---------------------------------------------------------

/** Target stage mix. Drives the funnel, then everything else follows. */
const STAGE_PLAN: { status: LeadStatus; count: number; ageMin: number; ageMax: number }[] = [
  { status: 'NEW', count: 10, ageMin: 0, ageMax: 9 },
  { status: 'CONTACTED', count: 7, ageMin: 1, ageMax: 24 },
  { status: 'QUALIFIED', count: 6, ageMin: 4, ageMax: 44 },
  { status: 'TRIAL_BOOKED', count: 5, ageMin: 7, ageMax: 50 },
  { status: 'TRIAL_ATTENDED', count: 5, ageMin: 9, ageMax: 60 },
  { status: 'MEMBERSHIP', count: 11, ageMin: 14, ageMax: 88 },
  { status: 'LOST', count: 6, ageMin: 9, ageMax: 80 },
];

const usedNames = new Set<string>();

/** Clears every piece of module-level generator state so buildSeed() is pure. */
function resetGenerator(): void {
  currentRandom = mulberry32(SEED_VALUE);
  usedNames.clear();
}

function uniqueName(): string {
  for (let i = 0; i < 200; i += 1) {
    const candidate = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
  }
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${usedNames.size}`;
}

function makePhone(): string {
  return `+91 9${between(100000000, 999999999)}`.replace(/(\+91 9\d{5})(\d{5})/, '$1 $2');
}

function makeEmail(name: string, index: number): string {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '.');
  return `${slug}${index}@gmail.com`;
}

/** Weighted so NEW is common and GENERAL inquiries are rare. */
function pickGoal(): LeadGoal {
  const roll = rand();
  if (roll < 0.3) return 'WEIGHT_LOSS';
  if (roll < 0.55) return 'MUSCLE_GAIN';
  if (roll < 0.75) return 'STRENGTH';
  if (roll < 0.9) return 'FITNESS';
  if (roll < 0.98) return 'PERSONAL_TRAINING';
  return 'GENERAL';
}

function pickMessage(scoreRoll: number): string {
  if (scoreRoll > 0.75) return pick(MESSAGES_HIGH);
  if (scoreRoll > 0.4) return pick(MESSAGES_MEDIUM);
  return pick(MESSAGES_LOW);
}

/**
 * Weighted lead-source pool that guarantees every channel appears at
 * least once, then shuffles it. Pure random picking can omit a channel
 * entirely on a given seed, which would leave a filter empty in the UI.
 */
function buildSourcePool(size: number): LeadSource[] {
  const pool: LeadSource[] = [];
  for (const source of SOURCES) pool.push(source);
  const weights: LeadSource[] = [
    'WEBSITE', 'WEBSITE', 'WEBSITE', 'WEBSITE',
    'META_ADS', 'META_ADS', 'META_ADS', 'META_ADS', 'META_ADS', 'META_ADS',
    'INSTAGRAM', 'INSTAGRAM', 'INSTAGRAM', 'INSTAGRAM',
    'WHATSAPP', 'WHATSAPP', 'WHATSAPP',
    'REFERRAL', 'REFERRAL', 'REFERRAL',
    'MANUAL',
  ];
  while (pool.length < size) pool.push(pick(weights));
  return shuffle(pool).slice(0, size);
}

function buildLeads(): Lead[] {
  const leads: Lead[] = [];
  let index = 0;
  const sourcePool = buildSourcePool(
    STAGE_PLAN.reduce((sum, stage) => sum + stage.count, 0),
  );

  for (const stage of STAGE_PLAN) {
    for (let i = 0; i < stage.count; i += 1) {
      index += 1;
      const name = uniqueName();
      const ageDays = between(stage.ageMin, stage.ageMax);
      const created = subDays(NOW, ageDays);

      // Message intensity drives the score, and the score drives
      // whether this looks like a genuinely hot lead.
      const intentRoll = rand();
      const message = pickMessage(intentRoll);
      const highIntent = intentRoll > 0.75;

      const source = sourcePool[index - 1];

      const goal = pickGoal();
      const status: LeadStatus = stage.status;

      // Contacted / progressed leads have all been touched.
      const progressed = status !== 'NEW' && status !== 'LOST';
      const lastContactDays = progressed
        ? Math.max(0, ageDays - between(0, Math.max(1, Math.floor(ageDays / 2))))
        : chance(0.25)
          ? between(1, Math.max(1, ageDays))
          : null;

      // statusChangedAt: when they entered their current stage.
      const stagesEntered = ['NEW', 'CONTACTED', 'QUALIFIED', 'TRIAL_BOOKED', 'TRIAL_ATTENDED', 'MEMBERSHIP'];
      const depth = Math.max(0, stagesEntered.indexOf(status));
      const statusAgeDays = depth === 0 ? 0 : between(0, Math.max(1, Math.floor(ageDays / (depth + 1))));

      leads.push({
        id: `lead_${String(index).padStart(3, '0')}`,
        createdAt: created.toISOString(),
        name,
        phone: makePhone(),
        email: makeEmail(name, index),
        goal,
        workoutTime: pick(TIMES),
        program: chance(0.72) ? pick(PROGRAM_NAMES) : null,
        message,
        source,
        status,
        score: 0,
        // Conversion rate is better with a coach, so keep most assignments.
        assignedToId: chance(0.94) ? pick(SALES_IDS) : null,
        requestedTrial: highIntent || chance(0.3),
        lastContactedAt:
          lastContactDays === null ? null : subDays(NOW, lastContactDays).toISOString(),
        statusChangedAt: subDays(NOW, statusAgeDays).toISOString(),
        nextFollowUpAt: null,
        lostReason:
          status === 'LOST'
            ? pick([
                'Price was too high',
                'Chose a gym closer to home',
                'Not the right time financially',
                'Wanted a female-only facility',
                'Stopped replying after two calls',
                'Moved out of the area',
              ])
            : null,
        archivedAt: null,
      });
    }
  }

  return leads.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// ---------------------------------------------------------
// Appointments — derived from the leads that reached each stage
// ---------------------------------------------------------

const TRIAL_SLOTS = [
  '06:30', '07:15', '08:00', '09:00', '10:30', '16:30', '17:15', '18:00', '19:00', '20:00',
];

function buildAppointments(leads: Lead[]): Appointment[] {
  const out: Appointment[] = [];
  let n = 0;

  for (const lead of leads) {
    const reachedTrial = ['TRIAL_BOOKED', 'TRIAL_ATTENDED', 'MEMBERSHIP'].includes(lead.status);
    if (!reachedTrial) continue;

    // The trial happens after the lead was qualified, before the end
    // of its life in the pipeline.
    const createdAt = new Date(lead.createdAt).getTime();
    const earliest = createdAt + 2 * 86_400_000;
    const latest = Math.min(
      NOW.getTime(),
      new Date(lead.statusChangedAt).getTime() || NOW.getTime(),
    );
    const at = between(earliest, Math.max(earliest + 36e5, latest));
    const when = new Date(at);

    let status: AppointmentStatus;
    if (lead.status === 'TRIAL_ATTENDED' || lead.status === 'MEMBERSHIP') {
      status = 'ATTENDED';
    } else if (lead.status === 'TRIAL_BOOKED') {
      // Still ahead of us, or today — a mix of confirmed and pending.
      status = when.getTime() > NOW.getTime() ? (chance(0.6) ? 'CONFIRMED' : 'SCHEDULED') : 'ATTENDED';
    } else {
      status = 'ATTENDED';
    }
    if (status === 'ATTENDED' && lead.status === 'TRIAL_BOOKED') {
      // Attendance happened but nobody advanced the pipeline — this is
      // exactly the stalled case the insights panel should surface.
      if (chance(0.5)) status = 'SCHEDULED';
    }

    n += 1;
    out.push({
      id: `appt_${String(n).padStart(3, '0')}`,
      createdAt: new Date(at - 3 * 86_400_000).toISOString(),
      leadId: lead.id,
      staffId: lead.assignedToId ?? 'tm_priya',
      type: 'FREE_TRIAL',
      date: ymd(when),
      time: TRIAL_SLOTS[between(0, TRIAL_SLOTS.length - 1)],
      attendedAt: status === 'ATTENDED' ? new Date(at).toISOString() : null,
      status,
      notes: status === 'ATTENDED' ? 'Attended full session. Discussed plans.' : '',
    });
  }

  // A few supplementary consultations so the calendar is not trial-only.
  const consultLeads = leads.filter(
    (l) => ['QUALIFIED', 'TRIAL_BOOKED', 'TRIAL_ATTENDED'].includes(l.status) && chance(0.34),
  );
  for (const lead of consultLeads) {
    n += 1;
    const when = addDays(NOW, between(-20, 12));
    const type: AppointmentType = chance(0.5)
      ? 'FITNESS_ASSESSMENT'
      : 'MEMBERSHIP_CONSULTATION';
    const past = when.getTime() < NOW.getTime();
    out.push({
      id: `appt_${String(n).padStart(3, '0')}`,
      createdAt: subDays(when, 4).toISOString(),
      leadId: lead.id,
      staffId: lead.assignedToId ?? 'tm_priya',
      type,
      date: ymd(when),
      time: TRIAL_SLOTS[between(0, TRIAL_SLOTS.length - 1)],
      attendedAt: past ? when.toISOString() : null,
      status: past ? 'ATTENDED' : chance(0.5) ? 'CONFIRMED' : 'SCHEDULED',
      notes: '',
    });
  }

  // Two no-shows and one cancellation, so every status is represented.
  const atRisk = leads.filter((l) => ['QUALIFIED', 'CONTACTED'].includes(l.status));
  for (let i = 0; i < Math.min(2, atRisk.length); i += 1) {
    const lead = atRisk[i];
    const when = subDays(NOW, between(2, 25));
    n += 1;
    out.push({
      id: `appt_${String(n).padStart(3, '0')}`,
      createdAt: subDays(when, 5).toISOString(),
      leadId: lead.id,
      staffId: lead.assignedToId ?? 'tm_priya',
      type: 'FREE_TRIAL',
      date: ymd(when),
      time: TRIAL_SLOTS[between(0, TRIAL_SLOTS.length - 1)],
      attendedAt: null,
      status: 'NO_SHOW',
      notes: 'Did not attend, no reply on WhatsApp.',
    });
  }

  if (atRisk[2]) {
    const when = subDays(NOW, between(3, 14));
    n += 1;
    out.push({
      id: `appt_${String(n).padStart(3, '0')}`,
      createdAt: subDays(when, 6).toISOString(),
      leadId: atRisk[2].id,
      staffId: atRisk[2].assignedToId ?? 'tm_priya',
      type: 'FITNESS_ASSESSMENT',
      date: ymd(when),
      time: TRIAL_SLOTS[between(0, TRIAL_SLOTS.length - 1)],
      attendedAt: null,
      status: 'CANCELLED',
      notes: 'Rescheduled by the lead.',
    });
  }

  // A couple of trials later today, so the demo has something live.
  const todays = leads.filter((l) => l.status === 'QUALIFIED').slice(0, 2);
  for (const lead of todays) {
    n += 1;
    out.push({
      id: `appt_${String(n).padStart(3, '0')}`,
      createdAt: subDays(NOW, 2).toISOString(),
      leadId: lead.id,
      staffId: lead.assignedToId ?? 'tm_priya',
      type: 'FREE_TRIAL',
      date: TODAY,
      time: '18:00',
      attendedAt: null,
      status: 'CONFIRMED',
      notes: '',
    });
  }

  return out.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

// ---------------------------------------------------------
// Members — derived from converted leads
// ---------------------------------------------------------

/**
 * Renewal state is assigned by member position rather than derived from a
 * hash of the lead id, so the Members screen is guaranteed to contain
 * genuinely expiring and genuinely lapsed memberships — and a lapsed
 * member is a renewal opportunity, which is a real revenue story rather
 * than something to quietly push into the future.
 */
type ExpiryBucket = 'lapsed' | 'expiring' | 'healthy';

const EXPIRY_BUCKETS: ExpiryBucket[] = [
  'lapsed',
  'expiring',
  'healthy',
  'expiring',
  'healthy',
  'healthy',
];

function buildMembers(leads: Lead[], plans: MembershipPlan[]): Member[] {
  const converted = leads.filter((l) => l.status === 'MEMBERSHIP');
  return converted.map((lead, i) => {
    const bucket = EXPIRY_BUCKETS[i % EXPIRY_BUCKETS.length];

    // Pick a plan whose term matches the renewal state, then anchor the
    // expiry to that state directly. Anchoring to the term instead would
    // make the state depend on the plan length, so a 12-month plan would
    // silently turn a lapsed member back into an active one.
    const pool = plans.filter((p) =>
      bucket === 'lapsed'
        ? p.durationMonths <= 3
        : bucket === 'expiring'
          ? p.durationMonths <= 3
          : p.durationMonths >= 6,
    );
    const plan = pick(pool.length ? pool : plans);

    const convertedAt = new Date(lead.statusChangedAt);
    const expiry =
      bucket === 'lapsed'
        ? subDays(NOW, between(1, 20))
        : bucket === 'expiring'
          ? addDays(NOW, between(1, EXPIRY_WARNING_DAYS))
          : addDays(NOW, between(EXPIRY_WARNING_DAYS + 10, 330));

    return {
      id: `mem_${String(i + 1).padStart(3, '0')}`,
      createdAt: lead.statusChangedAt,
      leadId: lead.id,
      planId: plan.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      salespersonId: lead.assignedToId ?? 'tm_priya',
      source: lead.source,
      startDate: ymd(convertedAt),
      expiryDate: ymd(expiry),
      // Elite and Coach's Circle are billed annually — charge the period price.
      amountPaid: plan.price,
      paymentMode: pick(['UPI', 'CARD', 'CASH', 'BANK_TRANSFER'] as const),
      active: expiry.getTime() >= NOW.getTime(),
    };
  });
}

// ---------------------------------------------------------
// Follow-up tasks — derived from open leads
// ---------------------------------------------------------

function buildTasks(leads: Lead[], appointments: Appointment[]): FollowUpTask[] {
  const out: FollowUpTask[] = [];
  let n = 0;
  const push = (
    leadId: string,
    assigneeId: string,
    type: TaskType,
    title: string,
    dueAt: string,
    status: FollowUpTask['status'],
    priority: TaskPriority,
    notes = '',
  ) => {
    n += 1;
    out.push({
      id: `task_${String(n).padStart(3, '0')}`,
      createdAt: new Date(new Date(dueAt).getTime() - 2 * 86_400_000).toISOString(),
      leadId,
      assigneeId,
      type,
      title,
      notes,
      dueAt,
      priority,
      status,
      completedAt: status === 'COMPLETED' ? new Date(dueAt).toISOString() : null,
    });
  };

  // An open follow-up for every lead still in the pipeline.
  for (const lead of leads) {
    if (['MEMBERSHIP', 'LOST'].includes(lead.status)) continue;
    if (!lead.assignedToId) continue;

    const ageHours = (NOW.getTime() - new Date(lead.lastContactedAt ?? lead.createdAt).getTime()) / 36e5;
    const urgent = lead.score >= 70 || ageHours > 48;

    // A third of open leads are already behind.
    const overdue = urgent && chance(0.34);
    const dueAt = overdue
      ? new Date(NOW.getTime() - between(2, 60) * 36e5).toISOString()
      : addDays(NOW, between(0, 4)).setHours(between(9, 19), 0, 0, 0);

    const type: TaskType =
      lead.status === 'TRIAL_BOOKED' ? 'TRIAL_REMINDER' : chance(0.55) ? 'CALL' : 'WHATSAPP';

    push(
      lead.id,
      lead.assignedToId,
      type,
      type === 'TRIAL_REMINDER'
        ? `Confirm the trial with ${lead.name}`
        : `${type === 'CALL' ? 'Call' : 'WhatsApp'} ${lead.name}`,
      new Date(dueAt).toISOString(),
      'PENDING',
      urgent ? 'HIGH' : lead.score >= 45 ? 'MEDIUM' : 'LOW',
      overdue ? 'Slipped from an earlier commitment.' : '',
    );
  }

  // Completed history, so the follow-ups screen is not all noise.
  for (const lead of leads) {
    if (!['CONTACTED', 'QUALIFIED', 'TRIAL_BOOKED', 'TRIAL_ATTENDED', 'MEMBERSHIP'].includes(lead.status)) {
      continue;
    }
    if (!lead.assignedToId || !chance(0.75)) continue;
    const anchor = new Date(lead.createdAt).getTime();
    const completedAt = new Date(anchor + between(1, 6) * 86_400_000);
    if (completedAt.getTime() > NOW.getTime()) continue;
    push(
      lead.id,
      lead.assignedToId,
      chance(0.6) ? 'CALL' : 'WHATSAPP',
      `First contact with ${lead.name}`,
      completedAt.toISOString(),
      'COMPLETED',
      'MEDIUM',
    );
  }

  // Reminders for trials scheduled in the next two days.
  for (const appt of appointments) {
    if (appt.status !== 'SCHEDULED' && appt.status !== 'CONFIRMED') continue;
    const at = new Date(`${appt.date}T${appt.time}:00`).getTime();
    if (at < NOW.getTime() || at > NOW.getTime() + 2 * 86_400_000) continue;
    const lead = leads.find((l) => l.id === appt.leadId);
    if (!lead) continue;
    push(
      lead.id,
      appt.staffId,
      'TRIAL_REMINDER',
      `Remind ${lead.name} about the ${appt.time} trial`,
      new Date(at - 86_400_000).toISOString(),
      'PENDING',
      'HIGH',
    );
  }

  return out;
}

// ---------------------------------------------------------
// Activities — a real timeline per lead
// ---------------------------------------------------------

const ACTIVITY_BODIES = {
  call: [
    'Spoke for four minutes. Asked about timings and monthly cost.',
    'No answer. Left a voicemail mentioning the free trial.',
    'Responded positively, asked what a typical week looks like.',
    'Discussed the fat loss programme and asked for the price list.',
  ],
  whatsapp: [
    'Sent the programme brochure and the trial timings.',
    'Shared the before/after gallery as asked.',
    'Sent a short voice note explaining the three-month plan.',
    'Confirmed the Saturday slot over WhatsApp.',
  ],
  email: [
    'Emailed the membership comparison sheet.',
    'Followed up with the nutrition questionnaire.',
  ],
  note: [
    'Prefers evening slots after 7 PM.',
    'Lives ten minutes away, can get here quickly.',
    'Travelling for work for three weeks — pause and follow up in April.',
    'Partner also wants to join, ask about the couple plan.',
  ],
};

function buildActivities(leads: Lead[], appointments: Appointment[]): LeadActivity[] {
  const out: LeadActivity[] = [];
  let n = 0;
  const leadAssignee = new Map(leads.map((l) => [l.id, l.assignedToId]));

  const push = (
    leadId: string,
    type: LeadActivity['type'],
    summary: string,
    occurredAt: string,
    body = '',
    authorId: string | null = null,
  ) => {
    n += 1;
    out.push({
      id: `act_${String(n).padStart(4, '0')}`,
      createdAt: occurredAt,
      leadId,
      type,
      summary,
      body,
      authorId: authorId ?? leadAssignee.get(leadId) ?? null,
      occurredAt,
    });
  };

  for (const lead of leads) {
    const created = new Date(lead.createdAt);

    push(
      lead.id,
      'NOTE',
      `Lead captured from ${lead.source.replace(/_/g, ' ').toLowerCase()}`,
      created.toISOString(),
      [
        `Goal: ${lead.goal.replace(/_/g, ' ').toLowerCase()}`,
        lead.program ? `Program: ${lead.program}` : null,
        `Preferred time: ${lead.workoutTime.replace(/_/g, ' ').toLowerCase()}`,
        lead.message ? `Message: "${lead.message}"` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      null,
    );

    if (lead.lastContactedAt) {
      const at = new Date(lead.lastContactedAt);
      const usedCall = chance(0.6);
      push(
        lead.id,
        usedCall ? 'CALL' : 'WHATSAPP',
        usedCall ? 'Called the lead' : 'WhatsApp message sent',
        at.toISOString(),
        pick(usedCall ? ACTIVITY_BODIES.call : ACTIVITY_BODIES.whatsapp),
      );
      if (chance(0.4)) {
        push(
          lead.id,
          'NOTE',
          'Note added',
          new Date(at.getTime() + 4 * 36e5).toISOString(),
          pick(ACTIVITY_BODIES.note),
        );
      }
    }

    if (['QUALIFIED', 'TRIAL_BOOKED', 'TRIAL_ATTENDED', 'MEMBERSHIP'].includes(lead.status)) {
      const at = new Date(lead.statusChangedAt);
      push(
        lead.id,
        'STATUS_CHANGE',
        'Contacted → Qualified',
        at.toISOString(),
        'Budget and timing confirmed. Ready to book a trial.',
      );
    }

    const trial = appointments.find(
      (a) => a.leadId === lead.id && (a.type === 'FREE_TRIAL' || a.status === 'ATTENDED'),
    );
    if (trial) {
      const at = new Date(`${trial.date}T${trial.time}:00`);
      push(
        lead.id,
        'TRIAL',
        `Trial ${trial.status === 'ATTENDED' ? 'attended' : 'booked'} for ${trial.date} at ${trial.time}`,
        (trial.createdAt || at.toISOString()),
        trial.notes,
      );
      if (trial.status === 'ATTENDED') {
        push(
          lead.id,
          'TRIAL',
          'Trial session attended',
          at.toISOString(),
          'Full 60 minutes completed. Walked through the membership options.',
        );
      }
      if (trial.status === 'NO_SHOW') {
        push(lead.id, 'TRIAL', 'Trial no-show', at.toISOString(), 'No contact on the day.');
      }
    }

    if (lead.status === 'MEMBERSHIP') {
      const at = new Date(lead.statusChangedAt);
      push(
        lead.id,
        'CONVERSION',
        'Membership purchased',
        at.toISOString(),
        `Converted to a membership. Payment confirmed and plan activated.`,
      );
    }

    if (lead.status === 'LOST') {
      push(
        lead.id,
        'STATUS_CHANGE',
        'Marked lost',
        lead.statusChangedAt,
        `Reason: ${lead.lostReason ?? 'Not stated'}`,
      );
    }
  }

  return out.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}

// ---------------------------------------------------------
// Campaigns — lead counts derived from real leads
// ---------------------------------------------------------

interface CampaignSpec {
  id: string;
  name: string;
  platform: AdPlatform;
  objective: string;
  status: Campaign['status'];
  source: LeadSource;
  dailySpendRange: [number, number];
  ctrRange: [number, number];
  leadRateRange: [number, number];
}

const CAMPAIGN_SPECS: CampaignSpec[] = [
  {
    id: 'cmp_transform',
    name: '30 Day Transformation',
    platform: 'META',
    objective: 'Lead generation — free trial signups',
    status: 'ACTIVE',
    source: 'META_ADS',
    dailySpendRange: [700, 1500],
    ctrRange: [0.014, 0.023],
    leadRateRange: [0.05, 0.12],
  },
  {
    id: 'cmp_trial',
    name: 'Free Trial Campaign',
    platform: 'INSTAGRAM',
    objective: 'Trial bookings from reel traffic',
    status: 'ACTIVE',
    source: 'INSTAGRAM',
    dailySpendRange: [380, 820],
    ctrRange: [0.011, 0.019],
    leadRateRange: [0.04, 0.1],
  },
  {
    id: 'cmp_summer',
    name: 'Summer Fitness Challenge',
    platform: 'WHATSAPP',
    objective: 'Click-to-WhatsApp conversions',
    status: 'PAUSED',
    source: 'WHATSAPP',
    dailySpendRange: [260, 540],
    ctrRange: [0.02, 0.031],
    leadRateRange: [0.09, 0.18],
  },
  {
    id: 'cmp_search',
    name: 'Search — Memberships & PT',
    platform: 'GOOGLE',
    objective: 'High-intent membership enquiries',
    status: 'ACTIVE',
    source: 'WEBSITE',
    dailySpendRange: [420, 900],
    ctrRange: [0.026, 0.041],
    leadRateRange: [0.08, 0.16],
  },
];

/**
 * Every campaign is attributed across the full window, so each paid lead
 * in the CRM is counted by exactly one campaign and the campaigns screen
 * always reconciles with the Leads screen. A paused campaign still has a
 * history — pausing stops future spend, it does not rewrite the past —
 * so it keeps an empty endDate rather than a truncated window.
 */
function buildCampaigns(leads: Lead[]): { campaigns: Campaign[]; metrics: CampaignMetric[] } {
  const campaigns: Campaign[] = [];
  const metrics: CampaignMetric[] = [];
  let m = 0;

  // Leads per day per source, straight from the CRM.
  const leadsPerDay = new Map<string, number>();
  for (const lead of leads) {
    if (lead.source === 'REFERRAL' || lead.source === 'MANUAL') continue;
    const key = `${lead.source}:${ymd(new Date(lead.createdAt))}`;
    leadsPerDay.set(key, (leadsPerDay.get(key) ?? 0) + 1);
  }

  for (const spec of CAMPAIGN_SPECS) {
    campaigns.push({
      id: spec.id,
      createdAt: subDays(NOW, WINDOW_DAYS).toISOString(),
      name: spec.name,
      platform: spec.platform,
      objective: spec.objective,
      status: spec.status,
      startDate: ymd(subDays(NOW, WINDOW_DAYS)),
      endDate: '',
      source: spec.source,
    });

    for (let back = WINDOW_DAYS; back >= 0; back -= 1) {
      const day = subDays(NOW, back);
      const realLeads = leadsPerDay.get(`${spec.source}:${ymd(day)}`) ?? 0;

      // Spend is set to land in a believable CPL band, then nudged by
      // an efficiency factor so the trend is not a flat line.
      const baseCpl = between(180, 420);
      const efficiency = 0.78 + rand() * 0.44;
      const spend = realLeads > 0 ? Math.round((realLeads * baseCpl * efficiency) / 50) * 50 : between(120, 480);

      const ctr = spec.ctrRange[0] + rand() * (spec.ctrRange[1] - spec.ctrRange[0]);
      const leadRate = spec.leadRateRange[0] + rand() * (spec.leadRateRange[1] - spec.leadRateRange[0]);

      const clicks = realLeads > 0 ? Math.max(realLeads, Math.round(realLeads / leadRate)) : between(6, 34);
      const impressions = Math.round(clicks / ctr);
      const reach = Math.round(impressions * (0.42 + rand() * 0.18));

      m += 1;
      metrics.push({
        id: `cm_${String(m).padStart(4, '0')}`,
        createdAt: day.toISOString(),
        campaignId: spec.id,
        date: ymd(day),
        spend,
        impressions,
        reach,
        clicks,
        leads: realLeads,
      });
    }
  }

  return { campaigns, metrics };
}

// ---------------------------------------------------------
// Notifications
// ---------------------------------------------------------

function buildNotifications(leads: Lead[]): Database['notifications'] {
  const recent = [...leads]
    .filter((l) => !l.archivedAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 14);

  let n = 0;
  const push = (
    kind: Database['notifications'][number]['kind'],
    title: string,
    body: string,
    href: string,
    at: string,
    read: boolean,
    recipientId: string | null,
  ) => {
    n += 1;
    return {
      id: `ntf_${String(n).padStart(3, '0')}`,
      createdAt: at,
      kind,
      title,
      body,
      href,
      read,
      recipientId,
    };
  };

  const out: Database['notifications'] = [];

  recent.forEach((lead, i) => {
    out.push(
      push(
        'NEW_LEAD',
        `New lead — ${lead.name}`,
        `${lead.score}/100 · ${lead.source.replace(/_/g, ' ').toLowerCase()}`,
        `/admin/leads/${lead.id}`,
        lead.createdAt,
        i > 4,
        lead.assignedToId,
      ),
    );
  });

  for (const lead of leads.filter((l) => l.status === 'MEMBERSHIP').slice(0, 5)) {
    out.push(
      push(
        'MEMBERSHIP_CONVERTED',
        `Membership sold — ${lead.name}`,
        'Conversion recorded and revenue updated.',
        `/admin/leads/${lead.id}`,
        lead.statusChangedAt,
        true,
        lead.assignedToId,
      ),
    );
  }

  leads
    .filter((l) => l.status === 'TRIAL_BOOKED')
    .slice(0, 4)
    .forEach((lead, i) => {
      out.push(
        push(
          'TRIAL_BOOKED',
          `Trial booked — ${lead.name}`,
          'Reminder task created automatically.',
          `/admin/leads/${lead.id}`,
          lead.statusChangedAt,
          i > 1,
          lead.assignedToId,
        ),
      );
    });

  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ---------------------------------------------------------
// Compose
// ---------------------------------------------------------

export function buildSeed(): Database {
  // Reset every piece of generator state so the demo dataset is identical
  // on first load and after every "Reset demo data".
  resetGenerator();

  const leads = buildLeads();
  const appointments = buildAppointments(leads);
  const members = buildMembers(leads, PLANS);
  const tasks = buildTasks(leads, appointments);
  const activities = buildActivities(leads, appointments);
  const { campaigns, metrics } = buildCampaigns(leads);
  const notifications = buildNotifications(leads);

  const db: Database = {
    team: TEAM,
    plans: PLANS,
    leads,
    appointments,
    members,
    tasks,
    activities,
    campaigns,
    campaignMetrics: metrics,
    notifications,
  };

  // Scores are computed last, once every appointment exists, so a
  // booked trial is reflected in the seeded score.
  db.leads = leads.map((lead) => ({
    ...lead,
    score: computeLeadScore(lead, appointments).score,
  }));

  // Point each lead's next-follow-up at its earliest open task.
  const byLead = new Map<string, FollowUpTask[]>();
  for (const task of tasks) {
    if (task.status !== 'PENDING') continue;
    const list = byLead.get(task.leadId) ?? [];
    list.push(task);
    byLead.set(task.leadId, list);
  }
  db.leads = db.leads.map((lead) => {
    const open = (byLead.get(lead.id) ?? []).sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    );
    return { ...lead, nextFollowUpAt: open[0]?.dueAt ?? null };
  });

  return db;
}
