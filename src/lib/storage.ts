// ===========================================================
// Versioned local datastore
//
// The app runs with zero configuration against this store.
// A version bump invalidates old demo data so a schema change
// never leaves stale records behind.
// ===========================================================

const NAMESPACE = 'fitgreen';
const VERSION = 'v1';
const KEY = `${NAMESPACE}:${VERSION}`;

export function readStore<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt or unreadable payload — fall back rather than crash the app.
    return fallback;
  }
}

export function writeStore(value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch (err) {
    // Quota exceeded or private-mode storage. The app still works for the
    // current session; data simply will not persist across reloads.
    console.warn('[fitgreen] Could not persist to localStorage:', err);
  }
}

export function clearStore(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
