"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// =============================================================================
// useAutoSave — generic debounced auto-save with status tracking
// =============================================================================
//
// Used by the Journal section to auto-save reflection drafts, the
// Notes-tab draft, and trade reflection answers. The hook is
// framework-agnostic — `save` can write to zustand, fire a network
// request, or no-op — and the status is derived state, not setState in
// effect bodies, so the React-Compiler lint stays clean.
//
// Behavior:
//   * Debounced save while typing (default 700 ms).
//   * Status returned: idle | unsaved | saving | saved | failed.
//   * `flush()` writes the pending value immediately (used from
//     finalize handlers to guarantee the latest text is committed).
//   * On unmount, any pending write is flushed synchronously so a tab
//     switch can't lose the last keystroke.
//   * Optional `guardLeave`: registers a beforeunload handler while
//     unsaved/saving so the browser warns the user before closing the
//     tab.
//
// IMPORTANT: refs are only updated INSIDE effects, never during render
// — the React-Compiler `refs` lint rejects render-time ref reads. The
// status itself is derived from `value` + `lastSavedValue` (plain
// state), so the render path stays ref-free.
// =============================================================================

export const AUTO_SAVE_STATUSES = [
  "idle",
  "unsaved",
  "saving",
  "saved",
  "failed",
] as const;
export type AutoSaveStatus = (typeof AUTO_SAVE_STATUSES)[number];

export type UseAutoSaveOptions<T> = {
  value: T;
  save: (value: T) => void | Promise<void>;
  // Returns true if the current value is worth saving. Useful to skip
  // initial-mount writes when the form is empty. Defaults to "always".
  shouldSave?: (value: T) => boolean;
  debounceMs?: number;
  isEqual?: (a: T, b: T) => boolean;
  guardLeave?: boolean;
};

export type AutoSaveHandle = {
  status: AutoSaveStatus;
  lastSavedAt: number | null;
  flush: () => Promise<void>;
};

const defaultEqual = <T,>(a: T, b: T) =>
  JSON.stringify(a) === JSON.stringify(b);

export function useAutoSave<T>({
  value,
  save,
  shouldSave,
  debounceMs = 700,
  isEqual,
  guardLeave = false,
}: UseAutoSaveOptions<T>): AutoSaveHandle {
  // Plain function references — used directly during render where the
  // dirty/status derivation needs them. Treated as freshly closed-over
  // on every render so callers don't need to memoize.
  const equals = isEqual ?? defaultEqual<T>;
  const meaningful = shouldSave ?? alwaysTrue;

  // Reactive state that flows into render.
  const [lastSavedValue, setLastSavedValue] = useState<T>(value);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [internalState, setInternalState] = useState<
    "normal" | "saving" | "failed"
  >("normal");

  // Refs for the unmount-flush + setTimeout callback paths. ASSIGNED
  // only inside effects so the lint doesn't trip on render-time ref
  // writes. The latest values are captured each render via the sync
  // effects below.
  const saveRef = useRef(save);
  const valueRef = useRef(value);
  const lastSavedValueRef = useRef(lastSavedValue);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    lastSavedValueRef.current = lastSavedValue;
  }, [lastSavedValue]);

  // Derived status. `equals` is a plain function called inline here,
  // not a ref — so this stays out of the refs-in-render lint.
  const isDirty = !equals(value, lastSavedValue);
  const status: AutoSaveStatus =
    internalState === "failed"
      ? "failed"
      : internalState === "saving"
        ? "saving"
        : isDirty
          ? "unsaved"
          : lastSavedAt != null
            ? "saved"
            : "idle";

  // The actual save runner. Memoized so the debounce effect below
  // doesn't re-trigger purely from re-renders.
  const runSave = useCallback(async (next: T) => {
    setInternalState("saving");
    try {
      await Promise.resolve(saveRef.current(next));
      setLastSavedValue(next);
      setLastSavedAt(Date.now());
      setInternalState("normal");
    } catch {
      // Don't update lastSavedValue — status stays "failed" and the
      // value remains dirty so the next change retries.
      setInternalState("failed");
    }
  }, []);

  // Debounced auto-save. Schedules a timer when the value diverges
  // from lastSaved + shouldSave allows it.
  useEffect(() => {
    if (!meaningful(value)) return;
    if (equals(value, lastSavedValue)) return;
    const timer = setTimeout(() => {
      runSave(value);
    }, debounceMs);
    return () => clearTimeout(timer);
    // `meaningful` + `equals` aren't in the dep array — they're called
    // inline using the freshly-closed-over reference each render. The
    // effect itself only needs to re-run when `value`, `lastSavedValue`,
    // or `debounceMs` change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, lastSavedValue, debounceMs, runSave]);

  // Flush-on-unmount — synchronous best-effort. Captures the latest
  // pending value via the ref so the cleanup writes the actual last
  // keystroke, not a stale value from the effect's mount snapshot.
  useEffect(() => {
    return () => {
      const pending = valueRef.current;
      const last = lastSavedValueRef.current;
      if (equals(pending, last)) return;
      if (!meaningful(pending)) return;
      try {
        // Fire-and-forget — unmount can't await. For sync savers
        // (zustand), this lands immediately.
        Promise.resolve(saveRef.current(pending));
      } catch {
        // best effort on unmount
      }
    };
    // Intentionally empty deps — we only want unmount cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Beforeunload guard. Active only while there are unsaved or
  // in-flight changes.
  useEffect(() => {
    if (!guardLeave) return;
    if (status !== "unsaved" && status !== "saving") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [guardLeave, status]);

  const flush = useCallback(async () => {
    const pending = valueRef.current;
    const last = lastSavedValueRef.current;
    if (equals(pending, last)) return;
    await runSave(pending);
    // `equals` intentionally closed-over from latest render — same
    // pattern as the debounce effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSave]);

  return { status, lastSavedAt, flush };
}

function alwaysTrue() {
  return true;
}
