"use client";

import { useCallback, useSyncExternalStore } from "react";

import { loadState, saveState } from "@/lib/storage";

// SSR-safe hook that mirrors a single boolean preference into
// localStorage under an arbitrary key. Used by UI surfaces that want
// to remember a per-user toggle (e.g. the dashboard Weekly Review
// expanded/collapsed state) without expanding the persisted zustand
// store schema.
//
// `useSyncExternalStore` is the canonical React 19 pattern for
// syncing external state. `getServerSnapshot` returns `defaultValue`
// so SSR markup is deterministic; the client's `getSnapshot` reads
// the actual value out of localStorage after hydration. Same-tab
// writes dispatch a custom event so other components reading the
// same key re-render without a page reload.

const SAME_TAB_EVENT = "sf-storage-changed";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(SAME_TAB_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SAME_TAB_EVENT, callback);
  };
}

export function useStoredBoolean(
  key: string,
  defaultValue: boolean,
): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const stored = loadState<boolean>(key);
      return typeof stored === "boolean" ? stored : defaultValue;
    },
    () => defaultValue,
  );

  const update = useCallback(
    (next: boolean) => {
      saveState(key, next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SAME_TAB_EVENT));
      }
    },
    [key],
  );

  return [value, update];
}
