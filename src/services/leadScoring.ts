// ===========================================================
// Lead scoring
//
// A transparent, rule-based scoring mechanism — NOT a
// predictive model. Each rule contributes a fixed number of
// points and the lead detail screen shows exactly which rules
// fired, so a salesperson can see why a lead is ranked Hot.
//
// The score is always *recomputed* from stored inputs rather
// than accumulated. That makes it idempotent: dragging a lead
// back and forth through the pipeline can never double-count.
// ===========================================================

import type { Appointment, Lead, LeadScoreBand } from '@/types';
import { SCORE_BAND_META } from '@/constants';

export const SCORE_WEIGHTS = {
  goalProvided: 10,
  phoneProvided: 10,
  programSelected: 10,
  highIntentMessage: 15,
  requestedTrial: 20,
  trialBooked: 25,
} as const;

export const MAX_SCORE = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);

export interface ScoreFactor {
  key: keyof typeof SCORE_WEIGHTS;
  label: string;
  detail: string;
  points: number;
  earned: boolean;
}

export interface ScoreResult {
  score: number;
  band: LeadScoreBand;
  factors: ScoreFactor[];
}

/**
 * Words that signal someone close to buying. Kept deliberately
 * small and readable rather than clever — a gym owner should be
 * able to understand and change it.
 */
const HIGH_INTENT_PATTERNS = [
  'price',
  'pricing',
  'how much',
  'charges',
  'fee',
  'discount',
  'offer',
  'join',
  'joining',
  'membership',
  'trial',
  'free session',
  'demo',
  'interested',
  'sign up',
  'signup',
  'start',
  'begin',
  'urgent',
  'this week',
  'tomorrow',
  'today',
  'personal trainer',
  'demo class',
  'plan',
  'emi',
  'installments',
];

function normalise(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function messageHasHighIntent(message: string): boolean {
  const text = normalise(message);
  if (!text) return false;
  return HIGH_INTENT_PATTERNS.some((pattern) => text.includes(normalise(pattern)));
}

export function messageIntentMatches(message: string): string[] {
  const text = normalise(message);
  if (!text) return [];
  return HIGH_INTENT_PATTERNS.filter((pattern) => text.includes(normalise(pattern)));
}

export function scoreBand(score: number): LeadScoreBand {
  if (score >= SCORE_BAND_META.HOT.min) return 'HOT';
  if (score >= SCORE_BAND_META.WARM.min) return 'WARM';
  return 'COLD';
}

/**
 * True once the lead has a live or completed free-trial
 * appointment — the strongest positive signal in the model.
 */
export function hasTrialBooked(lead: Lead, appointments: Appointment[] = []): boolean {
  if (
    lead.status === 'TRIAL_BOOKED' ||
    lead.status === 'TRIAL_ATTENDED' ||
    lead.status === 'MEMBERSHIP'
  ) {
    return true;
  }
  return appointments.some(
    (a) =>
      a.leadId === lead.id &&
      a.type === 'FREE_TRIAL' &&
      (a.status === 'SCHEDULED' || a.status === 'CONFIRMED' || a.status === 'ATTENDED'),
  );
}

/**
 * @param lead        the lead record
 * @param appointments all appointments (used only to detect a booked trial)
 */
export function computeLeadScore(lead: Lead, appointments: Appointment[] = []): ScoreResult {
  const goalProvided = !!lead.goal && lead.goal !== 'GENERAL';
  const phoneProvided = !!String(lead.phone || '').trim();
  const programSelected = !!String(lead.program || '').trim();
  const highIntent = messageHasHighIntent(lead.message);
  const requestedTrial = !!lead.requestedTrial || highIntent;
  const trialBooked = hasTrialBooked(lead, appointments);

  const factors: ScoreFactor[] = [
    {
      key: 'goalProvided',
      label: 'Goal selected',
      detail: lead.goal && lead.goal !== 'GENERAL' ? 'Specific goal given' : 'No specific goal',
      points: SCORE_WEIGHTS.goalProvided,
      earned: goalProvided,
    },
    {
      key: 'phoneProvided',
      label: 'Phone number',
      detail: phoneProvided ? 'Reachable by phone' : 'No phone number',
      points: SCORE_WEIGHTS.phoneProvided,
      earned: phoneProvided,
    },
    {
      key: 'programSelected',
      label: 'Program interest',
      detail: lead.program ? `${lead.program} selected` : 'No program selected',
      points: SCORE_WEIGHTS.programSelected,
      earned: programSelected,
    },
    {
      key: 'highIntentMessage',
      label: 'High-intent message',
      detail: highIntent
        ? `Message mentions buying intent (${messageIntentMatches(lead.message).slice(0, 3).join(', ')})`
        : 'No buying signals in message',
      points: SCORE_WEIGHTS.highIntentMessage,
      earned: highIntent,
    },
    {
      key: 'requestedTrial',
      label: 'Requested a trial',
      detail: lead.requestedTrial ? 'Asked for a free trial' : 'Did not ask for a trial',
      points: SCORE_WEIGHTS.requestedTrial,
      earned: requestedTrial,
    },
    {
      key: 'trialBooked',
      label: 'Trial booked',
      detail: trialBooked ? 'Free trial scheduled or attended' : 'No trial scheduled',
      points: SCORE_WEIGHTS.trialBooked,
      earned: trialBooked,
    },
  ];

  const score = factors.reduce((total, f) => total + (f.earned ? f.points : 0), 0);

  return { score, band: scoreBand(score), factors };
}

/** Convenience wrapper for persistence paths that only need the number. */
export function leadScoreValue(lead: Lead, appointments: Appointment[] = []): number {
  return computeLeadScore(lead, appointments).score;
}
