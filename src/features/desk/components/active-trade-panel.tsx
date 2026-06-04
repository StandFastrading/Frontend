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
  Target,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import type {
  ActiveTrade,
  DeviationSeverity,
  InterventionRecommendation,
  MonitoringEvent,
} from "@/types";
import {
  aggregateDeviationsByFamily,
  summarizeGroupCount,
  type DeviationFamilyGroup,
} from "@/lib/monitoring/deviation-aggregation";
import {
  useCurrentSessionMonitoringEvents,
  useCurrentSessionTrades,
} from "@/lib/sessions/session-helpers";
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
  // Session-scoped reads — the active trade card and its deviation /
  // intervention surfaces must never display a record from a prior
  // session. Records carry sessionId; we filter through the same hooks
  // session intelligence + the behavior feed already use. Status filter
  // narrows the current-session set to whatever's still open.
  const { activeTrades } = useCurrentSessionTrades();
  const sessionMonitoringEvents = useCurrentSessionMonitoringEvents();
  const trade = useMemo(
    () => activeTrades.find((t) => t.status === "active") ?? null,
    [activeTrades],
  );

  // Temporary diagnostic — surfaces the exact session-scoped read the panel
  // sees on each render so we can correlate it with the activation-side
  // logs in trade-desk-slice / active-trades-slice. Remove once the
  // post-activate visibility bug is closed.
  if (process.env.NODE_ENV === "development") {
    const rawActiveTrades = useAppStore.getState().activeTrades;
    const rawActiveSessionId = useAppStore.getState().activeSessionId;
    console.log("[debug:activate] ActiveTradePanel render", {
      hookActiveTradesCount: activeTrades.length,
      hookActiveTrades: activeTrades.map((t) => ({
        id: t.id,
        status: t.status,
        sessionId: t.sessionId ?? null,
        tradingDate: t.tradingDate ?? null,
      })),
      foundActiveTrade: trade != null,
      foundTradeId: trade?.id ?? null,
      foundTradeStatus: trade?.status ?? null,
      rawStoreActiveTradesCount: rawActiveTrades.length,
      rawStoreActiveTrades: rawActiveTrades.map((t) => ({
        id: t.id,
        status: t.status,
        sessionId: t.sessionId ?? null,
        tradingDate: t.tradingDate ?? null,
      })),
      rawStoreActiveSessionId: rawActiveSessionId,
      willRender: trade ? "ActiveState" : "EmptyState",
    });
  }
  const moveStop = useAppStore((s) => s.moveStop);
  const moveTarget = useAppStore((s) => s.moveTarget);
  const addPosition = useAppStore((s) => s.addPosition);
  const partialExit = useAppStore((s) => s.partialExit);
  const markMistake = useAppStore((s) => s.markMistake);
  const logExit = useAppStore((s) => s.logExit);

  const [modalMode, setModalMode] = useState<ActiveTradeActionMode | null>(
    null,
  );

  // Trade-scoped narrowing. Already session-filtered above; the tradeId
  // filter keeps the deviation/intervention surfaces tied to the trade
  // that's actually being shown.
  const events = useMemo(
    () =>
      trade
        ? sessionMonitoringEvents.filter((e) => e.tradeId === trade.id)
        : [],
    [sessionMonitoringEvents, trade],
  );

  if (!trade) return <EmptyState />;

  const recommendations = events[0]?.recommendations ?? [];

  const handleSubmit = (payload: ActiveTradeActionSubmit) => {
    switch (payload.mode) {
      case "move_stop":
        moveStop(trade.id, payload.newStopPrice, payload.reason);
        toast.success("Stop updated — decision context captured");
        break;
      case "move_target":
        moveTarget(trade.id, payload.newTargetPrice, payload.reason);
        toast.success("Target updated — decision context captured");
        break;
      case "add_position":
        addPosition(
          trade.id,
          payload.additionalSize,
          payload.addedAtPrice,
        );
        toast.success("Add logged — exposure recalculated");
        break;
      case "take_partial_profit":
        partialExit(
          trade.id,
          payload.sizeReduced,
          payload.exitPrice,
          payload.note,
        );
        toast.success("Partial profit logged — remaining position updated");
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
          payload.exitReason,
          payload.exitNotes,
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

      {/* Deviation event timeline — family-aggregated to keep the
          fatigue protection layer coherent. The raw events stay
          untouched in the store and in the Trade Detail View; this
          card collapses consecutive same-family / same-severity
          events into one evolving group so repeated stop widenings
          surface as ONE escalating arc, not N stacked cards. */}
      {events.length > 0 ? (
        <DeviationTimeline trade={trade} events={events} />
      ) : null}

      {/* Action row */}
      {/* Trade Management — partial profits, stop / target moves, and
          adds. Behavioral data capture lives here: every action carries
          decision-context metadata (reason / note) onto the monitoring
          event for future analytics. */}
      <div className="flex flex-col gap-2">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Trade Management
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ActiveAction
            icon={TrendingDown}
            label="Take Partial Profit"
            onClick={() => onAction("take_partial_profit")}
          />
          <ActiveAction
            icon={Move}
            label="Move Stop"
            onClick={() => onAction("move_stop")}
          />
          <ActiveAction
            icon={Target}
            label="Move Target"
            onClick={() => onAction("move_target")}
          />
          <ActiveAction
            icon={PlusCircle}
            label="Add Position"
            onClick={() => onAction("add_position")}
          />
        </div>
      </div>

      {/* Session Controls — terminal trade actions (Log Exit archives
          the trade; Mark Mistake flags it for behavioral review). Kept
          separate from management so the trader sees the end-state
          actions distinctly from the in-trade adjustments. */}
      <div className="flex flex-col gap-2">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Session Controls
        </span>
        <div className="grid grid-cols-2 gap-2">
          <ActiveAction
            icon={LogOut}
            label="Log Exit"
            onClick={() => onAction("log_exit")}
          />
          <ActiveAction
            icon={Flag}
            label="Mark Mistake"
            onClick={() => onAction("mark_mistake")}
            tone="rose"
          />
        </div>
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
  const currentTarget = trade.currentTargetPrice ?? trade.targetPrice;
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
        current={
          currentTarget !== trade.targetPrice
            ? formatPrice(currentTarget)
            : null
        }
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

function DeviationTimeline({
  trade,
  events,
}: {
  trade: ActiveTrade;
  events: MonitoringEvent[];
}) {
  const groups = useMemo(
    () => aggregateDeviationsByFamily(trade, events),
    [trade, events],
  );
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Deviation Events
      </span>
      <ul className="flex flex-col gap-2">
        {groups.slice(0, 5).map((group) => (
          <DeviationGroupCard
            key={group.groupId}
            group={group}
            events={events}
          />
        ))}
      </ul>
      {groups.length > 5 ? (
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

function DeviationGroupCard({
  group,
  events,
}: {
  group: DeviationFamilyGroup;
  events: MonitoringEvent[];
}) {
  const Icon = SEVERITY_ICON[group.severity];
  // Look up the underlying events for the expandable history. The
  // aggregator preserves chronological event ids, so the history is
  // ordered exactly the way the trader produced the moves.
  const groupEvents = useMemo(() => {
    const map = new Map(events.map((e) => [e.id, e]));
    return group.eventIds
      .map((id) => map.get(id))
      .filter((e): e is MonitoringEvent => e != null);
  }, [events, group.eventIds]);

  const showProgression =
    group.riskProgression.firstRiskPerShare != null &&
    group.riskProgression.latestRiskPerShare != null &&
    group.riskProgression.firstRiskPerShare !==
      group.riskProgression.latestRiskPerShare;

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg ring-1 px-3 py-2.5",
        SEVERITY_RING[group.severity],
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-1 flex-col gap-0.5 leading-tight">
          <span className="text-sm font-semibold">
            {group.familyLabel} active
          </span>
          <span className="text-xs opacity-90">
            {summarizeGroupCount(group)} · last updated{" "}
            {formatTime(group.latestAt)}
          </span>
        </div>
        <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] ring-1 ring-white/10">
          {SEVERITY_LABEL[group.severity]}
        </span>
      </div>

      {showProgression ? (
        <span className="text-xs opacity-90">
          Risk/share expanded from{" "}
          <span className="font-semibold tabular-nums">
            {group.riskProgression.firstRiskPerShare?.toFixed(2)}
          </span>{" "}
          →{" "}
          <span className="font-semibold tabular-nums">
            {group.riskProgression.latestRiskPerShare?.toFixed(2)}
          </span>
        </span>
      ) : null}

      <span className="text-xs opacity-80">
        Latest change · {group.latestHeadline}
      </span>

      {group.eventCount > 1 ? (
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground/80">
            <ArrowRight className="size-3 transition-transform group-open:rotate-90" />
            View {group.eventCount} step
            {group.eventCount === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1 pl-4 text-[0.7rem] text-muted-foreground">
            {groupEvents.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="tabular-nums">{formatTime(e.timestamp)}</span>
                <span className="opacity-80">·</span>
                <span className="flex-1 opacity-90">
                  {e.deviations[0]?.description ?? describeUpdate(e.update)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

function describeUpdate(update: MonitoringEvent["update"]): string {
  switch (update.type) {
    case "move_stop":
      return `Stop set to ${update.newStopPrice}`;
    case "move_target":
      return `Target set to ${update.newTargetPrice}`;
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

