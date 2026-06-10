// Durable outbound write queue.
//
// Every mutating zustand action enqueues a task here. The queue persists
// itself to localStorage so a tab crash or refresh mid-sync doesn't lose
// pending writes. On each enqueue (and on `online` events) we attempt to
// drain. Failed tasks retry with exponential backoff; after MAX_ATTEMPTS
// they're marked errored and surfaced via `useSyncStatus`.
//
// Idempotency: each task carries a `clientId`. The mappers' upsert calls
// use `onConflict: 'user_id,client_id'` so a retry never duplicates a row.

import { SF_STORAGE_KEYS } from "@/lib/storage/storage-keys";
import { saveState, loadState } from "@/lib/storage/persistence";

import {
  supabaseDelete,
  supabaseInsert,
  supabaseUpdate,
  supabaseUpsert,
} from "./client";

type Op = "insert" | "upsert" | "update" | "delete";

type TableName = Parameters<typeof supabaseInsert>[0];

export interface SyncTask {
  /** Stable id for dedup across retries. */
  id: string;
  table: TableName;
  op: Op;
  /** Row payload (for insert/upsert) or patch (for update). */
  payload: Record<string, unknown>;
  /** Match filter for update/delete ops (e.g., { id }). */
  match?: Record<string, string | number | boolean | null>;
  /** Column(s) the upsert should conflict on (e.g., 'user_id,client_id'). */
  onConflict?: string;
  /** When the task was first enqueued. */
  enqueuedAt: number;
  /** Number of attempts so far. */
  attempts: number;
  /** Last error message, if any. */
  lastError?: string;
  /** Status. `errored` = exhausted retries. */
  status: "pending" | "in_flight" | "errored";
}

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000]; // index by attempts

type Listener = (snapshot: QueueSnapshot) => void;

export interface QueueSnapshot {
  pending: number;
  errored: number;
  lastSuccessAt: number | null;
  tasks: SyncTask[];
}

let queue: SyncTask[] = [];
let lastSuccessAt: number | null = null;
let isDraining = false;
let drainTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();
let initialized = false;

// React 18's `useSyncExternalStore` requires `getSnapshot` to return a
// stable reference between mutations. Building a fresh QueueSnapshot on
// every call (e.g. inside snapshot()) trips the "result should be cached
// to avoid an infinite loop" warning. Cache it and only rebuild on
// notify().
let cachedSnapshot: QueueSnapshot = {
  pending: 0,
  errored: 0,
  lastSuccessAt: null,
  tasks: [],
};
const emptySnapshot: QueueSnapshot = cachedSnapshot;

function load() {
  const persisted = loadState<{
    tasks: SyncTask[];
    lastSuccessAt: number | null;
  }>(SF_STORAGE_KEYS.syncQueue);
  if (persisted) {
    // Reset any in_flight tasks back to pending — they were interrupted by
    // refresh and need to retry.
    queue = persisted.tasks.map((t) =>
      t.status === "in_flight" ? { ...t, status: "pending" } : t,
    );
    lastSuccessAt = persisted.lastSuccessAt;
  }
}

function persist() {
  saveState(SF_STORAGE_KEYS.syncQueue, { tasks: queue, lastSuccessAt });
}

function rebuildSnapshot() {
  cachedSnapshot = {
    pending: queue.filter((t) => t.status !== "errored").length,
    errored: queue.filter((t) => t.status === "errored").length,
    lastSuccessAt,
    tasks: queue.slice(),
  };
}

function notify() {
  rebuildSnapshot();
  for (const fn of listeners) fn(cachedSnapshot);
}

async function runTask(task: SyncTask): Promise<void> {
  if (task.op === "insert") {
    await supabaseInsert(task.table, task.payload);
  } else if (task.op === "upsert") {
    await supabaseUpsert(task.table, task.payload, {
      onConflict: task.onConflict,
    });
  } else if (task.op === "update") {
    if (!task.match) throw new Error("update task missing match filter");
    await supabaseUpdate(
      task.table,
      task.payload,
      task.match as Record<string, string | number | boolean | null>,
    );
  } else if (task.op === "delete") {
    if (!task.match) throw new Error("delete task missing match filter");
    await supabaseDelete(
      task.table,
      task.match as Record<string, string | number>,
    );
  }
}

async function drain() {
  if (isDraining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  isDraining = true;
  try {
    while (true) {
      const next = queue.find((t) => t.status === "pending");
      if (!next) break;
      next.status = "in_flight";
      persist();
      notify();
      try {
        await runTask(next);
        // Success: drop from queue
        queue = queue.filter((t) => t.id !== next.id);
        lastSuccessAt = Date.now();
        persist();
        notify();
      } catch (err) {
        const message = (err as Error)?.message ?? String(err);
        next.attempts += 1;
        next.lastError = message;
        next.status = "pending";
        if (next.attempts >= MAX_ATTEMPTS) {
          next.status = "errored";
          if (typeof console !== "undefined") {
            console.error(
              `[sync] task errored after ${next.attempts} attempts`,
              next,
            );
          }
        }
        persist();
        notify();
        // If pending (not errored), schedule a retry; otherwise move on.
        if (next.status === "pending") {
          scheduleRetry(next);
          break;
        }
      }
    }
  } finally {
    isDraining = false;
  }
}

function scheduleRetry(task: SyncTask) {
  const delay = BACKOFF_MS[Math.min(task.attempts - 1, BACKOFF_MS.length - 1)];
  if (drainTimer) clearTimeout(drainTimer);
  drainTimer = setTimeout(() => {
    drainTimer = null;
    void drain();
  }, delay);
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  load();
  window.addEventListener("online", () => {
    void drain();
  });
  // Drain whatever was persisted from the prior session.
  if (queue.length > 0) void drain();
}

export function enqueueSync(
  task: Omit<SyncTask, "id" | "enqueuedAt" | "attempts" | "status">,
): void {
  initialize();
  const id = `${task.table}:${task.op}:${
    task.match?.id ??
    (task.payload as { client_id?: string; id?: string }).client_id ??
    (task.payload as { client_id?: string; id?: string }).id ??
    Math.random().toString(36).slice(2)
  }`;
  // Coalesce: if there's already a pending task with the same id, replace it
  // with the latest payload. Avoids enqueueing 50 outdated stop-price
  // updates when the user drags a slider quickly.
  const existingIdx = queue.findIndex(
    (t) => t.id === id && t.status === "pending",
  );
  if (existingIdx !== -1) {
    queue[existingIdx] = {
      ...queue[existingIdx],
      payload: task.payload,
      match: task.match,
      onConflict: task.onConflict,
    };
  } else {
    queue.push({
      ...task,
      id,
      enqueuedAt: Date.now(),
      attempts: 0,
      status: "pending",
    });
  }
  persist();
  notify();
  void drain();
}

/** Force-flush. Called after server hydration to replay any persisted
 *  writes from a previous session that hadn't synced yet. */
export function flushSyncQueue(): void {
  initialize();
  if (queue.length === 0) return;
  void drain();
}

/** Awaitable flush. Drains the queue and resolves once no `pending`/`in_flight`
 *  tasks remain (or `timeoutMs` elapses). Used by onboarding completion to
 *  guarantee onboarding writes have reached Supabase before the dashboard
 *  hydrates — otherwise hydration could overwrite them with default rows.
 *  Resolves `true` if the queue fully drained, `false` on timeout. */
export async function flushSyncQueueAsync(timeoutMs = 8_000): Promise<boolean> {
  initialize();
  const started = Date.now();
  void drain();
  while (queue.some((t) => t.status !== "errored")) {
    if (Date.now() - started >= timeoutMs) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
    void drain();
  }
  return true;
}

/** Manually retry an errored task. */
export function retryTask(id: string): void {
  const task = queue.find((t) => t.id === id);
  if (!task) return;
  task.status = "pending";
  task.attempts = 0;
  task.lastError = undefined;
  persist();
  notify();
  void drain();
}

/** Drop an errored task (give up on it permanently). */
export function discardTask(id: string): void {
  queue = queue.filter((t) => t.id !== id);
  persist();
  notify();
}

export function subscribeSyncQueue(listener: Listener): () => void {
  initialize();
  listeners.add(listener);
  listener(cachedSnapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncSnapshot(): QueueSnapshot {
  initialize();
  return cachedSnapshot;
}

/** Stable empty snapshot for SSR / first-render fallback. Same reference
 *  every call so React's strict mode doesn't loop. */
export function getServerSyncSnapshot(): QueueSnapshot {
  return emptySnapshot;
}

/** Sign-out cleanup. Wipes the queue so user A's pending writes aren't sent
 *  under user B's session if a sign-out happens before a flush completes. */
export function clearSyncQueue(): void {
  queue = [];
  lastSuccessAt = null;
  persist();
  notify();
}
