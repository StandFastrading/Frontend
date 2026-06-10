import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import { detectDeviations } from "@/lib/monitoring/behavior-deviation-engine";
import { deriveCurrentAccountBalance } from "@/lib/sessions/account-balance";
import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import { enqueueSync, tradeMapper } from "@/lib/sync";
import { getCurrentTradingDate } from "@/types";
import type {
  ActiveTrade,
  ActiveTradeExitOutcome,
  ActiveTradeUpdate,
  BehaviorEvent,
  ClosedTrade,
  ExitReason,
  MonitoringEvent,
  StopMoveReason,
  TargetMoveReason,
} from "@/types";
import type { SliceCreator } from "@/store/types";

// Sync helpers — every active-trade mutation flows through one of these so
// the server's `trades` row stays consistent with the local view. UPSERT on
// inserts (so retries land on the same row), UPDATE on incremental edits.

function syncActiveTradeUpsert(
  trade: ActiveTrade,
  userId: string | null,
  tradingDate: string,
) {
  if (!userId) return;
  enqueueSync({
    table: "trades",
    op: "upsert",
    payload: tradeMapper.activeTradeToInsert(trade, userId, tradingDate),
    onConflict: "user_id,client_id",
  });
}

function syncActiveTradeUpdate(
  trade: ActiveTrade,
  userId: string | null,
) {
  if (!userId) return;
  enqueueSync({
    table: "trades",
    op: "update",
    payload: tradeMapper.activeTradeToUpdate(trade),
    match: { user_id: userId, client_id: trade.id },
  });
}

function syncClosedTradeUpsert(
  trade: ClosedTrade,
  userId: string | null,
  tradingDate: string,
) {
  if (!userId) return;
  enqueueSync({
    table: "trades",
    op: "upsert",
    payload: tradeMapper.closedTradeToInsert(trade, userId, tradingDate),
    onConflict: "user_id,client_id",
  });
}

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
  // `reason` is the V1.5 decision-context capture. Optional for
  // backwards compatibility — older callers still work and produce a
  // monitoring event without the reason metadata.
  moveStop: (
    tradeId: string,
    newStopPrice: number,
    reason?: StopMoveReason,
  ) => void;
  // V1.5 — move the working target with a reason for the change. Not
  // a deviation (target extensions are usually disciplined behavior),
  // but the event + reason persist for future analytics.
  moveTarget: (
    tradeId: string,
    newTargetPrice: number,
    reason?: TargetMoveReason,
  ) => void;
  addPosition: (
    tradeId: string,
    additionalSize: number,
    addedAtPrice: number,
  ) => void;
  // V1.5 — partial-profit takes carry an optional contextual note
  // alongside the price + size.
  partialExit: (
    tradeId: string,
    sizeReduced: number,
    exitPrice: number,
    note?: string,
  ) => void;
  markMistake: (tradeId: string, note: string) => void;
  logExit: (
    tradeId: string,
    exitPrice: number,
    outcome: ActiveTradeExitOutcome,
    reflection: string | undefined,
    exitReason: ExitReason,
    exitNotes: string | undefined,
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
  // Magnitudes only — matches the trade-validation-engine's calculation
  // contract, so the rule-check, monitoring, and post-activation
  // surfaces all read from the same shape regardless of direction
  // representation. Direction-aware checks (stop on the wrong side,
  // target on the wrong side) belong in the deviation engine.
  const riskPS = Math.abs(trade.currentAvgEntry - trade.currentStopPrice);
  const currentRisk = riskPS * trade.currentPositionSize;
  // Reward leg uses the LIVE target (`currentTargetPrice`) so a Move
  // Target action immediately re-prices R:R. Falls back to baseline
  // `targetPrice` on legacy records the migration hasn't backfilled
  // yet, then null if no target was ever set.
  const liveTarget = trade.currentTargetPrice ?? trade.targetPrice;
  let currentRewardRiskRatio: number | null = null;
  if (liveTarget != null && riskPS > 0) {
    const rewardPS = Math.abs(liveTarget - trade.currentAvgEntry);
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
        // Penalty count excludes info-severity deviations (e.g. stop_tightened
        // — a risk-reducing move). Those are recorded on the monitoring event
        // for history/analytics, but they are not departures from the plan and
        // must not count as rule violations.
        deviationCount: engineOutput.deviations.filter(
          (d) => d.severity !== "info",
        ).length,
      },
    };
    get().appendBehaviorEvent(feedEvent);

    return monitoringEvent;
  }

  // Convenience helper: write back a mutated trade record into activeTrades.
  // Also enqueues a server-side update so the local view + Supabase agree.
  function replaceTrade(updated: ActiveTrade) {
    set((state) => ({
      activeTrades: state.activeTrades.map((t) =>
        t.id === updated.id ? updated : t,
      ),
    }));
    syncActiveTradeUpdate(updated, get().userId);
  }

  return {
    activeTrades: [],
    appendActiveTrade: (trade) => {
      const stamped = stampWithActiveSession(get(), trade);
      if (process.env.NODE_ENV === "development") {
        console.log("[debug:activate] appendActiveTrade", {
          inputTradeId: trade.id,
          inputStatus: trade.status,
          inputSessionId: trade.sessionId ?? null,
          stampedSessionId: stamped.sessionId ?? null,
          stampedTradingDate: stamped.tradingDate ?? null,
        });
      }
      set((state) => ({
        activeTrades: [stamped, ...state.activeTrades],
      }));
      syncActiveTradeUpsert(
        stamped,
        get().userId,
        stamped.tradingDate ?? getCurrentTradingDate(),
      );
    },
    removeActiveTrade: (id) =>
      set((state) => ({
        activeTrades: state.activeTrades.filter((t) => t.id !== id),
      })),
    clearActiveTrades: () => set(() => ({ activeTrades: [] })),

    moveStop: (tradeId, newStopPrice, reason) => {
      const trade = get().activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;
      recordUpdate(trade, { type: "move_stop", newStopPrice, reason });
      const mutated: ActiveTrade = { ...trade, currentStopPrice: newStopPrice };
      const recalc = recalcCurrentRisk(mutated);
      // Risk % uses Current Balance (Starting + Realized P/L Today) so
      // the trader sees the true exposure-to-capital ratio after any
      // realized P/L on closed trades earlier today.
      const balance = deriveCurrentAccountBalance(
        get().riskRules.accountSize,
        get().closedTrades,
      );
      replaceTrade({
        ...mutated,
        currentRisk: recalc.currentRisk,
        currentAccountRiskPercent:
          recalc.currentRisk != null && balance > 0
            ? (recalc.currentRisk / balance) * 100
            : mutated.currentAccountRiskPercent,
        currentRewardRiskRatio: recalc.currentRewardRiskRatio,
      });
    },

    moveTarget: (tradeId, newTargetPrice, reason) => {
      const trade = get().activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;
      recordUpdate(trade, { type: "move_target", newTargetPrice, reason });
      const mutated: ActiveTrade = {
        ...trade,
        currentTargetPrice: newTargetPrice,
      };
      // Risk dollar amount doesn't change with a target move (it's a
      // stop-side number), but R:R does — recompute via the shared
      // helper to keep the math centralized.
      const recalc = recalcCurrentRisk(mutated);
      replaceTrade({
        ...mutated,
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
      const balance = deriveCurrentAccountBalance(
        get().riskRules.accountSize,
        get().closedTrades,
      );
      replaceTrade({
        ...mutated,
        currentRisk: recalc.currentRisk,
        currentAccountRiskPercent:
          recalc.currentRisk != null && balance > 0
            ? (recalc.currentRisk / balance) * 100
            : mutated.currentAccountRiskPercent,
        currentRewardRiskRatio: recalc.currentRewardRiskRatio,
      });
    },

    partialExit: (tradeId, sizeReduced, exitPrice, note) => {
      const trade = get().activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;
      const newSize = Math.max(0, trade.currentPositionSize - sizeReduced);
      // Trim and persist the optional decision-context note. The note
      // rides on the monitoring event's update field; downstream
      // consumers (Trade Detail timeline, future analytics) read it
      // from there. Empty/whitespace-only inputs are dropped so the
      // schema gets a clean omit rather than an empty string.
      const trimmedNote = note?.trim() ?? "";
      recordUpdate(trade, {
        type: "partial_exit",
        sizeReduced,
        exitPrice,
        note: trimmedNote.length > 0 ? trimmedNote : undefined,
      });
      const mutated: ActiveTrade = {
        ...trade,
        currentPositionSize: newSize,
      };
      const recalc = recalcCurrentRisk(mutated);
      const balance = deriveCurrentAccountBalance(
        get().riskRules.accountSize,
        get().closedTrades,
      );
      replaceTrade({
        ...mutated,
        currentRisk: recalc.currentRisk,
        currentAccountRiskPercent:
          recalc.currentRisk != null && balance > 0
            ? (recalc.currentRisk / balance) * 100
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
    logExit: (
      tradeId,
      exitPrice,
      outcome,
      reflection,
      exitReason,
      exitNotes,
    ) => {
      // Boundary guard — roll the session if it's stale (yesterday).
      // This is the action that produces the ClosedTrade record + bumps
      // the daily-loss / red-trade counters; a stale active session
      // would otherwise stamp the archive with the wrong tradingDate
      // and silently carry yesterday's counters into today's caps.
      // Preserves desk state for symmetry with the other action sites.
      get().ensureSessionForToday({ preserveDeskState: true });
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
      const trimmedExitNotes = exitNotes?.trim() ?? "";

      // Risk-reduction attribution — only computed for the explicit
      // "Manual Exit - Risk Reduction" path AND only when the trade
      // actually closed at a loss AND a baseline original risk exists.
      // The amount/percent compare actual realized loss against the
      // originally-planned loss (`originalRisk`), so a smaller realized
      // loss earns a positive defensive attribution. Wins, breakevens,
      // and override activations with a null stop short-circuit to null.
      let lossReduced: boolean | null = null;
      let lossReductionAmount: number | null = null;
      let lossReductionPercent: number | null = null;
      if (
        exitReason === "manual_exit_risk_reduction" &&
        outcome === "loss" &&
        trade.originalRisk != null &&
        trade.originalRisk > 0
      ) {
        const plannedLoss = trade.originalRisk;
        const actualLoss = Math.abs(realizedPnL);
        const saved = plannedLoss - actualLoss;
        lossReduced = saved > 0;
        lossReductionAmount = saved > 0 ? saved : 0;
        lossReductionPercent = saved > 0 ? saved / plannedLoss : 0;
      }

      // Build the normalized archive record. Closed-trade deviation +
      // mistake counts come from the monitoring history for this trade
      // (the archive is what Trade History reads from later).
      const monitoringForTrade = get().monitoringEvents.filter(
        (e) => e.tradeId === trade.id,
      );
      // Count only penalizing deviations — info-severity signals (e.g.
      // stop_tightened, a risk-reducing move) stay on the monitoring record
      // but are not plan departures, so they don't count as rule violations.
      const deviationCount = monitoringForTrade.reduce(
        (n, e) =>
          n + e.deviations.filter((d) => d.severity !== "info").length,
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
        exitReason,
        exitNotes: trimmedExitNotes.length > 0 ? trimmedExitNotes : null,
        lossReduced,
        lossReductionAmount,
        lossReductionPercent,
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
      const stampedArchive = stampWithActiveSession(get(), archived);
      set((state) => ({
        activeTrades: state.activeTrades.filter((t) => t.id !== trade.id),
        closedTrades: [stampedArchive, ...state.closedTrades],
      }));
      // Server sync: same `client_id` as the original active trade row →
      // the upsert overwrites status='closed' + exit fields onto that row.
      syncClosedTradeUpsert(
        stampedArchive,
        get().userId,
        stampedArchive.tradingDate ?? getCurrentTradingDate(),
      );

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
