"use client";

import { useState } from "react";
import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { useActiveSession } from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";
import { useSessionIntelligence } from "@/store/slices/session-intelligence-slice";
import type { SessionType } from "@/types";
import { cn } from "@/lib/utils";
import { SessionTypeDropdown } from "@/features/dashboard/components/session-type-dropdown";
import { StartSessionModal } from "@/features/dashboard/components/start-session-modal";

function formatPnL(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DashboardHeader({ name }: { name: string }) {
  const activeSession = useActiveSession();
  const intel = useSessionIntelligence();
  const startNewSession = useAppStore((s) => s.startNewSession);
  const setSessionType = useAppStore((s) => s.setSessionType);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pnLPositive = intel.pnLToday > 0;
  const pnLNegative = intel.pnLToday < 0;
  const PnLIcon = pnLNegative ? TrendingDown : TrendingUp;
  const pnLBadgeTone = pnLNegative
    ? "bg-rose-500/20 text-rose-300 ring-rose-500/45 shadow-[0_0_18px_-6px_rgba(244,63,94,0.55)]"
    : "bg-emerald-500/20 text-emerald-300 ring-emerald-500/45 shadow-[0_0_18px_-6px_rgba(16,185,129,0.55)]";
  const pnLTextTone = pnLPositive
    ? "text-emerald-400"
    : pnLNegative
      ? "text-rose-400"
      : "text-foreground";

  // Session-type dropdown updates the active session WITHOUT resetting
  // metrics. Counters only reset when the trader explicitly clicks
  // Start New Session and confirms the modal.
  const handleTypeChange = (
    type: SessionType,
    customLabel?: string | null,
  ) => {
    setSessionType(type, customLabel ?? null);
  };

  const handleConfirmStart = () => {
    // Default to the active session's type so the trader's session-window
    // preference carries forward. If they want a different type they can
    // pick it from the dropdown afterward.
    const carryType = activeSession?.sessionType ?? "regular";
    const carryLabel = activeSession?.customLabel ?? null;
    startNewSession(carryType, carryLabel);
    toast.success("New trading session started — counters reset");
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&rsquo;s your behavioral overview for today.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SessionTypeDropdown
          activeSession={activeSession}
          onSelect={handleTypeChange}
        />

        <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-card/60 px-3 py-2 backdrop-blur">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md ring-1",
              pnLBadgeTone,
            )}
          >
            <PnLIcon className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              P/L Today
            </span>
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                pnLTextTone,
              )}
            >
              {formatPnL(intel.pnLToday)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
        >
          Start New Session
          <Plus className="size-4" />
        </button>
      </div>

      <StartSessionModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmStart}
      />
    </div>
  );
}
