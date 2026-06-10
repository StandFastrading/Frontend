import {
  ALL_SF_STORAGE_KEYS,
  type SfStorageKey,
} from "@/lib/storage/storage-keys";

// Low-level JSON IO over localStorage. All callers (zustand persist
// middleware, demo-reset, legacy migration) route through these helpers so
// SSR safety and error-swallowing live in one place.

export function saveState<T>(key: SfStorageKey | string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or serialization error — non-fatal */
  }
}

export function loadState<T>(key: SfStorageKey | string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function clearState(key: SfStorageKey | string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// Demo-reset wipes every SF-owned localStorage key. Intended for the dev
// "Reset Local Data" affordance. Does not touch Supabase sb-* keys — let
// supabase.auth.signOut() handle its own session cleanup.
export function resetDemoData(): void {
  for (const key of ALL_SF_STORAGE_KEYS) clearState(key);
}

// Factory reset for test data — sweeps EVERY localStorage key that starts
// with the `sf_` prefix, including legacy keys we may have forgotten to
// enumerate in `ALL_SF_STORAGE_KEYS`. Deliberately does NOT touch non-`sf_`
// keys, so:
//   * Supabase `sb-*` localStorage stays untouched → the user's auth session
//     survives a local-data wipe.
//   * Any other vendor key (analytics, feature flags) is left alone.
//
// Returns the list of removed keys so the caller can log them for
// auditability of a destructive action.
export function factoryResetTestData(): string[] {
  if (typeof window === "undefined") return [];
  const removed: string[] = [];
  // Snapshot keys first — removing during iteration shifts indices and
  // can skip entries on some implementations.
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key !== null) keys.push(key);
  }
  for (const key of keys) {
    if (!key.startsWith("sf_")) continue;
    try {
      window.localStorage.removeItem(key);
      removed.push(key);
    } catch {
      /* quota / locked / other — non-fatal */
    }
  }
  return removed;
}
