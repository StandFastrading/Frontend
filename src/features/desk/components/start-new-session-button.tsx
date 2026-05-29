"use client";

import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { useActiveSession } from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

// [DEV / PROTOTYPE TESTING CONTROL]
// Surfaces the session-lifecycle reset on the Trade Desk so we can exercise
// the boundary without waiting for midnight. Backed by `startNewSession()`
// in the sessions slice, which:
//   - closes the current TradingSession + opens a fresh one with a new id
//   - resets SessionMetrics + Trade Desk in-flight state (form, validation,
//     approved snapshot, modal)
//   - PRESERVES trader identity (user.userId), behavior events,
//     interventions, closed trades, monitoring events, journal /
//     reflections / notes, risk rules, allowed setups, and the sessions[]
//     archive itself.
// This UI is intentionally informal — it is NOT production account
// behavior. Final auth + per-trader session rotation will replace it.

type Variant = "primary" | "ghost";

type Props = {
  variant?: Variant;
  className?: string;
};

export function StartNewSessionButton({
  variant = "ghost",
  className,
}: Props) {
  const activeSession = useActiveSession();
  const startNewSession = useAppStore((s) => s.startNewSession);

  const handleClick = () => {
    const carryType = activeSession?.sessionType ?? "regular";
    const carryLabel = activeSession?.customLabel ?? null;
    startNewSession(carryType, carryLabel);
    toast.success("New session started — history preserved");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Dev control · resets current session state only (trader, history, journal preserved)"
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        variant === "primary"
          ? "border border-brand/40 bg-brand/10 text-brand hover:bg-brand/15"
          : "border border-white/10 bg-background/40 text-muted-foreground hover:text-foreground hover:bg-foreground/5",
        className,
      )}
    >
      <RefreshCcw className="size-4" />
      Start New Session
    </button>
  );
}
