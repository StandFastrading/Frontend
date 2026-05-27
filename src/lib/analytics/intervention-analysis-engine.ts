import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type { BehaviorEvent } from "@/types";

import { type TimeframeDefinition } from "@/lib/analytics/timeframe";
import {
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";

// =============================================================================
// Intervention Effectiveness Analysis
// =============================================================================
//
// StandFast must eventually prove that "behavioral interruption changes
// decision quality." This file is where we measure that — deterministic
// metrics derived from observed intervention decisions + the events that
// followed them.
//
// Key metrics:
//
//   * overrideRate          continue_anyway / total intervention decisions
//   * cancelRate            cancel_trade / total
//   * reviseRate            revise_trade / total
//   * postWarningDeterioration  % of warnings followed by a destructive
//                               event within `deteriorationWindowMin`
//   * postInterventionStability % of interventions where NO destructive
//                               event followed within the same window
//   * interventionRecoveryRate  % of override decisions followed by a
//                               clean approval/exit within the same
//                               window (counter-evidence: the trader
//                               stabilized despite the override)
// =============================================================================

const DESTRUCTIVE_EVENT_TYPES = new Set<string>([
  BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
  BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
  BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  BEHAVIOR_EVENT_TYPES.MISTAKE_MARKED,
]);

const STABILIZING_EVENT_TYPES = new Set<string>([
  BEHAVIOR_EVENT_TYPES.TRADE_APPROVED,
  BEHAVIOR_EVENT_TYPES.TRADE_AVOIDED,
  BEHAVIOR_EVENT_TYPES.TRADE_REVISED,
  BEHAVIOR_EVENT_TYPES.STOP_TIGHTENED,
  BEHAVIOR_EVENT_TYPES.TRADE_EXIT_REFLECTION_ADDED,
]);

export const DETERIORATION_WINDOW_MIN = 30;

export type InterventionEffectiveness = {
  totalDecisions: number;
  overrideCount: number;
  cancelCount: number;
  reviseCount: number;
  // Rates are 0–100 percentages, rounded for display. Denominator is the
  // matching event source (e.g., totalDecisions, totalWarnings).
  overrideRate: number;
  cancelRate: number;
  reviseRate: number;
  totalWarningsTriggered: number;
  postWarningDeteriorationRate: number;
  postInterventionStabilityRate: number;
  // Counter-evidence: trader stabilized after overriding (the override
  // didn't lead to destruction). A higher rate here doesn't reward the
  // override — it just measures the outcome.
  postOverrideStabilizationRate: number;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function withinWindow(
  fromIso: string,
  toIso: string,
  windowMin: number,
): boolean {
  const f = new Date(fromIso).getTime();
  const t = new Date(toIso).getTime();
  if (!Number.isFinite(f) || !Number.isFinite(t)) return false;
  if (t < f) return false;
  return (t - f) / 60_000 <= windowMin;
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeInterventionEffectiveness(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): InterventionEffectiveness {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const sessionIds = new Set(windowed.map((s) => s.sessionId));

  const interventions = inputs.interventions.filter((i) =>
    sessionIds.has(i.sessionId ?? ""),
  );
  const behaviorEvents = inputs.behaviorEvents.filter((e) =>
    sessionIds.has(e.sessionId ?? ""),
  );

  const totalDecisions = interventions.length;
  let overrideCount = 0;
  let cancelCount = 0;
  let reviseCount = 0;
  for (const i of interventions) {
    if (i.decision === "continue_anyway") overrideCount += 1;
    else if (i.decision === "cancel_trade") cancelCount += 1;
    else if (i.decision === "revise_trade") reviseCount += 1;
  }

  // Warnings triggered = WARNING_TRIGGERED events. The post-warning
  // deterioration rate counts how often a warning was followed by a
  // destructive event within the window.
  const warningsTriggered = behaviorEvents.filter(
    (e: BehaviorEvent) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
  );
  let postWarningDeteriorated = 0;
  for (const w of warningsTriggered) {
    const deteriorated = behaviorEvents.some(
      (e) =>
        DESTRUCTIVE_EVENT_TYPES.has(e.eventType) &&
        withinWindow(w.timestamp, e.timestamp, DETERIORATION_WINDOW_MIN),
    );
    if (deteriorated) postWarningDeteriorated += 1;
  }

  // Post-intervention stability: the trader took an intervention decision
  // and NO destructive event followed within the window (counts the
  // trader's behavior, not the modal outcome).
  let postInterventionStable = 0;
  for (const i of interventions) {
    const deteriorated = behaviorEvents.some(
      (e) =>
        DESTRUCTIVE_EVENT_TYPES.has(e.eventType) &&
        withinWindow(i.timestamp, e.timestamp, DETERIORATION_WINDOW_MIN),
    );
    if (!deteriorated) postInterventionStable += 1;
  }

  // Post-override stabilization: when the trader DID override, did they
  // stabilize anyway? (Stabilizing events landed inside the window, AND
  // no further destructive event landed.)
  const overrides = interventions.filter(
    (i) => i.decision === "continue_anyway",
  );
  let postOverrideStabilized = 0;
  for (const o of overrides) {
    const stabilized = behaviorEvents.some(
      (e) =>
        STABILIZING_EVENT_TYPES.has(e.eventType) &&
        withinWindow(o.timestamp, e.timestamp, DETERIORATION_WINDOW_MIN),
    );
    const deteriorated = behaviorEvents.some(
      (e) =>
        DESTRUCTIVE_EVENT_TYPES.has(e.eventType) &&
        withinWindow(o.timestamp, e.timestamp, DETERIORATION_WINDOW_MIN),
    );
    if (stabilized && !deteriorated) postOverrideStabilized += 1;
  }

  return {
    totalDecisions,
    overrideCount,
    cancelCount,
    reviseCount,
    overrideRate: pct(overrideCount, totalDecisions),
    cancelRate: pct(cancelCount, totalDecisions),
    reviseRate: pct(reviseCount, totalDecisions),
    totalWarningsTriggered: warningsTriggered.length,
    postWarningDeteriorationRate: pct(
      postWarningDeteriorated,
      warningsTriggered.length,
    ),
    postInterventionStabilityRate: pct(
      postInterventionStable,
      totalDecisions,
    ),
    postOverrideStabilizationRate: pct(
      postOverrideStabilized,
      overrides.length,
    ),
  };
}
