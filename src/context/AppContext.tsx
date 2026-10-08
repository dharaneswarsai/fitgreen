import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Database, Lead, TeamRole } from '@/types';
import { loadDatabase, persistDelta, resetToSeed, diffDatabase, backend } from '@/lib/dataService';
import * as wf from '@/services/leadWorkflow';
import type { LeadInput, TrialInput, ConversionInput, WorkflowResult } from '@/services/leadWorkflow';
import { deriveAlerts, unreadEventCount, type AlertItem } from '@/services/notifications';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const VIEWER_STORAGE_KEY = 'fitgreen:viewer';

interface AppValue {
  db: Database;
  loading: boolean;
  backend: typeof backend;
  toasts: Toast[];
  dismissToast: (id: number) => void;

  /** Demo persona. Only affects visibility, never the data itself. */
  viewer: TeamRole;
  viewerId: string | null;
  setViewer: (role: TeamRole) => void;

  /** Live, actionable items recomputed from current data on every render. */
  alerts: AlertItem[];
  unreadCount: number;
  markNotificationsRead: () => WorkflowResult;

  /** Applies a pure workflow transform, persists the delta, then updates state. */
  run: <T extends WorkflowResult>(fn: (db: Database) => T) => T;
  submitLead: (input: LeadInput) => WorkflowResult;
  refresh: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const AppContext = createContext<AppValue | null>(null);

/**
 * Every mutation in the app funnels through here. Workflows are pure
 * `(db) => result` transforms, so the pattern is always the same:
 * run it, diff old against new, persist only what changed, swap state.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewer, setViewerState] = useState<TeamRole>(() => {
    const stored = localStorage.getItem(VIEWER_STORAGE_KEY);
    return stored === 'SALES_MANAGER' || stored === 'SALES_EXEC' ? stored : 'ADMIN';
  });

  const toastId = useRef(0);
  // A ref of the current snapshot, so `run` never closes over a stale db.
  const dbRef = useRef<Database | null>(null);

  const pushToast = useCallback((tone: ToastTone, message: string) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const snapshot = await loadDatabase();
      if (cancelled) return;
      dbRef.current = snapshot;
      setDb(snapshot);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setViewer = useCallback((role: TeamRole) => {
    setViewerState(role);
    localStorage.setItem(VIEWER_STORAGE_KEY, role);
  }, []);

  const run = useCallback(
    <T extends WorkflowResult>(fn: (current: Database) => T): T => {
      const current = dbRef.current;
      if (!current) throw new Error('App is still loading.');

      const result = fn(current);
      if (!result.ok) {
        pushToast('error', result.error ?? 'That action could not be completed.');
        return result;
      }

      // Optimistic swap, then persist in the background. If persistence
      // fails the user keeps their change and is told it did not save,
      // rather than silently losing the edit on the next reload.
      dbRef.current = result.db;
      setDb(result.db);

      void persistDelta(diffDatabase(current, result.db))
        .then(() => {
          if (result.message) pushToast('success', result.message);
        })
        .catch((error: unknown) => {
          pushToast('error', `Saved locally, but not to the server: ${String(error)}`);
        });

      return result;
    },
    [pushToast],
  );

  const submitLead = useCallback(
    (input: LeadInput) => {
      const current = dbRef.current;
      if (!current) throw new Error('App is still loading.');
      const result = wf.submitPublicLead(current, input);
      if (!result.ok) {
        pushToast('error', result.error ?? 'We could not submit your details.');
        return result;
      }
      dbRef.current = result.db;
      setDb(result.db);
      void persistDelta(diffDatabase(current, result.db)).catch(() => {
        pushToast('error', 'Saved locally, but not to the server.');
      });
      return result;
    },
    [pushToast],
  );

  const refresh = useCallback(async () => {
    const snapshot = await loadDatabase();
    dbRef.current = snapshot;
    setDb(snapshot);
  }, []);

  const resetDemo = useCallback(async () => {
    setLoading(true);
    const snapshot = await resetToSeed();
    dbRef.current = snapshot;
    setDb(snapshot);
    setLoading(false);
    pushToast('success', 'Demo data reset to the original snapshot.');
  }, [pushToast]);

  const value = useMemo<AppValue>(() => {
    // Safe: the provider returns a loading screen before rendering children.
    const snapshot = db as Database;
    return {
      db: snapshot,
      loading,
      backend,
      toasts,
      dismissToast,
      viewer,
      viewerId:
        viewer === 'ADMIN' ? null : snapshot.team.find((t) => t.role === viewer)?.id ?? null,
      setViewer,
      alerts: deriveAlerts(snapshot),
      unreadCount: unreadEventCount(snapshot?.notifications),
      markNotificationsRead: () => run((current) => wf.markNotificationsRead(current)),
      run,
      submitLead,
      refresh,
      resetDemo,
    };
  }, [
    db,
    loading,
    toasts,
    dismissToast,
    viewer,
    setViewer,
    run,
    submitLead,
    refresh,
    resetDemo,
  ]);

  if (loading || !db) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-ink/15 border-t-fit-500" />
          <p className="text-sm text-ink/60">Loading FITGREEN…</p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>.');
  return ctx;
}

/** Narrowed accessor so pages never have to null-check the database. */
export function useDb(): Database {
  return useApp().db;
}

export function useLead(id: string | undefined): Lead | undefined {
  const { db } = useApp();
  return useMemo(() => db.leads.find((l) => l.id === id), [db.leads, id]);
}

/** Everything a salesperson is allowed to see, narrowed to their own book. */
export function useVisibleLeads(): Lead[] {
  const { db, viewer, viewerId } = useApp();
  return useMemo(() => {
    const open = db.leads.filter((l) => !l.archivedAt);
    if (viewer === 'SALES_EXEC' && viewerId) {
      return open.filter((l) => l.assignedToId === viewerId);
    }
    return open;
  }, [db.leads, viewer, viewerId]);
}

export type AppActions = {
  submitLead: AppValue['submitLead'];
  createManualLead: (input: LeadInput) => WorkflowResult;
  assignLead: (leadId: string, assigneeId: string | null) => WorkflowResult;
  moveLeadStage: (leadId: string, status: Lead['status'], lostReason?: string) => WorkflowResult;
  updateLead: (leadId: string, patch: Partial<Lead>) => WorkflowResult;
  archiveLead: (leadId: string, archived: boolean) => WorkflowResult;
  logContact: (
    leadId: string,
    input: { type: Parameters<typeof wf.logContact>[2]['type']; summary: string; body?: string; authorId: string | null },
  ) => WorkflowResult;
  createTask: (input: Parameters<typeof wf.createTask>[1]) => WorkflowResult;
  completeTask: (taskId: string) => WorkflowResult;
  reopenTask: (taskId: string) => WorkflowResult;
  deleteTask: (taskId: string) => WorkflowResult;
  bookAppointment: (leadId: string, input: TrialInput) => WorkflowResult;
  setAppointmentStatus: (id: string, status: Parameters<typeof wf.setAppointmentStatus>[2]) => WorkflowResult;
  cancelAppointment: (id: string) => WorkflowResult;
  convertToMember: (leadId: string, input: ConversionInput) => WorkflowResult;
};

/** Thin action layer so components call `actions.moveLeadStage(...)` directly. */
export function useActions(): AppActions {
  const { run } = useApp();
  return useMemo(
    () => ({
      submitLead: (input) => run((db) => wf.submitPublicLead(db, input)),
      createManualLead: (input) => run((db) => wf.createManualLead(db, input)),
      assignLead: (leadId, assigneeId) => run((db) => wf.assignLead(db, leadId, assigneeId)),
      moveLeadStage: (leadId, status, lostReason) =>
        run((db) => wf.moveLeadStage(db, leadId, status, lostReason)),
      updateLead: (leadId, patch) => run((db) => wf.updateLead(db, leadId, patch)),
      archiveLead: (leadId, archived) => run((db) => wf.archiveLead(db, leadId, archived)),
      logContact: (leadId, input) => run((db) => wf.logContact(db, leadId, input)),
      createTask: (input) => run((db) => wf.createTask(db, input)),
      completeTask: (taskId) => run((db) => wf.completeTask(db, taskId)),
      reopenTask: (taskId) => run((db) => wf.reopenTask(db, taskId)),
      deleteTask: (taskId) => run((db) => wf.deleteTask(db, taskId)),
      bookAppointment: (leadId, input) => run((db) => wf.bookAppointment(db, leadId, input)),
      setAppointmentStatus: (id, status) => run((db) => wf.setAppointmentStatus(db, id, status)),
      cancelAppointment: (id) => run((db) => wf.cancelAppointment(db, id)),
      convertToMember: (leadId, input) => run((db) => wf.convertToMember(db, leadId, input)),
    }),
    [run],
  );
}
