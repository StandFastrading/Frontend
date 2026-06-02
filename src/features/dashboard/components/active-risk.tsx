"use client";

import { ArrowRight, ShieldAlert } from "lucide-react";

import { deriveCurrentAccountBalance } from "@/lib/sessions/account-balance";
import { useCurrentSessionTrades } from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";
import { useSessionIntelligence } from "@/store/slices/session-intelligence-slice";
import { cn } from "@/lib/utils";

// Reads daily risk usage + open exposure from the Session Intelligence layer.
// Presentation rule: when a threshold is breached the widget switches to a
// short, human-readable status ("Daily loss limit reached" / "Risk threshold
// exceeded") instead of rendering raw negative percentages. The underlying
// `session.dailyLossUsedPercent` math is left untouched; only the visible
// number is clamped + reworded.

function RBar({
  current,
  max,
  percent,
  variant,
  breached,
  breachedLabel,
}: {
  current: number;
  max: number;
  percent: number;
  variant: "brand" | "rose";
  breached: boolean;
  breachedLabel: string;
}) {
  const barColor = variant === "brand" ? "bg-brand" : "bg-rose-500";

  if (breached) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-base font-semibold leading-none text-rose-300">
            <ShieldAlert className="size-4 shrink-0" />
            {breachedLabel}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full w-full rounded-full bg-rose-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold leading-none tabular-nums text-foreground">
          {current.toFixed(2)}%
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {max.toFixed(2)}%
          </span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {percent.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function formatPnL(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ActiveRisk() {
  const session = useAppStore((s) => s.session);
  const riskRules = useAppStore((s) => s.riskRules);
  // Session-scoped: "Open Exposure" reflects the current session only —
  // a Start New Session must reset this tile to zero open risk even if
  // a prior session's trade is still in the persisted archive.
  const { activeTrades } = useCurrentSessionTrades();
  const intel = useSessionIntelligence();

  const dailyMax = riskRules.maxDailyLossPercent;
  const dailyUsage = Math.max(0, session.dailyLossUsedPercent);
  const dailyPercent = dailyMax > 0 ? (dailyUsage / dailyMax) * 100 : 0;
  // Threshold breach: visible bar/label switches to status copy. Math is
  // unchanged — `dailyUsage` keeps its raw value for analytics + Reports.
  const dailyBreached = dailyUsage > dailyMax && dailyMax > 0;

  const openRiskDollars = activeTrades
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + (t.currentRisk ?? t.originalRisk ?? 0), 0);
  // Open exposure % reflects the trader's open risk against the money
  // they actually have to trade against right now — Current Balance,
  // not Starting Balance. Same anchor the Trade Desk validator uses.
  const closedTrades = useAppStore((s) => s.closedTrades);
  const currentBalance = deriveCurrentAccountBalance(
    riskRules.accountSize,
    closedTrades,
  );
  const openRiskPercent =
    currentBalance > 0 ? (openRiskDollars / currentBalance) * 100 : 0;

  // Floors at 0 so we never display a negative slack number when the cap
  // has been exceeded — the breach label below makes the state clear.
  const potentialRiskPercent = Math.max(0, dailyMax - dailyUsage);

  const pnLTone =
    intel.pnLToday > 0
      ? "text-emerald-400"
      : intel.pnLToday < 0
        ? "text-rose-400"
        : "text-foreground";

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Active Risk
      </span>

      <div className="flex flex-col gap-4">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Daily Risk Usage
        </span>
        <RBar
          current={dailyUsage}
          max={dailyMax}
          percent={dailyPercent}
          variant={dailyPercent >= 80 ? "rose" : "brand"}
          breached={dailyBreached}
          breachedLabel="Risk threshold exceeded"
        />
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">Open Risk</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {openRiskPercent.toFixed(2)}%
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">Remaining Budget</dt>
          <dd
            className={cn(
              "font-semibold tabular-nums",
              dailyBreached ? "text-rose-300" : "text-foreground",
            )}
          >
            {dailyBreached
              ? "Limit reached"
              : `${potentialRiskPercent.toFixed(2)}%`}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">P/L Today</dt>
          <dd className={cn("font-semibold tabular-nums", pnLTone)}>
            {formatPnL(intel.pnLToday)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-4 border-t border-border/40 pt-4">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Max Daily Loss
        </span>
        <RBar
          current={dailyUsage}
          max={dailyMax}
          percent={dailyPercent}
          variant="rose"
          breached={dailyBreached}
          breachedLabel="Daily loss limit breached"
        />
      </div>

      <button
        type="button"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        Risk Limits
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
