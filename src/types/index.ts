// ===========================================================
// FITGREEN Growth System — domain types
//
// Every entity in the product is described here. Services,
// the data layer and the UI all import from this single file
// so there is exactly one definition of the data model.
// ===========================================================

// ---------------------------------------------------------
// Enums (string unions — the DB uses text + CHECK constraints)
// ---------------------------------------------------------

export const LEAD_SOURCES = [
  'WEBSITE',
  'META_ADS',
  'INSTAGRAM',
  'WHATSAPP',
  'REFERRAL',
  'MANUAL',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'TRIAL_BOOKED',
  'TRIAL_ATTENDED',
  'MEMBERSHIP',
  'LOST',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_GOALS = [
  'WEIGHT_LOSS',
  'MUSCLE_GAIN',
  'STRENGTH',
  'FITNESS',
  'PERSONAL_TRAINING',
  'GENERAL',
] as const;
export type LeadGoal = (typeof LEAD_GOALS)[number];

export const WORKOUT_TIMES = [
  'EARLY_MORNING',
  'MORNING',
  'AFTERNOON',
  'EVENING',
  'WEEKEND',
] as const;
export type WorkoutTime = (typeof WORKOUT_TIMES)[number];

export type LeadScoreBand = 'COLD' | 'WARM' | 'HOT';

export const ACTIVITY_TYPES = [
  'CALL',
  'WHATSAPP',
  'EMAIL',
  'NOTE',
  'MEETING',
  'STATUS_CHANGE',
  'TRIAL',
  'CONVERSION',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const TASK_TYPES = [
  'CALL',
  'WHATSAPP',
  'EMAIL',
  'TRIAL_REMINDER',
  'MEMBERSHIP_FOLLOWUP',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ['PENDING', 'COMPLETED'] as const;
/** OVERDUE is *derived* from PENDING + a past due date, never stored. */
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskEffectiveStatus = TaskStatus | 'OVERDUE';

export const TASK_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const APPOINTMENT_TYPES = [
  'FREE_TRIAL',
  'FITNESS_ASSESSMENT',
  'PT_CONSULTATION',
  'MEMBERSHIP_CONSULTATION',
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'ATTENDED',
  'NO_SHOW',
  'CANCELLED',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const AD_PLATFORMS = ['META', 'INSTAGRAM', 'WHATSAPP', 'GOOGLE'] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];

export const TEAM_ROLES = ['ADMIN', 'SALES_MANAGER', 'SALES_EXEC'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

// ---------------------------------------------------------
// Entities
// ---------------------------------------------------------

interface Base {
  id: string;
  createdAt: string;
}

export interface TeamMember extends Base {
  /** Present once Supabase auth is enabled — see supabase/schema.sql */
  authUserId: string | null;
  name: string;
  email: string;
  phone: string;
  role: TeamRole;
  /** Index colour into the accent set */
  colorIndex: number;
  active: boolean;
}

export interface Lead extends Base {
  name: string;
  phone: string;
  email: string;
  goal: LeadGoal;
  workoutTime: WorkoutTime;
  /** Free-text program name from the public site, or null */
  program: string | null;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  /** Denormalised for list rendering; always recomputed by leadScoring */
  score: number;
  assignedToId: string | null;
  requestedTrial: boolean;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  /** Date the lead entered its current status — powers stage-stall insights */
  statusChangedAt: string;
  lostReason: string | null;
  archivedAt: string | null;
}

export interface LeadActivity extends Base {
  leadId: string;
  type: ActivityType;
  summary: string;
  body: string;
  /** null = system-generated */
  authorId: string | null;
  occurredAt: string;
}

export interface FollowUpTask extends Base {
  leadId: string;
  assigneeId: string;
  type: TaskType;
  title: string;
  notes: string;
  dueAt: string;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: string | null;
}

export interface Appointment extends Base {
  leadId: string;
  staffId: string;
  type: AppointmentType;
  /** Local date as YYYY-MM-DD so it never shifts across timezones */
  date: string;
  /** 24h clock as HH:MM */
  time: string;
  /** Derived from status once ATTENDED */
  attendedAt: string | null;
  status: AppointmentStatus;
  notes: string;
}

export interface MembershipPlan extends Base {
  name: string;
  tagline: string;
  /** Rupees charged per billing period — not per month; see durationMonths */
  price: number;
  /** Length of one billing period in months */
  durationMonths: number;
  features: string[];
  highlight: boolean;
  sortOrder: number;
}

export interface Member extends Base {
  leadId: string;
  planId: string;
  name: string;
  phone: string;
  email: string;
  /** Salesperson credited with the conversion */
  salespersonId: string;
  source: LeadSource;
  startDate: string;
  expiryDate: string;
  /** Total rupees collected at conversion — this is the revenue figure */
  amountPaid: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
  active: boolean;
}

export interface Campaign extends Base {
  name: string;
  platform: AdPlatform;
  objective: string;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  startDate: string;
  /** Empty string means "still running" - no planned end date. */
  endDate: string;
  /**
   * Lead source this campaign feeds. Attribution matches on this rather
   * than on `platform`, because one platform maps to one CRM source but
   * a source can be driven by more than one campaign over time.
   */
  source: LeadSource;
}

export interface CampaignMetric extends Base {
  campaignId: string;
  /** YYYY-MM-DD */
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  /** Leads attributed to this campaign on this date */
  leads: number;
}

export type NotificationKind =
  | 'NEW_LEAD'
  | 'FOLLOW_UP_OVERDUE'
  | 'FOLLOW_UP_DUE'
  | 'TRIAL_BOOKED'
  | 'TRIAL_REMINDER'
  | 'TRIAL_ATTENDED'
  | 'MEMBERSHIP_CONVERTED'
  | 'MEMBER_EXPIRING'
  | 'HIGH_INTENT_LEAD';

export interface AppNotification extends Base {
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  /** Optional in-app deep link, e.g. /admin/leads/<id> */
  href: string | null;
  /** Optional recipient; null = broadcast to the owner view */
  recipientId: string | null;
}

// ---------------------------------------------------------
// Collections snapshot — what the whole app reads from
// ---------------------------------------------------------

export interface Database {
  team: TeamMember[];
  leads: Lead[];
  activities: LeadActivity[];
  tasks: FollowUpTask[];
  appointments: Appointment[];
  plans: MembershipPlan[];
  members: Member[];
  campaigns: Campaign[];
  campaignMetrics: CampaignMetric[];
  notifications: AppNotification[];
}

export type CollectionKey = keyof Database;

export const COLLECTION_KEYS: CollectionKey[] = [
  'team',
  'leads',
  'activities',
  'tasks',
  'appointments',
  'plans',
  'members',
  'campaigns',
  'campaignMetrics',
  'notifications',
];
