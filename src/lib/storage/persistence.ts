import {
  ALL_SF_COOKIE_NAMES,
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

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

// Demo-reset wipes every SF-owned localStorage key + mock-session cookie.
// Intended for the "Reset Demo" affordance, not user-facing sign-out.
export function resetDemoData(): void {
  for (const key of ALL_SF_STORAGE_KEYS) clearState(key);
  for (const name of ALL_SF_COOKIE_NAMES) clearCookie(name);
}

// Factory reset for test data — sweeps EVERY localStorage key that starts
// with the `sf_` prefix, including legacy keys we may have forgotten to
// enumerate in `ALL_SF_STORAGE_KEYS`. Deliberately does NOT touch cookies
// or non-`sf_` keys, so:
//   * `sf_mock_session` + `sf_mock_onboarded` cookies stay → user stays
//     signed in and isn't re-routed through onboarding.
//   * Supabase `sb-*` localStorage + cookies stay untouched → real auth
//     sessions aren't disturbed.
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
