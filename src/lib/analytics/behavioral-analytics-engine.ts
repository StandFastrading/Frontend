import {
  BEHAVIOR_CLUSTER_LABEL,
  computeBehavioralDetection,
  type BehaviorCluster,
  type DetectionId,
} from "@/lib/detection/behavioral-detection-engine";
import { computeBehavioralStateAggregation } from "@/lib/state/behavioral-state-aggregator";
import type { BehavioralStateLabel } from "@/lib/state/behavioral-state-aggregator";

import {
  confidenceFromSampleSize,
  type ConfidenceLevel,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import {
  buildDisciplineSeries,
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";

// =============================================================================
// Behavioral Analytics — page-wide snapshot engine
// =============================================================================
//
// Computes the headline read for the Behavioral Profile Header. Everything
// is derived from already-persisted slices + the existing engines so the
// analytics page is consistent with the live dashboard.
//
// Sample-size awareness is built in: every claim carries a confidence
// level and the engine refuses to surface "most improved" or "most common
// weakness" when the timeframe contains too few sessions.
// =============================================================================

export type BehavioralWeaknessId = DetectionId;

export type BehavioralProfileSnapshot = {
  // Aggregated state across the window — the state the trader has spent
  // the most time in. For "Today" this is just the current state.
  currentState: BehavioralStateLabel;
  // Average discipline score across all sessions in the window.
  averageDiscipline: number;
  // Median is a steadier reference than mean — surfaced so the UI can
  // show both when sample size warrants.
  medianDiscipline: number;
  // Direction the discipline series is moving (improving / declining /
  // stable). Null when sample size is too small.
  disciplineTrend: "improving" | "declining" | "stable" | null;
  // Behavioral Stability Score — coefficient-of-variation-style spread
  // measure inverted to 0–100. High = consistent; low = volatile.
  stabilityScore: number;
  // Most-frequent detection across the window. Null when nothing fired.
  mostCommonWeakness: {
    id: BehavioralWeaknessId;
    label: string;
    cluster: BehaviorCluster;
    occurrences: number;
  } | null;
  // The detection that fired LESS often in the second half of the window
  // than the first — the trader's improving area. Null when sample is
  // insufficient for a credible compare.
  mostImprovedArea: {
    id: BehavioralWeaknessId;
    label: string;
    cluster: BehaviorCluster;
    firstHalfCount: number;
    secondHalfCount: number;
  } | null;
  // Confidence rating for the snapshot.
  confidence: ConfidenceLevel;
  sessionCount: number;
  // Sample-aware copy. Mirrors the "Emerging pattern" / "Moderate
  // confidence" vocabulary so the page never speaks with certainty after
  // tiny samples.
  confidenceLabel: string;
};

// Map of detection id → display label for the snapshot card. Friendlier
// than the snake_case wire id.
const DETECTION_LABEL: Record<DetectionId, string> = {
  revenge_trading: "Revenge trading",
  position_size_escalation: "Position size escalation",
  rapid_reentry: "Rapid re-entry",
  stop_widening: "Stop widening",
  intervention_override: "Intervention override",
  overtrading: "Overtrading",
};

const DETECTION_CLUSTER_LOCAL: Record<DetectionId, BehaviorCluster> = {
  revenge_trading: "emotional_escalation",
  rapid_reentry: "emotional_escalation",
  position_size_escalation: "emotional_escalation",
  stop_widening: "rule_defiance",
  intervention_override: "rule_defiance",
  overtrading: "fatigue_overuse",
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function stabilityFromDisciplineSeries(values: number[]): number {
  if (values.length < 2) return values[0] ?? 100;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdev = Math.sqrt(variance);
  // Coefficient of variation (CV) = stdev / mean — lower = steadier.
  // Convert to a 0–100 score where 100 = no variance, 0 = full variance.
  const cv = stdev / mean;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - Math.min(1, cv)))));
}

function mostFrequentState(
  states: BehavioralStateLabel[],
): BehavioralStateLabel {
  if (states.length === 0) return "focused";
  const counts = new Map<BehavioralStateLabel, number>();
  for (const s of states) counts.set(s, (counts.get(s) ?? 0) + 1);
  let best: BehavioralStateLabel = states[0];
  let bestCount = 0;
  for (const [s, c] of counts) {
    if (c > bestCount) {
      best = s;
      bestCount = c;
    }
  }
  return best;
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeBehavioralProfileSnapshot(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): BehavioralProfileSnapshot {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const sessionCount = windowed.length;
  const confidence = confidenceFromSampleSize(sessionCount, timeframe);

  // Per-session aggregation rolls — also gives us the detection counts we
  // need for "most common weakness" + "most improved area".
  const states: BehavioralStateLabel[] = [];
  const disciplineSeries = buildDisciplineSeries(inputs, timeframe, nowMs);
  const detectionCounts: Record<DetectionId, number> = {
    revenge_trading: 0,
    position_size_escalation: 0,
    rapid_reentry: 0,
    stop_widening: 0,
    intervention_override: 0,
    overtrading: 0,
  };
  const detectionCountsFirstHalf: Record<DetectionId, number> = {
    revenge_trading: 0,
    position_size_escalation: 0,
    rapid_reentry: 0,
    stop_widening: 0,
    intervention_override: 0,
    overtrading: 0,
  };
  const detectionCountsSecondHalf: Record<DetectionId, number> = {
    revenge_trading: 0,
    position_size_escalation: 0,
    rapid_reentry: 0,
    stop_widening: 0,
    intervention_override: 0,
    overtrading: 0,
  };
  const halfIndex = Math.floor(windowed.length / 2);

  windowed.forEach((session, idx) => {
    const sessionEvents = inputs.behaviorEvents.filter(
      (e) => e.sessionId === session.sessionId,
    );
    const sessionMonitoring = inputs.monitoringEvents.filter(
      (e) => e.sessionId === session.sessionId,
    );
    const sessionInterventions = inputs.interventions.filter(
      (e) => e.sessionId === session.sessionId,
    );
    const sessionTrades = inputs.closedTrades.filter(
      (t) => t.sessionId === session.sessionId,
    );

    const detectionReading = computeBehavioralDetection({
      behaviorEvents: sessionEvents,
      monitoringEvents: sessionMonitoring,
      interventions: sessionInterventions,
      activeTrades: [],
      closedTrades: sessionTrades,
      riskRules: inputs.riskRules,
      sessionMetrics: inputs.liveSessionMetrics,
    });

    const isLive = session.sessionId === inputs.activeSessionId;
    const sampleMs = isLive
      ? nowMs
      : session.endedAt
        ? new Date(session.endedAt).getTime()
        : nowMs;

    const aggregation = computeBehavioralStateAggregation({
      behaviorEvents: sessionEvents,
      monitoringEvents: sessionMonitoring,
      interventions: sessionInterventions,
      detections: detectionReading.detections,
      closedTrades: sessionTrades,
      sessionMetrics: inputs.liveSessionMetrics,
      riskRules: inputs.riskRules,
      nowMs: sampleMs,
    });
    states.push(aggregation.state);

    for (const detection of detectionReading.detections) {
      detectionCounts[detection.id] += 1;
      if (idx < halfIndex) {
        detectionCountsFirstHalf[detection.id] += 1;
      } else {
        detectionCountsSecondHalf[detection.id] += 1;
      }
    }
  });

  const disciplineValues = disciplineSeries.points.map((p) => p.value);
  const averageDiscipline =
    disciplineValues.length > 0
      ? Math.round(
          disciplineValues.reduce((s, v) => s + v, 0) /
            disciplineValues.length,
        )
      : 100;
  const sorted = [...disciplineValues].sort((a, b) => a - b);
  const medianDiscipline =
    sorted.length === 0
      ? 100
      : sorted.length % 2 === 0
        ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
        : sorted[Math.floor(sorted.length / 2)];

  // Most-common weakness: the highest count across the full window.
  let mostCommonWeakness: BehavioralProfileSnapshot["mostCommonWeakness"] =
    null;
  let bestCount = 0;
  for (const id of Object.keys(detectionCounts) as DetectionId[]) {
    const c = detectionCounts[id];
    if (c > bestCount) {
      bestCount = c;
      mostCommonWeakness = {
        id,
        label: DETECTION_LABEL[id],
        cluster: DETECTION_CLUSTER_LOCAL[id],
        occurrences: c,
      };
    }
  }

  // Most-improved area: detection that fired less in the second half than
  // the first half. Refuses to claim improvement on a 1-session sample.
  let mostImprovedArea: BehavioralProfileSnapshot["mostImprovedArea"] = null;
  if (windowed.length >= timeframe.moderateConfidenceMinSessions * 2) {
    let bestImprovement = 0;
    for (const id of Object.keys(detectionCounts) as DetectionId[]) {
      const a = detectionCountsFirstHalf[id];
      const b = detectionCountsSecondHalf[id];
      const delta = a - b;
      if (a > 0 && delta > bestImprovement) {
        bestImprovement = delta;
        mostImprovedArea = {
          id,
          label: DETECTION_LABEL[id],
          cluster: DETECTION_CLUSTER_LOCAL[id],
          firstHalfCount: a,
          secondHalfCount: b,
        };
      }
    }
  }

  const stabilityScore = stabilityFromDisciplineSeries(disciplineValues);

  // Trend direction — borrow from the discipline series (already
  // computed correctly for the higher-is-better semantics).
  const disciplineTrend =
    disciplineSeries.direction === "insufficient"
      ? null
      : disciplineSeries.direction;

  const confidenceLabel =
    sessionCount === 0
      ? "No sessions in window"
      : sessionCount === 1
        ? "Single-session sample"
        : sessionCount < timeframe.moderateConfidenceMinSessions
          ? "Emerging pattern"
          : sessionCount < timeframe.highConfidenceMinSessions
            ? "Moderate confidence"
            : "High confidence";

  return {
    currentState: mostFrequentState(states),
    averageDiscipline,
    medianDiscipline,
    disciplineTrend,
    stabilityScore,
    mostCommonWeakness,
    mostImprovedArea,
    confidence,
    sessionCount,
    confidenceLabel,
  };
}

// Re-exported so consumers reading from this module don't have to import
// from the detection engine for the cluster label map.
export { BEHAVIOR_CLUSTER_LABEL };
