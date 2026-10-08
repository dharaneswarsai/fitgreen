// ===========================================================
// Data service — one boundary for every read and write
//
// Two backends behind a single interface:
//
//   1. Local demo store (default). Entire dataset lives in
//      localStorage under a versioned key. Zero setup.
//   2. Supabase / Postgres (optional). Enabled purely by adding
//      VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to .env after
//      running supabase/schema.sql.
//
// Components never call either backend directly — they go through
// this module, which is what keeps validation and persistence
// boundaries in one place.
// ===========================================================

import supabase, { SCHEMA, isSupabaseConfigured } from './supabaseClient';
import { readStore, writeStore, clearStore } from './storage';
import { buildSeed } from './seed';
import type { CollectionKey, Database } from '@/types';

export const backend = isSupabaseConfigured ? 'supabase' : 'local';

// ---------------------------------------------------------
// localStorage path
// ---------------------------------------------------------

let cache: Database | null = null;

function localSnapshot(): Database {
  if (!cache) {
    const stored = readStore<Database | null>(null);
    cache = stored ?? buildSeed();
    if (!stored) writeStore(cache);
  }
  return cache;
}

/** Replaces the cached snapshot and flushes it to storage. */
function localFlush(next: Database): void {
  cache = next;
  writeStore(next);
}

// ---------------------------------------------------------
// Postgres mapping
//
// TS uses camelCase; Postgres columns are snake_case. Mappings
// are explicit so a schema change cannot silently desync.
// ---------------------------------------------------------

const COLUMNS: Record<CollectionKey, Record<string, string>> = {
  team: {
    authUserId: 'auth_user_id',
    name: 'name',
    email: 'email',
    phone: 'phone',
    role: 'role',
    colorIndex: 'color_index',
    active: 'active',
    id: 'id',
    createdAt: 'created_at',
  },
  leads: {
    name: 'name',
    phone: 'phone',
    email: 'email',
    goal: 'goal',
    workoutTime: 'workout_time',
    program: 'program',
    message: 'message',
    source: 'source',
    status: 'status',
    score: 'score',
    assignedToId: 'assigned_to_id',
    requestedTrial: 'requested_trial',
    nextFollowUpAt: 'next_follow_up_at',
    lastContactedAt: 'last_contacted_at',
    statusChangedAt: 'status_changed_at',
    lostReason: 'lost_reason',
    archivedAt: 'archived_at',
    id: 'id',
    createdAt: 'created_at',
  },
  activities: {
    leadId: 'lead_id',
    type: 'type',
    summary: 'summary',
    body: 'body',
    authorId: 'author_id',
    occurredAt: 'occurred_at',
    id: 'id',
    createdAt: 'created_at',
  },
  tasks: {
    leadId: 'lead_id',
    assigneeId: 'assignee_id',
    type: 'type',
    title: 'title',
    notes: 'notes',
    dueAt: 'due_at',
    priority: 'priority',
    status: 'status',
    completedAt: 'completed_at',
    id: 'id',
    createdAt: 'created_at',
  },
  appointments: {
    leadId: 'lead_id',
    staffId: 'staff_id',
    type: 'type',
    date: 'date',
    time: 'time',
    attendedAt: 'attended_at',
    status: 'status',
    notes: 'notes',
    id: 'id',
    createdAt: 'created_at',
  },
  plans: {
    name: 'name',
    tagline: 'tagline',
    price: 'price',
    durationMonths: 'duration_months',
    features: 'features',
    highlight: 'highlight',
    sortOrder: 'sort_order',
    id: 'id',
    createdAt: 'created_at',
  },
  members: {
    leadId: 'lead_id',
    planId: 'plan_id',
    name: 'name',
    phone: 'phone',
    email: 'email',
    salespersonId: 'salesperson_id',
    source: 'source',
    startDate: 'start_date',
    expiryDate: 'expiry_date',
    amountPaid: 'amount_paid',
    paymentMode: 'payment_mode',
    active: 'active',
    id: 'id',
    createdAt: 'created_at',
  },
  campaigns: {
    name: 'name',
    platform: 'platform',
    objective: 'objective',
    status: 'status',
    startDate: 'start_date',
    endDate: 'end_date',
    source: 'source',
    id: 'id',
    createdAt: 'created_at',
  },
  campaignMetrics: {
    campaignId: 'campaign_id',
    date: 'date',
    spend: 'spend',
    impressions: 'impressions',
    reach: 'reach',
    clicks: 'clicks',
    leads: 'leads',
    id: 'id',
    createdAt: 'created_at',
  },
  notifications: {
    kind: 'kind',
    title: 'title',
    body: 'body',
    read: 'read',
    href: 'href',
    recipientId: 'recipient_id',
    id: 'id',
    createdAt: 'created_at',
  },
};

const TABLES: Record<CollectionKey, string> = {
  team: 'team_members',
  leads: 'leads',
  activities: 'lead_activities',
  tasks: 'follow_up_tasks',
  appointments: 'appointments',
  plans: 'membership_plans',
  members: 'members',
  campaigns: 'campaigns',
  campaignMetrics: 'campaign_metrics',
  notifications: 'notifications',
};

function toRow(key: CollectionKey, record: Record<string, unknown>): Record<string, unknown> {
  const map = COLUMNS[key];
  const row: Record<string, unknown> = {};
  for (const [field, column] of Object.entries(map)) {
    if (record[field] !== undefined) row[column] = record[field];
  }
  return row;
}

function fromRow(key: CollectionKey, row: Record<string, unknown>): Record<string, unknown> {
  const map = COLUMNS[key];
  const inverse = Object.fromEntries(Object.entries(map).map(([field, column]) => [column, field]));
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    const field = inverse[column];
    if (field) out[field] = value;
  }
  return out;
}

async function loadFromSupabase(): Promise<Database | null> {
  if (!supabase) return null;
  // Capture the client in a local so TypeScript keeps the narrowing
  // inside the async callbacks below.
  const client = supabase;
  const empty: Database = {
    team: [],
    leads: [],
    activities: [],
    tasks: [],
    appointments: [],
    plans: [],
    members: [],
    campaigns: [],
    campaignMetrics: [],
    notifications: [],
  };
  const results = await Promise.all(
    (Object.keys(TABLES) as CollectionKey[]).map(async (key) => {
      const { data, error } = await client.schema(SCHEMA).from(TABLES[key]).select('*').limit(5000);
      if (error) throw new Error(`[fitgreen] ${TABLES[key]}: ${error.message}`);
      return [key, (data ?? []).map((row) => fromRow(key, row))] as const;
    }),
  );
  return Object.assign(empty, Object.fromEntries(results)) as Database;
}

// ---------------------------------------------------------
// Delta syncing
// ---------------------------------------------------------

export interface CollectionDelta {
  upserts: Record<string, unknown>[];
  deletes: string[];
}

export type DatabaseDelta = Partial<Record<CollectionKey, CollectionDelta>>;

/** Minimal shape every persisted row satisfies. */
type Identified = { id: string };

/**
 * Records that were added or changed between two snapshots.
 * Compared by JSON so a changed field is detected without a
 * per-column equality helper.
 */
export function diffCollection(
  prev: readonly Identified[] | undefined,
  next: readonly Identified[] | undefined,
): CollectionDelta {
  const upserts: Record<string, unknown>[] = [];
  const deletes: string[] = [];
  const prevMap = new Map((prev ?? []).map((r) => [r.id, r]));
  const nextMap = new Map((next ?? []).map((r) => [r.id, r]));

  for (const [id, record] of nextMap) {
    const before = prevMap.get(id);
    if (!before || JSON.stringify(before) !== JSON.stringify(record)) {
      upserts.push(record as unknown as Record<string, unknown>);
    }
  }
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) deletes.push(id);
  }
  return { upserts, deletes };
}

export function diffDatabase(prev: Database, next: Database): DatabaseDelta {
  const delta: DatabaseDelta = {};
  for (const key of Object.keys(TABLES) as CollectionKey[]) {
    delta[key] = diffCollection(prev[key], next[key]);
  }
  return delta;
}

// ---------------------------------------------------------
// Public API
// ---------------------------------------------------------

/** Full dataset read. Seeds on first run so the demo is never empty. */
export async function loadDatabase(): Promise<Database> {
  if (backend === 'supabase') {
    try {
      const db = await loadFromSupabase();
      if (db) return db;
    } catch (err) {
      console.error('[fitgreen] Postgres read failed — using local demo store:', err);
    }
  }
  return localSnapshot();
}

/** Applies a mutation delta to whichever backend is active. */
export async function persistDelta(delta: DatabaseDelta): Promise<void> {
  const touched = (Object.keys(delta) as CollectionKey[]).filter((key) => {
    const d = delta[key];
    return !!d && (d.upserts.length > 0 || d.deletes.length > 0);
  });
  if (!touched.length) return;

  if (backend === 'supabase' && supabase) {
    const client = supabase;
    for (const key of touched) {
      const { upserts, deletes } = delta[key]!;
      const table = client.schema(SCHEMA).from(TABLES[key]);
      if (upserts.length) {
        const { error } = await table.upsert(upserts.map((r) => toRow(key, r)), { onConflict: 'id' });
        if (error) throw new Error(`[fitgreen] ${TABLES[key]} upsert: ${error.message}`);
      }
      if (deletes.length) {
        const { error } = await table.delete().in('id', deletes);
        if (error) throw new Error(`[fitgreen] ${TABLES[key]} delete: ${error.message}`);
      }
    }
    return;
  }

  // Local: clone the snapshot, splice the delta in, flush once.
  const next = { ...localSnapshot() } as unknown as Record<CollectionKey, Identified[]>;
  for (const key of touched) {
    const { upserts, deletes } = delta[key]!;
    const rows: Identified[] = [...(next[key] ?? [])];
    for (const record of upserts) {
      const idx = rows.findIndex((r) => r.id === record.id);
      const merged = {
        ...(rows[idx] as Record<string, unknown> | undefined),
        ...record,
      } as unknown as Identified;
      if (idx >= 0) rows[idx] = merged;
      else rows.push(merged);
    }
    next[key] = rows.filter((r) => !deletes.includes(r.id));
  }
  localFlush(next as unknown as Database);
}

/** Full write — used by demo reset. */
export async function replaceDatabase(db: Database): Promise<void> {
  if (backend === 'supabase' && supabase) {
    const client = supabase;
    for (const key of Object.keys(TABLES) as CollectionKey[]) {
      const { error } = await client.schema(SCHEMA).from(TABLES[key]).delete().neq('id', '');
      if (error) throw new Error(`[fitgreen] ${TABLES[key]} clear: ${error.message}`);
    }
    const delta = {} as DatabaseDelta;
    for (const key of Object.keys(TABLES) as CollectionKey[]) {
      delta[key] = {
        upserts: (db[key] as unknown as Record<string, unknown>[]).map((r) => toRow(key, r)),
        deletes: [],
      };
    }
    await persistDelta(delta);
    return;
  }
  localFlush(db);
}

/** Restores the pristine demo dataset. */
export async function resetToSeed(): Promise<Database> {
  const seeded = buildSeed();
  await replaceDatabase(seeded);
  return seeded;
}

/** Wipes everything — used by Settings > Danger zone. */
export async function clearDatabase(): Promise<void> {
  if (backend === 'supabase' && supabase) {
    for (const key of Object.keys(TABLES) as CollectionKey[]) {
      const { error } = await supabase.schema(SCHEMA).from(TABLES[key]).delete().neq('id', '');
      if (error) throw new Error(`[fitgreen] ${TABLES[key]} clear: ${error.message}`);
    }
    return;
  }
  cache = null;
  clearStore();
}
