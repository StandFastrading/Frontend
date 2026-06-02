import { useMemo } from "react";

import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  computeInterventionMetrics,
  type InterventionMetrics,
} from "@/types/intervention";
import type {
  ActiveTrade,
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  MonitoringEvent,
  RiskRules,
  SessionMetrics,
  ValidationResult,
} from "@/types";
import {
  useCurrentSessionEvents,
  useCurrentSessionInterventions,
  useCurrentSessionMonitoringEvents,
  useCurrentSessionTrades,
} from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";

// Session Intelligence Layer.
//
// Pure derivation over the persisted slices — session counters, behavior
// events, monitoring events, validation history, active + closed trades.
// Every metric here is deterministic; no AI, no probabilistic modeling.
//
// IMPORTANT: this module exports a *pure function* + a *React hook*, NOT a
// Zustand slice. The previous slice-method approach (`useAppStore((s) =>
// s.sessionIntelligence())`) returned a fresh object on every store read,
// which triggered React 18's "result of getSnapshot should be cached"
// guard and an infinite render loop. The hook below selects each
// underlying slice as a primitive reference and computes the snapshot
// behind a `useMemo`, so the rendered object is stable until one of the
// contributing slices actually changes.
//
// Persistence: nothing here holds state — the data flows in from the
// already-persisted slices, so reload restores everything for free.

export const SESSION_STATES = [
  "calm",
  "focused",
  "caution",
  "elevated",
  "high-risk",
] as const;
export type SessionStateLabel = (typeof SESSION_STATES)[number];

export type EmotionalBehaviorFlag =
  | "averaging_down"
  | "stop_widened"
  | "warnings_ignored_repeatedly"
  | "consecutive_losses_streak"
  | "mistakes_acknowledged"
  | "post_loss_reactivation"
  | "overtrading_pressure";

export type RulesFollowedShape = {
  current: number;
  total: number;
  adherence: number;
};

export type SessionIntelligence = {
  // --------------------------------------------------------------- Core
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  activeTrades: number;
  totalMistakesLogged: number;
  totalWarningsTriggered: number;
  totalWarningsIgnored: number;
  totalInterventionsTriggered: number;
  totalRuleViolations: number;
  totalApprovedTrades: number;
  totalRejectedTrades: number;
  cumulativeRealizedPnL: number;
  cumulativeRealizedR: number;

  // ---------------------------------------------------------- Behavioral
  impulsiveActionCount: number;
  disciplineScore: number;
  ruleAdherencePercent: number;
  emotionalBehaviorFlags: EmotionalBehaviorFlag[];
  largestDeviationRiskIncrease: number;
  consecutiveLosses: number;
  revengeTradeSignals: number;
  overtradingSignals: number;

  // ----------------------------------------------------- Session State
  sessionState: SessionStateLabel;
  sessionStateMessage: string;

  // --------------------------------------------- Per-tile derived shapes
  dailyTradePercent: number;
  rulesFollowed: RulesFollowedShape;
  pnLToday: number;
};

function isToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function withinMinutes(
  iso: string,
  referenceIso: string,
  windowMinutes: number,
): boolean {
  const a = new Date(iso).getTime();
  const b = new Date(referenceIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= windowMinutes * 60_000;
}

export type SessionIntelligenceInputs = {
  session: SessionMetrics;
  riskRules: RiskRules;
  behaviorEvents: BehaviorEvent[];
  monitoringEvents: MonitoringEvent[];
  validationHistory: ValidationResult[];
  interventions: InterventionEvent[];
  activeTrades: ActiveTrade[];
  closedTrades: ClosedTrade[];
};

// Pure compute function — exported so non-React callers (other slice
// actions, future jobs) can use the same derivation. Callers from React
// components should NEVER call this inside a Zustand selector; use the
// `useSessionIntelligence()` hook below instead.
export function computeSessionIntelligence(
  inputs: SessionIntelligenceInputs,
): SessionIntelligence {
  const {
    session,
    riskRules,
    behaviorEvents,
    monitoringEvents,
    validationHistory,
    interventions,
    activeTrades,
    closedTrades,
  } = inputs;

  // --------------------------------------------------------------- Core
  const activeOpen = activeTrades.filter((t) => t.status === "active");
  const winningTrades = closedTrades.filter((t) => t.outcome === "win").length;
  const losingTrades = closedTrades.filter((t) => t.outcome === "loss").length;
  const breakevenTrades = closedTrades.filter(
    (t) => t.outcome === "breakeven",
  ).length;
  const totalTrades = activeOpen.length + closedTrades.length;

  const totalMistakesLogged = monitoringEvents.filter(
    (e) => e.update.type === "mark_mistake",
  ).length;

  const totalWarningsTriggered = behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
  ).length;
  // Count ONLY hard-limit overrides — events where the trader pushed
  // past a FAIL-status rule via Continue Anyway. Advisory cautions
  // (status === "warning", no FAIL rules) ride the
  // TRADE_OVERRIDE_ACCEPTED event type and must NOT inflate this metric.
  // Mirrors the rule in countWarningIgnored (behavior-analysis-engine)
  // so both surfaces agree on the definition of "warnings ignored."
  const totalWarningsIgnored = behaviorEvents.filter((e) => {
    const wasOverridden = e.decision === "continue_anyway";
    if (!wasOverridden) return false;
    const ruleViolated = e.triggeredRules.some((r) => r.status === "fail");
    const isHardLimitOverride =
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED;
    return ruleViolated || isHardLimitOverride;
  }).length;
  const totalInterventionsTriggered = interventions.length;
  const totalRuleViolations = validationHistory.filter(
    (v) => v.validationStatus === "violation",
  ).length;
  const totalApprovedTrades = behaviorEvents.filter(
    (e) => e.decision === "approved",
  ).length;
  const totalRejectedTrades = behaviorEvents.filter(
    (e) => e.decision === "cancel_trade",
  ).length;

  const cumulativeRealizedPnL = closedTrades.reduce(
    (sum, t) => sum + t.realizedPnL,
    0,
  );
  // Null realized-R entries (override activations with no defined stop) are
  // skipped — adding them to the cumulative total would be meaningless.
  const cumulativeRealizedR = closedTrades.reduce(
    (sum, t) => sum + (t.realizedR ?? 0),
    0,
  );

  // ---------------------------------------------------------- Behavioral
  const criticalDeviations = monitoringEvents.filter(
    (e) => e.severity === "critical" || e.severity === "elevated",
  ).length;

  const impulsiveActionCount =
    totalWarningsIgnored + totalMistakesLogged + criticalDeviations;

  const rawDiscipline =
    100 -
    totalWarningsIgnored * 10 -
    totalMistakesLogged * 15 -
    criticalDeviations * 10 +
    totalApprovedTrades * 2;
  const disciplineScore = Math.max(0, Math.min(100, rawDiscipline));

  // Rules Followed — anchored to committed trade records, NOT to
  // behavior-event decisions. Drafts, evaluations, revisions, cancels,
  // and abandoned plans never produce a trade record, so they're
  // naturally excluded from both numerator and denominator. The prior
  // implementation read from the decision stream, which counted every
  // Check / Revise / Cancel / Continue-Anyway as a "rule opportunity"
  // — inflating the denominator for traders who revised their plan
  // before activating.
  //
  // Denominator: every committed trade (open + closed).
  // Numerator: trades that respected the rules end-to-end —
  //   * Closed: zero deviations and zero mistakes during the trade
  //     (the same fields the deviation engine populated at archive).
  //   * Open: clean approval pathway (not a warning override), no
  //     mistake flag yet, no deviations recorded in monitoring events
  //     for the trade so far. Flips to not-followed if any of those
  //     three signals appear later.
  const cleanClosedTrades = closedTrades.filter(
    (t) => t.deviationCount === 0 && t.mistakeCount === 0,
  ).length;
  const cleanOpenTrades = activeOpen.filter((t) => {
    if (t.approvalStatus === "approved_with_warnings") return false;
    if (t.mistakeFlagged) return false;
    const hasDeviation = monitoringEvents.some(
      (e) => e.tradeId === t.id && e.deviations.length > 0,
    );
    return !hasDeviation;
  }).length;
  const rulesFollowedCurrent = cleanClosedTrades + cleanOpenTrades;
  const rulesFollowedTotal = totalTrades;
  const ruleAdherencePercent =
    rulesFollowedTotal > 0
      ? Math.round((rulesFollowedCurrent / rulesFollowedTotal) * 100)
      : 100;
  const rulesFollowed: RulesFollowedShape = {
    current: rulesFollowedCurrent,
    total: rulesFollowedTotal,
    adherence: ruleAdherencePercent,
  };

  let largestDeviationRiskIncrease = 0;
  for (const event of monitoringEvents) {
    for (const dev of event.deviations) {
      if (
        dev.type === "risk_exposure_increased" &&
        dev.delta &&
        dev.delta.unit === "dollars"
      ) {
        const delta = dev.delta.to - dev.delta.from;
        if (delta > largestDeviationRiskIncrease) {
          largestDeviationRiskIncrease = delta;
        }
      }
    }
  }

  const lossExits = behaviorEvents.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_CLOSED &&
      (e.metadata as Record<string, unknown> | undefined)?.outcome === "loss",
  );
  const markActives = behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
  );
  let revengeTradeSignals = 0;
  for (const mark of markActives) {
    for (const loss of lossExits) {
      if (
        new Date(mark.timestamp).getTime() >
          new Date(loss.timestamp).getTime() &&
        withinMinutes(mark.timestamp, loss.timestamp, 10)
      ) {
        revengeTradeSignals += 1;
        break;
      }
    }
  }

  const overtradingSignals = validationHistory.filter((v) =>
    v.triggeredRules.some((r) => r.id === "daily-trade-count"),
  ).length;

  const flags = new Set<EmotionalBehaviorFlag>();
  if (
    monitoringEvents.some((e) =>
      e.deviations.some((d) => d.type === "averaging_down"),
    )
  ) {
    flags.add("averaging_down");
  }
  if (
    monitoringEvents.some((e) =>
      e.deviations.some((d) => d.type === "stop_moved_further"),
    )
  ) {
    flags.add("stop_widened");
  }
  if (totalWarningsIgnored >= 2) flags.add("warnings_ignored_repeatedly");
  if (session.consecutiveLosses >= 2) flags.add("consecutive_losses_streak");
  if (totalMistakesLogged > 0) flags.add("mistakes_acknowledged");
  if (revengeTradeSignals > 0) flags.add("post_loss_reactivation");
  if (overtradingSignals > 0) flags.add("overtrading_pressure");
  const emotionalBehaviorFlags = Array.from(flags);

  // ------------------------------------------------------ Session State
  let sessionState: SessionStateLabel = "calm";
  let sessionStateMessage = "You are operating within your rules.";

  const highRisk =
    session.dailyLossLimitBreached ||
    session.consecutiveLosses >= riskRules.maxConsecutiveLosses ||
    flags.has("averaging_down") ||
    criticalDeviations >= 3 ||
    revengeTradeSignals >= 2;
  const elevated =
    criticalDeviations > 0 ||
    totalWarningsIgnored >= 2 ||
    totalMistakesLogged >= 2 ||
    session.consecutiveLosses >= 2 ||
    flags.has("post_loss_reactivation") ||
    flags.has("overtrading_pressure");
  const caution =
    totalWarningsIgnored > 0 ||
    totalMistakesLogged > 0 ||
    flags.has("stop_widened");
  const focused = totalApprovedTrades > 0 && impulsiveActionCount === 0;

  if (highRisk) {
    sessionState = "high-risk";
    sessionStateMessage =
      "High-risk behavior pattern detected — review recommended before continuing.";
  } else if (elevated) {
    sessionState = "elevated";
    sessionStateMessage =
      "Elevated behavior risk — review the deviation log before continuing.";
  } else if (caution) {
    sessionState = "caution";
    sessionStateMessage = "Watch your discipline — review recommended.";
  } else if (focused) {
    sessionState = "focused";
    sessionStateMessage = "Approved trades only — staying inside your plan.";
  }

  // --------------------------------------------- Per-tile derived shapes
  const dailyTradePercent =
    riskRules.maxDailyTrades > 0
      ? (session.tradesTakenToday / riskRules.maxDailyTrades) * 100
      : 0;
  const pnLToday = closedTrades
    .filter((t) => isToday(t.closedAt))
    .reduce((sum, t) => sum + t.realizedPnL, 0);

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    activeTrades: activeOpen.length,
    totalMistakesLogged,
    totalWarningsTriggered,
    totalWarningsIgnored,
    totalInterventionsTriggered,
    totalRuleViolations,
    totalApprovedTrades,
    totalRejectedTrades,
    cumulativeRealizedPnL,
    cumulativeRealizedR,
    impulsiveActionCount,
    disciplineScore,
    ruleAdherencePercent,
    emotionalBehaviorFlags,
    largestDeviationRiskIncrease,
    consecutiveLosses: session.consecutiveLosses,
    revengeTradeSignals,
    overtradingSignals,
    sessionState,
    sessionStateMessage,
    dailyTradePercent,
    rulesFollowed,
    pnLToday,
  };
}

// React hook — the *only* supported way to consume session intelligence
// from a component. Selects each contributing slice as a primitive
// reference (Zustand returns the same array/object reference until the
// slice actually changes), then `useMemo`s the computation so the
// rendered object is stable across renders. Avoids the `getSnapshot`
// infinite-loop trap that calling a derived function inside a Zustand
// selector produces.
export function useSessionIntelligence(): SessionIntelligence {
  // Session-scoped reads. Current-session intelligence ignores anything
  // outside the active TradingSession — historical events stay in the
  // store but never inflate today's counts/metrics.
  const session = useAppStore((s) => s.session);
  const riskRules = useAppStore((s) => s.riskRules);
  const behaviorEvents = useCurrentSessionEvents();
  const monitoringEvents = useCurrentSessionMonitoringEvents();
  const validationHistory = useAppStore((s) => s.validationHistory);
  const interventions = useCurrentSessionInterventions();
  const { activeTrades, closedTrades } = useCurrentSessionTrades();

  return useMemo(
    () =>
      computeSessionIntelligence({
        session,
        riskRules,
        behaviorEvents,
        monitoringEvents,
        validationHistory,
        interventions,
        activeTrades,
        closedTrades,
      }),
    [
      session,
      riskRules,
      behaviorEvents,
      monitoringEvents,
      validationHistory,
      interventions,
      activeTrades,
      closedTrades,
    ],
  );
}

// React hook for intervention-decision metrics. Same memoization shape as
// `useSessionIntelligence` — selects the persisted slice as a primitive
// reference and runs the pure computation behind `useMemo` so the returned
// object is referentially stable until the underlying interventions array
// actually changes. Reports / Journal / future dashboards consume this.
export function useInterventionMetrics(): InterventionMetrics {
  // Session-scoped — Reports / future history views will get an unscoped
  // variant when they're built. Live dashboard surfaces should track only
  // the current session.
  const interventions = useCurrentSessionInterventions();
  return useMemo(
    () => computeInterventionMetrics(interventions),
    [interventions],
  );
}
