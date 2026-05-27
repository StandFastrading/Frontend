import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import { detectDeviations } from "@/lib/monitoring/behavior-deviation-engine";
import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import type {
  ActiveTrade,
  ActiveTradeExitOutcome,
  ActiveTradeUpdate,
  BehaviorEvent,
  ClosedTrade,
  MonitoringEvent,
} from "@/types";
import type { SliceCreator } from "@/store/types";

// Trades the trader has confirmed they entered + the action thunks that
// mutate them. Every action routes through the Behavior Deviation Engine —
// the engine produces a `MonitoringEvent` (append into monitoringEvents)
// AND a high-level `BehaviorEvent` (append into the behavior feed).
//
// The slice does not validate inputs (e.g. that newStopPrice is a number) —
// the modals that build the `ActiveTradeUpdate` are responsible for that.

export type ActiveTradesSlice = {
  activeTrades: ActiveTrade[];
  appendActiveTrade: (trade: ActiveTrade) => void;
  removeActiveTrade: (id: string) => void;
  clearActiveTrades: () => void;

  // Deviation-emitting action thunks. Each one:
  //   1. Builds an ActiveTradeUpdate
  //   2. Asks the engine for deviations + recommendations
  //   3. Mutates the trade (currentStopPrice, currentPositionSize, …)
  //   4. Appends a MonitoringEvent to `monitoringEvents`
  //   5. Appends a BehaviorEvent to `behaviorEvents` for the feed
  moveStop: (tradeId: string, newStopPrice: number) => void;
  addPosition: (
    tradeId: string,
    additionalSize: number,
    addedAtPrice: number,
  ) => void;
  partialExit: (
    tradeId: string,
    sizeReduced: number,
    exitPrice: number,
  ) => void;
  markMistake: (tradeId: string, note: string) => void;
  logExit: (
    tradeId: string,
    exitPrice: number,
    outcome: ActiveTradeExitOutcome,
    reflection?: string,
  ) => void;
};

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Short P/L formatter for the closed-trade feed description ("+$120.00" /
// "-$45.50"). Kept in the slice rather than a shared util because it's only
// used here today; if a second consumer shows up, lift it.
function formatPnLForFeed(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Direction-aware risk-per-share, used after every mutation to refresh the
// current* risk numbers the panel renders. `currentStopPrice` may be null on
// override activations — both risk numbers come back null in that case.
function recalcCurrentRisk(trade: ActiveTrade): {
  currentRisk: number | null;
  currentRewardRiskRatio: number | null;
} {
  if (trade.currentStopPrice == null) {
    return { currentRisk: null, currentRewardRiskRatio: null };
  }
  const dir = trade.direction;
  const riskPS =
    dir === "Long"
      ? trade.currentAvgEntry - trade.currentStopPrice
      : trade.currentStopPrice - trade.currentAvgEntry;
  const currentRisk = riskPS * trade.currentPositionSize;
  let currentRewardRiskRatio: number | null = null;
  if (trade.targetPrice != null && riskPS > 0) {
    const rewardPS =
      dir === "Long"
        ? trade.targetPrice - trade.currentAvgEntry
        : trade.currentAvgEntry - trade.targetPrice;
    currentRewardRiskRatio = rewardPS / riskPS;
  }
  return { currentRisk, currentRewardRiskRatio };
}

export const createActiveTradesSlice: SliceCreator<ActiveTradesSlice> = (
  set,
  get,
) => {
  // Runs the Behavior Deviation Engine for the given update, persists the
  // MonitoringEvent + matching BehaviorEvent, and returns the engine output
  // so callers can chain UI feedback off it (toasts, banners, etc.).
  function recordUpdate(
    trade: ActiveTrade,
    update: ActiveTradeUpdate,
  ): MonitoringEvent {
    const { riskRules, monitoringEvents, behaviorEvents } = get();
    const priorEvents = monitoringEvents.filter(
      (e) => e.tradeId === trade.id,
    );
    const engineOutput = detectDeviations({
      trade,
      update,
      riskRules,
      priorEvents,
      behaviorEventLog: behaviorEvents,
    });

    const monitoringEvent: MonitoringEvent = {
      id: genId("mon"),
      tradeId: trade.id,
      timestamp: new Date().toISOString(),
      update,
      deviations: engineOutput.deviations,
      severity: engineOutput.severity,
      recommendations: engineOutput.recommendations,
    };
    get().appendMonitoringEvent(monitoringEvent);

    // Mirror onto the centralized behavior feed using the dominant event
    // type the engine picked. Severity maps: critical/elevated → "fail",
    // caution → "warning", info → "info".
    const feedSeverity =
      engineOutput.severity === "critical" ||
      engineOutput.severity === "elevated"
        ? "fail"
        : engineOutput.severity === "caution"
          ? "warning"
          : "info";

    const feedEvent: BehaviorEvent = {
      id: genId("evt"),
      eventType: engineOutput.primaryEventType,
      displayTitle: engineOutput.displayTitle,
      displayDescription: engineOutput.displayDescription,
      timestamp: monitoringEvent.timestamp,
      source: "trade_desk",
      symbol: trade.symbol || undefined,
      setupType: trade.setupType || undefined,
      direction: trade.direction,
      severity: feedSeverity,
      triggeredRules: engineOutput.deviations.map((d) => ({
        id: d.id,
        label: d.description,
        status: d.severity === "info" ? "warning" : "fail",
      })),
      totalRisk: trade.currentRisk,
      accountRiskPercent: trade.currentAccountRiskPercent,
      metadata: {
        tradeId: trade.id,
        updateType: update.type,
        deviationCount: engineOutput.deviations.length,
      },
    };
    get().appendBehaviorEvent(feedEvent);

    return monitoringEvent;
  }

  // Convenience helper: write back a mutated trade record into activeTrades.
  function replaceTrade(updated: ActiveTrade) {
    set((state) => ({
      activeTrades: state.activeTrades.map((t) =>
        t.id === updated.id ? updated : t,
      ),
    }));
  }

  return {
    activeTrades: [],
    appendActiveTrade: (trade) =>
      set((state) => ({
        activeTrades: [stampWithActiveSession(state, trade), ...state.activeTrades],
      })),
    removeActiveTrade: (id) =>
      set((state) => ({
        activeTrades: state.activeTrades.filter((t) => t.id !== id),
      })),
    clearActiveTrades: () => set(() => ({ activeTrades: [] })),

    moveStop: (tradeId, newStopPrice) => {
      const trade = get().activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;
      recordUpdate(trade, { type: "move_stop", newStopPrice });
      const mutated: ActiveTrade = { ...trade, currentStopPrice: newStopPrice };
      const recalc = recalcCurrentRisk(mutated);
      replaceTrade({
        ...mutated,
        currentRisk: recalc.currentRisk,
        currentAccountRiskPercent:
          recalc.currentRisk != null && get().riskRules.accountSize > 0
            ? (recalc.currentRisk / get().riskRules.accountSize) * 100
            : mutated.currentAccountRiskPercent,
        currentRewardRiskRatio: recalc.currentRewardRiskRatio,
      });
    },

    addPosition: (tradeId, additionalSize, addedAtPrice) => {
      const trade = get().activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;
      recordUpdate(trade, {
        type: "add_position",
        additionalSize,
        addedAtPrice,
      });
      const newSize = trade.currentPositionSize + additionalSize;
      const newAvgEntry =
        (trade.currentAvgEntry * trade.currentPositionSize +
          addedAtPrice * additionalSize) /
        newSize;
      const mutated: ActiveTrade = {
        ...trade,
        currentPositionSize: newSize,
        currentAvgEntry: newAvgEntry,
      };
      const recalc = recalcCurrentRisk(mutated);
      replaceTrade({
        ...mutated,
        currentRisk: recalc.currentRisk,
        currentAccountRiskPercent:
          recalc.currentRisk != null && get().riskRules.accountSize > 0
            ? (recalc.currentRisk / get().riskRules.accountSize) * 100
            : mutated.currentAccountRiskPercent,
        currentRewardRiskRatio: recalc.currentRewardRiskRatio,
      });
    },

    partialExit: (tradeId, sizeReduced, exitPrice) => {
      const trade = get().activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;
      const newSize = Math.max(0, trade.currentPositionSize - sizeReduced);
      recordUpdate(trade, { type: "partial_exit", sizeReduced, exitPrice });
      const mutated: ActiveTrade = {
        ...trade,
        currentPositionSize: newSize,
      };
      const recalc = recalcCurrentRisk(mutated);
      replaceTrade({
        ...mutated,
        currentRisk: recalc.currentRisk,
        currentAccountRiskPercent:
          recalc.currentRisk != null && get().riskRules.accountSize > 0
            ? (recalc.currentRisk / get().riskRules.accountSize) * 100
            : mutated.currentAccountRiskPercent,
        currentRewardRiskRatio: recalc.currentRewardRiskRatio,
      });
    },

    markMistake: (tradeId, note) => {
      const trade = get().activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;
      recordUpdate(trade, { type: "mark_mistake", note });
      replaceTrade({
        ...trade,
        mistakeFlagged: true,
        mistakeNote: note.trim() || null,
      });
    },

    // Full active-trade exit flow. Computes realized P/L + R from the live
    // position, emits the headline TRADE_CLOSED behavior event (title +
    // description tuned per outcome), optionally emits a reflection event,
    // archives the trade into closedTrades, removes it from activeTrades,
    // and updates session counters so dashboard metrics reflect the change.
    logExit: (tradeId, exitPrice, outcome, reflection) => {
      const trade = get().activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;

      // recordUpdate runs the deviation engine + appends the granular
      // TRADE_EXIT_LOGGED event. We follow with the headline TRADE_CLOSED
      // event below so the feed has a clear "closed (W/L/BE)" entry.
      recordUpdate(trade, { type: "log_exit", exitPrice, outcome });

      // Realized P/L is calculated on the position that was actually held
      // at close — `currentPositionSize` and `currentAvgEntry`, which the
      // monitor mutates through partial exits + adds. Falls back to the
      // baseline if those fields are missing on an older record.
      const closingSize = trade.currentPositionSize ?? trade.positionSize;
      const avgEntry = trade.currentAvgEntry ?? trade.entryPrice;
      const pnLPerShare =
        trade.direction === "Long"
          ? exitPrice - avgEntry
          : avgEntry - exitPrice;
      const realizedPnL = pnLPerShare * closingSize;
      // Realized R is null when the trade had no defined original risk
      // (override activations with a missing stop). The dashboard's
      // cumulative-R metric ignores null entries.
      const realizedR =
        trade.originalRisk != null && trade.originalRisk > 0
          ? realizedPnL / trade.originalRisk
          : null;

      const closedAt = new Date().toISOString();
      const note = reflection?.trim() ?? "";

      // Build the normalized archive record. Closed-trade deviation +
      // mistake counts come from the monitoring history for this trade
      // (the archive is what Trade History reads from later).
      const monitoringForTrade = get().monitoringEvents.filter(
        (e) => e.tradeId === trade.id,
      );
      const deviationCount = monitoringForTrade.reduce(
        (n, e) => n + e.deviations.length,
        0,
      );
      const mistakeCount = monitoringForTrade.filter(
        (e) => e.update.type === "mark_mistake",
      ).length;

      const archived: ClosedTrade = {
        id: trade.id,
        symbol: trade.symbol,
        setupType: trade.setupType,
        marketType: trade.marketType,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        exitPrice,
        positionSize: trade.positionSize,
        originalRisk: trade.originalRisk,
        realizedPnL,
        realizedR,
        outcome,
        deviationCount,
        mistakeCount,
        exitReflection: note.length > 0 ? note : null,
        approvedAt: trade.approvedAt,
        activatedAt: trade.activatedAt,
        closedAt,
      };

      // Archive + remove in a SINGLE batched set so no intermediate state
      // ever lands where the trade lives in both `activeTrades` and
      // `closedTrades` (or worse: in `activeTrades` with `status: "closed"`
      // — a stale shape some consumers used to read past the panel's
      // status filter). The active record is dropped outright; the closed
      // archive is the authoritative post-exit representation. The archive
      // also gets session-stamped on the way in.
      set((state) => ({
        activeTrades: state.activeTrades.filter((t) => t.id !== trade.id),
        closedTrades: [
          stampWithActiveSession(state, archived),
          ...state.closedTrades,
        ],
      }));

      // 3) Update session metrics. Every closed trade increments the
      //    daily counter; losses additionally bump red trades + the
      //    consecutive-loss streak and consume some of the daily loss
      //    budget. Wins reset the consecutive-loss counter.
      const { session, riskRules } = get();
      const accountSize = riskRules.accountSize;
      const additionalLossPercent =
        outcome === "loss" && accountSize > 0
          ? (Math.abs(realizedPnL) / accountSize) * 100
          : 0;
      const nextDailyLoss =
        session.dailyLossUsedPercent + additionalLossPercent;
      get().patchSessionMetrics({
        tradesTakenToday: session.tradesTakenToday + 1,
        redTradesToday:
          outcome === "loss"
            ? session.redTradesToday + 1
            : session.redTradesToday,
        consecutiveLosses:
          outcome === "loss" ? session.consecutiveLosses + 1 : 0,
        lastTradeAt: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        dailyLossUsedPercent: nextDailyLoss,
        dailyLossLimitBreached:
          nextDailyLoss >= riskRules.maxDailyLossPercent ||
          session.dailyLossLimitBreached,
      });

      // 4) Headline TRADE_CLOSED behavior event with outcome-specific copy.
      const outcomeTitles: Record<ActiveTradeExitOutcome, string> = {
        win: "Winning trade closed",
        loss: "Losing trade closed",
        breakeven: "Breakeven trade closed",
      };
      // Override activations with no original stop have a null realized R.
      // The feed shows `—R` in that case so the trader sees the math
      // couldn't be computed (vs. a misleading 0.00R).
      const rTag =
        realizedR == null
          ? "—R"
          : `${realizedR >= 0 ? "+" : ""}${realizedR.toFixed(2)}R`;
      const pnLTag = formatPnLForFeed(realizedPnL);
      const closedEvent: BehaviorEvent = {
        id: genId("evt"),
        eventType: BEHAVIOR_EVENT_TYPES.TRADE_CLOSED,
        displayTitle: outcomeTitles[outcome],
        displayDescription: `Realized ${rTag} (${pnLTag}) on ${trade.symbol || "—"}.`,
        timestamp: closedAt,
        source: "trade_desk",
        symbol: trade.symbol || undefined,
        setupType: trade.setupType || undefined,
        direction: trade.direction,
        severity: outcome === "loss" ? "warning" : "info",
        triggeredRules: [],
        totalRisk: trade.originalRisk,
        accountRiskPercent: trade.accountRiskPercent,
        metadata: {
          tradeId: trade.id,
          outcome,
          realizedPnL,
          realizedR,
          deviationCount,
          mistakeCount,
        },
      };
      get().appendBehaviorEvent(closedEvent);

      // 5) Optional second event for the reflection note so the feed shows
      //    the journaling action distinctly from the close itself.
      if (note.length > 0) {
        const reflectionEvent: BehaviorEvent = {
          id: genId("evt"),
          eventType: BEHAVIOR_EVENT_TYPES.TRADE_EXIT_REFLECTION_ADDED,
          displayTitle: "Exit reflection added",
          displayDescription: note,
          timestamp: closedAt,
          source: "trade_desk",
          symbol: trade.symbol || undefined,
          setupType: trade.setupType || undefined,
          direction: trade.direction,
          severity: "info",
          triggeredRules: [],
          totalRisk: null,
          accountRiskPercent: null,
          metadata: { tradeId: trade.id },
        };
        get().appendBehaviorEvent(reflectionEvent);
      }
    },
  };
};
