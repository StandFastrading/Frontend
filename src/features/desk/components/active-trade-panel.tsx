"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Flag,
  Info,
  LogOut,
  Move,
  PlusCircle,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import type {
  ActiveTrade,
  DeviationSeverity,
  InterventionRecommendation,
  MonitoringEvent,
} from "@/types";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import {
  ActiveTradeActionModal,
  type ActiveTradeActionMode,
  type ActiveTradeActionSubmit,
} from "@/features/desk/components/active-trade-action-modal";

// Active Trade Monitoring panel. Three states:
//  1. No active trade → empty placeholder.
//  2. Active trade, no monitoring events yet → plan + current snapshot, no
//     deviation list, action buttons enabled.
//  3. Active trade with monitoring history → plan + current + deviation
//     events + intervention recommendations banner.
//
// The panel never *enforces* anything. The four action buttons launch the
// unified ActiveTradeActionModal; submission routes through the centralized
// slice actions, which call the Behavior Deviation Engine and append events.

// Format helpers accept `undefined` explicitly so older persisted records or
// any caller passing a missing field renders as "—" instead of crashing on a
// `.toLocaleString` / `.toFixed` call. `value == null` matches both null and
// undefined in JS so a single early-return covers both.
function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function formatRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} : 1`;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

// Position size formatter — used in the header where the value should
// always exist on a healthy record but might be missing on an older one.
function formatSize(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const SEVERITY_RING: Record<DeviationSeverity, string> = {
  info: "ring-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300",
  caution: "ring-amber-500/40 bg-amber-500/[0.08] text-amber-300",
  elevated: "ring-rose-500/40 bg-rose-500/[0.08] text-rose-300",
  critical: "ring-rose-500/60 bg-rose-500/[0.12] text-rose-200",
};

const SEVERITY_ICON: Record<DeviationSeverity, LucideIcon> = {
  info: Info,
  caution: AlertTriangle,
  elevated: AlertTriangle,
  critical: ShieldAlert,
};

const SEVERITY_LABEL: Record<DeviationSeverity, string> = {
  info: "Info",
  caution: "Caution",
  elevated: "Elevated",
  critical: "Critical",
};

export function ActiveTradePanel() {
  // Only render the most recent *active* (not closed) trade. Multi-position
  // monitoring lands when broker integration arrives.
  const trade = useAppStore(
    (s) => s.activeTrades.find((t) => t.status === "active") ?? null,
  );
  const monitoringEvents = useAppStore((s) => s.monitoringEvents);
  const moveStop = useAppStore((s) => s.moveStop);
  const addPosition = useAppStore((s) => s.addPosition);
  const markMistake = useAppStore((s) => s.markMistake);
  const logExit = useAppStore((s) => s.logExit);

  const [modalMode, setModalMode] = useState<ActiveTradeActionMode | null>(
    null,
  );

  const events = useMemo(
    () =>
      trade ? monitoringEvents.filter((e) => e.tradeId === trade.id) : [],
    [monitoringEvents, trade],
  );

  if (!trade) return <EmptyState />;

  const recommendations = events[0]?.recommendations ?? [];

  const handleSubmit = (payload: ActiveTradeActionSubmit) => {
    switch (payload.mode) {
      case "move_stop":
        moveStop(trade.id, payload.newStopPrice);
        toast.success("Stop updated — deviation analysis logged");
        break;
      case "add_position":
        addPosition(
          trade.id,
          payload.additionalSize,
          payload.addedAtPrice,
        );
        toast.success("Add logged — exposure recalculated");
        break;
      case "mark_mistake":
        markMistake(trade.id, payload.note);
        toast.success("Mistake logged for review");
        break;
      case "log_exit":
        logExit(
          trade.id,
          payload.exitPrice,
          payload.outcome,
          payload.reflection,
        );
        // Outcome-specific toast so the feedback reads like the headline
        // behavior event ("Winning trade closed" etc.).
        if (payload.outcome === "win") {
          toast.success("Winning trade closed — archived to Trade History");
        } else if (payload.outcome === "loss") {
          toast.warning("Losing trade closed — archived to Trade History");
        } else {
          toast.success("Breakeven trade closed — archived to Trade History");
        }
        break;
    }
  };

  return (
    <>
      <ActiveState
        trade={trade}
        events={events}
        recommendations={recommendations}
        onAction={setModalMode}
      />
      <ActiveTradeActionModal
        open={modalMode != null}
        mode={modalMode}
        trade={trade}
        onClose={() => setModalMode(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-dashed border-white/15 bg-card/40 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Active Trade Monitoring
        </span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          No Active Trade
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-background/30 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-muted-foreground ring-1 ring-white/10">
          <Activity className="size-4" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Once a trade receives StandFast approval and you mark it active, the
          plan + risk frozen at approval will appear here, along with any
          deviations from that plan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DisabledAction icon={LogOut} label="Log Exit" />
        <DisabledAction icon={Move} label="Move Stop" />
        <DisabledAction icon={PlusCircle} label="Add Position" />
        <DisabledAction icon={Flag} label="Mark Mistake" />
      </div>
    </div>
  );
}

function ActiveState({
  trade,
  events,
  recommendations,
  onAction,
}: {
  trade: ActiveTrade;
  events: MonitoringEvent[];
  recommendations: InterventionRecommendation[];
  onAction: (mode: ActiveTradeActionMode) => void;
}) {
  const DirectionIcon =
    trade.direction === "Long" ? ArrowUpRight : ArrowDownRight;
  const directionTone =
    trade.direction === "Long"
      ? "text-emerald-300 ring-emerald-500/40 bg-emerald-500/15"
      : "text-rose-300 ring-rose-500/40 bg-rose-500/15";

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Active Trade Monitoring
        </span>
        {trade.approvalStatus === "approved_with_warnings" ? (
          <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-300">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/60" />
              <span className="relative size-2 rounded-full bg-amber-400" />
            </span>
            Trade activated with acknowledged warnings
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative size-2 rounded-full bg-emerald-400" />
            </span>
            Trade activated · Manual confirmation
          </span>
        )}
      </div>

      {/* Acknowledged warnings preserved from the rule check the trader
          chose to override. Surfaced as a distinct amber section so the
          original rationale stays visible throughout the trade's life. */}
      {trade.approvalStatus === "approved_with_warnings" &&
      trade.approvalWarnings.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Acknowledged Warnings
          </span>
          <ul className="flex flex-col gap-2">
            {trade.approvalWarnings.map((w) => (
              <li
                key={w.id}
                className="flex items-start gap-3 rounded-lg ring-1 ring-amber-500/40 bg-amber-500/[0.08] px-3 py-2.5"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <div className="flex flex-col gap-0.5 leading-tight">
                  <span className="text-sm font-semibold text-amber-200">
                    {w.label}
                  </span>
                  {w.message ? (
                    <span className="text-xs text-amber-200/80">
                      {w.message}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Header: symbol + direction + size */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/30 p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md ring-1",
              directionTone,
            )}
          >
            <DirectionIcon className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold text-foreground">
              {trade.symbol || "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {trade.direction} · {trade.marketType}
              {trade.setupType ? ` · ${trade.setupType}` : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {/* Older persisted records may have no `currentPositionSize`; fall
                back to the baseline `positionSize` so the header always
                renders. `formatSize` returns "—" if both are missing. */}
            {formatSize(trade.currentPositionSize ?? trade.positionSize)}
            {trade.currentPositionSize != null &&
            trade.positionSize != null &&
            trade.currentPositionSize !== trade.positionSize ? (
              <span className="ml-2 text-[0.7rem] font-normal text-muted-foreground">
                (orig {formatSize(trade.positionSize)})
              </span>
            ) : null}
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Position Size
          </span>
        </div>
      </div>

      {/* Plan vs current price grid */}
      <PlanVsCurrentGrid trade={trade} />

      {/* Risk grid */}
      <RiskGrid trade={trade} />

      {/* Mistake flag */}
      {trade.mistakeFlagged ? (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3">
          <Flag className="mt-0.5 size-4 shrink-0 text-rose-300" />
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="text-sm font-semibold text-rose-200">
              Trade flagged as mistake
            </span>
            {trade.mistakeNote ? (
              <span className="text-xs text-rose-200/80">
                {trade.mistakeNote}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Intervention recommendations banner (newest event's recs) */}
      {recommendations.length > 0 ? (
        <RecommendationsBanner recommendations={recommendations} />
      ) : null}

      {/* Deviation event timeline */}
      {events.length > 0 ? <DeviationTimeline events={events} /> : null}

      {/* Action row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ActiveAction
          icon={LogOut}
          label="Log Exit"
          onClick={() => onAction("log_exit")}
        />
        <ActiveAction
          icon={Move}
          label="Move Stop"
          onClick={() => onAction("move_stop")}
        />
        <ActiveAction
          icon={PlusCircle}
          label="Add Position"
          onClick={() => onAction("add_position")}
        />
        <ActiveAction
          icon={Flag}
          label="Mark Mistake"
          onClick={() => onAction("mark_mistake")}
          tone="rose"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Approved · {formatTime(trade.approvedAt)}</span>
        <span>Marked Active · {formatTime(trade.activatedAt)}</span>
      </div>
    </div>
  );
}

function PlanVsCurrentGrid({ trade }: { trade: ActiveTrade }) {
  // Fall back to baseline when the current-state field is missing — older
  // persisted records may not have these even after the migration if a
  // baseline value itself was missing. `formatPrice` then renders "—".
  const currentEntry = trade.currentAvgEntry ?? trade.entryPrice;
  const currentStop = trade.currentStopPrice ?? trade.stopPrice;
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat
        label="Entry"
        baseline={formatPrice(trade.entryPrice)}
        current={
          currentEntry !== trade.entryPrice ? formatPrice(currentEntry) : null
        }
      />
      <Stat
        label="Stop"
        baseline={formatPrice(trade.stopPrice)}
        current={
          currentStop !== trade.stopPrice ? formatPrice(currentStop) : null
        }
        currentTone="rose"
      />
      <Stat
        label="Target"
        baseline={formatPrice(trade.targetPrice)}
        currentTone="emerald"
      />
    </div>
  );
}

function RiskGrid({ trade }: { trade: ActiveTrade }) {
  const currentRisk = trade.currentRisk ?? trade.originalRisk;
  const currentAccountRiskPercent =
    trade.currentAccountRiskPercent ?? trade.accountRiskPercent;
  const currentRewardRiskRatio =
    trade.currentRewardRiskRatio ?? trade.rewardRiskRatio;

  const riskIncreased =
    currentRisk != null &&
    trade.originalRisk != null &&
    currentRisk > trade.originalRisk;
  const rrDegraded =
    trade.rewardRiskRatio != null &&
    currentRewardRiskRatio != null &&
    currentRewardRiskRatio < trade.rewardRiskRatio;

  return (
    <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-4">
      <Stat
        label="Risk ($)"
        baseline={formatCurrency(trade.originalRisk)}
        current={
          currentRisk !== trade.originalRisk
            ? formatCurrency(currentRisk)
            : null
        }
        currentTone={riskIncreased ? "rose" : "emerald"}
      />
      <Stat
        label="Account at Risk"
        baseline={formatPercent(trade.accountRiskPercent)}
        current={
          currentAccountRiskPercent !== trade.accountRiskPercent
            ? formatPercent(currentAccountRiskPercent)
            : null
        }
        currentTone={riskIncreased ? "rose" : "emerald"}
      />
      <Stat
        label="Reward : Risk"
        baseline={formatRatio(trade.rewardRiskRatio)}
        current={
          currentRewardRiskRatio !== trade.rewardRiskRatio
            ? formatRatio(currentRewardRiskRatio)
            : null
        }
        currentTone={rrDegraded ? "amber" : "emerald"}
      />
    </div>
  );
}

function RecommendationsBanner({
  recommendations,
}: {
  recommendations: InterventionRecommendation[];
}) {
  // Show up to 2 recs (highest severity first — engine already sorted).
  const visible = recommendations.slice(0, 2);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Intervention Recommendations
      </span>
      {visible.map((rec) => {
        const Icon = SEVERITY_ICON[rec.severity];
        return (
          <div
            key={rec.id}
            className={cn(
              "flex items-start gap-3 rounded-lg ring-1 px-3 py-2.5",
              SEVERITY_RING[rec.severity],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-1 flex-col gap-0.5 leading-tight">
              <span className="text-sm font-semibold">{rec.title}</span>
              <span className="text-xs opacity-90">{rec.body}</span>
            </div>
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] ring-1 ring-white/10">
              {SEVERITY_LABEL[rec.severity]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DeviationTimeline({ events }: { events: MonitoringEvent[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Deviation Events
      </span>
      <ul className="flex flex-col gap-2">
        {events.slice(0, 5).map((event) => {
          const Icon = SEVERITY_ICON[event.severity];
          const headline =
            event.deviations[0]?.description ??
            describeUpdate(event.update);
          return (
            <li
              key={event.id}
              className={cn(
                "flex items-start gap-3 rounded-lg ring-1 px-3 py-2.5",
                SEVERITY_RING[event.severity],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="flex flex-1 flex-col gap-0.5 leading-tight">
                <span className="text-sm font-semibold">{headline}</span>
                <span className="text-xs opacity-90">
                  {formatTime(event.timestamp)} · {event.deviations.length}{" "}
                  deviation{event.deviations.length === 1 ? "" : "s"}
                </span>
              </div>
              <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] ring-1 ring-white/10">
                {SEVERITY_LABEL[event.severity]}
              </span>
            </li>
          );
        })}
      </ul>
      {events.length > 5 ? (
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
        >
          View Full Deviation Log
          <ArrowRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function describeUpdate(update: MonitoringEvent["update"]): string {
  switch (update.type) {
    case "move_stop":
      return `Stop set to ${update.newStopPrice}`;
    case "add_position":
      return `Added ${update.additionalSize} at ${update.addedAtPrice}`;
    case "partial_exit":
      return `Reduced ${update.sizeReduced} at ${update.exitPrice}`;
    case "mark_mistake":
      return "Mistake flagged";
    case "log_exit":
      return `Exited at ${update.exitPrice} (${update.outcome})`;
  }
}

function Stat({
  label,
  baseline,
  current,
  currentTone = "default",
}: {
  label: string;
  baseline: string;
  current?: string | null;
  currentTone?: "default" | "rose" | "emerald" | "amber";
}) {
  const toneClass =
    currentTone === "rose"
      ? "text-rose-300"
      : currentTone === "emerald"
        ? "text-emerald-300"
        : currentTone === "amber"
          ? "text-amber-300"
          : "text-foreground";
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-background/30 p-3">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-base font-semibold tabular-nums leading-none",
            current ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {baseline}
        </span>
        {current ? (
          <span
            className={cn(
              "text-base font-semibold tabular-nums leading-none",
              toneClass,
            )}
          >
            → {current}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ActiveAction({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "default" | "rose";
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/[0.08]"
      : "border-white/10 hover:border-white/20 hover:bg-foreground/5";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-background/30 px-3 py-3 text-xs font-semibold text-foreground transition-colors",
        toneClass,
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function DisabledAction({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled
      title="Becomes available once a trade is marked active"
      className="flex cursor-not-allowed flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-background/30 px-3 py-3 text-xs font-semibold text-muted-foreground"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

