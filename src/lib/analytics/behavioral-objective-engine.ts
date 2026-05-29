import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import { computeBehaviorClusterFormations } from "@/lib/analytics/pattern-cluster-recurrence";
import { computeInterventionOutcomes } from "@/lib/analytics/intervention-outcomes-engine";
import { computeReflectionCorrelations } from "@/lib/analytics/reflection-correlation-engine";
import type { EvidenceLevel } from "@/lib/analytics/evidence-weighting-engine";
import {
  CONFIDENCE_LABEL,
  type ConfidenceLevel,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import {
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";
import type {
  DailyReflection,
  SessionNote,
  TradeReflection,
} from "@/types";

// =============================================================================
// Personalized Behavioral Objectives — orchestration only, NOT a new engine
// =============================================================================
//
// PURPOSE
//   Translate the existing behavioral-intelligence outputs (cluster
//   formations, intervention outcomes, reflection correlations, and the
//   raw behavior event stream) into ONE primary objective the trader
//   should focus on today. No new analytics, no AI — this is a
//   deterministic selector over already-computed structures.
//
// SELECTION
//   Spec-defined priority order. The engine iterates the priority list
//   once, evaluates each candidate against observed records, and the
//   first that qualifies becomes the primary. Lower-priority candidates
//   that also qualify are emitted as `secondaryCandidates` for future
//   AI retrieval — the UI only renders primary today.
//
// CONFIDENCE
//   Inherited from the source intelligence (cluster confidence,
//   intervention-outcomes confidence, etc.) and capped by the engine's
//   evidence vocabulary. The objective never reads with more certainty
//   than the data underneath supports.
//
// AI-READY SHAPE
//   `BehavioralObjective` carries `objectiveId`, `traderId`,
//   `generatedAt`, `objectiveType`, `confidence`, `evidenceLevel`,
//   `supportingClusterIds`, `supportingPatternIds`, `explanation`. A
//   future mentor query like "what was the objective and why was it
//   assigned?" can answer without re-deriving from raw events.
// =============================================================================

export const OBJECTIVE_TYPES = [
  "preserve_active_risk",
  "respect_first_warning",
  "protect_early_session",
  "allow_setups_to_reset",
  "align_reflection_with_action",
  "honor_rule_boundaries",
  "strengthen_intervention_response",
] as const;
export type ObjectiveType = (typeof OBJECTIVE_TYPES)[number];

export type ObjectiveConfidence = "low" | "moderate" | "high";

export const OBJECTIVE_CONFIDENCE_LABEL: Record<ObjectiveConfidence, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

// AI-retrieval-ready record.
export type BehavioralObjective = {
  objectiveId: string;
  traderId: string;
  generatedAt: string;
  objectiveText: string;
  objectiveType: ObjectiveType;
  confidence: ObjectiveConfidence;
  confidenceLabel: string;
  evidenceLevel: EvidenceLevel;
  explanation: string;
  // Traceback ids — every entry references a record already in the
  // store so the AI layer can hop straight to the source.
  supportingClusterIds: string[];
  supportingPatternIds: string[];
  // Plain-language tags rendered as a chip row under the explanation.
  supportingTagLabels: string[];
};

export type BehavioralObjectiveSummary = {
  primary: BehavioralObjective | null;
  // Engine still emits the other qualifying candidates so future
  // surfaces can show "secondary focus" — current UI only renders
  // primary, but the data is here.
  secondaryCandidates: BehavioralObjective[];
  // True when there isn't enough session history in the window to
  // produce a personalized objective. Drives the empty-state copy.
  hasInsufficientHistory: boolean;
  historySessionCount: number;
  generatedAt: string;
};

// Priority list — spec-defined ordering. The engine picks the first
// objective in this order whose underlying conditions are satisfied.
const OBJECTIVE_PRIORITY: ObjectiveType[] = [
  "preserve_active_risk",
  "respect_first_warning",
  "protect_early_session",
  "allow_setups_to_reset",
  "align_reflection_with_action",
  "honor_rule_boundaries",
  "strengthen_intervention_response",
];

// Minimum number of sessions in the window before the engine will
// produce a personalized objective. Below this, the UI shows the
// empty-state copy from the spec.
const MIN_HISTORY_SESSIONS = 2;

// -----------------------------------------------------------------------------
// Public input + entry point
// -----------------------------------------------------------------------------

export type BehavioralObjectiveInputs = AnalyticsSliceInputs & {
  traderId: string;
  reflections: DailyReflection[];
  tradeReflections: TradeReflection[];
  sessionNotes: SessionNote[];
};

export function computeBehavioralObjective(
  inputs: BehavioralObjectiveInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): BehavioralObjectiveSummary {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const generatedAt = new Date(nowMs).toISOString();

  if (windowed.length < MIN_HISTORY_SESSIONS) {
    return {
      primary: null,
      secondaryCandidates: [],
      hasInsufficientHistory: true,
      historySessionCount: windowed.length,
      generatedAt,
    };
  }

  // Pull the existing engines' outputs once and reuse across builders.
  const formations = computeBehaviorClusterFormations(inputs, timeframe, nowMs);
  const outcomes = computeInterventionOutcomes(
    { ...inputs, historicalBaselines: null },
    timeframe,
    nowMs,
  );
  const reflection = computeReflectionCorrelations(
    {
      ...inputs,
      reflections: inputs.reflections,
      tradeReflections: inputs.tradeReflections,
      sessionNotes: inputs.sessionNotes,
    },
    timeframe,
    nowMs,
  );
  const windowedSessionIds = new Set(windowed.map((s) => s.sessionId));

  // Build candidates per type. Each builder returns `null` when its
  // underlying conditions don't qualify.
  const builders: Record<
    ObjectiveType,
    () => BehavioralObjective | null
  > = {
    preserve_active_risk: () => {
      const cluster = formations.find(
        (f) => f.type === "stop_discipline" || f.type === "risk_mutation",
      );
      if (!cluster) return null;
      return buildObjective({
        type: "preserve_active_risk",
        traderId: inputs.traderId,
        generatedAt,
        objectiveText: "Do not modify risk after activation.",
        explanation: `${cluster.title} has appeared in ${cluster.sessionsAffected} recent session${cluster.sessionsAffected === 1 ? "" : "s"} and remains your strongest recurring behavioral pattern.`,
        confidence: confidenceFromFormation(cluster.confidence),
        evidenceLevel: "directly_observed",
        supportingClusterIds: [cluster.clusterId],
        supportingPatternIds: cluster.linkedBehaviorTypes,
        supportingTagLabels: [cluster.title, formationConfidenceLabel(cluster.confidence)],
      });
    },
    respect_first_warning: () => {
      if (outcomes.continueAnywayCount < 2) return null;
      if (outcomes.overrideConsequenceRate < 50) return null;
      return buildObjective({
        type: "respect_first_warning",
        traderId: inputs.traderId,
        generatedAt,
        objectiveText: "Respect the first warning today.",
        explanation: `Override decisions have repeatedly led to deterioration — ${outcomes.overrideConsequenceRate}% of recent Continue Anyway decisions were followed by destructive events.`,
        confidence: confidenceFromConfidenceLevel(outcomes.confidence),
        evidenceLevel: "directly_observed",
        supportingClusterIds: [],
        supportingPatternIds: [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED],
        supportingTagLabels: [
          "Override Consequence",
          `${outcomes.overrideConsequenceRate}% consequence rate`,
        ],
      });
    },
    protect_early_session: () => {
      const cluster = formations.find(
        (f) => f.type === "early_session_deterioration",
      );
      if (!cluster) return null;
      return buildObjective({
        type: "protect_early_session",
        traderId: inputs.traderId,
        generatedAt,
        objectiveText: "Protect your first two trades.",
        explanation: `Most deterioration events occur early in your session — recurring across ${cluster.sessionsAffected} recent sessions.`,
        confidence: confidenceFromFormation(cluster.confidence),
        evidenceLevel: "directly_observed",
        supportingClusterIds: [cluster.clusterId],
        supportingPatternIds: cluster.linkedBehaviorTypes,
        supportingTagLabels: [cluster.title, formationConfidenceLabel(cluster.confidence)],
      });
    },
    allow_setups_to_reset: () => {
      const reentryEvents = inputs.behaviorEvents.filter(
        (e) =>
          windowedSessionIds.has(e.sessionId ?? "") &&
          e.eventType === BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
      );
      const reentrySessions = new Set(
        reentryEvents
          .map((e) => e.sessionId)
          .filter((s): s is string => s != null),
      );
      if (reentrySessions.size < 2) return null;
      const confidence: ObjectiveConfidence =
        reentrySessions.size >= 5
          ? "high"
          : reentrySessions.size >= 3
            ? "moderate"
            : "low";
      return buildObjective({
        type: "allow_setups_to_reset",
        traderId: inputs.traderId,
        generatedAt,
        objectiveText: "Allow setups to reset before re-entering.",
        explanation: `Rapid re-entry after losses has been observed across ${reentrySessions.size} recent sessions.`,
        confidence,
        evidenceLevel: "directly_observed",
        supportingClusterIds: [],
        supportingPatternIds: [
          BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
        ],
        supportingTagLabels: [
          "Rapid Re-Entry Pattern",
          `${reentrySessions.size} sessions`,
        ],
      });
    },
    align_reflection_with_action: () => {
      if (reflection.alignmentRatio.contradicted < 2) return null;
      const total =
        reflection.alignmentRatio.aligned +
        reflection.alignmentRatio.contradicted +
        reflection.alignmentRatio.unclear;
      return buildObjective({
        type: "align_reflection_with_action",
        traderId: inputs.traderId,
        generatedAt,
        objectiveText: "Match what you write with how you trade.",
        explanation: `${reflection.alignmentRatio.contradicted} of ${total} recent reflections did not match observed behavior.`,
        confidence: confidenceFromConfidenceLevel(reflection.sectionConfidence),
        evidenceLevel: "strongly_correlated",
        supportingClusterIds: [],
        supportingPatternIds: [],
        supportingTagLabels: [
          "Reflection Mismatch",
          `${reflection.alignmentRatio.contradicted} contradicted`,
        ],
      });
    },
    honor_rule_boundaries: () => {
      const cluster = formations.find((f) => f.type === "rule_defiance");
      if (!cluster) return null;
      return buildObjective({
        type: "honor_rule_boundaries",
        traderId: inputs.traderId,
        generatedAt,
        objectiveText: "Honor the original invalidation.",
        explanation: `Stop widening combined with warning overrides has recurred across ${cluster.sessionsAffected} recent sessions.`,
        confidence: confidenceFromFormation(cluster.confidence),
        evidenceLevel: "directly_observed",
        supportingClusterIds: [cluster.clusterId],
        supportingPatternIds: cluster.linkedBehaviorTypes,
        supportingTagLabels: [cluster.title, formationConfidenceLabel(cluster.confidence)],
      });
    },
    strengthen_intervention_response: () => {
      if (outcomes.responseQuality !== "deteriorating") return null;
      return buildObjective({
        type: "strengthen_intervention_response",
        traderId: inputs.traderId,
        generatedAt,
        objectiveText: "Pause before the next Continue Anyway today.",
        explanation:
          "Intervention response quality has been deteriorating — cancels and revisions have dropped relative to overrides.",
        confidence: confidenceFromConfidenceLevel(outcomes.confidence),
        evidenceLevel: "directly_observed",
        supportingClusterIds: [],
        supportingPatternIds: [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED],
        supportingTagLabels: ["Response Quality Declining"],
      });
    },
  };

  // Iterate in priority order, collect every qualifying candidate.
  const qualifying: BehavioralObjective[] = [];
  for (const type of OBJECTIVE_PRIORITY) {
    const candidate = builders[type]();
    if (candidate) qualifying.push(candidate);
  }

  const [primary = null, ...secondaryCandidates] = qualifying;
  return {
    primary,
    secondaryCandidates,
    hasInsufficientHistory: false,
    historySessionCount: windowed.length,
    generatedAt,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildObjective(input: {
  type: ObjectiveType;
  traderId: string;
  generatedAt: string;
  objectiveText: string;
  explanation: string;
  confidence: ObjectiveConfidence;
  evidenceLevel: EvidenceLevel;
  supportingClusterIds: string[];
  supportingPatternIds: string[];
  supportingTagLabels: string[];
}): BehavioralObjective {
  return {
    objectiveId: `obj_${input.type}_${input.generatedAt}`,
    traderId: input.traderId,
    generatedAt: input.generatedAt,
    objectiveText: input.objectiveText,
    objectiveType: input.type,
    confidence: input.confidence,
    confidenceLabel: OBJECTIVE_CONFIDENCE_LABEL[input.confidence],
    explanation: input.explanation,
    evidenceLevel: input.evidenceLevel,
    supportingClusterIds: input.supportingClusterIds,
    supportingPatternIds: input.supportingPatternIds,
    supportingTagLabels: input.supportingTagLabels,
  };
}

function confidenceFromFormation(
  c: "low" | "moderate" | "high",
): ObjectiveConfidence {
  return c;
}

function confidenceFromConfidenceLevel(
  c: ConfidenceLevel,
): ObjectiveConfidence {
  switch (c) {
    case "high":
      return "high";
    case "moderate":
      return "moderate";
    case "emerging":
      return "low";
    case "insufficient":
      return "low";
  }
}

function formationConfidenceLabel(
  c: "low" | "moderate" | "high",
): string {
  switch (c) {
    case "high":
      return "High Confidence";
    case "moderate":
      return "Moderate Confidence";
    case "low":
      return "Low Confidence";
  }
}

// Re-export so consumers don't reach into timeframe.ts just for the
// confidence dictionary.
export { CONFIDENCE_LABEL };
