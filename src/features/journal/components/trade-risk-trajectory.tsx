import {
  ArrowDownRight,
  ArrowUpRight,
  Flag,
  Move,
  PlusCircle,
  Shield,
  type LucideIcon,
} from "lucide-react";

import {
  BEHAVIOR_EVENT_TYPES,
  type BehaviorEventType,
} from "@/lib/behavior-events";
import { cn } from "@/lib/utils";
import type { BehaviorEvent, ClosedTrade } from "@/types";

// SECTION — Risk Trajectory
//
// Forensic rail of every moment risk meaningfully changed inside this
// trade: original approval → stop widenings → size adds → close. Reads
// as a behavioral escalation log — clean trades show baseline → close
// and nothing in between; sloppy trades surface every drift.

type RailEntry = {
  id: string;
  kind: "baseline" | "escalation" | "tighten" | "close";
  timestamp: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: "info" | "caution" | "warning" | "neutral";
};

const TONE_DOT: Record<RailEntry["tone"], string> = {
  info: "bg-emerald-400",
  caution: "bg-amber-400",
  warning: "bg-rose-400",
  neutral: "bg-foreground/40",
};

const TONE_RING: Record<RailEntry["tone"], string> = {
  info: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  caution: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  warning: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  neutral: "bg-foreground/[0.05] text-foreground/80 ring-white/10",
};

const ESCALATION_TYPES: ReadonlySet<BehaviorEventType> = new Set([
  BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
]);

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatR(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}R`;
}

function iconAndDetailForEvent(
  event: BehaviorEvent,
): { icon: LucideIcon; title: string; detail: string } {
  switch (event.eventType) {
    case BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER:
      return {
        icon: Move,
        title: "Stop widened",
        detail:
          event.displayDescription ||
          "Invalidation level extended further from entry.",
      };
    case BEHAVIOR_EVENT_TYPES.STOP_TIGHTENED:
      return {
        icon: Move,
        title: "Stop tightened",
        detail:
          event.displayDescription ||
          "Invalidation level pulled in toward entry.",
      };
    case BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED:
      return {
        icon: PlusCircle,
        title: "Size increased",
        detail:
          event.displayDescription ||
          "Position size added above the approved baseline.",
      };
    case BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED:
      return {
        icon: ArrowUpRight,
        title: "Risk exposure increased",
        detail:
          event.displayDescription ||
          "Total dollar risk rose above the approved baseline.",
      };
    case BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED:
      return {
        icon: Flag,
        title: "Excessive adds",
        detail:
          event.displayDescription ||
          "Repeated adds detected during the trade.",
      };
    default:
      return {
        icon: Flag,
        title: event.displayTitle || "Risk event",
        detail:
          event.displayDescription ||
          event.eventType.replace(/_/g, " "),
      };
  }
}

export function buildRiskTrajectory(
  trade: ClosedTrade,
  behaviorEvents: BehaviorEvent[],
): RailEntry[] {
  const entries: RailEntry[] = [];

  entries.push({
    id: `baseline-${trade.id}`,
    kind: "baseline",
    timestamp: trade.approvedAt,
    title: "Baseline at approval",
    detail:
      trade.originalRisk != null && Number.isFinite(trade.originalRisk)
        ? `Original risk ${formatMoney(trade.originalRisk)} · size ${trade.positionSize.toLocaleString("en-US")}`
        : `Size ${trade.positionSize.toLocaleString("en-US")} · original risk unavailable (override entry)`,
    icon: Shield,
    tone: "info",
  });

  for (const e of behaviorEvents) {
    if (!ESCALATION_TYPES.has(e.eventType as BehaviorEventType)) {
      // Allow tightenings to also surface — they're recovery moves and
      // worth showing as positive context.
      if (e.eventType === BEHAVIOR_EVENT_TYPES.STOP_TIGHTENED) {
        const meta = iconAndDetailForEvent(e);
        entries.push({
          id: `evt-${e.id}`,
          kind: "tighten",
          timestamp: e.timestamp,
          title: meta.title,
          detail: meta.detail,
          icon: meta.icon,
          tone: "info",
        });
      }
      continue;
    }
    const meta = iconAndDetailForEvent(e);
    // Stop widening is more behaviorally severe than a size add; mark
    // it warning. Risk-exposure-increased + excessive adds also warning;
    // plain size increase reads as caution.
    const tone: RailEntry["tone"] =
      e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER ||
      e.eventType === BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED
        ? "warning"
        : "caution";
    entries.push({
      id: `evt-${e.id}`,
      kind: "escalation",
      timestamp: e.timestamp,
      title: meta.title,
      detail: meta.detail,
      icon: meta.icon,
      tone,
    });
  }

  const closeDetail =
    trade.outcome === "loss"
      ? `Loss · ${formatR(trade.realizedR)} · ${formatMoney(trade.realizedPnL)}`
      : trade.outcome === "win"
        ? `Win · ${formatR(trade.realizedR)} · ${formatMoney(trade.realizedPnL)}`
        : `Breakeven · ${formatR(trade.realizedR)} · ${formatMoney(trade.realizedPnL)}`;

  entries.push({
    id: `close-${trade.id}`,
    kind: "close",
    timestamp: trade.closedAt,
    title: "Trade closed",
    detail: closeDetail,
    icon: trade.outcome === "loss" ? ArrowDownRight : ArrowUpRight,
    tone: "neutral",
  });

  entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  return entries;
}

export function TradeRiskTrajectory({
  trade,
  behaviorEvents,
}: {
  trade: ClosedTrade;
  behaviorEvents: BehaviorEvent[];
}) {
  const entries = buildRiskTrajectory(trade, behaviorEvents);
  // Two entries (baseline + close) = no escalations. Render a compact
  // "no escalations" affordance instead of the full rail.
  const escalationCount = entries.filter(
    (e) => e.kind === "escalation" || e.kind === "tighten",
  ).length;

  return (
    <section
      aria-label="Risk trajectory"
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/40 p-5 backdrop-blur"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Risk Trajectory
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/60">
          {escalationCount === 0
            ? "No escalations"
            : `${escalationCount} change${escalationCount === 1 ? "" : "s"} during the trade`}
        </span>
      </div>

      <ol className="flex flex-col">
        {entries.map((entry, idx) => {
          const isLast = idx === entries.length - 1;
          const Icon = entry.icon;
          return (
            <li key={entry.id} className="flex gap-3">
              <div className="relative flex w-12 shrink-0 flex-col items-end pt-1 leading-tight">
                <span className="text-[0.65rem] tabular-nums text-muted-foreground">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <div className="relative flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full ring-1",
                    TONE_RING[entry.tone],
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                {/* Connecting rail between markers. */}
                {!isLast ? (
                  <span
                    className={cn(
                      "mt-1 w-px flex-1 bg-gradient-to-b from-white/10 to-white/[0.02]",
                      "min-h-4",
                    )}
                  />
                ) : null}
              </div>
              <div
                className={cn(
                  "flex flex-1 flex-col gap-0.5 pb-3 leading-tight",
                  isLast && "pb-0",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      TONE_DOT[entry.tone],
                    )}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {entry.title}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {entry.detail}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
