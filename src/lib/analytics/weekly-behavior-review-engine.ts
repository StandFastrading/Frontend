import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  computeBehavioralObjective,
  type BehavioralObjective,
} from "@/lib/analytics/behavioral-objective-engine";
import {
  computeBehaviorClusterFormations,
  type BehaviorClusterFormation,
} from "@/lib/analytics/pattern-cluster-recurrence";
import {
  computeInterventionOutcomes,
  type InterventionOutcomeSummary,
} from "@/lib/analytics/intervention-outcomes-engine";
import {
  buildDisciplineSeries,
  sessionsInWindow,
  type AnalyticsSliceInputs,
  type TrendSeries,
} from "@/lib/analytics/trend-series";
import {
  CONFIDENCE_LABEL,
  TIMEFRAMES,
  type ConfidenceLevel,
} from "@/lib/analytics/timeframe";
import type {
  BehaviorEvent,
  DailyReflection,
  SessionNote,
  TradeReflection,
} from "@/types";

// =============================================================================
// Weekly Behavioral Review — orchestration only, NOT a new engine
// =============================================================================
//
// PURPOSE
//   Summarize a trader's recent 7-day behavioral history in five short
//   sections — Top Strength, Recurring Issue, Intervention Response,
//   Weekly Trend, Next Week Focus. Reads like a coach's summary, not
//   a data dump. No new analytics: every section consumes an existing
//   engine output verbatim.
//
// WINDOW
//   Fixed 7-day window — the review is "weekly" by definition. Both
//   surfaces (Dashboard + Analytics page) render the same review so
//   the trader doesn't see contradictory summaries between tabs.
//
// EMPTY STATE
//   Below `MIN_SESSIONS_FOR_REVIEW` sessions in the window, the engine
//   returns `hasInsufficientHistory: true` and every section is null;
//   surfaces render the spec's empty-state copy.
//
// AI-READY SHAPE
//   `WeeklyBehaviorReview` carries `reviewId`, `traderId`, `weekStart`,
//   `weekEnd`, each section as a `ReviewSection`, plus rollup
//   `supportingClusterIds` and `supportingPatternIds` so a future
//   mentor query can answer "what was my weekly review and what
//   evidence drove it" without re-deriving from raw events.
// =============================================================================

export type ReviewSectionConfidence = "low" | "moderate" | "high";

export const REVIEW_CONFIDENCE_LABEL: Record<ReviewSectionConfidence, string> =
  {
    low: "Low",
    moderate: "Moderate",
    high: "High",
  };

export type WeeklyTrendDirection =
  | "improving"
  | "stable"
  | "mixed"
  | "deteriorating"
  | "insufficient";

export const WEEKLY_TREND_LABEL: Record<WeeklyTrendDirection, string> = {
  improving: "Improving",
  stable: "Stable",
  mixed: "Mixed",
  deteriorating: "Deteriorating",
  insufficient: "Insufficient data",
};

export type InterventionQualityLabel =
  | "strong"
  | "moderate"
  | "weak"
  | "insufficient";

export const INTERVENTION_QUALITY_LABEL: Record<
  InterventionQualityLabel,
  string
> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
  insufficient: "Insufficient data",
};

export type ReviewSection = {
  title: string;
  summary: string;
  explanation: string;
  confidence: ReviewSectionConfidence;
  confidenceLabel: string;
};

export type WeeklyBehaviorReview = {
  reviewId: string;
  traderId: string;
  weekStart: string;
  weekEnd: string;
  hasInsufficientHistory: boolean;
  windowSessionCount: number;
  strongestBehavior: ReviewSection | null;
  recurringIssue: ReviewSection | null;
  interventionQuality: ReviewSection | null;
  weeklyTrend: ReviewSection | null;
  nextWeekFocus: ReviewSection | null;
  // Discrete value for surfaces that want to render a small trend
  // glyph (↗ / → / ↘) without parsing the weekly-trend section copy.
  // Null when no weekly trend section was produced.
  weeklyTrendDirection: WeeklyTrendDirection | null;
  overallConfidence: ReviewSectionConfidence;
  overallConfidenceLabel: string;
  supportingClusterIds: string[];
  supportingPatternIds: string[];
  createdAt: string;
};

export type WeeklyBehaviorReviewInputs = AnalyticsSliceInputs & {
  traderId: string;
  reflections: DailyReflection[];
  tradeReflections: TradeReflection[];
  sessionNotes: SessionNote[];
};

const MIN_SESSIONS_FOR_REVIEW = 2;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeWeeklyBehaviorReview(
  inputs: WeeklyBehaviorReviewInputs,
  nowMs: number,
): WeeklyBehaviorReview {
  const timeframe = TIMEFRAMES["7d"];
  const weekEnd = new Date(nowMs).toISOString();
  const weekStart = new Date(nowMs - WEEK_MS).toISOString();
  const createdAt = weekEnd;
  const reviewId = `review_${inputs.traderId}_${weekEnd}`;

  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);

  if (windowed.length < MIN_SESSIONS_FOR_REVIEW) {
    return {
      reviewId,
      traderId: inputs.traderId,
      weekStart,
      weekEnd,
      hasInsufficientHistory: true,
      windowSessionCount: windowed.length,
      strongestBehavior: null,
      recurringIssue: null,
      interventionQuality: null,
      weeklyTrend: null,
      nextWeekFocus: null,
      weeklyTrendDirection: null,
      overallConfidence: "low",
      overallConfidenceLabel: REVIEW_CONFIDENCE_LABEL.low,
      supportingClusterIds: [],
      supportingPatternIds: [],
      createdAt,
    };
  }

  // Pull existing engines once.
  const formations = computeBehaviorClusterFormations(
    inputs,
    timeframe,
    nowMs,
  );
  const outcomes = computeInterventionOutcomes(
    { ...inputs, historicalBaselines: null },
    timeframe,
    nowMs,
  );
  const objectiveSummary = computeBehavioralObjective(
    {
      ...inputs,
      reflections: inputs.reflections,
      tradeReflections: inputs.tradeReflections,
      sessionNotes: inputs.sessionNotes,
    },
    timeframe,
    nowMs,
  );
  const disciplineSeries = buildDisciplineSeries(inputs, timeframe, nowMs);

  const windowedSessionIds = new Set(windowed.map((s) => s.sessionId));
  const weekEvents = inputs.behaviorEvents.filter((e) =>
    windowedSessionIds.has(e.sessionId ?? ""),
  );

  const strongestBehavior = deriveStrongestBehavior(
    weekEvents,
    outcomes,
    windowed.length,
  );
  const recurringIssue = deriveRecurringIssue(formations);
  const interventionQuality = deriveInterventionQuality(outcomes);
  const weeklyTrendResult = deriveWeeklyTrend(disciplineSeries);
  const weeklyTrend = weeklyTrendResult.section;
  const weeklyTrendDirection = weeklyTrendResult.direction;
  const nextWeekFocus = deriveNextWeekFocus(objectiveSummary.primary);

  // Roll up traceback ids — every emitted id originates from an
  // existing record so future retrieval lands on real data.
  const supportingClusterIds = formations.map((f) => f.clusterId);
  const supportingPatternIdsSet = new Set<string>();
  for (const f of formations) {
    for (const p of f.linkedBehaviorTypes) supportingPatternIdsSet.add(p);
  }
  if (objectiveSummary.primary) {
    for (const p of objectiveSummary.primary.supportingPatternIds) {
      supportingPatternIdsSet.add(p);
    }
  }

  const overallConfidence = pickOverallConfidence([
    strongestBehavior?.confidence,
    recurringIssue?.confidence,
    interventionQuality?.confidence,
    weeklyTrend?.confidence,
    nextWeekFocus?.confidence,
  ]);

  return {
    reviewId,
    traderId: inputs.traderId,
    weekStart,
    weekEnd,
    hasInsufficientHistory: false,
    windowSessionCount: windowed.length,
    strongestBehavior,
    recurringIssue,
    interventionQuality,
    weeklyTrend,
    nextWeekFocus,
    weeklyTrendDirection,
    overallConfidence,
    overallConfidenceLabel: REVIEW_CONFIDENCE_LABEL[overallConfidence],
    supportingClusterIds,
    supportingPatternIds: Array.from(supportingPatternIdsSet),
    createdAt,
  };
}

// -----------------------------------------------------------------------------
// Section builders — each consumes existing engine output
// -----------------------------------------------------------------------------

function buildSection(input: {
  title: string;
  summary: string;
  explanation: string;
  confidence: ReviewSectionConfidence;
}): ReviewSection {
  return {
    title: input.title,
    summary: input.summary,
    explanation: input.explanation,
    confidence: input.confidence,
    confidenceLabel: REVIEW_CONFIDENCE_LABEL[input.confidence],
  };
}

function deriveStrongestBehavior(
  events: BehaviorEvent[],
  outcomes: InterventionOutcomeSummary,
  sessionCount: number,
): ReviewSection {
  // Positive signal priority — pick the strongest "what's working".
  const overrides = events.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  ).length;
  const stopWidenings = events.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  ).length;
  const rapidReentries = events.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  ).length;
  const cancelsAndRevises =
    outcomes.canceledTradeCount + outcomes.revisedTradeCount;

  const confidenceFromSessionCount = (n: number): ReviewSectionConfidence => {
    if (n >= 5) return "high";
    if (n >= 3) return "moderate";
    return "low";
  };

  if (overrides === 0 && sessionCount >= 2) {
    return buildSection({
      title: "Top Strength",
      summary: "Respecting warning checks.",
      explanation: `No warning overrides occurred in ${sessionCount} sessions.`,
      confidence: confidenceFromSessionCount(sessionCount),
    });
  }

  if (
    cancelsAndRevises >= 2 &&
    outcomes.continueAnywayCount < cancelsAndRevises
  ) {
    return buildSection({
      title: "Top Strength",
      summary: "Strong response to interventions.",
      explanation: `${cancelsAndRevises} canceled or revised setups versus ${outcomes.continueAnywayCount} overrides this week.`,
      confidence: cancelsAndRevises >= 5 ? "high" : "moderate",
    });
  }

  if (stopWidenings === 0 && sessionCount >= 2) {
    return buildSection({
      title: "Top Strength",
      summary: "Stop discipline held.",
      explanation: `No stop widening events across ${sessionCount} sessions.`,
      confidence: confidenceFromSessionCount(sessionCount),
    });
  }

  if (rapidReentries === 0 && sessionCount >= 2) {
    return buildSection({
      title: "Top Strength",
      summary: "No rapid re-entries after losses.",
      explanation: `Cool-off windows held across ${sessionCount} sessions.`,
      confidence: confidenceFromSessionCount(sessionCount),
    });
  }

  // Fallback — engagement only.
  return buildSection({
    title: "Top Strength",
    summary: "Consistent engagement with the system.",
    explanation: `${sessionCount} sessions logged this week.`,
    confidence: "low",
  });
}

function deriveRecurringIssue(
  formations: BehaviorClusterFormation[],
): ReviewSection {
  if (formations.length === 0) {
    return buildSection({
      title: "Recurring Issue",
      summary: "No recurring issue observed.",
      explanation:
        "No cross-session behavior formation reached the engine's recurrence threshold this week.",
      confidence: "low",
    });
  }
  // Top by severity, then by sessionsAffected — the cluster engine
  // already sorts that way.
  const top = formations[0];
  return buildSection({
    title: "Recurring Issue",
    summary: `${top.title}.`,
    explanation: `${top.explanation} Observed in ${top.sessionsAffected} session${top.sessionsAffected === 1 ? "" : "s"} this week.`,
    confidence: top.confidence,
  });
}

function deriveInterventionQuality(
  outcomes: InterventionOutcomeSummary,
): ReviewSection {
  let label: InterventionQualityLabel;
  let summary: string;
  let explanation: string;
  let confidence: ReviewSectionConfidence;

  switch (outcomes.responseQuality) {
    case "improving":
      label = "strong";
      summary = "Responding constructively to interventions.";
      explanation = `${outcomes.canceledTradeCount} canceled and ${outcomes.revisedTradeCount} revised setups this week.`;
      confidence = "moderate";
      break;
    case "mixed":
      label = "moderate";
      summary = "Mixed response quality.";
      explanation = `${outcomes.canceledTradeCount + outcomes.revisedTradeCount} responsive decisions vs ${outcomes.continueAnywayCount} overrides.`;
      confidence = "moderate";
      break;
    case "deteriorating":
      label = "weak";
      summary = "Frequently overriding interventions.";
      explanation = `${outcomes.overrideConsequenceRate}% of Continue Anyway decisions were followed by deterioration.`;
      confidence = "moderate";
      break;
    case "insufficient":
      label = "insufficient";
      summary = "Not enough decisions to evaluate yet.";
      explanation =
        "Resolve more rule-check decisions before response quality becomes meaningful.";
      confidence = "low";
      break;
  }

  // Lift confidence to high when the outcomes engine itself reports high.
  if (
    outcomes.confidence === "high" &&
    label !== "insufficient" &&
    confidence !== "low"
  ) {
    confidence = "high";
  }

  return buildSection({
    title: "Intervention Response",
    summary: `${INTERVENTION_QUALITY_LABEL[label]} · ${summary}`,
    explanation,
    confidence,
  });
}

function deriveWeeklyTrend(series: TrendSeries): {
  section: ReviewSection;
  direction: WeeklyTrendDirection;
} {
  let direction: WeeklyTrendDirection;
  let summary: string;
  let explanation: string;
  let confidence: ReviewSectionConfidence;

  switch (series.direction) {
    case "improving":
      direction = "improving";
      summary = "Improving.";
      explanation = `Discipline score trended up across ${series.points.length} sessions (median ${Math.round(series.median)}).`;
      confidence = "moderate";
      break;
    case "stable":
      direction = "stable";
      summary = "Stable.";
      explanation = `Discipline score remained within a narrow range (median ${Math.round(series.median)}).`;
      confidence = "moderate";
      break;
    case "declining":
      direction = "deteriorating";
      summary = "Deteriorating.";
      explanation = `Discipline score trended down across ${series.points.length} sessions (median ${Math.round(series.median)}).`;
      confidence = "moderate";
      break;
    case "insufficient":
    default:
      direction = "insufficient";
      summary = "Insufficient data.";
      explanation =
        "Need at least four scored sessions before a trend reads as anything other than noise.";
      confidence = "low";
      break;
  }

  // Bump to high when we have a clear direction across many points.
  if (series.points.length >= 7 && direction !== "insufficient") {
    confidence = "high";
  }

  return {
    section: buildSection({
      title: "Weekly Trend",
      summary: `${WEEKLY_TREND_LABEL[direction]} · ${summary}`,
      explanation,
      confidence,
    }),
    direction,
  };
}

function deriveNextWeekFocus(
  primary: BehavioralObjective | null,
): ReviewSection {
  if (!primary) {
    return buildSection({
      title: "Next Week Focus",
      summary: "Maintain current discipline.",
      explanation:
        "No higher-priority focus emerged from this week's observed behavior.",
      confidence: "low",
    });
  }
  // Reuse the objective engine's selection so dashboard, analytics, and
  // weekly review all point at the same focus.
  return buildSection({
    title: "Next Week Focus",
    summary: primary.objectiveText,
    explanation: primary.explanation,
    confidence: primary.confidence,
  });
}

function pickOverallConfidence(
  values: Array<ReviewSectionConfidence | undefined>,
): ReviewSectionConfidence {
  // Average rank — never speak with more certainty than the weakest
  // section can support.
  const ranks: Record<ReviewSectionConfidence, number> = {
    low: 0,
    moderate: 1,
    high: 2,
  };
  const present = values.filter(
    (v): v is ReviewSectionConfidence => v != null,
  );
  if (present.length === 0) return "low";
  const min = present.reduce(
    (acc, v) => (ranks[v] < ranks[acc] ? v : acc),
    present[0],
  );
  return min;
}

// Re-export so the UI doesn't reach into timeframe.ts just to label
// confidence chips.
export { CONFIDENCE_LABEL };
export type { ConfidenceLevel };
