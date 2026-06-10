import { clearSyncQueue } from "@/lib/sync";
import { factoryResetTestData } from "@/lib/storage";
import { resetAppState } from "@/store";

// Wipes every sf_* localStorage key, drops any pending sync-queue writes,
// and resets the in-memory zustand store. Called on sign-out so user A's
// data isn't visible to user B on the same browser, and so A's queued
// writes don't get sent under B's session. Does NOT touch Supabase sb-*
// keys — Supabase's signOut() handles its own session cleanup.
export function clearLocalCache(): string[] {
  clearSyncQueue();
  const removed = factoryResetTestData();
  resetAppState();
  return removed;
}
