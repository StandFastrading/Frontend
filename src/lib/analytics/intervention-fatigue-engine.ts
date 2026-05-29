import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  ADAPTIVE_SEVERITY_LABEL,
  type AdaptiveSeverityLevel,
} from "@/lib/analytics/adaptive-intervention-engine";
import {
  CONFIDENCE_LABEL,
  confidenceFromSampleSize,
  type ConfidenceLevel,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import {
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";
import type { BehaviorEvent, InterventionEvent } from "@/types";

// =============================================================================
// Intervention Fatigue Protection Engine — rules-based, deterministic, NOT AI
// =============================================================================
//
// PURPOSE
//   Pace and suppress repeated interventions so warnings keep their
//   psychological weight. The adaptive-intervention-engine already
//   calibrates severity per-trader; this layer governs *whether* and
//   *how* a candidate warning actually surfaces given:
//
//     * the family the warning belongs to
//     * recent same-family emissions inside the active session
//     * recent trader response (cancel / revise / reflection)
//     * how long the session has been clean
//
//   The system only escalates when behavior meaningfully changes; same-
//   family duplicates collapse into a lightweight reinforcement chip.
//
// CORE FATIGUE RULES (single source of truth)
//   1. Duplicate suppression  — same warning within family cooldown is
//                               silenced (caller may render a chip).
//   2. Escalation reactivation — severity rise OR a worse family member
//                                always emits, regardless of cooldown.
//   3. Family grouping        — only the dominant family member shows;
//                               equal-severity siblings collapse.
//   4. Post-response grace    — after cancel / revise / reflection, the
//                               family is silent for `responseGraceSec`.
//   5. Clean-session relief   — sustained clean streak lengthens
//                               cooldown (less noise when disciplined).
//   6. Escalation memory      — every emission carries `priorWarningIds`
//                               and a transition record when severity
//                               climbed since the last emission.
//
// AI-READY STRUCTURES
//   `WarningSuppressionRecord`, `EscalationTransition`, `FamilyFatigueState`
//   and `FatigueDecision` all carry traceable ids + reasons. A future
//   retrieval layer can answer "show every warning I suppressed because
//   the trader had just revised" without re-deriving anything.
// =============================================================================

// -----------------------------------------------------------------------------
// Warning families
// -----------------------------------------------------------------------------

export const WARNING_FAMILIES = [
  "risk_mutation",
  "pressure",
  "plan_integrity",
  "general",
] as const;
export type WarningFamily = (typeof WARNING_FAMILIES)[number];

export const WARNING_FAMILY_LABEL: Record<WarningFamily, string> = {
  risk_mutation: "Risk Mutation",
  pressure: "Pressure",
  plan_integrity: "Plan Integrity",
  general: "General",
};

// Map behavior event types to families. Anything not in the map falls
// through to `general`. Keep the mapping narrow + literal so future
// retrieval can match without ambiguity.
export const EVENT_FAMILY: Record<string, WarningFamily> = {
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: "risk_mutation",
  [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: "risk_mutation",
  [BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED]: "risk_mutation",
  [BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED]: "risk_mutation",
  [BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED]: "risk_mutation",
  [BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED]: "risk_mutation",
  [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED]: "plan_integrity",
  [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED]: "plan_integrity",
  [BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED]: "plan_integrity",
  [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION]: "pressure",
  [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED]: "general",
};

// Rule-id → family for the rule-check modal surface. Rule ids live in
// `trade-validation-engine.RULE_IDS`; we duplicate the strings here
// rather than import the private constant.
export const RULE_FAMILY: Record<string, WarningFamily> = {
  "stop-entered": "plan_integrity",
  "plan-written": "plan_integrity",
  "setup-approved": "plan_integrity",
  "risk-limit": "risk_mutation",
  "daily-loss": "pressure",
  "daily-trade-count": "pressure",
  "red-trades": "pressure",
  "consecutive-losses": "pressure",
  cooldown: "pressure",
  "reward-risk": "plan_integrity",
};

export function familyOfRule(ruleId: string): WarningFamily {
  return RULE_FAMILY[ruleId] ?? "general";
}

export function familyOfEvent(eventType: string): WarningFamily {
  return EVENT_FAMILY[eventType] ?? "general";
}

// -----------------------------------------------------------------------------
// Severity ranking (re-exported for ordering math)
// -----------------------------------------------------------------------------

const SEVERITY_RANK: Record<AdaptiveSeverityLevel, number> = {
  passive: 0,
  standard: 1,
  elevated: 2,
  high_pressure: 3,
  critical: 4,
};

// -----------------------------------------------------------------------------
// Cooldown / grace tables (single source of truth)
// -----------------------------------------------------------------------------

const BASE_COOLDOWN_SEC_BY_SEVERITY: Record<AdaptiveSeverityLevel, number> = {
  passive: 30,
  standard: 45,
  elevated: 60,
  high_pressure: 90,
  critical: 120,
};

// Seconds after a cancel / revise / reflection where same-family
// warnings are silenced. The trader already responded — repeating the
// nudge here would just train them to ignore it.
const RESPONSE_GRACE_SEC = 90;

// Clean-streak multipliers — longer disciplined runs widen cooldowns.
// Caps at 2× so the engine never goes silent indefinitely.
function cleanStreakMultiplier(cleanStreakSec: number): number {
  if (cleanStreakSec >= 600) return 2.0; // 10+ min clean
  if (cleanStreakSec >= 300) return 1.5; // 5+ min clean
  return 1.0;
}

// -----------------------------------------------------------------------------
// AI-ready record shapes
// -----------------------------------------------------------------------------

export type SuppressionReason =
  | "not_suppressed"
  | "cooldown_active"
  | "duplicate_within_window"
  | "family_already_dominant"
  | "post_response_grace_period"
  | "clean_session_relief";

export const SUPPRESSION_REASON_LABEL: Record<SuppressionReason, string> = {
  not_suppressed: "Not suppressed",
  cooldown_active: "Cooldown active",
  duplicate_within_window: "Duplicate within cooldown window",
  family_already_dominant: "Family already dominated by a higher warning",
  post_response_grace_period:
    "Grace period after a recent revise / cancel / reflection",
  clean_session_relief: "Session has been clean — relief multiplier applied",
};

export type RecentEmission = {
  warningType: string;
  severity: AdaptiveSeverityLevel;
  emittedAtMs: number;
  acknowledged: boolean;
  ignored: boolean;
  revised: boolean;
  warningId: string;
};

export type FatigueDecisionInput = {
  traderId: string;
  sessionId: string | null;
  tradeId: string | null;
  warningType: string;
  warningFamily: WarningFamily;
  severity: AdaptiveSeverityLevel;
  nowMs: number;
  // Recent same-family emissions in the active session, newest last.
  recentFamilyEmissions: RecentEmission[];
  // ISO timestamp of the most recent cancel / revise / reflection. Null
  // when the trader hasn't responded inside the current session.
  lastResponseAtMs: number | null;
  // How long the active session has been clean (no destructive events).
  cleanStreakSec: number;
};

export type EscalationTransition = {
  fromLevel: AdaptiveSeverityLevel;
  toLevel: AdaptiveSeverityLevel;
  fromLevelLabel: string;
  toLevelLabel: string;
  warningType: string;
  warningFamily: WarningFamily;
  reason: string;
  timestamp: string;
};

export type FatigueDecision = {
  emit: boolean;
  // True when this emission is opening a stronger card (vs. a collapsed
  // reinforcement chip) — escalation reactivation, first-of-family, or
  // post-cooldown.
  asEscalation: boolean;
  cooldownAppliedSec: number;
  cooldownUntilMs: number;
  suppressionReason: SuppressionReason;
  // When `emit === false`, render this lightweight chip copy instead of
  // a full warning card. Null when even the chip should be silent.
  collapsedChipCopy: string | null;
  // Fatigue-aware language — surfaces should use `full` on the first
  // emission and `short` on repeats. Engine outputs both so the wording
  // stays consistent across surfaces.
  fatigueAwareCopy: { full: string; short: string };
  escalationTransition: EscalationTransition | null;
};

export type WarningSuppressionRecord = {
  id: string;
  traderId: string;
  sessionId: string | null;
  tradeId: string | null;
  warningType: string;
  warningFamily: WarningFamily;
  severity: AdaptiveSeverityLevel;
  suppressionReason: SuppressionReason;
  cooldownUntil: string;
  firstEmittedAt: string;
  lastEmittedAt: string;
  priorWarningIds: string[];
  occurrenceCount: number;
  acknowledged: boolean;
  ignored: boolean;
  revised: boolean;
  createdAt: string;
};

// -----------------------------------------------------------------------------
// Core decision function — pure, no I/O
// -----------------------------------------------------------------------------

export function evaluateFatigue(input: FatigueDecisionInput): FatigueDecision {
  const {
    warningType,
    warningFamily,
    severity,
    nowMs,
    recentFamilyEmissions,
    lastResponseAtMs,
    cleanStreakSec,
  } = input;

  const baseCooldownSec = BASE_COOLDOWN_SEC_BY_SEVERITY[severity];
  const cooldownAppliedSec = Math.round(
    baseCooldownSec * cleanStreakMultiplier(cleanStreakSec),
  );
  const cooldownUntilMs = nowMs + cooldownAppliedSec * 1000;

  const familyLabel = WARNING_FAMILY_LABEL[warningFamily];
  const fatigueAwareCopy = {
    full: `${familyLabel} pressure detected.`,
    short: `${familyLabel} still active`,
  };

  // 1. First emission of this family in the session — always allow.
  if (recentFamilyEmissions.length === 0) {
    return {
      emit: true,
      asEscalation: true,
      cooldownAppliedSec,
      cooldownUntilMs,
      suppressionReason: "not_suppressed",
      collapsedChipCopy: null,
      fatigueAwareCopy,
      escalationTransition: null,
    };
  }

  const lastEmission = recentFamilyEmissions[recentFamilyEmissions.length - 1];
  const previousSeverity = lastEmission.severity;
  const previousRank = SEVERITY_RANK[previousSeverity];
  const currentRank = SEVERITY_RANK[severity];

  // 2. Escalation reactivation — severity rose since the last emission.
  if (currentRank > previousRank) {
    return {
      emit: true,
      asEscalation: true,
      cooldownAppliedSec,
      cooldownUntilMs,
      suppressionReason: "not_suppressed",
      collapsedChipCopy: null,
      fatigueAwareCopy,
      escalationTransition: {
        fromLevel: previousSeverity,
        toLevel: severity,
        fromLevelLabel: ADAPTIVE_SEVERITY_LABEL[previousSeverity],
        toLevelLabel: ADAPTIVE_SEVERITY_LABEL[severity],
        warningType,
        warningFamily,
        reason: `Family escalated from ${ADAPTIVE_SEVERITY_LABEL[previousSeverity]} to ${ADAPTIVE_SEVERITY_LABEL[severity]}.`,
        timestamp: new Date(nowMs).toISOString(),
      },
    };
  }

  // 3. Post-response grace — if the trader responded recently, suppress.
  if (lastResponseAtMs != null) {
    const sinceResponseSec = (nowMs - lastResponseAtMs) / 1000;
    if (sinceResponseSec >= 0 && sinceResponseSec < RESPONSE_GRACE_SEC) {
      return {
        emit: false,
        asEscalation: false,
        cooldownAppliedSec,
        cooldownUntilMs,
        suppressionReason: "post_response_grace_period",
        collapsedChipCopy: fatigueAwareCopy.short,
        fatigueAwareCopy,
        escalationTransition: null,
      };
    }
  }

  // 4. Within cooldown — collapse to chip.
  const sinceLastEmissionSec = (nowMs - lastEmission.emittedAtMs) / 1000;
  if (sinceLastEmissionSec < cooldownAppliedSec) {
    const reason: SuppressionReason =
      cleanStreakSec >= 300
        ? "clean_session_relief"
        : sinceLastEmissionSec < baseCooldownSec
          ? "duplicate_within_window"
          : "cooldown_active";
    return {
      emit: false,
      asEscalation: false,
      cooldownAppliedSec,
      cooldownUntilMs: lastEmission.emittedAtMs + cooldownAppliedSec * 1000,
      suppressionReason: reason,
      collapsedChipCopy: fatigueAwareCopy.short,
      fatigueAwareCopy,
      escalationTransition: null,
    };
  }

  // 5. Cooldown elapsed at the same severity — emit but as a lighter
  // reinforcement (not escalation). Surfaces can use `asEscalation` to
  // decide whether to open a full card or a smaller persistent banner.
  return {
    emit: true,
    asEscalation: false,
    cooldownAppliedSec,
    cooldownUntilMs,
    suppressionReason: "not_suppressed",
    collapsedChipCopy: null,
    fatigueAwareCopy,
    escalationTransition: null,
  };
}

// -----------------------------------------------------------------------------
// Per-family rollup — current state derived from a session's emissions
// -----------------------------------------------------------------------------

export type FamilyFatigueState = {
  family: WarningFamily;
  label: string;
  active: boolean;
  dominantWarningType: string | null;
  dominantSeverity: AdaptiveSeverityLevel;
  occurrenceCount: number;
  acknowledgementCount: number;
  ignoredCount: number;
  revisedCount: number;
  // Plain-language reinforcement copy for the small persistent chip.
  collapsedChipCopy: string;
  lastEmittedAtMs: number | null;
  cooldownUntilMs: number | null;
};

export function buildFamilyStates(
  emissionsByFamily: Map<WarningFamily, RecentEmission[]>,
  nowMs: number,
): FamilyFatigueState[] {
  const out: FamilyFatigueState[] = [];
  for (const family of WARNING_FAMILIES) {
    const emissions = emissionsByFamily.get(family) ?? [];
    if (emissions.length === 0) continue;
    let dominant: RecentEmission = emissions[0];
    let ackCount = 0;
    let ignoredCount = 0;
    let revisedCount = 0;
    for (const e of emissions) {
      if (SEVERITY_RANK[e.severity] > SEVERITY_RANK[dominant.severity]) {
        dominant = e;
      }
      if (e.acknowledged) ackCount += 1;
      if (e.ignored) ignoredCount += 1;
      if (e.revised) revisedCount += 1;
    }
    const cooldown = BASE_COOLDOWN_SEC_BY_SEVERITY[dominant.severity] * 1000;
    out.push({
      family,
      label: WARNING_FAMILY_LABEL[family],
      active: nowMs - dominant.emittedAtMs < cooldown,
      dominantWarningType: dominant.warningType,
      dominantSeverity: dominant.severity,
      occurrenceCount: emissions.length,
      acknowledgementCount: ackCount,
      ignoredCount,
      revisedCount,
      collapsedChipCopy:
        emissions.length > 1
          ? `${WARNING_FAMILY_LABEL[family]} ×${emissions.length} during active trade`
          : `${WARNING_FAMILY_LABEL[family]} still active`,
      lastEmittedAtMs: dominant.emittedAtMs,
      cooldownUntilMs: dominant.emittedAtMs + cooldown,
    });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Retrospective metrics — drives the analytics card
// -----------------------------------------------------------------------------

export type FatigueMetrics = {
  traderId: string;
  timeframeLabel: string;
  // Number of same-family duplicates the engine would have suppressed
  // inside the active timeframe. Counted by replaying behavior events
  // through the same cooldown table — deterministic; no live state.
  duplicatesSuppressed: number;
  // % of interventions (cancel / revise) responding to a warning inside
  // the response grace window. Higher = the trader is acting on the
  // first nudge, not the fifth.
  postWarningResponsivenessRate: number;
  // Average seconds between same-family warnings across the window.
  averageInterWarningGapSec: number | null;
  // Escalation transitions observed (severity rises within a family).
  escalationTransitionCount: number;
  // Sample size confidence.
  confidence: ConfidenceLevel;
  confidenceLabel: string;
};

const DESTRUCTIVE_FOR_FAMILY: Set<string> = new Set([
  BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
  BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED,
  BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
  BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
  BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
]);

// Map an event severity onto an adaptive level so the replay uses the
// same cooldown table the live engine would. BehaviorEvent.severity is
// "info" / "caution" / "warning" / "critical"; we map directly.
function adaptiveLevelFromEventSeverity(s: string): AdaptiveSeverityLevel {
  switch (s) {
    case "critical":
      return "critical";
    case "warning":
      return "high_pressure";
    case "caution":
      return "elevated";
    case "info":
      return "standard";
    default:
      return "standard";
  }
}

export type FatigueMetricsInputs = AnalyticsSliceInputs & {
  traderId: string;
};

export function computeFatigueMetrics(
  inputs: FatigueMetricsInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): FatigueMetrics {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const windowedSessionIds = new Set(windowed.map((s) => s.sessionId));

  // Replay per session so cooldowns reset at session boundary.
  let duplicatesSuppressed = 0;
  let escalationTransitionCount = 0;
  const interWarningGapsMs: number[] = [];

  const familyEmissionsBySession = new Map<
    string,
    Map<WarningFamily, RecentEmission[]>
  >();

  // Sort all eligible behavior events chronologically per session.
  const eligibleEvents = inputs.behaviorEvents
    .filter((e: BehaviorEvent) => windowedSessionIds.has(e.sessionId ?? ""))
    .filter((e) => DESTRUCTIVE_FOR_FAMILY.has(e.eventType))
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

  for (const event of eligibleEvents) {
    const sessionId = event.sessionId;
    if (!sessionId) continue;
    const family = familyOfEvent(event.eventType);
    const eventMs = new Date(event.timestamp).getTime();
    if (!Number.isFinite(eventMs)) continue;
    const severity = adaptiveLevelFromEventSeverity(event.severity);

    let familyMap = familyEmissionsBySession.get(sessionId);
    if (!familyMap) {
      familyMap = new Map();
      familyEmissionsBySession.set(sessionId, familyMap);
    }
    const prior = familyMap.get(family) ?? [];
    if (prior.length > 0) {
      const last = prior[prior.length - 1];
      const gapMs = eventMs - last.emittedAtMs;
      interWarningGapsMs.push(gapMs);
      const cooldownMs = BASE_COOLDOWN_SEC_BY_SEVERITY[last.severity] * 1000;
      if (gapMs < cooldownMs && SEVERITY_RANK[severity] <= SEVERITY_RANK[last.severity]) {
        duplicatesSuppressed += 1;
      }
      if (SEVERITY_RANK[severity] > SEVERITY_RANK[last.severity]) {
        escalationTransitionCount += 1;
      }
    }
    prior.push({
      warningType: event.eventType,
      severity,
      emittedAtMs: eventMs,
      acknowledged: false,
      ignored: false,
      revised: false,
      warningId: event.id,
    });
    familyMap.set(family, prior);
  }

  // Post-warning responsiveness — for each WARNING_TRIGGERED, did a
  // cancel/revise intervention land within RESPONSE_GRACE_SEC?
  const warningsTriggered = inputs.behaviorEvents.filter(
    (e) =>
      windowedSessionIds.has(e.sessionId ?? "") &&
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
  );
  let respondedCount = 0;
  for (const w of warningsTriggered) {
    const wms = new Date(w.timestamp).getTime();
    if (!Number.isFinite(wms)) continue;
    const responded = inputs.interventions.some((i: InterventionEvent) => {
      if (i.sessionId !== w.sessionId) return false;
      if (i.decision !== "cancel_trade" && i.decision !== "revise_trade")
        return false;
      const t = new Date(i.timestamp).getTime();
      if (!Number.isFinite(t)) return false;
      const sinceSec = (t - wms) / 1000;
      return sinceSec >= 0 && sinceSec <= RESPONSE_GRACE_SEC;
    });
    if (responded) respondedCount += 1;
  }
  const postWarningResponsivenessRate =
    warningsTriggered.length > 0
      ? Math.round((respondedCount / warningsTriggered.length) * 1000) / 10
      : 0;

  const averageInterWarningGapSec =
    interWarningGapsMs.length > 0
      ? Math.round(
          interWarningGapsMs.reduce((s, v) => s + v, 0) /
            interWarningGapsMs.length /
            1000,
        )
      : null;

  const confidence = confidenceFromSampleSize(windowed.length, timeframe);

  return {
    traderId: inputs.traderId,
    timeframeLabel: timeframe.label,
    duplicatesSuppressed,
    postWarningResponsivenessRate,
    averageInterWarningGapSec,
    escalationTransitionCount,
    confidence,
    confidenceLabel: CONFIDENCE_LABEL[confidence],
  };
}
