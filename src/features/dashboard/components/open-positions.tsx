"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Flag,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { ActiveTrade, MarketType } from "@/types";
import { useCurrentSessionTrades } from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

// Live mirror of the Trade Desk's Active Trade Monitoring system. Reads
// through `useCurrentSessionTrades` so the panel only ever shows trades
// stamped with the active session id — a Start New Session empties this
// tile even if a prior session's record is still in the persisted
// archive. The hook memoizes its return so no array identity churn.
// Status filter is still applied: the store also guarantees the list
// contains only OPEN trades (logExit archives to closedTrades; the
// persist `merge` hook drops any `status: "closed"` record on hydration),
// so anything `t.status === "active"` is safe to render directly.

function formatR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}R`;
}

function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

// Position size formatter that picks the noun by market type so the panel
// reads naturally ("2 Contracts" / "100 Shares" / "1.5 Units") instead of a
// bare number.
function formatSize(
  value: number | null | undefined,
  market: MarketType,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const noun =
    market === "Futures" || market === "Options"
      ? value === 1
        ? "Contract"
        : "Contracts"
      : market === "Forex"
        ? value === 1
          ? "Lot"
          : "Lots"
        : market === "Crypto"
          ? "Units"
          : value === 1
            ? "Share"
            : "Shares";
  return `${value.toLocaleString("en-US")} ${noun}`;
}

type BehavioralFlag = {
  label: string;
  tone: "rose" | "amber";
  icon: LucideIcon;
};

// Dominant behavioral signal for a single trade, derived from the fields the
// deviation engine already mutates. Precedence matches the Trade Desk panel:
//   mistake > risk drift > warning override.
function behavioralFlagFor(trade: ActiveTrade): BehavioralFlag | null {
  if (trade.mistakeFlagged) {
    return { label: "Mistake flagged", tone: "rose", icon: Flag };
  }
  if (
    trade.currentRisk != null &&
    trade.originalRisk != null &&
    trade.currentRisk > trade.originalRisk
  ) {
    return { label: "Risk drifted up", tone: "amber", icon: ShieldAlert };
  }
  if (trade.approvalStatus === "approved_with_warnings") {
    return {
      label: "Entered with warnings",
      tone: "amber",
      icon: AlertTriangle,
    };
  }
  return null;
}

// "R at risk" = current open risk relative to the original conviction-priced
// risk. Stop moved to breakeven → 0R. Stop tightened → < 1R. Stop widened →
// > 1R. Returns null when the trade was activated without a defined stop
// (override path) — `originalRisk` is null there and the math can't be
// computed honestly.
function rAtRisk(trade: ActiveTrade): number | null {
  const cur = trade.currentRisk ?? trade.originalRisk;
  const baseline = trade.originalRisk;
  if (cur == null || baseline == null || baseline === 0) return null;
  return cur / baseline;
}

function rTone(r: number | null): string {
  if (r == null) return "text-muted-foreground";
  if (r > 1) return "text-rose-300";
  if (r === 0) return "text-emerald-300";
  return "text-foreground";
}

export function OpenPositions() {
  // Session-scoped — mirrors the Trade Desk's Active Trade Monitoring
  // panel, which now also filters by activeSessionId. A new session
  // empties this tile until the trader marks something active under
  // the new session id.
  const { activeTrades } = useCurrentSessionTrades();
  const accountSize = useAppStore((s) => s.riskRules.accountSize);

  const openTrades = activeTrades.filter((t) => t.status === "active");

  if (openTrades.length === 0) {
    return <EmptyState />;
  }

  const totalOpenRiskDollars = openTrades.reduce(
    (sum, t) => sum + (t.currentRisk ?? t.originalRisk ?? 0),
    0,
  );
  const totalAccountRiskPercent =
    accountSize > 0 ? (totalOpenRiskDollars / accountSize) * 100 : 0;
  const combinedR = openTrades.reduce((sum, t) => {
    const r = rAtRisk(t);
    return r != null ? sum + r : sum;
  }, 0);
  const combinedRTone =
    combinedR > openTrades.length
      ? "text-rose-300"
      : combinedR === 0
        ? "text-emerald-300"
        : "text-foreground";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col leading-tight">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Open Positions
          </span>
          <span className="text-[0.65rem] tracking-[0.05em] text-muted-foreground/70">
            Current risk exposure
          </span>
        </div>
        <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-foreground ring-1 ring-white/10 tabular-nums">
          {openTrades.length} Live
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {openTrades.map((trade) => {
          const flag = behavioralFlagFor(trade);
          const r = rAtRisk(trade);
          const size = trade.currentPositionSize ?? trade.positionSize;
          return (
            <li
              key={trade.id}
              className="flex flex-col gap-2 rounded-lg border border-white/10 bg-background/30 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-foreground">
                    {trade.symbol || "—"}
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground">
                    {trade.direction} · {formatSize(size, trade.marketType)}
                  </span>
                </div>
                <div className="flex flex-col items-end leading-tight">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      rTone(r),
                    )}
                  >
                    {r == null ? "—" : `${r.toFixed(2)}R`}
                  </span>
                  <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
                    At Risk
                  </span>
                </div>
              </div>

              {flag ? (
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] ring-1",
                    flag.tone === "rose"
                      ? "bg-rose-500/[0.08] text-rose-300 ring-rose-500/30"
                      : "bg-amber-500/[0.08] text-amber-300 ring-amber-500/30",
                  )}
                >
                  <flag.icon className="size-3" />
                  {flag.label}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <dl className="flex flex-col gap-1.5 border-t border-border/40 pt-3">
        <div className="flex items-baseline justify-between">
          <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Combined R Exposure
          </dt>
          <dd
            className={cn(
              "text-sm font-semibold tabular-nums",
              combinedRTone,
            )}
          >
            {formatR(combinedR)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between text-xs">
          <dt className="text-muted-foreground">Account at risk</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {formatPercent(totalAccountRiskPercent)}
          </dd>
        </div>
      </dl>

      <Link
        href="/desk"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        Open in Trade Desk
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-white/15 bg-card/40 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col leading-tight">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Open Positions
          </span>
          <span className="text-[0.65rem] tracking-[0.05em] text-muted-foreground/70">
            Current risk exposure
          </span>
        </div>
        <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground ring-1 ring-white/10">
          Flat
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-background/30 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
          <ShieldCheck className="size-4" />
        </span>
        <div className="flex flex-col gap-1 leading-tight">
          <span className="text-sm font-semibold text-foreground">
            No active risk exposure
          </span>
          <span className="text-xs text-muted-foreground">
            No open positions are currently affecting your decision state.
          </span>
        </div>
      </div>
    </div>
  );
}
