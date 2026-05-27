import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  BEHAVIOR_CLUSTER_LABEL,
  type BehavioralDetectionReading,
} from "@/lib/detection/behavioral-detection-engine";
import {
  BEHAVIORAL_STATE_NARRATIVE,
  DISCIPLINE_BAND_LABEL,
  type BehavioralStateReading,
} from "@/lib/state/behavioral-state-aggregator";
import type {
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  ReflectionQuestionId,
  ReflectionSummarySnapshot,
} from "@/types";

// =============================================================================
// Reflection Engine
// =============================================================================
//
// Produces three things consumed by the Daily Reflection tab:
//
//   1. buildReflectionSummary    — frozen snapshot of the session's
//                                  behavioral context for the summary
//                                  card (and for persistence with the
//                                  saved reflection record)
//   2. buildBehavioralInsight    — single deterministic observation
//                                  derived from the live reading
//   3. buildTomorrowFocus        — single actionable focus objective
//
// All three are rule-based, traceable, and never use motivational copy.
// The vocabulary mirrors the existing aggregator + detection engine so
// the reflection page reads as the same voice as the rest of the app.
// =============================================================================

// -----------------------------------------------------------------------------
// Reflection prompts. Stored next to the question ids so renumbering
// happens in one place.
// -----------------------------------------------------------------------------
export const REFLECTION_QUESTIONS: ReadonlyArray<{
  id: ReflectionQuestionId;
  prompt: string;
  // Behavioral framing — appears as a sub-label under the prompt so
  // the trader knows what kind of answer the prompt is asking for.
  hint: string;
}> = [
  {
    id: "discipline_shift",
    prompt: "What moment shifted your discipline today?",
    hint: "The single event or decision that changed your session's behavioral trajectory.",
  },
  {
    id: "emotional_decision",
    prompt:
      "What decision today felt emotionally driven instead of process driven?",
    hint: "A trade or adjustment where the trigger was reactive rather than from your plan.",
  },
  {
    id: "minimized_warning",
    prompt: "What warning did you recognize but minimize?",
    hint: "A signal you noticed AND dismissed. Not a missed signal — a known one.",
  },
  {
    id: "dangerous_if_repeated",
    prompt:
      "What behavior today would become dangerous if repeated for 30 days?",
    hint: "Compound risk. Identify it now while the cost is one session.",
  },
  {
    id: "repeat_tomorrow",
    prompt:
      "What did you do well today that should be repeated tomorrow?",
    hint: "Behavioral, not P/L. Reinforce process, not outcome.",
  },
  {
    id: "identity_alignment",
    prompt:
      "Did your trading today align with your intended identity as a trader?",
    hint: "Behavior is the proof of identity. Where did today match it; where did it not?",
  },
];

// -----------------------------------------------------------------------------
// Inputs — minimal slice surface the engine needs. Centralized so
// callers (page hooks) only assemble it once.
// -----------------------------------------------------------------------------
export type ReflectionEngineInputs = {
  aggregation: BehavioralStateReading;
  detection: BehavioralDetectionReading;
  behaviorEvents: BehaviorEvent[];
  interventions: InterventionEvent[];
  closedTrades: ClosedTrade[];
};

// -----------------------------------------------------------------------------
// Display labels for behavioral state labels — kept here so the engine's
// summary snapshot carries human-readable copy alongside the wire ids.
// -----------------------------------------------------------------------------
const STATE_LABEL: Record<string, string> = {
  focused: "Focused",
  controlled: "Controlled",
  stable: "Stable",
  overtrading: "Overtrading",
  escalating: "Escalating",
  reactive: "Reactive",
  impulsive: "Impulsive",
  fatigued: "Fatigued",
  locked_down: "Locked Down",
};

// -----------------------------------------------------------------------------
// Summary builder — freezes the current session's behavioral context
// into a serializable snapshot. Used both for the reflection card and
// for persistence with the saved reflection record.
// -----------------------------------------------------------------------------
export function buildReflectionSummary(
  inputs: ReflectionEngineInputs,
): ReflectionSummarySnapshot {
  const { aggregation, detection, behaviorEvents, interventions, closedTrades } =
    inputs;

  const warningOverrides = interventions.filter(
    (i) => i.decision === "continue_anyway",
  ).length;
  const stopWidenEvents = behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  ).length;
  const positionSizeIncreases = behaviorEvents.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  ).length;
  const rapidReentries = behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  ).length;

  const overtradingDetected = detection.detections.some(
    (d) =>
      d.id === "overtrading" &&
      (d.severity === "warning" || d.severity === "critical"),
  );
  const escalationDetected =
    aggregation.state === "escalating" ||
    aggregation.state === "reactive" ||
    aggregation.state === "impulsive" ||
    aggregation.state === "fatigued";
  const lockoutActive = aggregation.state === "locked_down";

  // Clean executions = winning OR breakeven closes with zero deviations
  // and zero mistakes flagged.
  const cleanExecutions = closedTrades.filter(
    (t) =>
      (t.outcome === "win" || t.outcome === "breakeven") &&
      t.deviationCount === 0 &&
      t.mistakeCount === 0,
  ).length;

  // Biggest cluster = the active cluster with the highest dominant
  // severity. Null when no cluster is firing.
  const biggestCluster =
    detection.activeClusters.length > 0
      ? detection.activeClusters[0].cluster
      : null;
  const biggestClusterLabel = biggestCluster
    ? BEHAVIOR_CLUSTER_LABEL[detection.activeClusters[0].cluster]
    : null;

  // P/L surfaced muted-secondary per the product principle.
  const pnLToday =
    closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + t.realizedPnL, 0)
      : null;

  return {
    state: aggregation.state,
    stateLabel: STATE_LABEL[aggregation.state] ?? aggregation.state,
    disciplineScore: aggregation.disciplineScore,
    disciplineBand: aggregation.disciplineBand,
    disciplineBandLabel: DISCIPLINE_BAND_LABEL[aggregation.disciplineBand],
    warningOverrides,
    stopWidenEvents,
    positionSizeIncreases,
    rapidReentries,
    overtradingDetected,
    escalationDetected,
    lockoutActive,
    totalInterventions: interventions.length,
    cleanExecutions,
    tradesTakenToday: closedTrades.length,
    biggestCluster,
    biggestClusterLabel,
    pnLToday,
  };
}

// -----------------------------------------------------------------------------
// Behavioral insight generator — picks ONE observation that best
// describes the session. Priority ladder; first match wins. Tone is
// calm, analytical, professional. No motivational or therapy copy.
// -----------------------------------------------------------------------------
export function buildBehavioralInsight(
  inputs: ReflectionEngineInputs,
): string {
  const { aggregation, detection } = inputs;
  const summary = buildReflectionSummary(inputs);

  // 1. Locked down — most severe condition; clear, clinical copy.
  if (aggregation.state === "locked_down") {
    return "Trading access was restricted under critical behavioral instability. Recovery requires sustained discipline before re-engagement.";
  }

  // 2. Multi-cluster session — the dominant arc was rule defiance +
  //    emotional escalation simultaneously.
  if (detection.activeClusters.length >= 2) {
    return "Multiple behavioral clusters fired together. Rule defiance and emotional escalation compounded across the session.";
  }

  // 3. Single dominant cluster — specific, traceable observation per
  //    cluster id.
  if (detection.activeClusters.length === 1) {
    const top = detection.activeClusters[0];
    if (top.cluster === "emotional_escalation") {
      if (summary.warningOverrides > 0) {
        return "Behavioral pressure increased after warning overrides. Risk tolerance expanded under emotional load.";
      }
      return "Decisions began responding to recent events rather than to setups. Emotional escalation cluster fired.";
    }
    if (top.cluster === "rule_defiance") {
      if (summary.stopWidenEvents >= 2) {
        return "Risk parameters became negotiable under pressure. Stop discipline weakened multiple times this session.";
      }
      if (summary.warningOverrides > 0) {
        return "Warning checks were acknowledged but proceeded through. Rule boundaries were edited mid-decision.";
      }
      return "Rule boundaries shifted during execution. The plan was modified rather than honored.";
    }
    if (top.cluster === "fatigue_overuse") {
      return "Pacing discipline weakened despite otherwise controlled execution. Trade frequency outran focus capacity.";
    }
  }

  // 4. Stop widening alone (no cluster fired).
  if (summary.stopWidenEvents >= 2) {
    return "Stop discipline degraded across multiple trades. Risk parameters became negotiable under pressure.";
  }
  if (summary.stopWidenEvents === 1) {
    return "Stop discipline shifted once during the session. A single widening can preview a pattern worth watching.";
  }

  // 5. Overtrading alone.
  if (summary.overtradingDetected) {
    return "Trade pacing reached the configured daily limit. Behavior otherwise contained, but cadence warrants review.";
  }

  // 6. Single warning override, no other signals.
  if (summary.warningOverrides > 0 && detection.detections.length === 0) {
    return "A warning check was overridden without escalation following. The override pathway is worth examining even when the outcome held.";
  }

  // 7. Clean focused session.
  if (
    aggregation.state === "focused" &&
    summary.totalInterventions === 0 &&
    detection.detections.length === 0
  ) {
    return "Behavior remained structurally stable throughout the session. No interventions, no deviations.";
  }

  // 8. Controlled session with some signals.
  if (aggregation.state === "controlled") {
    return "Minor behavioral signals appeared but stayed contained. Session held inside its bounds.";
  }

  // 9. Stable / no specific arc.
  return aggregation.narrative ?? BEHAVIORAL_STATE_NARRATIVE.stable;
}

// -----------------------------------------------------------------------------
// Tomorrow focus generator — picks ONE focus objective for the next
// session. Single sentence, actionable, behavioral. Same priority ladder
// pattern.
// -----------------------------------------------------------------------------
export function buildTomorrowFocus(inputs: ReflectionEngineInputs): string {
  const { aggregation, detection } = inputs;
  const summary = buildReflectionSummary(inputs);

  if (aggregation.state === "locked_down") {
    return "Begin tomorrow at reduced size. Re-establish behavioral baseline before scaling decisions.";
  }

  // Top cluster determines the focus when one is active.
  if (detection.activeClusters.length > 0) {
    const top = detection.activeClusters[0];
    if (top.cluster === "rule_defiance") {
      if (summary.stopWidenEvents > 0) {
        return "Honor the original stop on every trade tomorrow. Treat a widened stop as a new trade decision.";
      }
      if (summary.warningOverrides > 0) {
        return "Respect the first warning tomorrow without negotiation.";
      }
      return "Hold every rule check as binding tomorrow — no plan edits mid-execution.";
    }
    if (top.cluster === "emotional_escalation") {
      if (summary.rapidReentries > 0) {
        return "Pause for the full cooldown after the first loss tomorrow. Re-entry is a separate decision, not a continuation.";
      }
      if (summary.positionSizeIncreases > 0) {
        return "Hold size at or below approval tomorrow. Adding under pressure compounds risk.";
      }
      return "Reduce trade frequency after the first loss tomorrow. Spacing protects judgment.";
    }
    if (top.cluster === "fatigue_overuse") {
      return "Cap entries at half of today's count. Quality over cadence.";
    }
  }

  // Pattern-specific focuses (no cluster).
  if (summary.stopWidenEvents > 0) {
    return "Honor the original invalidation tomorrow. Stops are decisions, not adjustable parameters.";
  }
  if (summary.warningOverrides > 0) {
    return "Respect the first warning tomorrow without negotiation.";
  }
  if (summary.overtradingDetected) {
    return "Reduce trade frequency tomorrow. Pacing earns discipline back.";
  }
  if (summary.rapidReentries > 0) {
    return "Pause after emotional acceleration. Cooldown is a decision tool, not a delay.";
  }

  // Positive baseline — protect what worked.
  if (
    aggregation.state === "focused" &&
    summary.cleanExecutions > 0 &&
    summary.totalInterventions === 0
  ) {
    return "Protect discipline during profitable momentum. The next mistake will likely follow a win.";
  }
  if (aggregation.state === "controlled" || aggregation.state === "stable") {
    return "Hold the same structure tomorrow. Repeat what worked today.";
  }

  // Generic fallback — observational, not motivational.
  return "Begin tomorrow by reviewing the original plan before the first entry.";
}
