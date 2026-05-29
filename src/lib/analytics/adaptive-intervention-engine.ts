import {
  CONFIDENCE_LABEL,
  confidenceFromSampleSize,
  type ConfidenceLevel,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import { type AnalyticsSliceInputs } from "@/lib/analytics/trend-series";
import { computeBehaviorClusterFormations } from "@/lib/analytics/pattern-cluster-recurrence";
import {
  computeInterventionOutcomes,
  type ResponseQualityTone,
} from "@/lib/analytics/intervention-outcomes-engine";
import { sessionsInWindow } from "@/lib/analytics/trend-series";

// =============================================================================
// Adaptive Intervention Severity Engine — rules-based, deterministic, NOT AI
// =============================================================================
//
// PURPOSE
//   Calibrate intervention intensity to the trader's current behavioral
//   trust. Same trader, same rule-check modal — but the friction the
//   modal applies (countdown duration, acknowledgement requirement,
//   reflection-prompt nudge) is scaled to what the observed record
//   says about discipline, override history, recurring patterns, and
//   response quality.
//
//   The engine never claims certainty, never diagnoses psychology,
//   never punishes red days. Every calibration is a function of
//   recorded events inside the active timeframe.
//
// FIVE-TIER OUTPUT
//   passive       (LEVEL 0) — high-discipline, stable. Subtle nudges only.
//   standard      (LEVEL 1) — moderate concern; light pause.
//   elevated      (LEVEL 2) — recurring rule pressure; stronger wording.
//   high_pressure (LEVEL 3) — deterioration + override pattern. Friction up.
//   critical      (LEVEL 4) — escalating consequence rate. Cooldown option.
//
// INPUT DIMENSIONS (each scored to [0..1])
//   recurringPatternInfluence    cluster engine: how many cross-session
//                                formations are active
//   overrideHistoryWeight        intervention-outcomes engine: % of
//                                Continue-Anyway decisions followed by
//                                deterioration / escalation
//   deteriorationProbability     current session pressure: discipline
//                                score band, escalation flags, stop
//                                widenings, override count
//   interventionResponseScore    [HIGHER = better] response quality
//                                from intervention outcomes (improving
//                                → 1.0, deteriorating → 0.1)
//
// COMPOSITE PRESSURE
//   pressure = 0.30 * recurringPatternInfluence
//            + 0.25 * overrideHistoryWeight
//            + 0.25 * deteriorationProbability
//            + 0.20 * (1 - interventionResponseScore)
//   → mapped to severity tier by fixed bands so the calibration is
//     fully reproducible.
//
// AI-READY STRUCTURE
//   `AdaptiveInterventionProfile` carries every input score, the chosen
//   tier, an `evidenceConfidence` level derived from session sample
//   size, a friction config the modal can consume directly, and a
//   fatigue snapshot that drives duplicate-warning suppression. Future
//   AI mentor layers can retrieve calibrations safely without
//   re-deriving.
// =============================================================================

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export const ADAPTIVE_SEVERITY_LEVELS = [
  "passive",
  "standard",
  "elevated",
  "high_pressure",
  "critical",
] as const;
export type AdaptiveSeverityLevel = (typeof ADAPTIVE_SEVERITY_LEVELS)[number];

export const ADAPTIVE_SEVERITY_LABEL: Record<AdaptiveSeverityLevel, string> = {
  passive: "Passive",
  standard: "Standard",
  elevated: "Elevated",
  high_pressure: "High Pressure",
  critical: "Critical",
};

export const ADAPTIVE_SEVERITY_NUMERIC: Record<
  AdaptiveSeverityLevel,
  0 | 1 | 2 | 3 | 4
> = {
  passive: 0,
  standard: 1,
  elevated: 2,
  high_pressure: 3,
  critical: 4,
};

export type BehavioralTrustLevel =
  | "stable"
  | "caution"
  | "high_pressure"
  | "critical";

export const BEHAVIORAL_TRUST_LABEL: Record<BehavioralTrustLevel, string> = {
  stable: "Stable",
  caution: "Caution",
  high_pressure: "High Pressure",
  critical: "Critical",
};

export type InterventionResponseQuality =
  | "improving"
  | "stable"
  | "deteriorating"
  | "insufficient";

export const INTERVENTION_RESPONSE_LABEL: Record<
  InterventionResponseQuality,
  string
> = {
  improving: "Improving",
  stable: "Stable",
  deteriorating: "Deteriorating",
  insufficient: "Insufficient data",
};

// Friction config — the rule-check modal (and any other intervention
// surface that consumes this) reads these fields to scale countdown,
// acknowledgement, and optional reflection prompt. Defaults are
// designed to never produce more friction than the existing modal:
// `passive` is no-op.
export type FrictionConfig = {
  pauseSeconds: number;
  requireExplicitAcknowledgement: boolean;
  showReflectionPrompt: boolean;
  // User-facing copy describing the friction in plain language. UI
  // surfaces can render this verbatim instead of inventing copy.
  description: string;
};

// Intervention-fatigue snapshot — drives duplicate-suppression. The
// engine emits this so re-firing surfaces can decide whether to
// silence a repeat warning or let it through.
export type InterventionFatigueState = {
  // Minimum seconds between identical warnings (same rule id). Higher
  // when the trader has had a quiet session — disciplined sessions
  // should suppress repeats more aggressively. Lower when behavior is
  // actively deteriorating — repeated nudges are still allowed but
  // not on a 5-second loop.
  cooldownSeconds: number;
  // True when recent warning density is high enough that the engine
  // recommends silencing all but escalating warnings. Surfaces should
  // honor this by only emitting warnings when severity has risen.
  fatigueActive: boolean;
  // Plain-language description for the analytics card / debug view.
  description: string;
};

// Composite calibration. Standalone so non-engine callers (testing,
// future AI retrieval) can build it manually without spinning up the
// full inputs.
export type SeverityCalibration = {
  level: AdaptiveSeverityLevel;
  numeric: 0 | 1 | 2 | 3 | 4;
  trust: BehavioralTrustLevel;
  responseQuality: InterventionResponseQuality;
  friction: FrictionConfig;
  fatigue: InterventionFatigueState;
};

export type AdaptiveInterventionProfile = SeverityCalibration & {
  traderId: string;
  sessionId: string | null;
  // Sample-size confidence. Drives "Modeled from N sessions" copy on
  // surfaces, and keeps the engine from speaking with certainty after
  // tiny histories.
  evidenceConfidence: ConfidenceLevel;
  evidenceConfidenceLabel: string;
  // [0..1] scores — the inputs to the composite. Each surface that
  // wants to explain a calibration can render these as factor weights.
  recurringPatternInfluence: number;
  overrideHistoryWeight: number;
  deteriorationProbability: number;
  interventionResponseScore: number;
  // Composite pressure score in [0..1]. Useful for sorting or
  // analytics overlays; the level field is the consumable form.
  pressure: number;
  // User-facing description of the calibration. Always observational,
  // never therapeutic.
  explanation: string;
  createdAt: string;
};

// -----------------------------------------------------------------------------
// Friction / fatigue tables — single source of truth per severity tier
// -----------------------------------------------------------------------------

const FRICTION_BY_LEVEL: Record<AdaptiveSeverityLevel, FrictionConfig> = {
  passive: {
    pauseSeconds: 0,
    requireExplicitAcknowledgement: false,
    showReflectionPrompt: false,
    description: "Subtle nudges; no countdown.",
  },
  standard: {
    pauseSeconds: 3,
    requireExplicitAcknowledgement: false,
    showReflectionPrompt: false,
    description: "3-second pause before Continue Anyway is enabled.",
  },
  elevated: {
    pauseSeconds: 5,
    requireExplicitAcknowledgement: false,
    showReflectionPrompt: false,
    description: "5-second pause; revise wording emphasized.",
  },
  high_pressure: {
    pauseSeconds: 8,
    requireExplicitAcknowledgement: true,
    showReflectionPrompt: false,
    description: "8-second pause and explicit acknowledgement required.",
  },
  critical: {
    pauseSeconds: 10,
    requireExplicitAcknowledgement: true,
    showReflectionPrompt: true,
    description:
      "10-second pause, explicit acknowledgement, optional reflection prompt.",
  },
};

// Cooldown seconds per tier. Higher cooldown = more silence between
// identical warnings. Disciplined sessions get the most silence; the
// engine still emits warnings when conditions change.
const COOLDOWN_BY_LEVEL: Record<AdaptiveSeverityLevel, number> = {
  passive: 180,
  standard: 90,
  elevated: 60,
  high_pressure: 45,
  critical: 30,
};

const TRUST_BY_LEVEL: Record<AdaptiveSeverityLevel, BehavioralTrustLevel> = {
  passive: "stable",
  standard: "stable",
  elevated: "caution",
  high_pressure: "high_pressure",
  critical: "critical",
};

// -----------------------------------------------------------------------------
// Score helpers
// -----------------------------------------------------------------------------

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function pickLevel(pressure: number): AdaptiveSeverityLevel {
  if (pressure >= 0.7) return "critical";
  if (pressure >= 0.5) return "high_pressure";
  if (pressure >= 0.3) return "elevated";
  if (pressure >= 0.15) return "standard";
  return "passive";
}

function responseScoreFromTone(tone: ResponseQualityTone): number {
  switch (tone) {
    case "improving":
      return 1.0;
    case "mixed":
      return 0.5;
    case "deteriorating":
      return 0.1;
    case "insufficient":
      return 0.6; // neutral when data is thin — bias toward less friction
  }
}

function responseQualityFromTone(
  tone: ResponseQualityTone,
): InterventionResponseQuality {
  switch (tone) {
    case "improving":
      return "improving";
    case "mixed":
      return "stable";
    case "deteriorating":
      return "deteriorating";
    case "insufficient":
      return "insufficient";
  }
}

// -----------------------------------------------------------------------------
// Public input + entry point
// -----------------------------------------------------------------------------

export type AdaptiveInterventionInputs = AnalyticsSliceInputs & {
  traderId: string;
  // Live session intelligence — the engine reads escalation flags and
  // discipline-band signals from these. Optional so callers that only
  // want a longitudinal calibration (no live session) can omit them.
  liveSessionState?: {
    sessionId: string | null;
    disciplineScore: number; // 0..100
    escalationDetected: boolean;
    overtradingDetected: boolean;
    lockoutActive: boolean;
    consecutiveLosses: number;
    warningOverridesThisSession: number;
    stopWideningsThisSession: number;
    interventionsThisSession: number;
  };
};

export function computeAdaptiveInterventionProfile(
  inputs: AdaptiveInterventionInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): AdaptiveInterventionProfile {
  // -- Recurring-pattern influence ---------------------------------------
  const formations = computeBehaviorClusterFormations(
    inputs,
    timeframe,
    nowMs,
  );
  // Weight: each active formation adds pressure, capped at 1.0. High-
  // confidence formations weigh more.
  let recurringPatternRaw = 0;
  for (const f of formations) {
    const baseline =
      f.confidence === "high" ? 0.4 : f.confidence === "moderate" ? 0.25 : 0.15;
    recurringPatternRaw += baseline;
  }
  const recurringPatternInfluence = clamp01(recurringPatternRaw);

  // -- Override-consequence weight --------------------------------------
  const outcomes = computeInterventionOutcomes(
    { ...inputs, historicalBaselines: null },
    timeframe,
    nowMs,
  );
  // overrideConsequenceRate is 0–100 already.
  const overrideHistoryWeight = clamp01(outcomes.overrideConsequenceRate / 100);

  // -- Deterioration probability ----------------------------------------
  // Snapshot of the live session pressure. Engine deliberately leans on
  // recorded counters rather than predictive modeling.
  const live = inputs.liveSessionState;
  let deteriorationRaw = 0;
  if (live) {
    if (live.lockoutActive) deteriorationRaw += 0.5;
    if (live.escalationDetected) deteriorationRaw += 0.3;
    if (live.overtradingDetected) deteriorationRaw += 0.2;
    deteriorationRaw += Math.min(0.3, live.warningOverridesThisSession * 0.1);
    deteriorationRaw += Math.min(0.3, live.stopWideningsThisSession * 0.1);
    deteriorationRaw += Math.min(0.2, live.consecutiveLosses * 0.05);
    // Discipline band — score < 35 contributes meaningfully.
    if (live.disciplineScore < 35) deteriorationRaw += 0.3;
    else if (live.disciplineScore < 55) deteriorationRaw += 0.15;
  }
  const deteriorationProbability = clamp01(deteriorationRaw);

  // -- Response quality score -------------------------------------------
  const interventionResponseScore = responseScoreFromTone(
    outcomes.responseQuality,
  );

  // -- Composite ---------------------------------------------------------
  const pressure = clamp01(
    0.3 * recurringPatternInfluence +
      0.25 * overrideHistoryWeight +
      0.25 * deteriorationProbability +
      0.2 * (1 - interventionResponseScore),
  );
  const level = pickLevel(pressure);

  // -- Fatigue snapshot --------------------------------------------------
  const fatigueActive = live
    ? live.interventionsThisSession >= 4 && deteriorationProbability < 0.5
    : false;
  const fatigue: InterventionFatigueState = {
    cooldownSeconds: COOLDOWN_BY_LEVEL[level],
    fatigueActive,
    description: fatigueActive
      ? "High recent warning density — repeat warnings suppressed until conditions change."
      : `Repeats of the same warning are suppressed for ${COOLDOWN_BY_LEVEL[level]} seconds.`,
  };

  // -- Evidence confidence ----------------------------------------------
  const windowSessions = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const evidenceConfidence = confidenceFromSampleSize(
    windowSessions.length,
    timeframe,
  );

  // -- Explanation -------------------------------------------------------
  const explanation = buildExplanation(
    level,
    recurringPatternInfluence,
    overrideHistoryWeight,
    deteriorationProbability,
    interventionResponseScore,
    fatigueActive,
  );

  return {
    traderId: inputs.traderId,
    sessionId: live?.sessionId ?? null,
    level,
    numeric: ADAPTIVE_SEVERITY_NUMERIC[level],
    trust: TRUST_BY_LEVEL[level],
    responseQuality: responseQualityFromTone(outcomes.responseQuality),
    friction: FRICTION_BY_LEVEL[level],
    fatigue,
    evidenceConfidence,
    evidenceConfidenceLabel: CONFIDENCE_LABEL[evidenceConfidence],
    recurringPatternInfluence,
    overrideHistoryWeight,
    deteriorationProbability,
    interventionResponseScore,
    pressure,
    explanation,
    createdAt: new Date(nowMs).toISOString(),
  };
}

function buildExplanation(
  level: AdaptiveSeverityLevel,
  patterns: number,
  overrides: number,
  deterioration: number,
  response: number,
  fatigueActive: boolean,
): string {
  const factors: string[] = [];
  if (patterns >= 0.4) factors.push("recurring cross-session patterns");
  if (overrides >= 0.4) factors.push("override consequence history");
  if (deterioration >= 0.4) factors.push("current session pressure");
  if (response <= 0.3) factors.push("declining response quality");
  const fatigueSuffix = fatigueActive
    ? " Repeat warnings are temporarily suppressed."
    : "";
  if (factors.length === 0) {
    return `Calibration is ${ADAPTIVE_SEVERITY_LABEL[
      level
    ].toLowerCase()} — observed behavior is within stable bounds.${fatigueSuffix}`;
  }
  return `Calibration is ${ADAPTIVE_SEVERITY_LABEL[level].toLowerCase()} — driven by ${factors.join(", ")}.${fatigueSuffix}`;
}

// -----------------------------------------------------------------------------
// Helper consumed by intervention surfaces.
//
// Should this warning fire now? Surfaces (rule-check modal, live
// monitoring banner) call this with the rule id and the last time the
// SAME rule produced a warning. Returns true when either the cooldown
// has elapsed OR the calibration level has risen since the last fire.
// Pure function — caller owns the state of "last fire" tracking.
// -----------------------------------------------------------------------------
export function shouldEmitWarning(input: {
  calibration: SeverityCalibration;
  ruleId: string;
  lastEmittedAtMs: number | null;
  lastEmittedLevel: AdaptiveSeverityLevel | null;
  nowMs: number;
}): boolean {
  const {
    calibration,
    lastEmittedAtMs,
    lastEmittedLevel,
    nowMs,
  } = input;
  // Always allow first emission.
  if (lastEmittedAtMs == null) return true;
  const elapsedSec = (nowMs - lastEmittedAtMs) / 1000;
  // Cooldown elapsed → allow.
  if (elapsedSec >= calibration.fatigue.cooldownSeconds) return true;
  // Severity escalated since last emission → allow.
  if (
    lastEmittedLevel &&
    ADAPTIVE_SEVERITY_NUMERIC[calibration.level] >
      ADAPTIVE_SEVERITY_NUMERIC[lastEmittedLevel]
  ) {
    return true;
  }
  // Otherwise suppress as duplicate.
  return false;
}
