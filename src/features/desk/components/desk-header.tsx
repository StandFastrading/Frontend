"use client";

import { Lock, Terminal, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSessionIntelligence } from "@/store/slices/session-intelligence-slice";
import { StartNewSessionButton } from "@/features/desk/components/start-new-session-button";

function formatPnL(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DeskHeader() {
  const intel = useSessionIntelligence();
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

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Trade Desk
        </h1>
        <p className="text-sm text-muted-foreground">
          Plan the trade. Check the risk. Control the behavior.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-card/60 px-3 py-2 backdrop-blur">
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

        <div className="flex items-center gap-2.5 rounded-lg border border-brand/55 bg-brand/[0.12] px-3 py-2 shadow-[0_0_22px_-8px_oklch(0.62_0.22_255/0.5)]">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand/25 text-brand ring-1 ring-brand/45 shadow-[0_0_14px_-4px_oklch(0.62_0.22_255/0.55)]">
            <Terminal className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Mode
            </span>
            <span className="text-sm font-semibold text-brand">
              Manual Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-card/40 px-3 py-2 opacity-70">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground/10 text-muted-foreground ring-1 ring-white/10">
            <Lock className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Broker Sync
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              Coming Later
            </span>
          </div>
        </div>

        {/* DEV / PROTOTYPE — session lifecycle control. Final auth flow
            will replace this with broker-driven session rotation. */}
        <StartNewSessionButton variant="primary" />
      </div>
    </div>
  );
}
