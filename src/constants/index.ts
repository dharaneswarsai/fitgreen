// ===========================================================
// FITGREEN Growth System — constants
//
// Labels, colour treatments and navigation config.
//
// Tailwind v4 JIT only sees classes that appear as complete
// string literals in source, so every style map below stores
// full class strings. Never build these with interpolation.
// ===========================================================

import type {
  AdPlatform,
  ActivityType,
  AppointmentStatus,
  AppointmentType,
  LeadGoal,
  LeadScoreBand,
  LeadSource,
  LeadStatus,
  Member,
  NotificationKind,
  TaskPriority,
  TaskType,
  TeamRole,
  WorkoutTime,
} from '@/types';

// ---------------------------------------------------------
// Style tokens
// ---------------------------------------------------------

export interface Style {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const s = (bg: string, text: string, border: string, dot: string): Style => ({
  bg,
  text,
  border,
  dot,
});

// ---------------------------------------------------------
// Leads
// ---------------------------------------------------------

export const LEAD_STATUS_META: Record<
  LeadStatus,
  { label: string; short: string; style: Style; description: string }
> = {
  NEW: {
    label: 'New',
    short: 'New',
    style: s('bg-slate-50', 'text-slate-700', 'border-slate-200', 'bg-slate-400'),
    description: 'Captured but not yet contacted',
  },
  CONTACTED: {
    label: 'Contacted',
    short: 'Contacted',
    style: s('bg-sky-50', 'text-sky-700', 'border-sky-200', 'bg-sky-500'),
    description: 'First touch made, conversation open',
  },
  QUALIFIED: {
    label: 'Qualified',
    short: 'Qualified',
    style: s('bg-violet-50', 'text-violet-700', 'border-violet-200', 'bg-violet-500'),
    description: 'Budget, timing and goal confirmed',
  },
  TRIAL_BOOKED: {
    label: 'Trial Booked',
    short: 'Trial',
    style: s('bg-amber-50', 'text-amber-700', 'border-amber-200', 'bg-amber-500'),
    description: 'Free trial session scheduled',
  },
  TRIAL_ATTENDED: {
    label: 'Trial Attended',
    short: 'Attended',
    style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500'),
    description: 'Showed up for the trial — hot to close',
  },
  MEMBERSHIP: {
    label: 'Membership',
    short: 'Member',
    style: s('bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'bg-emerald-500'),
    description: 'Converted into a paying member',
  },
  LOST: {
    label: 'Lost',
    short: 'Lost',
    style: s('bg-red-50', 'text-red-700', 'border-red-200', 'bg-red-400'),
    description: 'Did not convert',
  },
};

export const LEAD_SOURCE_META: Record<LeadSource, { label: string; style: Style }> = {
  WEBSITE: {
    label: 'Website',
    style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500'),
  },
  META_ADS: {
    label: 'Meta Ads',
    style: s('bg-indigo-50', 'text-indigo-700', 'border-indigo-200', 'bg-indigo-500'),
  },
  INSTAGRAM: {
    label: 'Instagram',
    style: s('bg-pink-50', 'text-pink-700', 'border-pink-200', 'bg-pink-500'),
  },
  WHATSAPP: {
    label: 'WhatsApp',
    style: s('bg-green-50', 'text-green-700', 'border-green-200', 'bg-green-500'),
  },
  REFERRAL: {
    label: 'Referral',
    style: s('bg-teal-50', 'text-teal-700', 'border-teal-200', 'bg-teal-500'),
  },
  MANUAL: {
    label: 'Manual',
    style: s('bg-stone-100', 'text-stone-700', 'border-stone-200', 'bg-stone-400'),
  },
};

export const LEAD_GOAL_META: Record<LeadGoal, { label: string }> = {
  WEIGHT_LOSS: { label: 'Weight Loss' },
  MUSCLE_GAIN: { label: 'Muscle Gain' },
  STRENGTH: { label: 'Strength' },
  FITNESS: { label: 'General Fitness' },
  PERSONAL_TRAINING: { label: 'Personal Training' },
  GENERAL: { label: 'General Inquiry' },
};

export const WORKOUT_TIME_META: Record<WorkoutTime, { label: string; hint: string }> = {
  EARLY_MORNING: { label: 'Early Morning', hint: '5:00 – 8:00 AM' },
  MORNING: { label: 'Morning', hint: '8:00 – 11:00 AM' },
  AFTERNOON: { label: 'Afternoon', hint: '11:00 AM – 4:00 PM' },
  EVENING: { label: 'Evening', hint: '4:00 – 9:00 PM' },
  WEEKEND: { label: 'Weekends', hint: 'Sat & Sun' },
};

// The maximum score before a trial is booked is 65 (goal + phone +
// program + intent + requested trial). HOT therefore starts at 65 so
// a lead who explicitly asks about price and joining is recognised as
// hot the moment they submit, not only once they book a session.
export const SCORE_BAND_META: Record<
  LeadScoreBand,
  { label: string; min: number; max: number; bar: string; text: string; pill: string }
> = {
  COLD: {
    label: 'Cold',
    min: 0,
    max: 34,
    bar: 'bg-slate-400',
    text: 'text-slate-600',
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  WARM: {
    label: 'Warm',
    min: 35,
    max: 64,
    bar: 'bg-amber-500',
    text: 'text-amber-700',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  HOT: {
    label: 'Hot',
    min: 65,
    max: 100,
    bar: 'bg-fit-500',
    text: 'text-fit-700',
    pill: 'bg-fit-50 text-fit-700 border-fit-200',
  },
};

/** Score at which a lead is treated as high priority for task/workload purposes. */
export const HOT_SCORE_THRESHOLD = SCORE_BAND_META.HOT.min;

/** Canonical pipeline order — drives the Kanban columns and the funnel. */
export const PIPELINE_ORDER: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'TRIAL_BOOKED',
  'TRIAL_ATTENDED',
  'MEMBERSHIP',
  'LOST',
];

// ---------------------------------------------------------
// Activities
// ---------------------------------------------------------

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: string }> = {
  CALL: { label: 'Call', icon: 'phone' },
  WHATSAPP: { label: 'WhatsApp', icon: 'message' },
  EMAIL: { label: 'Email', icon: 'mail' },
  NOTE: { label: 'Note', icon: 'sticky' },
  MEETING: { label: 'Meeting', icon: 'users' },
  STATUS_CHANGE: { label: 'Status Change', icon: 'arrow' },
  TRIAL: { label: 'Trial', icon: 'calendar' },
  CONVERSION: { label: 'Conversion', icon: 'trophy' },
};

// ---------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------

export const TASK_TYPE_META: Record<TaskType, { label: string; icon: string }> = {
  CALL: { label: 'Call', icon: 'phone' },
  WHATSAPP: { label: 'WhatsApp', icon: 'message' },
  EMAIL: { label: 'Email', icon: 'mail' },
  TRIAL_REMINDER: { label: 'Trial Reminder', icon: 'bell' },
  MEMBERSHIP_FOLLOWUP: { label: 'Membership Follow-up', icon: 'trophy' },
};

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; style: Style }> = {
  HIGH: { label: 'High', style: s('bg-red-50', 'text-red-700', 'border-red-200', 'bg-red-500') },
  MEDIUM: {
    label: 'Medium',
    style: s('bg-amber-50', 'text-amber-700', 'border-amber-200', 'bg-amber-500'),
  },
  LOW: {
    label: 'Low',
    style: s('bg-slate-50', 'text-slate-600', 'border-slate-200', 'bg-slate-400'),
  },
};

export const TASK_STATUS_META: Record<
  'PENDING' | 'COMPLETED' | 'OVERDUE',
  { label: string; style: Style }
> = {
  PENDING: {
    label: 'Pending',
    style: s('bg-sky-50', 'text-sky-700', 'border-sky-200', 'bg-sky-500'),
  },
  COMPLETED: {
    label: 'Completed',
    style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500'),
  },
  OVERDUE: {
    label: 'Overdue',
    style: s('bg-red-50', 'text-red-700', 'border-red-200', 'bg-red-500'),
  },
};

// ---------------------------------------------------------
// Appointments
// ---------------------------------------------------------

export const APPOINTMENT_TYPE_META: Record<AppointmentType, { label: string; minutes: number }> = {
  FREE_TRIAL: { label: 'Free Trial', minutes: 60 },
  FITNESS_ASSESSMENT: { label: 'Fitness Assessment', minutes: 45 },
  PT_CONSULTATION: { label: 'PT Consultation', minutes: 30 },
  MEMBERSHIP_CONSULTATION: { label: 'Membership Consultation', minutes: 20 },
};

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, { label: string; style: Style }> =
  {
    SCHEDULED: {
      label: 'Scheduled',
      style: s('bg-sky-50', 'text-sky-700', 'border-sky-200', 'bg-sky-500'),
    },
    CONFIRMED: {
      label: 'Confirmed',
      style: s('bg-violet-50', 'text-violet-700', 'border-violet-200', 'bg-violet-500'),
    },
    ATTENDED: {
      label: 'Attended',
      style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500'),
    },
    NO_SHOW: {
      label: 'No Show',
      style: s('bg-red-50', 'text-red-700', 'border-red-200', 'bg-red-500'),
    },
    CANCELLED: {
      label: 'Cancelled',
      style: s('bg-stone-100', 'text-stone-600', 'border-stone-200', 'bg-stone-400'),
    },
  };

// ---------------------------------------------------------
// Members + team
// ---------------------------------------------------------

export const MEMBER_STATUS_META = {
  ACTIVE: {
    label: 'Active',
    style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500'),
  },
  EXPIRING: {
    label: 'Expiring Soon',
    style: s('bg-amber-50', 'text-amber-700', 'border-amber-200', 'bg-amber-500'),
  },
  EXPIRED: {
    label: 'Expired',
    style: s('bg-red-50', 'text-red-700', 'border-red-200', 'bg-red-400'),
  },
} as const;

export type MemberFilter = 'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED';

/** A membership inside 21 days of expiry counts as "expiring". */
export const EXPIRY_WARNING_DAYS = 21;

export function memberStatus(member: Member, now = new Date()): 'ACTIVE' | 'EXPIRING' | 'EXPIRED' {
  const expiry = new Date(member.expiryDate);
  if (expiry.getTime() < now.getTime()) return 'EXPIRED';
  const days = (expiry.getTime() - now.getTime()) / 86_400_000;
  return days <= EXPIRY_WARNING_DAYS ? 'EXPIRING' : 'ACTIVE';
}

export const TEAM_ROLE_META: Record<TeamRole, { label: string; style: Style }> = {
  ADMIN: { label: 'Owner', style: s('bg-ink', 'text-white', 'border-ink', 'bg-fit-500') },
  SALES_MANAGER: {
    label: 'Sales Manager',
    style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500'),
  },
  SALES_EXEC: {
    label: 'Sales Executive',
    style: s('bg-slate-100', 'text-slate-700', 'border-slate-200', 'bg-slate-400'),
  },
};

/** Accent colours for avatars — indexes into this array. */
export const AVATAR_COLORS = [
  'bg-fit-600 text-white',
  'bg-indigo-600 text-white',
  'bg-amber-500 text-white',
  'bg-slate-700 text-white',
  'bg-teal-600 text-white',
];

/** Chart palette, kept consistent across every chart in the product. */
export const CHART_COLORS = ['#00A650', '#111111', '#63CD90', '#6B6B6B', '#9BE0B7', '#3D3D3D'];

export const FUNNEL_COLORS: Record<string, string> = {
  NEW: '#9a9a9a',
  CONTACTED: '#6B6B6B',
  QUALIFIED: '#63CD90',
  TRIAL_BOOKED: '#22c55e',
  TRIAL_ATTENDED: '#00A650',
  MEMBERSHIP: '#111111',
};

// ---------------------------------------------------------
// Campaigns + notifications
// ---------------------------------------------------------

export const PLATFORM_META: Record<AdPlatform, { label: string; style: Style }> = {
  META: { label: 'Meta Ads', style: s('bg-indigo-50', 'text-indigo-700', 'border-indigo-200', 'bg-indigo-500') },
  INSTAGRAM: {
    label: 'Instagram',
    style: s('bg-pink-50', 'text-pink-700', 'border-pink-200', 'bg-pink-500'),
  },
  WHATSAPP: {
    label: 'WhatsApp',
    style: s('bg-green-50', 'text-green-700', 'border-green-200', 'bg-green-500'),
  },
  GOOGLE: { label: 'Google', style: s('bg-amber-50', 'text-amber-700', 'border-amber-200', 'bg-amber-500') },
};

export const NOTIFICATION_META: Record<
  NotificationKind,
  { label: string; icon: string; style: Style }
> = {
  NEW_LEAD: { label: 'New lead', icon: 'user-plus', style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500') },
  FOLLOW_UP_OVERDUE: { label: 'Overdue', icon: 'alert', style: s('bg-red-50', 'text-red-700', 'border-red-200', 'bg-red-500') },
  FOLLOW_UP_DUE: { label: 'Due today', icon: 'clock', style: s('bg-amber-50', 'text-amber-700', 'border-amber-200', 'bg-amber-500') },
  TRIAL_BOOKED: { label: 'Trial booked', icon: 'calendar', style: s('bg-sky-50', 'text-sky-700', 'border-sky-200', 'bg-sky-500') },
  TRIAL_REMINDER: { label: 'Trial reminder', icon: 'bell', style: s('bg-violet-50', 'text-violet-700', 'border-violet-200', 'bg-violet-500') },
  TRIAL_ATTENDED: { label: 'Trial attended', icon: 'check', style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500') },
  MEMBERSHIP_CONVERTED: { label: 'Membership', icon: 'trophy', style: s('bg-fit-50', 'text-fit-700', 'border-fit-200', 'bg-fit-500') },
  MEMBER_EXPIRING: { label: 'Expiring', icon: 'hourglass', style: s('bg-amber-50', 'text-amber-700', 'border-amber-200', 'bg-amber-500') },
  HIGH_INTENT_LEAD: { label: 'High intent', icon: 'flame', style: s('bg-red-50', 'text-red-700', 'border-red-200', 'bg-red-500') },
};

// ---------------------------------------------------------
// Navigation
// ---------------------------------------------------------

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: 'leadCount' | 'taskCount' | 'notificationCount';
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'layout-dashboard' },
      { to: '/admin/analytics', label: 'Analytics', icon: 'chart' },
    ],
  },
  {
    section: 'Sales',
    items: [
      { to: '/admin/leads', label: 'Leads', icon: 'users', badge: 'leadCount' },
      { to: '/admin/pipeline', label: 'Pipeline', icon: 'kanban' },
      { to: '/admin/follow-ups', label: 'Follow-ups', icon: 'check-square', badge: 'taskCount' },
      { to: '/admin/appointments', label: 'Appointments', icon: 'calendar' },
    ],
  },
  {
    section: 'Revenue',
    items: [
      { to: '/admin/members', label: 'Members', icon: 'badge-check' },
      { to: '/admin/campaigns', label: 'Campaigns', icon: 'megaphone' },
    ],
  },
  {
    section: 'Manage',
    items: [
      { to: '/admin/team', label: 'Team', icon: 'user-cog' },
      { to: '/admin/notifications', label: 'Notifications', icon: 'bell', badge: 'notificationCount' },
      { to: '/admin/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

// ---------------------------------------------------------
// Formatting
// ---------------------------------------------------------

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹1,24,000 — Indian digit grouping. Compact for axis ticks. */
export function formatINR(amount: number, opts?: { compact?: boolean }): string {
  if (!Number.isFinite(amount)) return '₹0';
  if (opts?.compact && Math.abs(amount) >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(lakhs >= 10 ? 0 : 1)}L`;
  }
  return inrFormatter.format(Math.round(amount));
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(digits)}%`;
}

export function initials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function summarize(text: string, len = 80): string {
  const t = String(text || '').trim();
  if (t.length <= len) return t;
  return `${t.slice(0, len - 1).trimEnd()}…`;
}
