import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import { computeInterventionOutcomes } from "@/lib/analytics/intervention-outcomes-engine";
import {
  buildDisciplineSeries,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";
import {
  CONFIDENCE_LABEL,
  TIMEFRAMES,
  type ConfidenceLevel,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import type {
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  TradingSession,
} from "@/types";

// =============================================================================
// Behavioral Progress / Improvement Tracking — orchestration, NOT a new engine
// =============================================================================
//
// PURPOSE
//   Answer one question for the trader: "Am I getting better?"
//
//   Compares a CURRENT window against the PRIOR equivalent window (7d
//   vs the 7d before, 30d vs the 30d before) and emits one record per
//   tracked behavior. Each record reads as "current vs previous,
//   improving / stable / deteriorating" — no charts, no percentages
//   the trader can't interpret in 5 seconds.
//
// SCOPE
//   PURE orchestration over already-recorded events + the existing
//   intervention-outcomes engine. No new analytics derivation; no AI;
//   no mutation of state.
//
// AI-READY SHAPES
//   `BehaviorProgressRecord` carries traderId, comparisonWindow,
//   behaviorType, previousValue, currentValue, trend, confidence,
//   supporting* arrays, createdAt — so a future mentor query like
//   "what improved over the last 7 days vs the prior 7?" can answer
//   without re-deriving anything.
// =============================================================================

export const PROGRESS_TRENDS = [
  "improving",
  "stable",
  "mixed",
  "deteriorating",
] as const;
export type ProgressTrend = (typeof PROGRESS_TRENDS)[number];

export const PROGRESS_TREND_LABEL: Record<ProgressTrend, string> = {
  improving: "Improving",
  stable: "Stable",
  mixed: "Mixed",
  deteriorating: "Deteriorating",
};

export const PROGRESS_TREND_ARROW: Record<ProgressTrend, string> = {
  improving: "↓",
  stable: "→",
  mixed: "↕",
  deteriorating: "↑",
};

export type ComparisonWindowId = "7d" | "30d";

export type BehaviorProgressRecord = {
  recordId: string;
  traderId: string;
  comparisonWindow: ComparisonWindowId;
  behaviorType: string;
  behaviorLabel: string;
  // Whether a higher value reads as better (discipline, clean sessions)
  // or worse (stop widening, overrides). Surfaces use this to pick the
  // correct arrow direction without re-deriving.
  directionPreference: "higher" | "lower";
  currentValue: number;
  previousValue: number;
  // Pre-formatted display strings — keep the surfaces dumb.
  currentLabel: string;
  previousLabel: string;
  trend: ProgressTrend;
  trendArrow: string;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  // Plain explanation of the change for the AI-retrieval layer.
  explanation: string;
  supportingPatternIds: string[];
  supportingClusterIds: string[];
  createdAt: string;
};

export type BehaviorProgressSummary = {
  traderId: string;
  comparisonWindow: ComparisonWindowId;
  currentSessionCount: number;
  previousSessionCount: number;
  hasInsufficientHistory: boolean;
  records: BehaviorProgressRecord[];
  overallTrend: ProgressTrend;
  overallSummaryCopy: string;
  generatedAt: string;
};

export type BehaviorProgressInputs = AnalyticsSliceInputs & {
  traderId: string;
};

const MIN_SESSIONS_PER_PERIOD = 2;

// Significance gate — keeps single-event noise from triggering an
// "improving" / "deteriorating" classification. A change must be
// ≥ 25% AND ≥ 1 absolute unit to count as a real direction; otherwise
// the record reads as `stable`.
const SIGNIFICANCE_RELATIVE = 0.25;
const SIGNIFICANCE_ABSOLUTE = 1;

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeBehaviorProgress(
  inputs: BehaviorProgressInputs,
  comparisonWindow: ComparisonWindowId,
  nowMs: number,
): BehaviorProgressSummary {
  const windowMs = comparisonWindow === "7d" ? 7 : 30;
  const dayMs = 24 * 60 * 60 * 1000;

  const currentStartMs = nowMs - windowMs * dayMs;
  const previousStartMs = currentStartMs - windowMs * dayMs;
  const previousEndMs = currentStartMs;

  const currentSessions = sessionsBetween(
    inputs.sessions,
    currentStartMs,
    nowMs,
  );
  const previousSessions = sessionsBetween(
    inputs.sessions,
    previousStartMs,
    previousEndMs,
  );
  const generatedAt = new Date(nowMs).toISOString();

  if (
    currentSessions.length < MIN_SESSIONS_PER_PERIOD ||
    previousSessions.length < MIN_SESSIONS_PER_PERIOD
  ) {
    return {
      traderId: inputs.traderId,
      comparisonWindow,
      currentSessionCount: currentSessions.length,
      previousSessionCount: previousSessions.length,
      hasInsufficientHistory: true,
      records: [],
      overallTrend: "stable",
      overallSummaryCopy:
        "More session history is needed before progress tracking becomes available.",
      generatedAt,
    };
  }

  const currentIds = new Set(currentSessions.map((s) => s.sessionId));
  const previousIds = new Set(previousSessions.map((s) => s.sessionId));

  // Per-period slices of the raw event log.
  const currentBehavior = inputs.behaviorEvents.filter((e) =>
    currentIds.has(e.sessionId ?? ""),
  );
  const previousBehavior = inputs.behaviorEvents.filter((e) =>
    previousIds.has(e.sessionId ?? ""),
  );
  const currentInterventions = inputs.interventions.filter((i) =>
    currentIds.has(i.sessionId ?? ""),
  );
  const previousInterventions = inputs.interventions.filter((i) =>
    previousIds.has(i.sessionId ?? ""),
  );
  const currentClosed = inputs.closedTrades.filter((t) =>
    currentIds.has(t.sessionId ?? ""),
  );
  const previousClosed = inputs.closedTrades.filter((t) =>
    previousIds.has(t.sessionId ?? ""),
  );

  // Pull the timeframe-shaped intervention outcomes for response
  // quality scoring. The existing engine is window-aware so we run it
  // against a synthetic timeframe per period.
  const currentOutcomes = computeInterventionOutcomes(
    { ...inputs, historicalBaselines: null },
    syntheticTimeframe(comparisonWindow),
    nowMs,
  );
  const previousOutcomes = computeInterventionOutcomes(
    { ...inputs, historicalBaselines: null },
    syntheticTimeframe(comparisonWindow),
    previousEndMs,
  );

  const records: BehaviorProgressRecord[] = [
    buildCountRecord({
      behaviorType: "stop_widening",
      behaviorLabel: "Stop Widening",
      eventTypes: [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER],
      currentBehavior,
      previousBehavior,
      directionPreference: "lower",
      ...sharedRecordMeta(inputs.traderId, comparisonWindow, generatedAt),
      currentSessionCount: currentSessions.length,
      previousSessionCount: previousSessions.length,
    }),
    buildCountRecord({
      behaviorType: "warning_overrides",
      behaviorLabel: "Warning Overrides",
      eventTypes: [
        BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
        BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
      ],
      currentBehavior,
      previousBehavior,
      directionPreference: "lower",
      ...sharedRecordMeta(inputs.traderId, comparisonWindow, generatedAt),
      currentSessionCount: currentSessions.length,
      previousSessionCount: previousSessions.length,
    }),
    buildCountRecord({
      behaviorType: "rapid_reentries",
      behaviorLabel: "Rapid Re-Entries",
      eventTypes: [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION],
      currentBehavior,
      previousBehavior,
      directionPreference: "lower",
      ...sharedRecordMeta(inputs.traderId, comparisonWindow, generatedAt),
      currentSessionCount: currentSessions.length,
      previousSessionCount: previousSessions.length,
    }),
    buildEarlySessionRecord({
      currentSessions,
      previousSessions,
      currentBehavior,
      previousBehavior,
      ...sharedRecordMeta(inputs.traderId, comparisonWindow, generatedAt),
    }),
    buildResponseQualityRecord({
      currentOutcomes,
      previousOutcomes,
      ...sharedRecordMeta(inputs.traderId, comparisonWindow, generatedAt),
    }),
    buildDisciplineRecord({
      inputs,
      currentStartMs,
      previousStartMs,
      previousEndMs,
      nowMs,
      ...sharedRecordMeta(inputs.traderId, comparisonWindow, generatedAt),
    }),
    buildRuleAdherenceRecord({
      currentSessionCount: currentSessions.length,
      previousSessionCount: previousSessions.length,
      currentBehavior,
      previousBehavior,
      currentInterventions,
      previousInterventions,
      ...sharedRecordMeta(inputs.traderId, comparisonWindow, generatedAt),
    }),
    buildCleanSessionsRecord({
      currentSessions,
      previousSessions,
      currentBehavior,
      previousBehavior,
      currentClosed,
      previousClosed,
      ...sharedRecordMeta(inputs.traderId, comparisonWindow, generatedAt),
    }),
  ];

  const overallTrend = deriveOverallTrend(records);
  const overallSummaryCopy = deriveOverallSummary(records, overallTrend);

  return {
    traderId: inputs.traderId,
    comparisonWindow,
    currentSessionCount: currentSessions.length,
    previousSessionCount: previousSessions.length,
    hasInsufficientHistory: false,
    records,
    overallTrend,
    overallSummaryCopy,
    generatedAt,
  };
}

// -----------------------------------------------------------------------------
// Period helpers
// -----------------------------------------------------------------------------

function sessionsBetween(
  sessions: TradingSession[],
  startMs: number,
  endMs: number,
): TradingSession[] {
  return sessions.filter((s) => {
    const t = new Date(s.startedAt).getTime();
    if (!Number.isFinite(t)) return false;
    return t >= startMs && t < endMs;
  });
}

function syntheticTimeframe(
  comparisonWindow: ComparisonWindowId,
): TimeframeDefinition {
  // The existing engines accept a TimeframeDefinition with a windowMs.
  // We re-use the canonical 7d / 30d definitions; the period boundary
  // is enforced by the `nowMs` the callers pass into the downstream
  // engines, so `isWithinTimeframe` filters correctly per period.
  return TIMEFRAMES[comparisonWindow];
}

function sharedRecordMeta(
  traderId: string,
  comparisonWindow: ComparisonWindowId,
  generatedAt: string,
): {
  traderId: string;
  comparisonWindow: ComparisonWindowId;
  generatedAt: string;
} {
  return { traderId, comparisonWindow, generatedAt };
}

// -----------------------------------------------------------------------------
// Per-record builders
// -----------------------------------------------------------------------------

type SharedMeta = {
  traderId: string;
  comparisonWindow: ComparisonWindowId;
  generatedAt: string;
};

function buildCountRecord(input: {
  behaviorType: string;
  behaviorLabel: string;
  eventTypes: string[];
  currentBehavior: BehaviorEvent[];
  previousBehavior: BehaviorEvent[];
  directionPreference: "higher" | "lower";
  currentSessionCount: number;
  previousSessionCount: number;
} & SharedMeta): BehaviorProgressRecord {
  const accept = new Set(input.eventTypes);
  const current = input.currentBehavior.filter((e) =>
    accept.has(e.eventType),
  ).length;
  const previous = input.previousBehavior.filter((e) =>
    accept.has(e.eventType),
  ).length;
  return finalize(input, {
    currentValue: current,
    previousValue: previous,
    currentLabel: String(current),
    previousLabel: String(previous),
  });
}

function buildEarlySessionRecord(input: {
  currentSessions: TradingSession[];
  previousSessions: TradingSession[];
  currentBehavior: BehaviorEvent[];
  previousBehavior: BehaviorEvent[];
} & SharedMeta): BehaviorProgressRecord {
  const current = countEarlySessionDeterioration(
    input.currentSessions,
    input.currentBehavior,
  );
  const previous = countEarlySessionDeterioration(
    input.previousSessions,
    input.previousBehavior,
  );
  return finalize(
    {
      ...input,
      behaviorType: "early_session_deterioration",
      behaviorLabel: "Discipline Drift",
      directionPreference: "lower" as const,
      currentSessionCount: input.currentSessions.length,
      previousSessionCount: input.previousSessions.length,
    },
    {
      currentValue: current,
      previousValue: previous,
      currentLabel: String(current),
      previousLabel: String(previous),
    },
  );
}

function buildResponseQualityRecord(input: {
  currentOutcomes: ReturnType<typeof computeInterventionOutcomes>;
  previousOutcomes: ReturnType<typeof computeInterventionOutcomes>;
} & SharedMeta): BehaviorProgressRecord {
  const score = (
    o: ReturnType<typeof computeInterventionOutcomes>,
  ): number => {
    const positive = o.canceledTradeCount + o.revisedTradeCount;
    const total = positive + o.continueAnywayCount;
    if (total === 0) return 0;
    return Math.round((positive / total) * 100);
  };
  const current = score(input.currentOutcomes);
  const previous = score(input.previousOutcomes);
  return finalize(
    {
      ...input,
      behaviorType: "intervention_response_quality",
      behaviorLabel: "Intervention Response Quality",
      directionPreference: "higher" as const,
      currentSessionCount: input.currentOutcomes.windowSessionCount,
      previousSessionCount: input.previousOutcomes.windowSessionCount,
    },
    {
      currentValue: current,
      previousValue: previous,
      currentLabel: `${current}%`,
      previousLabel: `${previous}%`,
    },
  );
}

function buildDisciplineRecord(input: {
  inputs: BehaviorProgressInputs;
  currentStartMs: number;
  previousStartMs: number;
  previousEndMs: number;
  nowMs: number;
} & SharedMeta): BehaviorProgressRecord {
  const tf = TIMEFRAMES[input.comparisonWindow];
  const currentSeries = buildDisciplineSeries(input.inputs, tf, input.nowMs);
  const previousSeries = buildDisciplineSeries(
    input.inputs,
    tf,
    input.previousEndMs,
  );
  const median = (points: { value: number }[]): number => {
    if (points.length === 0) return 0;
    const sorted = [...points].map((p) => p.value).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : Math.round(sorted[mid]);
  };
  const current = median(currentSeries.points);
  const previous = median(previousSeries.points);
  return finalize(
    {
      ...input,
      behaviorType: "discipline_stability",
      behaviorLabel: "Discipline Stability",
      directionPreference: "higher" as const,
      currentSessionCount: currentSeries.points.length,
      previousSessionCount: previousSeries.points.length,
    },
    {
      currentValue: current,
      previousValue: previous,
      currentLabel: String(current),
      previousLabel: String(previous),
    },
  );
}

function buildRuleAdherenceRecord(input: {
  currentSessionCount: number;
  previousSessionCount: number;
  currentBehavior: BehaviorEvent[];
  previousBehavior: BehaviorEvent[];
  currentInterventions: InterventionEvent[];
  previousInterventions: InterventionEvent[];
} & SharedMeta): BehaviorProgressRecord {
  const adherenceRate = (
    behavior: BehaviorEvent[],
    interventions: InterventionEvent[],
  ): number => {
    const overrides = interventions.filter(
      (i) => i.decision === "continue_anyway",
    ).length;
    const responsive = interventions.filter(
      (i) => i.decision === "cancel_trade" || i.decision === "revise_trade",
    ).length;
    const ignored = behavior.filter(
      (e) =>
        e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
        e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    ).length;
    const totalDecisions = overrides + responsive;
    if (totalDecisions === 0 && ignored === 0) return 100;
    if (totalDecisions === 0) return 0;
    // Adherence = % of decisions that respected the warning.
    return Math.round((responsive / totalDecisions) * 100);
  };
  const current = adherenceRate(
    input.currentBehavior,
    input.currentInterventions,
  );
  const previous = adherenceRate(
    input.previousBehavior,
    input.previousInterventions,
  );
  return finalize(
    {
      ...input,
      behaviorType: "rule_adherence",
      behaviorLabel: "Rule Adherence",
      directionPreference: "higher" as const,
    },
    {
      currentValue: current,
      previousValue: previous,
      currentLabel: `${current}%`,
      previousLabel: `${previous}%`,
    },
  );
}

function buildCleanSessionsRecord(input: {
  currentSessions: TradingSession[];
  previousSessions: TradingSession[];
  currentBehavior: BehaviorEvent[];
  previousBehavior: BehaviorEvent[];
  currentClosed: ClosedTrade[];
  previousClosed: ClosedTrade[];
} & SharedMeta): BehaviorProgressRecord {
  const destructive = new Set<string>([
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
    BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
    BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
    BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  ]);
  const countClean = (
    sessions: TradingSession[],
    behavior: BehaviorEvent[],
  ): number => {
    return sessions.filter((s) => {
      const sessionEvents = behavior.filter(
        (e) => e.sessionId === s.sessionId,
      );
      return !sessionEvents.some((e) => destructive.has(e.eventType));
    }).length;
  };
  const current = countClean(input.currentSessions, input.currentBehavior);
  const previous = countClean(
    input.previousSessions,
    input.previousBehavior,
  );
  return finalize(
    {
      ...input,
      behaviorType: "clean_sessions",
      behaviorLabel: "Clean Sessions",
      directionPreference: "higher" as const,
      currentSessionCount: input.currentSessions.length,
      previousSessionCount: input.previousSessions.length,
    },
    {
      currentValue: current,
      previousValue: previous,
      currentLabel: String(current),
      previousLabel: String(previous),
    },
  );
}

// -----------------------------------------------------------------------------
// Finalize — trend classification + confidence
// -----------------------------------------------------------------------------

function finalize(
  base: SharedMeta & {
    behaviorType: string;
    behaviorLabel: string;
    directionPreference: "higher" | "lower";
    currentSessionCount: number;
    previousSessionCount: number;
  },
  values: {
    currentValue: number;
    previousValue: number;
    currentLabel: string;
    previousLabel: string;
  },
): BehaviorProgressRecord {
  const trend = classifyTrend(
    values.currentValue,
    values.previousValue,
    base.directionPreference,
  );
  const arrow =
    trend === "improving"
      ? base.directionPreference === "lower"
        ? "↓"
        : "↑"
      : trend === "deteriorating"
        ? base.directionPreference === "lower"
          ? "↑"
          : "↓"
        : PROGRESS_TREND_ARROW[trend];
  const confidence = confidenceFor(
    base.currentSessionCount + base.previousSessionCount,
  );
  return {
    recordId: `progress_${base.behaviorType}_${base.generatedAt}`,
    traderId: base.traderId,
    comparisonWindow: base.comparisonWindow,
    behaviorType: base.behaviorType,
    behaviorLabel: base.behaviorLabel,
    directionPreference: base.directionPreference,
    currentValue: values.currentValue,
    previousValue: values.previousValue,
    currentLabel: values.currentLabel,
    previousLabel: values.previousLabel,
    trend,
    trendArrow: arrow,
    confidence,
    confidenceLabel: CONFIDENCE_LABEL[confidence],
    explanation: buildExplanation(
      base.behaviorLabel,
      values.previousValue,
      values.currentValue,
      base.directionPreference,
      trend,
    ),
    supportingPatternIds: [],
    supportingClusterIds: [],
    createdAt: base.generatedAt,
  };
}

function classifyTrend(
  current: number,
  previous: number,
  directionPreference: "higher" | "lower",
): ProgressTrend {
  if (current === previous) return "stable";
  const delta = current - previous;
  const absDelta = Math.abs(delta);
  const denom = Math.max(1, Math.abs(previous));
  const relDelta = absDelta / denom;
  // Below the significance gate → stable.
  if (relDelta < SIGNIFICANCE_RELATIVE && absDelta < SIGNIFICANCE_ABSOLUTE) {
    return "stable";
  }
  const wentDown = delta < 0;
  if (directionPreference === "lower") {
    return wentDown ? "improving" : "deteriorating";
  }
  return wentDown ? "deteriorating" : "improving";
}

function confidenceFor(combinedSessions: number): ConfidenceLevel {
  if (combinedSessions === 0) return "insufficient";
  if (combinedSessions >= 10) return "high";
  if (combinedSessions >= 4) return "moderate";
  return "emerging";
}

function countEarlySessionDeterioration(
  sessions: TradingSession[],
  events: BehaviorEvent[],
): number {
  const THIRTY_MIN_MS = 30 * 60_000;
  const deteriorationTypes = new Set<string>([
    BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
    BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  ]);
  let total = 0;
  for (const session of sessions) {
    const startMs = new Date(session.startedAt).getTime();
    if (!Number.isFinite(startMs)) continue;
    const activations = events
      .filter(
        (e) =>
          e.sessionId === session.sessionId &&
          e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
      )
      .map((e) => new Date(e.timestamp).getTime())
      .sort((a, b) => a - b);
    const thirdActivation = activations[2] ?? null;
    const inWindow = events.filter((e) => {
      if (e.sessionId !== session.sessionId) return false;
      if (!deteriorationTypes.has(e.eventType)) return false;
      const t = new Date(e.timestamp).getTime();
      if (!Number.isFinite(t)) return false;
      const within30 = t - startMs <= THIRTY_MIN_MS;
      const withinFirst2 = thirdActivation == null ? true : t < thirdActivation;
      return within30 || withinFirst2;
    });
    total += inWindow.length;
  }
  return total;
}

// -----------------------------------------------------------------------------
// Overall summary
// -----------------------------------------------------------------------------

function deriveOverallTrend(
  records: BehaviorProgressRecord[],
): ProgressTrend {
  if (records.length === 0) return "stable";
  let improving = 0;
  let deteriorating = 0;
  for (const r of records) {
    if (r.trend === "improving") improving += 1;
    else if (r.trend === "deteriorating") deteriorating += 1;
  }
  if (improving === 0 && deteriorating === 0) return "stable";
  if (improving > deteriorating * 2) return "improving";
  if (deteriorating > improving * 2) return "deteriorating";
  return "mixed";
}

function deriveOverallSummary(
  records: BehaviorProgressRecord[],
  overall: ProgressTrend,
): string {
  const improving = records.filter((r) => r.trend === "improving").length;
  const deteriorating = records.filter(
    (r) => r.trend === "deteriorating",
  ).length;
  const total = records.length;
  if (overall === "improving") {
    return `${improving} of ${total} tracked behaviors improved during this period.`;
  }
  if (overall === "deteriorating") {
    return `${deteriorating} of ${total} tracked behaviors worsened during this period.`;
  }
  if (overall === "mixed") {
    return `${improving} of ${total} improved, ${deteriorating} worsened — direction is mixed.`;
  }
  return `Behavior held steady across the tracked categories.`;
}

function buildExplanation(
  label: string,
  previous: number,
  current: number,
  directionPreference: "higher" | "lower",
  trend: ProgressTrend,
): string {
  const verb =
    trend === "improving"
      ? directionPreference === "lower"
        ? "dropped"
        : "rose"
      : trend === "deteriorating"
        ? directionPreference === "lower"
          ? "rose"
          : "dropped"
        : "held";
  return `${label} ${verb} from ${previous} to ${current} compared to the prior window.`;
}
