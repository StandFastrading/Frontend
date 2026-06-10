"use client";

import { Check, CloudOff, Loader2, AlertTriangle } from "lucide-react";
import { useSyncStatus } from "@/lib/sync/hooks";
import { cn } from "@/lib/utils";

// Sidebar chip showing the state of the outbound write queue. Three states:
//   - All synced (nothing pending, last success recent)
//   - N pending (writes in flight or waiting on retry)
//   - N failed (errored after MAX_ATTEMPTS retries)
//
// Deliberately understated — it's an ambient signal, not a CTA. Only the
// "failed" state uses an alert color, since that's the one the trader needs
// to know about.
export function SyncStatusChip() {
  const { pending, errored } = useSyncStatus();

  if (errored > 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium",
          "border-rose-500/40 bg-rose-500/[0.08] text-rose-300",
        )}
        title={`${errored} sync${errored === 1 ? "" : "s"} failed — will retry on next action`}
      >
        <AlertTriangle className="size-3.5" />
        <span className="truncate">
          {errored} sync{errored === 1 ? "" : "s"} failed
        </span>
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
          "border-cyan-500/30 bg-cyan-500/[0.06] text-cyan-300",
        )}
        title={`Syncing ${pending} change${pending === 1 ? "" : "s"} to Standfast`}
      >
        <Loader2 className="size-3.5 animate-spin" />
        <span className="truncate">
          Syncing {pending}…
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs",
        "text-muted-foreground/70",
      )}
      title="All changes synced"
    >
      <Check className="size-3.5 text-emerald-500/80" />
      <span className="truncate">All synced</span>
    </div>
  );
}

// Suppress unused import warning if cloud-off is needed later.
void CloudOff;
