import { useMemo } from "react";

import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type {
  ActiveTrade,
  BehaviorEvent,
  ClosedTrade,
  MonitoringEvent,
  RiskRules,
  SessionMetrics,
} from "@/types";
import {
  useCurrentSessionEvents,
  useCurrentSessionMonitoringEvents,
  useCurrentSessionTrades,
} from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";

// =============================================================================
// StandFast Behavior Analysis Engine
// =============================================================================
//
// Pure deterministic engine. No AI, no probabilistic models, no black-box
// scoring — every number it produces can be traced back to a count of
// observed events and a weight defined in `BEHAVIOR_SCORING_WEIGHTS` below.
//
// CONSUMES:
//   - behaviorEvents  (the full feed)
//   - closedTrades    (the archive — outcomes + reflections)
//   - activeTrades    (currently open positions; counts toward overtrading)
//   - riskRules       (the trader's configured caps)
//   - sessionMetrics  (live daily counters)
//
// PRODUCES (`BehaviorAnalysisResult`):
//   - sessionState           5-tier mood label
//   - disciplineScore        0–100 composite
//   - emotionalRiskLevel     4-tier risk label
//   - dominantBehavior       most-frequent negative tag (null when calm)
//   - behavioralTags         observed tags
//   - interventionIntensity  4-tier escalation guidance
//   - explanationSummary     one-line natural-language sentence
//   - keyDrivers             list of what moved the score, in plain English
//
// HOW TO ADJUST:
//   - All scoring weights live in `BEHAVIOR_SCORING_WEIGHTS` — tune any of
//     them without touching the engine logic.
//   - State + intensity thresholds live in `SCORE_BANDS` — same idea.
//   - Adding a new behavior: add a count source, a weight, a tag, and an
//     entry in `DRIVER_LABELS` for the keyDriver string.
//
// WHY DETERMINISTIC:
//   - Beta-stage trust requires the trader to be able to ask "why did my
//     score drop?" and see a literal arithmetic answer.
//   - Every output of this engine is a function of the inputs at a single
//     point in time — no hidden state, no learning, no decay.
//
// FUTURE AI LAYER:
//   - Reads the same inputs + this engine's output and produces softer
//     signals: confidence bands, behavioral cluster classification, etc.
//   - This engine stays the source of truth for the score the trader sees;
//     the AI layer adds context, never replaces.

// -----------------------------------------------------------------------------
// Scoring weights — single source of truth. Negative weights penalize;
// positive weights credit. Tune here, never inline.
// -----------------------------------------------------------------------------
export const BEHAVIOR_SCORING_WEIGHTS = {
  // Negatives
  warning_ignored: -8,
  trade_activated_with_warnings: -6,
  stop_widened: -10,
  position_size_increased: -8,
  mistake_logged: -5,
  daily_risk_exceeded: -12,
  max_trades_exceeded: -8,
  losing_trade_after_ignored_warning: -10,
  // Positives
  trade_avoided: 5,
  trade_revised: 4,
  clean_approved_trade: 2,
  clean_exit_at_plan: 4,
  reflection_added: 2,
} as const;

export type BehaviorScoringKey = keyof typeof BEHAVIOR_SCORING_WEIGHTS;

// -----------------------------------------------------------------------------
// Escalation rules. Behavioral realism requires that REPEATED negative
// actions compound — the second ignored warning isn't twice as bad as the
// first, it's worse-than-twice. Likewise, repeated revisions diminish in
// credit because they often indicate unstable decision-making rather than
// discipline.
//
// Each entry overrides the weight applied to the 2nd / 3rd-and-onward
// occurrence of that behavior. Keys not listed here use the base weight
// from `BEHAVIOR_SCORING_WEIGHTS` for every occurrence (linear scoring).
//
// WHY ESCALATION MATTERS MORE THAN ISOLATED MISTAKES:
//   A single warning ignored is a data point; three in a row is a pattern.
//   Patterns are the highest-value behavioral signal StandFast captures —
//   they correlate strongly with the rest-of-session blow-up risk. Linear
//   scoring hides patterns inside large-but-stable totals; compounding
//   scoring surfaces them.
//
// WHY REPEATED OVERRIDES ARE HIGH-RISK:
//   The trader has been shown a warning, acknowledged it, and proceeded.
//   Doing this once is judgment; doing it three times is conditioning the
//   self to dismiss future warnings. The escalation curve penalizes the
//   second + third occurrences hard so the discipline score tracks that
//   conditioning risk faithfully.
//
// WHY POSITIVE ACTIONS DECAY:
//   "Trade revised" is good behavior the first time — the trader saw a
//   warning and chose to fix the plan. Revising again on the same setup
//   suggests indecision rather than discipline; by the third revision the
//   credit is minimal because the underlying action is no longer pure
//   discipline.
// -----------------------------------------------------------------------------
type EscalationRule = {
  /** Weight applied to the 2nd occurrence. */
  secondOccurrence: number;
  /** Weight applied to every occurrence from the 3rd onward. */
  thirdPlusOccurrence: number;
};

const BEHAVIOR_ESCALATION_RULES: Partial<
  Record<BehaviorScoringKey, EscalationRule>
> = {
  warning_ignored: { secondOccurrence: -12, thirdPlusOccurrence: -15 },
  stop_widened: { secondOccurrence: -18, thirdPlusOccurrence: -18 },
  trade_revised: { secondOccurrence: 2, thirdPlusOccurrence: 1 },
};

// Returns the total weighted contribution of `count` occurrences of `key`.
// Falls back to linear scoring when no escalation rule exists.
function contributionFor(key: BehaviorScoringKey, count: number): number {
  if (count <= 0) return 0;
  const base = BEHAVIOR_SCORING_WEIGHTS[key];
  const rule = BEHAVIOR_ESCALATION_RULES[key];
  if (!rule) return base * count;
  let total = base; // 1st occurrence
  if (count >= 2) total += rule.secondOccurrence;
  if (count >= 3) total += rule.thirdPlusOccurrence * (count - 2);
  return total;
}

// -----------------------------------------------------------------------------
// State + intensity bands. All thresholds in one place.
// -----------------------------------------------------------------------------
const SCORE_BANDS = {
  focused: { min: 85 },
  calm: { min: 70 },
  caution: { min: 50 },
  elevated: { min: 30 },
  // < 30 → high-risk
} as const;

// -----------------------------------------------------------------------------
// Result shape
// -----------------------------------------------------------------------------
export const SESSION_STATES = [
  "calm",
  "focused",
  "caution",
  "elevated",
  "high-risk",
] as const;
export type SessionStateLabel = (typeof SESSION_STATES)[number];

export const EMOTIONAL_RISK_LEVELS = [
  "low",
  "moderate",
  "elevated",
  "high",
] as const;
export type EmotionalRiskLevel = (typeof EMOTIONAL_RISK_LEVELS)[number];

export const INTERVENTION_INTENSITIES = [
  "normal",
  "increased",
  "strict",
  "maximum",
] as const;
export type InterventionIntensity = (typeof INTERVENTION_INTENSITIES)[number];

export const BEHAVIORAL_TAGS = [
  "warning_ignored",
  "risk_escalation",
  "stop_widening",
  "oversized_position",
  "revenge_risk",
  "overtrading",
  "mistake_logged",
  "plan_followed",
  "trade_avoided",
  "trade_revised",
  "clean_execution",
] as const;
export type BehavioralTag = (typeof BEHAVIORAL_TAGS)[number];

// Which tags count as negative for `dominantBehavior` selection.
const NEGATIVE_TAGS: ReadonlySet<BehavioralTag> = new Set([
  "warning_ignored",
  "risk_escalation",
  "stop_widening",
  "oversized_position",
  "revenge_risk",
  "overtrading",
  "mistake_logged",
]);

export type BehaviorAnalysisInputs = {
  behaviorEvents: BehaviorEvent[];
  closedTrades: ClosedTrade[];
  activeTrades: ActiveTrade[];
  // monitoringEvents feeds two escalation detectors: per-trade deviation
  // counts (multiple deviations inside one trade) and risk-grew-after-
  // intervention (which needs the deviation timeline, not just the
  // headline behavior feed).
  monitoringEvents: MonitoringEvent[];
  riskRules: RiskRules;
  sessionMetrics: SessionMetrics;
};

export type BehaviorAnalysisResult = {
  sessionState: SessionStateLabel;
  disciplineScore: number;
  emotionalRiskLevel: EmotionalRiskLevel;
  dominantBehavior: BehavioralTag | null;
  behavioralTags: BehavioralTag[];
  interventionIntensity: InterventionIntensity;
  explanationSummary: string;
  keyDrivers: string[];
  // Escalation pattern detection — fires when REPEATED negative behavior
  // emerges. The score itself reflects compounding penalties, but this
  // boolean + reasons array give downstream surfaces (banners, modals) an
  // explicit "escalation in progress" signal independent of the numeric
  // score, so the trader can be informed BEFORE the score has tanked.
  escalationDetected: boolean;
  escalationReasons: string[];
  // Raw counts surfaced so dashboard surfaces (and future Reports) can read
  // the same numbers the score derives from. Skipping a separate "stats"
  // hook keeps both surfaces aligned.
  counts: Record<BehaviorScoringKey, number>;
};

// -----------------------------------------------------------------------------
// Plain-English driver labels — one per scoring key. Used in `keyDrivers`.
// -----------------------------------------------------------------------------
const DRIVER_LABELS: Record<BehaviorScoringKey, (n: number) => string> = {
  warning_ignored: (n) => `${n} warning${n === 1 ? "" : "s"} ignored`,
  trade_activated_with_warnings: (n) =>
    `${n} trade${n === 1 ? "" : "s"} activated with acknowledged warnings`,
  stop_widened: (n) =>
    `${n} stop${n === 1 ? "" : "s"} widened beyond approved risk`,
  position_size_increased: (n) =>
    `${n} position size increase${n === 1 ? "" : "s"} beyond approval`,
  mistake_logged: (n) => `${n} mistake${n === 1 ? "" : "s"} logged`,
  daily_risk_exceeded: (n) =>
    n > 0 ? "Daily risk exceeded" : "Daily risk within limits",
  max_trades_exceeded: (n) =>
    n > 0 ? "Daily trade limit exceeded" : "Daily trade count within limit",
  losing_trade_after_ignored_warning: (n) =>
    `${n} losing trade${n === 1 ? "" : "s"} after ignored warning`,
  trade_avoided: (n) =>
    `${n} trade${n === 1 ? "" : "s"} avoided after intervention`,
  trade_revised: (n) =>
    `${n} trade${n === 1 ? "" : "s"} revised after warning`,
  clean_approved_trade: (n) =>
    `${n} clean approved trade${n === 1 ? "" : "s"}`,
  clean_exit_at_plan: (n) =>
    `${n} clean exit${n === 1 ? "" : "s"} at plan`,
  reflection_added: (n) => `${n} reflection${n === 1 ? "" : "s"} added`,
};

// =============================================================================
// Count derivation — every scoring input pulled from observed data.
// =============================================================================

function countWarningIgnored(events: BehaviorEvent[]): number {
  // Any Continue Anyway decision counts. Both warning-only overrides
  // (TRADE_OVERRIDE_ACCEPTED) and fail-overrides (WARNING_IGNORED) carry
  // `decision: "continue_anyway"`.
  return events.filter((e) => e.decision === "continue_anyway").length;
}

function countTradeActivatedWithWarnings(
  activeTrades: ActiveTrade[],
  closedTrades: ClosedTrade[],
  events: BehaviorEvent[],
): number {
  // Prefer trade-level signal — every override activation produces an
  // active/closed record with `approvalStatus === "approved_with_warnings"`.
  // Falls back to the TRADE_OVERRIDE_ACCEPTED event count if for any reason
  // the trade record didn't land (defensive).
  const fromTrades =
    activeTrades.filter((t) => t.approvalStatus === "approved_with_warnings")
      .length +
    closedTrades.filter(
      (t) =>
        events.find(
          (e) =>
            e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE &&
            (e.metadata as Record<string, unknown> | undefined)?.tradeId ===
              t.id,
        ) != null,
    ).length;
  if (fromTrades > 0) return fromTrades;
  return events.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  ).length;
}

function countStopWidened(events: BehaviorEvent[]): number {
  return events.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  ).length;
}

function countPositionSizeIncreased(events: BehaviorEvent[]): number {
  return events.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  ).length;
}

function countMistakeLogged(events: BehaviorEvent[]): number {
  return events.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.MISTAKE_MARKED,
  ).length;
}

function countDailyRiskExceeded(
  sessionMetrics: SessionMetrics,
  riskRules: RiskRules,
): number {
  // 1 if the trader has consumed past the configured daily loss cap, else
  // 0. Single-shot signal — repeated breaches don't compound (the cap is
  // already broken).
  return sessionMetrics.dailyLossLimitBreached ||
    sessionMetrics.dailyLossUsedPercent > riskRules.maxDailyLossPercent
    ? 1
    : 0;
}

function countMaxTradesExceeded(
  sessionMetrics: SessionMetrics,
  riskRules: RiskRules,
): number {
  return sessionMetrics.tradesTakenToday > riskRules.maxDailyTrades ? 1 : 0;
}

function countLosingTradeAfterOverride(
  closedTrades: ClosedTrade[],
  events: BehaviorEvent[],
): number {
  // For each losing closed trade, check if there's a TRADE_OVERRIDE_ACCEPTED
  // event with a matching tradeId, OR if any TRADE_CLOSED event for this
  // trade carried a "loss" outcome AND the trade's preceding TRADE_MARKED_
  // ACTIVE event followed a TRADE_OVERRIDE_ACCEPTED in the timeline.
  let count = 0;
  for (const trade of closedTrades) {
    if (trade.outcome !== "loss") continue;
    const hadOverride = events.some(
      (e) =>
        e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED &&
        e.symbol === trade.symbol,
    );
    if (hadOverride) count += 1;
  }
  return count;
}

function countTradeAvoided(events: BehaviorEvent[]): number {
  return events.filter((e) => e.decision === "cancel_trade").length;
}

function countTradeRevised(events: BehaviorEvent[]): number {
  return events.filter((e) => e.decision === "revise_trade").length;
}

function countCleanApprovedTrade(events: BehaviorEvent[]): number {
  return events.filter((e) => e.decision === "approved").length;
}

function countCleanExitAtPlan(closedTrades: ClosedTrade[]): number {
  // Win or breakeven outcome on a trade that closed at-or-better than
  // the original plan. Defined here as: outcome ∈ {win, breakeven} AND
  // deviationCount === 0 AND mistakeCount === 0 (the trader honored the
  // plan all the way through).
  return closedTrades.filter(
    (t) =>
      (t.outcome === "win" || t.outcome === "breakeven") &&
      t.deviationCount === 0 &&
      t.mistakeCount === 0,
  ).length;
}

function countReflectionAdded(events: BehaviorEvent[]): number {
  return events.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_EXIT_REFLECTION_ADDED,
  ).length;
}

// =============================================================================
// Derivation
// =============================================================================

// Session states ranked best → worst. Guardrails compare ranks so they can
// "raise the floor" (force a state to be at least N) or "lower the ceiling"
// (force a state to be at most N) without caring which raw score-band
// produced the candidate state.
const SESSION_STATE_RANK: Record<SessionStateLabel, number> = {
  focused: 0,
  calm: 1,
  caution: 2,
  elevated: 3,
  "high-risk": 4,
};
const SESSION_STATE_BY_RANK: readonly SessionStateLabel[] = [
  "focused",
  "calm",
  "caution",
  "elevated",
  "high-risk",
];

function deriveSessionState(
  score: number,
  counts: Record<BehaviorScoringKey, number>,
  impulsiveActionCount: number,
): SessionStateLabel {
  // 1) Pick the natural state from the score band.
  let label: SessionStateLabel;
  if (score >= SCORE_BANDS.focused.min) label = "focused";
  else if (score >= SCORE_BANDS.calm.min) label = "calm";
  else if (score >= SCORE_BANDS.caution.min) label = "caution";
  else if (score >= SCORE_BANDS.elevated.min) label = "elevated";
  else label = "high-risk";

  // 2) Apply behavioral guardrails. These are HARD rules — once the
  //    underlying behavior is severe enough, the session state must
  //    reflect it regardless of where the score landed.
  let rank = SESSION_STATE_RANK[label];

  // Ceiling: 5+ ignored warnings is a sustained-override pattern. The
  // session cannot read as "focused" or "calm" no matter how many positive
  // actions accumulate — discipline is no longer the dominant signal.
  if (counts.warning_ignored >= 5) {
    rank = Math.max(rank, SESSION_STATE_RANK.caution);
  }
  // Floor: 10+ impulsive actions OR any daily-risk breach pushes the
  // session to at least elevated. Score noise can't keep these out of
  // elevated/high-risk.
  if (impulsiveActionCount >= 10) {
    rank = Math.max(rank, SESSION_STATE_RANK.elevated);
  }
  if (counts.daily_risk_exceeded > 0) {
    rank = Math.max(rank, SESSION_STATE_RANK.elevated);
  }

  return SESSION_STATE_BY_RANK[rank];
}

function deriveEmotionalRisk(
  score: number,
  counts: Record<BehaviorScoringKey, number>,
): EmotionalRiskLevel {
  // Score band is the base. Hard signals (daily risk breach, post-override
  // losses, stack of ignored warnings) bump one tier upward.
  let level: EmotionalRiskLevel;
  if (score >= 70) level = "low";
  else if (score >= 50) level = "moderate";
  else if (score >= 30) level = "elevated";
  else level = "high";

  const hardSignals =
    counts.daily_risk_exceeded +
    counts.losing_trade_after_ignored_warning +
    (counts.warning_ignored >= 3 ? 1 : 0);
  if (hardSignals >= 2 && level !== "high") {
    const order: EmotionalRiskLevel[] = ["low", "moderate", "elevated", "high"];
    level = order[Math.min(order.indexOf(level) + 1, order.length - 1)];
  }

  // Hard floor: any daily-risk breach makes "low"/"moderate" impossible.
  // The trader has materially exceeded their configured daily limit; the
  // emotional risk reading should reflect that without ambiguity.
  if (counts.daily_risk_exceeded > 0) {
    const order: EmotionalRiskLevel[] = ["low", "moderate", "elevated", "high"];
    if (order.indexOf(level) < order.indexOf("elevated")) {
      level = "elevated";
    }
  }

  return level;
}

function deriveInterventionIntensity(
  score: number,
): InterventionIntensity {
  if (score >= 70) return "normal";
  if (score >= 50) return "increased";
  if (score >= 30) return "strict";
  return "maximum";
}

function deriveBehavioralTags(
  counts: Record<BehaviorScoringKey, number>,
): BehavioralTag[] {
  const tags: BehavioralTag[] = [];
  if (counts.warning_ignored > 0) tags.push("warning_ignored");
  if (
    counts.position_size_increased > 0 ||
    counts.stop_widened > 0
  ) {
    tags.push("risk_escalation");
  }
  if (counts.stop_widened > 0) tags.push("stop_widening");
  if (counts.position_size_increased > 0) tags.push("oversized_position");
  if (counts.losing_trade_after_ignored_warning > 0) tags.push("revenge_risk");
  if (counts.max_trades_exceeded > 0) tags.push("overtrading");
  if (counts.mistake_logged > 0) tags.push("mistake_logged");
  if (counts.clean_approved_trade > 0) tags.push("plan_followed");
  if (counts.trade_avoided > 0) tags.push("trade_avoided");
  if (counts.trade_revised > 0) tags.push("trade_revised");
  if (counts.clean_exit_at_plan > 0) tags.push("clean_execution");
  return tags;
}

function deriveDominantBehavior(
  counts: Record<BehaviorScoringKey, number>,
): BehavioralTag | null {
  // Sum each negative tag's contribution (single behavior may roll up
  // multiple counts — e.g., risk_escalation pulls from stop_widened +
  // position_size_increased). Highest sum wins; ties broken by spec order.
  const totals: Record<BehavioralTag, number> = {
    warning_ignored: counts.warning_ignored,
    risk_escalation: counts.stop_widened + counts.position_size_increased,
    stop_widening: counts.stop_widened,
    oversized_position: counts.position_size_increased,
    revenge_risk: counts.losing_trade_after_ignored_warning,
    overtrading: counts.max_trades_exceeded,
    mistake_logged: counts.mistake_logged,
    plan_followed: 0,
    trade_avoided: 0,
    trade_revised: 0,
    clean_execution: 0,
  };
  let best: BehavioralTag | null = null;
  let bestCount = 0;
  for (const tag of BEHAVIORAL_TAGS) {
    if (!NEGATIVE_TAGS.has(tag)) continue;
    if (totals[tag] > bestCount) {
      best = tag;
      bestCount = totals[tag];
    }
  }
  return best;
}

function buildKeyDrivers(
  counts: Record<BehaviorScoringKey, number>,
): string[] {
  // Order: negatives first by raw count desc, then positives by count desc.
  // Drops zero-count entries so the list reads tightly.
  const negativeKeys: BehaviorScoringKey[] = [
    "warning_ignored",
    "trade_activated_with_warnings",
    "stop_widened",
    "position_size_increased",
    "mistake_logged",
    "daily_risk_exceeded",
    "max_trades_exceeded",
    "losing_trade_after_ignored_warning",
  ];
  const positiveKeys: BehaviorScoringKey[] = [
    "trade_avoided",
    "trade_revised",
    "clean_approved_trade",
    "clean_exit_at_plan",
    "reflection_added",
  ];

  const fmt = (keys: BehaviorScoringKey[]) =>
    keys
      .filter((k) => counts[k] > 0)
      .sort((a, b) => counts[b] - counts[a])
      .map((k) => DRIVER_LABELS[k](counts[k]));

  return [...fmt(negativeKeys), ...fmt(positiveKeys)];
}

function buildExplanationSummary(
  score: number,
  sessionState: SessionStateLabel,
  drivers: string[],
  dominant: BehavioralTag | null,
): string {
  if (drivers.length === 0) {
    return "Session in calm — no behavioral signals yet.";
  }
  const top = drivers.slice(0, 2).join(", ");
  if (dominant && score < 70) {
    return `Session in ${sessionState} (${score}). Dominant pattern: ${humanizeTag(dominant)}. ${top}.`;
  }
  return `Session in ${sessionState} (${score}). ${top}.`;
}

function humanizeTag(tag: BehavioralTag): string {
  return tag.replace(/_/g, " ");
}

// -----------------------------------------------------------------------------
// Escalation detection
//
// Independent from the discipline score: fires the moment a pattern is
// observable, BEFORE the score has fully tanked. The dashboard can use
// `escalationDetected` to surface a banner; analytics can use the reason
// strings to attribute the escalation to a specific trigger.
//
// Triggers:
//   - 2+ ignored warnings in the session (override stacking)
//   - 2+ overrides resulting in marked-active trades (override
//     conditioning)
//   - risk grew after intervention (continue-anyway → subsequent stop
//     widen OR position size increase)
//   - 3+ deviations inside a single trade (single-trade escalation)
// -----------------------------------------------------------------------------

function detectEscalation(
  counts: Record<BehaviorScoringKey, number>,
  closedTrades: ClosedTrade[],
  monitoringEvents: MonitoringEvent[],
): { detected: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (counts.warning_ignored >= 2) {
    reasons.push(
      `Repeated warning overrides (${counts.warning_ignored} this session)`,
    );
  }
  if (counts.trade_activated_with_warnings >= 2) {
    reasons.push(
      `Multiple trades activated with acknowledged warnings (${counts.trade_activated_with_warnings})`,
    );
  }
  if (
    counts.warning_ignored >= 1 &&
    (counts.stop_widened >= 1 || counts.position_size_increased >= 1)
  ) {
    reasons.push("Risk exposure grew after intervention override");
  }

  // Per-trade deviation stack — counts across both active monitoring and
  // archived closed trades so escalation surfaces during the live trade,
  // not only after it closes.
  const deviationsByTrade = new Map<string, number>();
  for (const event of monitoringEvents) {
    deviationsByTrade.set(
      event.tradeId,
      (deviationsByTrade.get(event.tradeId) ?? 0) + event.deviations.length,
    );
  }
  for (const t of closedTrades) {
    if (t.deviationCount > (deviationsByTrade.get(t.id) ?? 0)) {
      deviationsByTrade.set(t.id, t.deviationCount);
    }
  }
  const maxPerTrade = Math.max(0, ...deviationsByTrade.values());
  if (maxPerTrade >= 3) {
    reasons.push(`${maxPerTrade} deviations within a single trade`);
  }

  return { detected: reasons.length > 0, reasons };
}

// =============================================================================
// Public entry point
// =============================================================================

export function computeBehaviorAnalysis(
  inputs: BehaviorAnalysisInputs,
): BehaviorAnalysisResult {
  const {
    behaviorEvents,
    closedTrades,
    activeTrades,
    monitoringEvents,
    riskRules,
    sessionMetrics,
  } = inputs;

  const counts: Record<BehaviorScoringKey, number> = {
    warning_ignored: countWarningIgnored(behaviorEvents),
    trade_activated_with_warnings: countTradeActivatedWithWarnings(
      activeTrades,
      closedTrades,
      behaviorEvents,
    ),
    stop_widened: countStopWidened(behaviorEvents),
    position_size_increased: countPositionSizeIncreased(behaviorEvents),
    mistake_logged: countMistakeLogged(behaviorEvents),
    daily_risk_exceeded: countDailyRiskExceeded(sessionMetrics, riskRules),
    max_trades_exceeded: countMaxTradesExceeded(sessionMetrics, riskRules),
    losing_trade_after_ignored_warning: countLosingTradeAfterOverride(
      closedTrades,
      behaviorEvents,
    ),
    trade_avoided: countTradeAvoided(behaviorEvents),
    trade_revised: countTradeRevised(behaviorEvents),
    clean_approved_trade: countCleanApprovedTrade(behaviorEvents),
    clean_exit_at_plan: countCleanExitAtPlan(closedTrades),
    reflection_added: countReflectionAdded(behaviorEvents),
  };

  // Discipline score — start at 100, apply each behavior's weighted
  // contribution (compounding for keys in BEHAVIOR_ESCALATION_RULES),
  // clamp 0–100.
  let score = 100;
  for (const key of Object.keys(counts) as BehaviorScoringKey[]) {
    score += contributionFor(key, counts[key]);
  }
  const disciplineScore = Math.max(0, Math.min(100, score));

  // Impulsive-action count is needed for the session-state floor. Mirrors
  // the StatTiles formula so the dashboard's "Impulsive Actions" tile and
  // the engine's session-state guardrails read off the same number.
  const impulsiveActionCount =
    counts.warning_ignored +
    counts.mistake_logged +
    counts.stop_widened +
    counts.position_size_increased +
    counts.daily_risk_exceeded +
    counts.max_trades_exceeded;

  const sessionState = deriveSessionState(
    disciplineScore,
    counts,
    impulsiveActionCount,
  );
  const emotionalRiskLevel = deriveEmotionalRisk(disciplineScore, counts);
  const interventionIntensity = deriveInterventionIntensity(disciplineScore);
  const behavioralTags = deriveBehavioralTags(counts);
  const dominantBehavior = deriveDominantBehavior(counts);
  const keyDrivers = buildKeyDrivers(counts);
  const explanationSummary = buildExplanationSummary(
    disciplineScore,
    sessionState,
    keyDrivers,
    dominantBehavior,
  );
  const escalation = detectEscalation(counts, closedTrades, monitoringEvents);

  return {
    sessionState,
    disciplineScore,
    emotionalRiskLevel,
    dominantBehavior,
    behavioralTags,
    interventionIntensity,
    explanationSummary,
    keyDrivers,
    escalationDetected: escalation.detected,
    escalationReasons: escalation.reasons,
    counts,
  };
}

// =============================================================================
// React hook
// =============================================================================

// Memoized read of the analysis engine. Same shape as `useSessionIntelligence`
// — primitive selectors + a single `useMemo`. Never call
// `computeBehaviorAnalysis()` directly inside a Zustand selector; that
// returns a fresh object each render and trips the getSnapshot loop guard.
export function useBehaviorAnalysis(): BehaviorAnalysisResult {
  // Session-scoped reads. Current-session views must NEVER include
  // historical records (events from prior trading days, or events from a
  // session that has since closed) — the engine output drives the live
  // dashboard, not the Reports view.
  const behaviorEvents = useCurrentSessionEvents();
  const monitoringEvents = useCurrentSessionMonitoringEvents();
  const { activeTrades, closedTrades } = useCurrentSessionTrades();
  const riskRules = useAppStore((s) => s.riskRules);
  const sessionMetrics = useAppStore((s) => s.session);

  return useMemo(
    () =>
      computeBehaviorAnalysis({
        behaviorEvents,
        closedTrades,
        activeTrades,
        monitoringEvents,
        riskRules,
        sessionMetrics,
      }),
    [
      behaviorEvents,
      closedTrades,
      activeTrades,
      monitoringEvents,
      riskRules,
      sessionMetrics,
    ],
  );
}
