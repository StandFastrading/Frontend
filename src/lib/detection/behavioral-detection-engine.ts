import { useMemo } from "react";

import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  useCurrentSessionEvents,
  useCurrentSessionInterventions,
  useCurrentSessionMonitoringEvents,
  useCurrentSessionTrades,
} from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";
import type {
  ActiveTrade,
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  MonitoringEvent,
  RiskRules,
  SessionMetrics,
} from "@/types";

// =============================================================================
// StandFast Behavioral Detection Engine — V1 (rules-based, deterministic)
// =============================================================================
//
// PURPOSE
//   Pattern-recognition layer above the per-trade Behavior Deviation Engine
//   and the session-level Behavior Analysis Engine. Answers a different
//   question than either of them:
//
//     * BehaviorDeviationEngine  → "did THIS trade update deviate from its
//                                   approved plan?" (writes MonitoringEvents)
//     * BehaviorAnalysisEngine   → "how disciplined was the session?"
//                                   (computes a 0–100 score + tags)
//     * BehavioralDetectionEngine (this file)
//                                → "WHICH named behavior patterns are
//                                   ACTIVE right now, and how severe is
//                                   each?"
//
//   Output is a flat list of `BehavioralDetection` records — one per pattern
//   that fired — plus a derived `behavioralState` ("focused" → "fatigued")
//   and the highest active severity. Dashboard surfaces (Today's Patterns
//   first, future Session State / Behavior Feed banners next) render this
//   directly.
//
// DESIGN PRINCIPLES
//   1. PURE — no `Date.now()`, no I/O, no zustand reads. Time comparisons
//      use event-vs-event timestamps so the engine is stable across renders
//      and unit-testable by passing fixture inputs.
//   2. DETERMINISTIC — every output is a function of the input slices at a
//      single moment. No probabilistic scoring, no AI, no hidden state.
//   3. EXPLAINABLE — every detection carries `reasons[]` listing the rule
//      conditions that fired. The trader can always trace why a pattern
//      was raised.
//   4. TRACEABLE THRESHOLDS — all numeric thresholds live in
//      `DETECTION_THRESHOLDS`. Tune without editing detector bodies.
//   5. NO MUTATIONS — derived view only. V2 may add a thin effect layer that
//      writes feed entries on detection transitions; the engine itself stays
//      mutation-free.
//
// HOW DETECTIONS FEED THE DASHBOARD
//   * Today's Patterns: renders active detections as the headline list.
//   * Session State (future): can surface `behavioralState` as a secondary
//     label or accent.
//   * Behavior Feed (future): a thin store action can listen for detection
//     transitions and emit a persistent BehaviorEvent. The headline +
//     description + reasons fields are already shaped for that use.
//
// V1 → AI EVOLUTION PATH
//   The AI layer (later) will read the same inputs as this engine plus this
//   engine's output and produce softer signals (confidence bands, behavioral
//   cluster classification, predictive nudges). This engine stays the
//   ground-truth source for what the trader sees; the AI layer adds
//   context, never replaces the deterministic floor.
// =============================================================================

// -----------------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------------

export const DETECTION_IDS = [
  "revenge_trading",
  "position_size_escalation",
  "rapid_reentry",
  "stop_widening",
  "intervention_override",
  "overtrading",
] as const;
export type DetectionId = (typeof DETECTION_IDS)[number];

export const DETECTION_SEVERITIES = [
  "info",
  "caution",
  "warning",
  "critical",
] as const;
export type DetectionSeverity = (typeof DETECTION_SEVERITIES)[number];

// Behavioral state vocabulary distinct from BehaviorAnalysisEngine's
// SessionStateLabel. SessionStateLabel ("calm/focused/caution/elevated/
// high-risk") tracks discipline-score band; BehavioralState tracks the
// DOMINANT PATTERN ARCHETYPE the trader is currently expressing.
export const BEHAVIORAL_STATES = [
  "focused",
  "controlled",
  "reactive",
  "escalating",
  "impulsive",
  "fatigued",
] as const;
export type BehavioralState = (typeof BEHAVIORAL_STATES)[number];

// Behavioral cluster — groups detections by the psychological signature
// they represent. The dashboard's Today's Patterns surface uses this to
// present clustered patterns as ONE escalation arc instead of disconnected
// alerts. Each detection is statically mapped to exactly one cluster.
export const BEHAVIOR_CLUSTERS = [
  "emotional_escalation",
  "rule_defiance",
  "fatigue_overuse",
] as const;
export type BehaviorCluster = (typeof BEHAVIOR_CLUSTERS)[number];

export const DETECTION_CLUSTER: Record<DetectionId, BehaviorCluster> = {
  revenge_trading: "emotional_escalation",
  rapid_reentry: "emotional_escalation",
  position_size_escalation: "emotional_escalation",
  stop_widening: "rule_defiance",
  intervention_override: "rule_defiance",
  overtrading: "fatigue_overuse",
};

export const BEHAVIOR_CLUSTER_LABEL: Record<BehaviorCluster, string> = {
  emotional_escalation: "Emotional escalation",
  rule_defiance: "Rule defiance",
  fatigue_overuse: "Fatigue / overuse",
};

export const BEHAVIOR_CLUSTER_DESCRIPTION: Record<BehaviorCluster, string> = {
  emotional_escalation:
    "Decisions are stacking under emotional pressure — losses, re-entries, size escalation feeding each other.",
  rule_defiance:
    "Rule boundaries are being moved or overridden mid-trade — the trader is editing the plan rather than executing it.",
  fatigue_overuse:
    "Trade frequency or session length is outpacing focus capacity.",
};

export type BehavioralDetection = {
  id: DetectionId;
  severity: DetectionSeverity;
  // Cluster this detection belongs to. Lets surfaces group related
  // patterns as ONE escalation arc instead of disconnected alerts.
  cluster: BehaviorCluster;
  // Short user-facing line — what the pattern IS. The spec's example output.
  headline: string;
  // One-line behavioral read — what the pattern MEANS, in plain English.
  description: string;
  // Every rule condition that contributed, traced verbatim. Order = first
  // condition that fired through last. Surfacing this is what makes the
  // engine explainable.
  reasons: string[];
  // Suggested intervention. NOT enforced — V1 is read-only output.
  recommendation: string;
};

// Active cluster summary — surfaced when 2+ detections in the same cluster
// fire together. The dashboard treats this as the dominant escalation arc
// for the session.
export type ActiveBehaviorCluster = {
  cluster: BehaviorCluster;
  label: string;
  description: string;
  detectionIds: DetectionId[];
  dominantSeverity: DetectionSeverity;
};

// Per-detector return type — cluster is stamped centrally in
// computeBehavioralDetection so individual detectors don't carry that
// concern. Keeps the cluster mapping in one place (DETECTION_CLUSTER).
type DetectorOutput = Omit<BehavioralDetection, "cluster">;

export type BehavioralDetectionReading = {
  // Sorted highest severity first within each cluster; clusters kept
  // adjacent so visual rendering reads as one behavioral arc.
  detections: BehavioralDetection[];
  // Active clusters — 2+ detections sharing a cluster. The dominant
  // escalation arc of the session.
  activeClusters: ActiveBehaviorCluster[];
  // Dominant archetype derived from active detections + severities.
  behavioralState: BehavioralState;
  // Highest severity across all detections. "info" when none triggered.
  dominantSeverity: DetectionSeverity;
  // True when any detection is at warning+ — convenience for banner UIs.
  alertActive: boolean;
};

export type BehavioralDetectionInputs = {
  behaviorEvents: BehaviorEvent[];
  monitoringEvents: MonitoringEvent[];
  activeTrades: ActiveTrade[];
  closedTrades: ClosedTrade[];
  interventions: InterventionEvent[];
  riskRules: RiskRules;
  sessionMetrics: SessionMetrics;
};

// -----------------------------------------------------------------------------
// Thresholds — single source of truth. Tune here, never inline.
// -----------------------------------------------------------------------------

export const DETECTION_THRESHOLDS = {
  revengeTrading: {
    consecutiveLossesInfo: 2,
    consecutiveLossesCaution: 3,
    consecutiveLossesWarning: 4,
    consecutiveLossesCritical: 5,
    postLossOverrideWindowMin: 15,
  },
  positionSizeEscalation: {
    increasedCountInfo: 1,
    increasedCountCaution: 2,
    increasedCountWarning: 3,
    riskDriftCaution: 1.25,
    riskDriftWarning: 1.5,
  },
  rapidReentry: {
    sameSymbolCaution: 2,
    sameSymbolWarning: 3,
    rapidPostLossCaution: 1,
    rapidPostLossWarning: 2,
    rapidPostLossCritical: 3,
  },
  stopWidening: {
    widenedCountInfo: 1,
    widenedCountCaution: 2,
    widenedCountWarning: 3,
    riskDriftCritical: 1.5,
  },
  interventionOverride: {
    countInfo: 1,
    countCaution: 2,
    countWarning: 3,
    countCritical: 4,
  },
  overtrading: {
    capUtilizationInfo: 0.6,
    capUtilizationCaution: 0.8,
    capUtilizationWarning: 1.0,
    capUtilizationCritical: 1.2,
    avgGapWarningMinutes: 5,
    minTradesForGapCheck: 3,
  },
} as const;

// -----------------------------------------------------------------------------
// Severity helpers
// -----------------------------------------------------------------------------

const SEVERITY_RANK: Record<DetectionSeverity, number> = {
  info: 0,
  caution: 1,
  warning: 2,
  critical: 3,
};

function maxSeverity(
  a: DetectionSeverity,
  b: DetectionSeverity,
): DetectionSeverity {
  return SEVERITY_RANK[b] > SEVERITY_RANK[a] ? b : a;
}

function escalate(
  current: DetectionSeverity | null,
  next: DetectionSeverity,
): DetectionSeverity {
  return current == null ? next : maxSeverity(current, next);
}

// Bucketed count → severity. `critical` is optional because some patterns
// don't have a critical-by-count threshold (they escalate via side rules).
function severityFromCount(
  count: number,
  t: {
    info: number;
    caution: number;
    warning: number;
    critical?: number;
  },
): DetectionSeverity | null {
  if (t.critical != null && count >= t.critical) return "critical";
  if (count >= t.warning) return "warning";
  if (count >= t.caution) return "caution";
  if (count >= t.info) return "info";
  return null;
}

function minutesBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return Math.abs(a - b) / 60_000;
}

// -----------------------------------------------------------------------------
// 1. Revenge Trading Detection
//
// Trigger conditions (any, max severity wins):
//   * consecutive losses  (info @ 2, caution @ 3, warning @ 4, critical @ 5)
//   * rapid re-entry after loss   → caution (uses persisted
//                                   RAPID_POST_LOSS_REACTIVATION events)
//   * increased size after loss   → warning (new active trade activated
//                                   after the most recent loss with size
//                                   greater than a prior winning baseline)
//   * impulsive override after loss → warning (WARNING_IGNORED /
//                                     TRADE_OVERRIDE_ACCEPTED within
//                                     `postLossOverrideWindowMin` of a
//                                     closed-loss timestamp)
// -----------------------------------------------------------------------------
function detectRevengeTrading(
  inputs: BehavioralDetectionInputs,
): DetectorOutput | null {
  const {
    sessionMetrics,
    behaviorEvents,
    closedTrades,
    activeTrades,
    riskRules,
  } = inputs;
  const T = DETECTION_THRESHOLDS.revengeTrading;
  const reasons: string[] = [];
  let severity: DetectionSeverity | null = null;

  // 1. Consecutive losses — source of truth is the session counter, which
  //    `logExit` increments on every losing close and resets on a win.
  const losses = sessionMetrics.consecutiveLosses;
  if (losses >= T.consecutiveLossesCritical) {
    severity = escalate(severity, "critical");
    reasons.push(`${losses} consecutive losses`);
  } else if (losses >= T.consecutiveLossesWarning) {
    severity = escalate(severity, "warning");
    reasons.push(`${losses} consecutive losses`);
  } else if (losses >= T.consecutiveLossesCaution) {
    severity = escalate(severity, "caution");
    reasons.push(`${losses} consecutive losses`);
  } else if (losses >= T.consecutiveLossesInfo) {
    severity = escalate(severity, "info");
    reasons.push(`${losses} consecutive losses`);
  }

  // 2. Rapid post-loss reactivation — the deviation engine already detects
  //    this at activation time and persists RAPID_POST_LOSS_REACTIVATION
  //    events. We just count them.
  const rapidPostLoss = behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  ).length;
  if (rapidPostLoss > 0) {
    severity = escalate(severity, "caution");
    reasons.push(
      `Re-entry within ${riskRules.cooldownAfterLossMinutes}-min cool-off (${rapidPostLoss}×)`,
    );
  }

  // 3. Increased size after the most recent loss — compares position size
  //    of any active trade entered after the loss to a prior winning size
  //    baseline (the smallest winning trade in this session works as a
  //    conservative reference). Skips if no prior win exists.
  const lossClosed = closedTrades
    .filter((t) => t.outcome === "loss")
    .sort(
      (a, b) =>
        new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
    );
  const lastLoss = lossClosed[0];
  if (lastLoss) {
    const winningSizes = closedTrades
      .filter(
        (t) =>
          t.outcome === "win" &&
          new Date(t.closedAt).getTime() <
            new Date(lastLoss.closedAt).getTime(),
      )
      .map((t) => t.positionSize);
    if (winningSizes.length > 0) {
      const baseline = Math.min(...winningSizes);
      const offending = activeTrades.find(
        (t) =>
          t.status === "active" &&
          new Date(t.activatedAt).getTime() >
            new Date(lastLoss.closedAt).getTime() &&
          t.positionSize > baseline,
      );
      if (offending) {
        severity = escalate(severity, "warning");
        reasons.push(
          `Size increased to ${offending.positionSize} on ${offending.symbol} after losing trade`,
        );
      }
    }
  }

  // 4. Override accepted within `postLossOverrideWindowMin` of a closed
  //    loss — surfaces the override-after-loss reflex even when the trader
  //    didn't increase size.
  const overridesAfterLoss = behaviorEvents.filter((e) => {
    if (
      e.eventType !== BEHAVIOR_EVENT_TYPES.WARNING_IGNORED &&
      e.eventType !== BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED
    ) {
      return false;
    }
    return closedTrades.some(
      (t) =>
        t.outcome === "loss" &&
        new Date(e.timestamp).getTime() >
          new Date(t.closedAt).getTime() &&
        minutesBetween(t.closedAt, e.timestamp) <=
          T.postLossOverrideWindowMin,
    );
  }).length;
  if (overridesAfterLoss > 0) {
    severity = escalate(severity, "warning");
    reasons.push(
      `${overridesAfterLoss} override${overridesAfterLoss === 1 ? "" : "s"} within ${T.postLossOverrideWindowMin}-min of a loss`,
    );
  }

  if (severity == null) return null;

  return {
    id: "revenge_trading",
    severity,
    headline:
      severity === "critical" || severity === "warning"
        ? "Revenge trading pattern active"
        : "Revenge behavior risk increasing",
    description:
      "Trading is starting to react to recent losses rather than to setups.",
    reasons,
    recommendation:
      severity === "critical" || severity === "warning"
        ? "Stop trading and reset. Walk the next setup against your written plan before considering re-entry."
        : "Take a beat before the next entry. Verify the setup independently from the last loss.",
  };
}

// -----------------------------------------------------------------------------
// 2. Position Size Escalation
//
// Trigger conditions:
//   * POSITION_SIZE_INCREASED + RISK_EXPOSURE_INCREASED event count
//     (info @ 1, caution @ 2, warning @ 3+)
//   * any active trade with currentRisk / originalRisk >= 1.25 → caution
//   * same ratio >= 1.5 → warning
//   * daily risk cap breached → critical
// -----------------------------------------------------------------------------
function detectPositionSizeEscalation(
  inputs: BehavioralDetectionInputs,
): DetectorOutput | null {
  const { behaviorEvents, activeTrades, sessionMetrics, riskRules } = inputs;
  const T = DETECTION_THRESHOLDS.positionSizeEscalation;
  const reasons: string[] = [];
  let severity: DetectionSeverity | null = null;

  const sizeIncreases = behaviorEvents.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  ).length;
  const countSev = severityFromCount(sizeIncreases, {
    info: T.increasedCountInfo,
    caution: T.increasedCountCaution,
    warning: T.increasedCountWarning,
  });
  if (countSev) {
    severity = escalate(severity, countSev);
    reasons.push(
      `${sizeIncreases} size/risk increase event${sizeIncreases === 1 ? "" : "s"}`,
    );
  }

  // Per-trade risk drift — `currentRisk` is mutated by the active-trades
  // slice on every Move Stop / Add / Partial Exit, so this captures live
  // exposure drift without needing a separate counter.
  for (const t of activeTrades) {
    if (t.status !== "active") continue;
    if (t.currentRisk == null || t.originalRisk == null || t.originalRisk === 0)
      continue;
    const ratio = t.currentRisk / t.originalRisk;
    if (ratio >= T.riskDriftWarning) {
      severity = escalate(severity, "warning");
      reasons.push(
        `${t.symbol}: risk drifted ${Math.round((ratio - 1) * 100)}% above approved`,
      );
    } else if (ratio >= T.riskDriftCaution) {
      severity = escalate(severity, "caution");
      reasons.push(
        `${t.symbol}: risk drifted ${Math.round((ratio - 1) * 100)}% above approved`,
      );
    }
  }

  if (
    sessionMetrics.dailyLossLimitBreached ||
    sessionMetrics.dailyLossUsedPercent > riskRules.maxDailyLossPercent
  ) {
    severity = escalate(severity, "critical");
    reasons.push("Daily risk cap exceeded");
  }

  if (severity == null) return null;

  return {
    id: "position_size_escalation",
    severity,
    headline: "Position sizing escalated after drawdown",
    description: "Risk exposure is expanding beyond your approved limits.",
    reasons,
    recommendation:
      "Hold size at or below the originally approved level. Do not add to losers.",
  };
}

// -----------------------------------------------------------------------------
// 3. Rapid Re-Entry Detection
//
// Trigger conditions:
//   * RAPID_POST_LOSS_REACTIVATION events
//     (caution @ 1, warning @ 2, critical @ 3+)
//   * Same-symbol TRADE_MARKED_ACTIVE events with consecutive pairs inside
//     riskRules.noReentryWithinMinutes — caution @ 2 clustered, warning @ 3
// -----------------------------------------------------------------------------
function detectRapidReentry(
  inputs: BehavioralDetectionInputs,
): DetectorOutput | null {
  const { behaviorEvents, riskRules } = inputs;
  const T = DETECTION_THRESHOLDS.rapidReentry;
  const reasons: string[] = [];
  let severity: DetectionSeverity | null = null;

  const rapidPostLoss = behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  ).length;
  if (rapidPostLoss >= T.rapidPostLossCritical) {
    severity = escalate(severity, "critical");
    reasons.push(`${rapidPostLoss} rapid post-loss re-entries`);
  } else if (rapidPostLoss >= T.rapidPostLossWarning) {
    severity = escalate(severity, "warning");
    reasons.push(`${rapidPostLoss} rapid post-loss re-entries`);
  } else if (rapidPostLoss >= T.rapidPostLossCaution) {
    severity = escalate(severity, "caution");
    reasons.push(`${rapidPostLoss} rapid post-loss re-entry`);
  }

  const cool = Math.max(1, riskRules.noReentryWithinMinutes);
  const activations = behaviorEvents
    .filter(
      (e) =>
        e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE && e.symbol,
    )
    .sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

  const bySymbol = new Map<string, BehaviorEvent[]>();
  for (const e of activations) {
    if (!e.symbol) continue;
    const arr = bySymbol.get(e.symbol) ?? [];
    arr.push(e);
    bySymbol.set(e.symbol, arr);
  }
  for (const [symbol, events] of bySymbol) {
    if (events.length < T.sameSymbolCaution) continue;
    let clusteredPairs = 0;
    for (let i = 1; i < events.length; i++) {
      if (
        minutesBetween(events[i].timestamp, events[i - 1].timestamp) <= cool
      ) {
        clusteredPairs += 1;
      }
    }
    if (clusteredPairs === 0) continue;
    const clusterCount = clusteredPairs + 1;
    if (clusterCount >= T.sameSymbolWarning) {
      severity = escalate(severity, "warning");
      reasons.push(
        `${clusterCount} entries on ${symbol} within ${cool}-min window`,
      );
    } else {
      severity = escalate(severity, "caution");
      reasons.push(
        `${clusterCount} entries on ${symbol} within ${cool}-min window`,
      );
    }
  }

  if (severity == null) return null;

  return {
    id: "rapid_reentry",
    severity,
    headline: "Rapid re-entry behavior detected",
    description:
      "New entries are stacking inside the cool-off window after recent activity.",
    reasons,
    recommendation:
      "Honor the cool-off window. Step away from the screen for the configured duration before considering the next entry.",
  };
}

// -----------------------------------------------------------------------------
// 4. Stop Widening Detection — CONTEXTUAL severity
//
// Stop widening severity is determined by context, not a static count:
//   * Single widening                     → caution
//   * Widening after a losing close       → warning  (loss-driven leniency)
//   * Repeated widening (≥ 3 events)      → critical (pattern conditioning)
//   * Widening with risk drift ≥ 1.5×     → critical (beyond approved risk)
//   * Widening during cooldown/lockout    → critical (rule defiance)
//
// Multiple conditions can fire; severity climbs to the highest match.
// -----------------------------------------------------------------------------
function detectStopWidening(
  inputs: BehavioralDetectionInputs,
): DetectorOutput | null {
  const {
    behaviorEvents,
    activeTrades,
    closedTrades,
    sessionMetrics,
    riskRules,
  } = inputs;
  const T = DETECTION_THRESHOLDS.stopWidening;
  const reasons: string[] = [];
  let severity: DetectionSeverity | null = null;

  const wideningEvents = behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  );
  const widenings = wideningEvents.length;

  // 1. Single widening — caution. Not a static "info" label any more — even
  //    one stop widening is a deliberate move past the original invalidation
  //    and reads as caution at minimum.
  if (widenings >= 1) {
    severity = escalate(severity, "caution");
    reasons.push(`${widenings} stop widening event${widenings === 1 ? "" : "s"}`);
  }

  // 2. Widening after a recent losing close — warning. The post-loss
  //    leniency reflex is a stronger behavioral signal than the count alone.
  const lastLoss = [...closedTrades]
    .filter((t) => t.outcome === "loss")
    .sort(
      (a, b) =>
        new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
    )[0];
  if (lastLoss && widenings > 0) {
    const afterLoss = wideningEvents.some(
      (e) =>
        new Date(e.timestamp).getTime() >
        new Date(lastLoss.closedAt).getTime(),
    );
    if (afterLoss) {
      severity = escalate(severity, "warning");
      reasons.push("Stop widened after a losing close");
    }
  }

  // 3. Repeated widening — critical. Three or more widenings in a session
  //    is no longer a single decision; it's conditioning the trader to
  //    accept worse exit levels.
  if (widenings >= T.widenedCountWarning) {
    severity = escalate(severity, "critical");
    reasons.push(`${widenings} stop widening events — repeated pattern`);
  }

  // 4. Widening beyond approved risk on any active trade — critical. Even
  //    one stop widen that pushes current risk past 1.5× the original is
  //    behavioral collapse, not a tactical adjustment.
  for (const t of activeTrades) {
    if (t.status !== "active") continue;
    if (t.currentRisk == null || t.originalRisk == null || t.originalRisk === 0)
      continue;
    if (t.currentStopPrice == null || t.stopPrice == null) continue;
    const wider =
      (t.direction === "Long" && t.currentStopPrice < t.stopPrice) ||
      (t.direction === "Short" && t.currentStopPrice > t.stopPrice);
    const ratio = t.currentRisk / t.originalRisk;
    if (!wider) continue;
    if (ratio >= T.riskDriftCritical) {
      severity = escalate(severity, "critical");
      reasons.push(
        `${t.symbol}: stop loosened with risk ${Math.round((ratio - 1) * 100)}% over approved`,
      );
    } else if (ratio >= 1.25) {
      severity = escalate(severity, "warning");
      reasons.push(
        `${t.symbol}: stop loosened with risk ${Math.round((ratio - 1) * 100)}% over approved`,
      );
    }
  }

  // 5. Widening during an active cooldown or lockout — critical. The
  //    trader is editing the plan while the system is asking them to
  //    stand down.
  if (widenings > 0) {
    const lockActive =
      sessionMetrics.dailyLossLimitBreached ||
      sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses ||
      // Loss-cooldown approximation — most recent loss within cooldown
      (lastLoss
        ? Date.now() <
          new Date(lastLoss.closedAt).getTime() +
            Math.max(1, riskRules.cooldownAfterLossMinutes) * 60_000
        : false);
    if (lockActive) {
      severity = escalate(severity, "critical");
      reasons.push("Stop widened while a cooldown or lockout was active");
    }
  }

  if (severity == null) return null;

  return {
    id: "stop_widening",
    severity,
    headline:
      severity === "critical"
        ? "Stop discipline broken under pressure"
        : severity === "warning"
          ? "Stop widening pattern emerging"
          : "Risk tolerance expanded during active trade",
    description:
      "Acceptable loss is being extended past the original invalidation level.",
    reasons,
    recommendation:
      severity === "critical"
        ? "Close the position at the original stop or pause the session. Do not widen further."
        : severity === "warning"
          ? "Treat the next stop adjustment as a new trade decision. Do not edit the invalidation again."
          : "Honor the original invalidation. A widened stop is a separate decision, not a continuation.",
  };
}

// -----------------------------------------------------------------------------
// 5. Intervention Override Tracking
//
// Trigger conditions:
//   * continue_anyway intervention count
//     (info @ 1, caution @ 2, warning @ 3, critical @ 4+)
//   * any closed loss preceded by a continue_anyway on the same symbol →
//     escalate to warning regardless of count
// -----------------------------------------------------------------------------
function detectInterventionOverride(
  inputs: BehavioralDetectionInputs,
): DetectorOutput | null {
  const { interventions, closedTrades } = inputs;
  const T = DETECTION_THRESHOLDS.interventionOverride;
  const reasons: string[] = [];
  let severity: DetectionSeverity | null = null;

  const overrides = interventions.filter(
    (i) => i.decision === "continue_anyway",
  ).length;
  const sev = severityFromCount(overrides, {
    info: T.countInfo,
    caution: T.countCaution,
    warning: T.countWarning,
    critical: T.countCritical,
  });
  if (sev) {
    severity = escalate(severity, sev);
    reasons.push(
      `${overrides} warning override${overrides === 1 ? "" : "s"} this session`,
    );
  }

  const overrideThenLoss = closedTrades.filter((t) => {
    if (t.outcome !== "loss") return false;
    return interventions.some(
      (i) =>
        i.decision === "continue_anyway" &&
        i.symbol === t.symbol &&
        new Date(i.timestamp).getTime() < new Date(t.closedAt).getTime(),
    );
  }).length;
  if (overrideThenLoss > 0) {
    severity = escalate(severity, "warning");
    reasons.push(
      `${overrideThenLoss} losing trade${overrideThenLoss === 1 ? "" : "s"} after override`,
    );
  }

  if (severity == null) return null;

  return {
    id: "intervention_override",
    severity,
    headline:
      severity === "critical"
        ? "Multiple intervention signals dismissed"
        : "Trader ignored intervention signals",
    description: "Warnings are being acknowledged but not heeded.",
    reasons,
    recommendation:
      severity === "critical"
        ? "Pause trading. Open Rules & Risk and review the warnings you have been overriding."
        : "Before the next Continue Anyway click, write down why the warning does not apply to this setup.",
  };
}

// -----------------------------------------------------------------------------
// 6. Overtrading Detection
//
// Trigger conditions:
//   * tradesTakenToday / maxDailyTrades utilization ratio
//     (info @ 0.6, caution @ 0.8, warning @ 1.0, critical @ 1.2)
//   * average minutes-between TRADE_MARKED_ACTIVE events < 5 min (with
//     ≥ 3 trades for a meaningful gap) → warning
// -----------------------------------------------------------------------------
function detectOvertrading(
  inputs: BehavioralDetectionInputs,
): DetectorOutput | null {
  const { sessionMetrics, riskRules, behaviorEvents } = inputs;
  const T = DETECTION_THRESHOLDS.overtrading;
  const reasons: string[] = [];
  let severity: DetectionSeverity | null = null;

  const cap = Math.max(1, riskRules.maxDailyTrades);
  const utilization = sessionMetrics.tradesTakenToday / cap;
  if (utilization >= T.capUtilizationCritical) {
    severity = escalate(severity, "critical");
    reasons.push(
      `${sessionMetrics.tradesTakenToday}/${cap} trades — cap exceeded by ${Math.round((utilization - 1) * 100)}%`,
    );
  } else if (utilization >= T.capUtilizationWarning) {
    severity = escalate(severity, "warning");
    reasons.push(
      `${sessionMetrics.tradesTakenToday}/${cap} trades — daily cap reached`,
    );
  } else if (utilization >= T.capUtilizationCaution) {
    severity = escalate(severity, "caution");
    reasons.push(
      `${sessionMetrics.tradesTakenToday}/${cap} trades — ${Math.round(utilization * 100)}% of daily cap`,
    );
  } else if (utilization >= T.capUtilizationInfo) {
    severity = escalate(severity, "info");
    reasons.push(`${sessionMetrics.tradesTakenToday}/${cap} trades — pacing watch`);
  }

  const activations = behaviorEvents
    .filter((e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE)
    .sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  if (activations.length >= T.minTradesForGapCheck) {
    const first = new Date(activations[0].timestamp).getTime();
    const last = new Date(
      activations[activations.length - 1].timestamp,
    ).getTime();
    const avgGap = (last - first) / 60_000 / (activations.length - 1);
    if (Number.isFinite(avgGap) && avgGap < T.avgGapWarningMinutes) {
      severity = escalate(severity, "warning");
      reasons.push(`Average ${avgGap.toFixed(1)} min between trades`);
    }
  }

  if (severity == null) return null;

  return {
    id: "overtrading",
    severity,
    headline: "Trade pacing becoming unstable",
    description: "Trade frequency is accelerating past your configured pace.",
    reasons,
    recommendation:
      severity === "critical" || severity === "warning"
        ? "Stop opening new positions for the rest of the session. Review tomorrow."
        : "Slow the entry cadence. Skip the next setup unless it is exceptionally clean.",
  };
}

// -----------------------------------------------------------------------------
// Behavioral state derivation
//
// Ranked rules — first match wins. Order matches the spec's vocabulary in
// approximate "most concerning → least concerning" sequence so the state
// names map to the kind of behavior the trader is most identifiably in.
// -----------------------------------------------------------------------------
function deriveBehavioralState(
  detections: BehavioralDetection[],
): BehavioralState {
  const sev = (id: DetectionId): DetectionSeverity | null =>
    detections.find((d) => d.id === id)?.severity ?? null;

  const isWarn = (s: DetectionSeverity | null): boolean =>
    s === "warning" || s === "critical";
  const isCaution = (s: DetectionSeverity | null): boolean =>
    s === "caution" || isWarn(s);

  // Fatigued: pacing is degraded — too many trades / too tight together.
  // Comes first because it's the systemic state that should pause trading.
  if (isWarn(sev("overtrading"))) return "fatigued";

  // Impulsive: overriding interventions repeatedly — discipline is breaking
  // around explicit warnings.
  if (isWarn(sev("intervention_override"))) return "impulsive";

  // Escalating: risk size or stop position is growing past plan limits, or
  // any pattern hit critical.
  if (
    detections.some((d) => d.severity === "critical") ||
    isWarn(sev("position_size_escalation")) ||
    isWarn(sev("stop_widening"))
  ) {
    return "escalating";
  }

  // Reactive: trader is reacting to losses (revenge / rapid re-entry) but
  // hasn't yet escalated risk size.
  if (isCaution(sev("revenge_trading")) || isCaution(sev("rapid_reentry"))) {
    return "reactive";
  }

  // Controlled: detections present but only at info level — pattern is
  // observable but the trader is staying within bounds.
  if (detections.length > 0) return "controlled";

  // Focused: no patterns detected.
  return "focused";
}

// =============================================================================
// Public entry point — pure computation
// =============================================================================

export function computeBehavioralDetection(
  inputs: BehavioralDetectionInputs,
): BehavioralDetectionReading {
  // Detector signatures don't carry cluster — the cluster mapping lives
  // centrally in DETECTION_CLUSTER and is stamped on each result below.
  const detectors: Array<
    (i: BehavioralDetectionInputs) => DetectorOutput | null
  > = [
    detectRevengeTrading,
    detectPositionSizeEscalation,
    detectRapidReentry,
    detectStopWidening,
    detectInterventionOverride,
    detectOvertrading,
  ];

  const raw: DetectorOutput[] = [];
  for (const d of detectors) {
    const result = d(inputs);
    if (result) raw.push(result);
  }

  // Stamp cluster.
  const detectionsUnsorted: BehavioralDetection[] = raw.map((d) => ({
    ...d,
    cluster: DETECTION_CLUSTER[d.id],
  }));

  // Active clusters: any cluster with 2+ detections firing. This is the
  // session's dominant escalation arc — Today's Patterns surfaces the
  // active cluster as a header above the grouped rows so the trader
  // reads it as one behavioral story, not disconnected alerts.
  const byCluster = new Map<BehaviorCluster, BehavioralDetection[]>();
  for (const d of detectionsUnsorted) {
    const arr = byCluster.get(d.cluster) ?? [];
    arr.push(d);
    byCluster.set(d.cluster, arr);
  }
  const activeClusters: ActiveBehaviorCluster[] = [];
  for (const [cluster, items] of byCluster) {
    if (items.length < 2) continue;
    const dominant = items.reduce<BehavioralDetection>(
      (best, cur) =>
        SEVERITY_RANK[cur.severity] > SEVERITY_RANK[best.severity]
          ? cur
          : best,
      items[0],
    );
    activeClusters.push({
      cluster,
      label: BEHAVIOR_CLUSTER_LABEL[cluster],
      description: BEHAVIOR_CLUSTER_DESCRIPTION[cluster],
      detectionIds: items.map((d) => d.id),
      dominantSeverity: dominant.severity,
    });
  }
  activeClusters.sort(
    (a, b) =>
      SEVERITY_RANK[b.dominantSeverity] - SEVERITY_RANK[a.dominantSeverity],
  );

  // Sort detections by severity desc, but keep cluster members adjacent
  // so the UI can render cluster headers without re-ordering.
  // Strategy: primary sort by cluster dominant severity desc; secondary
  // sort by detection severity desc within the cluster; clusters with
  // only one detection still get a slot.
  const clusterDominant = new Map<BehaviorCluster, number>();
  for (const [cluster, items] of byCluster) {
    const top = Math.max(...items.map((d) => SEVERITY_RANK[d.severity]));
    clusterDominant.set(cluster, top);
  }
  const detections = [...detectionsUnsorted].sort((a, b) => {
    const aTop = clusterDominant.get(a.cluster) ?? 0;
    const bTop = clusterDominant.get(b.cluster) ?? 0;
    if (aTop !== bTop) return bTop - aTop;
    if (a.cluster !== b.cluster) return a.cluster.localeCompare(b.cluster);
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  });

  const dominantSeverity: DetectionSeverity =
    detections[0]?.severity ?? "info";
  const behavioralState = deriveBehavioralState(detections);
  const alertActive = detections.some(
    (d) => d.severity === "warning" || d.severity === "critical",
  );

  return {
    detections,
    activeClusters,
    behavioralState,
    dominantSeverity,
    alertActive,
  };
}

// =============================================================================
// React hook — memoized read for dashboard surfaces
// =============================================================================

// Mirror of the `useBehaviorAnalysis` shape: primitive selectors only +
// single `useMemo`. Each contributing slice is selected as a stable
// reference so the rendered object is referentially equal until something
// genuinely changes — avoids the getSnapshot loop trap.
export function useBehavioralDetection(): BehavioralDetectionReading {
  const behaviorEvents = useCurrentSessionEvents();
  const monitoringEvents = useCurrentSessionMonitoringEvents();
  const interventions = useCurrentSessionInterventions();
  const { activeTrades, closedTrades } = useCurrentSessionTrades();
  const riskRules = useAppStore((s) => s.riskRules);
  const sessionMetrics = useAppStore((s) => s.session);

  return useMemo(
    () =>
      computeBehavioralDetection({
        behaviorEvents,
        monitoringEvents,
        activeTrades,
        closedTrades,
        interventions,
        riskRules,
        sessionMetrics,
      }),
    [
      behaviorEvents,
      monitoringEvents,
      interventions,
      activeTrades,
      closedTrades,
      riskRules,
      sessionMetrics,
    ],
  );
}
