"use client";

import { useEffect, useMemo, useState } from "react";

import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  useBehavioralDetection,
  type BehavioralDetection,
  type DetectionSeverity,
} from "@/lib/detection/behavioral-detection-engine";
import {
  useCurrentSessionEvents,
  useCurrentSessionInterventions,
  useCurrentSessionMonitoringEvents,
  useCurrentSessionTrades,
} from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";
import type {
  BehaviorEvent,
  ClosedTrade,
  DeviationSeverity,
  InterventionEvent,
  MonitoringEvent,
  RiskRules,
  SessionMetrics,
} from "@/types";

// =============================================================================
// StandFast Behavioral State Aggregation System
// =============================================================================
//
// PURPOSE
//   The detection engine answers "WHICH patterns are happening?". This file
//   answers "WHAT IS THE TRADER'S OVERALL PSYCHOLOGICAL CONDITION RIGHT NOW?"
//   by aggregating every behavioral signal into a single net score, applying
//   time-decay so old behavior fades, crediting positive actions as recovery,
//   and mapping the final score to a session-state label.
//
//   This is the layer the Session State panel reads. It MUST NEVER
//   contradict an active critical detection — explicit floor rules enforce
//   that ("if 2 critical patterns are active, the state cannot read below
//   Reactive").
//
// HOW THIS LAYERS WITH THE OTHER ENGINES
//
//     BehaviorDeviationEngine    per-update deviations on a single trade
//                ↓                (writes MonitoringEvents + BehaviorEvents)
//     BehavioralDetectionEngine  named behavior patterns (revenge,
//                ↓                overtrading, etc.) at a single moment
//     BehavioralStateAggregator  cumulative net psychological condition
//                ↓                across the entire session
//     Session State panel        reads from this aggregator
//
//   BehaviorAnalysisEngine still produces the 0–100 Discipline Score, which
//   is a backward-looking session report card. That score is fine; it
//   complements the forward-looking psychological state this aggregator
//   produces.
//
// DESIGN PRINCIPLES
//   1. PURE COMPUTATION + HOOK. The compute function takes `nowMs` so it's
//      framework-agnostic + unit-testable.
//   2. TIME-DECAY. Every event's contribution is multiplied by an
//      age-based decay factor so old behavior fades gradually.
//   3. CUMULATIVE STACKING. Repeated negative events compound — the third
//      warning override hurts more than the first because each instance
//      ages slowly and they all sum.
//   4. POSITIVE RECOVERY. Trade revisions, avoidances, clean exits, and
//      reflections subtract pressure — but with smaller weights, so one
//      good action cannot wipe out a session of poor discipline.
//   5. NEVER CONTRADICTS A CRITICAL EVENT. Detection-floor rules raise the
//      state above the band when patterns are active at warning/critical.
//   6. EXPLAINABLE. The reading carries the top contributors so a future
//      "why is the state X?" surface can render the arithmetic.
//   7. NO MUTATIONS. Pure derivation over already-persisted slices.
//
// V1 → V2 EVOLUTION
//   * Visual tone variation per state (UI is consumer's responsibility)
//   * On-transition feed entries (separate effect layer)
//   * Decay constants → user-configurable
//   * AI cluster classification reads `contributors` + `state` and adds
//     softer signals without replacing this deterministic floor
// =============================================================================

// -----------------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------------

export const BEHAVIORAL_STATE_LABELS = [
  "focused",
  "controlled",
  "stable",
  // Distinct OVERTRADING state — surfaced when the trader reaches the
  // configured daily-trade cap WITHOUT compounding behavioral collapse.
  // Sits below `escalating` because rule-defiance + intervention-override
  // signals should preempt it when both are present. Reserved
  // specifically so FATIGUED can mean what it says: cognitive overload
  // from sustained pacing, not just "you hit the cap".
  "overtrading",
  "escalating",
  "reactive",
  "impulsive",
  "fatigued",
  "locked_down",
] as const;
export type BehavioralStateLabel = (typeof BEHAVIORAL_STATE_LABELS)[number];

// Behavioral Integrity Score band vocabulary. Maps the 0–100 discipline
// score to a human-readable tier; the dashboard displays the band label
// alongside the numeric value so the trader doesn't have to interpret the
// number on its own.
export const DISCIPLINE_BANDS = [
  "exceptional",
  "controlled",
  "unstable",
  "degrading",
  "critical",
] as const;
export type DisciplineBand = (typeof DISCIPLINE_BANDS)[number];

// State ceiling — the MAXIMUM displayed discipline score for a given
// behavioral state. Implements requirement #6 of the credibility pass:
// "If state is Reactive / Impulsive / Locked Down, discipline cannot
// still appear elite." A trader in `locked_down` literally CANNOT see a
// score above 25, regardless of any clean approvals in their history.
const STATE_DISCIPLINE_CEILING: Record<BehavioralStateLabel, number> = {
  focused: 100,
  controlled: 100,
  stable: 90,
  // Overtrading — hit cap but not yet compounding behavioral collapse.
  // Sits between stable (90) and escalating (70) — meaningfully capped
  // but not as severe as a session with active rule-defiance patterns.
  overtrading: 80,
  escalating: 70,
  reactive: 55,
  impulsive: 35,
  // Fatigued ceiling is lower than impulsive because FATIGUED in the
  // refactored model represents compound pacing collapse (overtrading +
  // consecutive losses or heavy drawdown). Real cognitive overload.
  fatigued: 45,
  locked_down: 25,
};

// Behavioral momentum vocabulary — direction the session is moving.
//   deteriorating  recent pressure > older pressure  (worsening)
//   stable         recent pressure ≈ older pressure
//   improving      recent pressure < older pressure
export const MOMENTUM_TRENDS = [
  "deteriorating",
  "stable",
  "improving",
] as const;
export type MomentumTrend = (typeof MOMENTUM_TRENDS)[number];

export type BehavioralMomentum = {
  trend: MomentumTrend;
  // 0–1 magnitude of the trend. 0 = perfectly steady; 1 = sharply changing.
  magnitude: number;
  // Recent window (last 5 min) pressure contribution.
  recentPressure: number;
  // Older window (5–30 min) pressure contribution. Used as the comparator.
  priorPressure: number;
};

// Base recovery efficiency — see RECOVERY_FRICTION below for the dynamic
// drag layer that reduces this after critical events accumulate.
const RECOVERY_EFFICIENCY_BASE = 0.5;

// Recovery friction (trust debt). Each unit of critical-grade pressure
// reduces recovery efficiency by `dragPerCriticalPoint`, down to a floor.
// Effect: after the trader produces critical events, clean actions cannot
// efficiently restore discipline — recovery must be EARNED through
// sustained stability while the critical pressure decays naturally.
const RECOVERY_FRICTION = {
  // Critical weight threshold above which the drag kicks in.
  startsAfter: 20,
  // Drag per critical pressure unit beyond startsAfter.
  dragPerPoint: 0.01,
  // Floor — even at maximum drag, some recovery still flows. Otherwise a
  // single critical event would permanently lock the session at 0
  // efficiency, which would be punitive rather than corrective.
  floor: 0.1,
} as const;

// Active intervention discipline ceiling — defense-in-depth on top of the
// state-derived ceiling. If a daily-loss lockout is active, discipline is
// capped at 20 regardless of what the state says, eliminating any
// possible race condition where state hasn't fully escalated yet. Same
// for consecutive-loss pause (cap 45) and loss cooldown (cap 70 — softer
// because cooldowns are routine after a single losing close).
const ACTIVE_INTERVENTION_CEILING = {
  daily_loss_lockout: 20,
  consecutive_loss_pause: 45,
  loss_cooldown: 70,
} as const;

// State precedence — higher number = more severe. Used for floor math
// ("the state cannot read below X").
//
// IMPORTANT ORDERING DECISION:
//   `overtrading` sits BELOW `escalating`. This is the architectural
//   change from the precedence-bug fix: rule-defiance / multi-warning
//   sessions (which floor at `escalating`) now WIN over an
//   overtrading-only floor, even when the trader has reached the cap.
//   The trader sees the SPECIFIC behavioral signal that's dominating —
//   not a generic fatigue label that obscures rule-breaking. FATIGUED
//   continues to outrank `impulsive` because compound pacing collapse
//   (overtrading + losses, drawdown) IS a more concerning systemic
//   condition than discrete rule-defiance, but it only triggers when
//   those compound conditions are met.
const STATE_RANK: Record<BehavioralStateLabel, number> = {
  focused: 0,
  controlled: 1,
  stable: 2,
  overtrading: 3,
  escalating: 4,
  reactive: 5,
  impulsive: 6,
  fatigued: 7,
  locked_down: 8,
};
const STATE_BY_RANK: readonly BehavioralStateLabel[] = [
  "focused",
  "controlled",
  "stable",
  "overtrading",
  "escalating",
  "reactive",
  "impulsive",
  "fatigued",
  "locked_down",
];

export type ScoreContributor = {
  source:
    | "behavior_event"
    | "monitoring_event"
    | "intervention"
    | "detection_floor";
  description: string;
  ageMinutes: number;
  weight: number; // signed: + adds pressure, - adds recovery
  decayFactor: number;
  netImpact: number; // weight × decayFactor (signed)
};

export type BehavioralStateReading = {
  state: BehavioralStateLabel;
  // Cumulative time-decayed positive (pressure-adding) score.
  pressureScore: number;
  // Cumulative time-decayed negative (recovery-adding) score, as a positive
  // number. (Recovery weights are stored signed-negative; this aggregates
  // their absolute magnitude for display.)
  recoveryScore: number;
  // pressure − recovery, floored at 0. The state band is read off this.
  netScore: number;
  // Behavioral Integrity Score (0–100). Replaces the legacy additive
  // "discipline score" — derived from the same time-decayed pressure +
  // recovery math that drives the state, then CAPPED by the state ceiling
  // so a Locked Down session can never display an elite-looking value.
  disciplineScore: number;
  // Score band label (exceptional → critical). Mapped from disciplineScore.
  disciplineBand: DisciplineBand;
  // Hard ceiling currently applied (lowest of state ceiling and active-
  // intervention ceiling). Surfaced so the UI can render "capped by state"
  // copy when relevant.
  disciplineCeiling: number;
  // Live recovery efficiency (0..1) — base 0.5 with friction subtracted
  // for accumulated critical events. Surfaced so consumers can render
  // "recovery slowed" copy.
  recoveryEfficiency: number;
  // Behavioral momentum (refinement 3) — direction the session is moving.
  momentum: BehavioralMomentum;
  // One-line trajectory narrative (refinement 8).
  arcSummary: string;
  // Per-state copy. The UI shouldn't hardcode these — read from here.
  narrative: string;
  // Top contributors by absolute impact, sorted desc. Cap = 8.
  topContributors: ScoreContributor[];
  // True if a detection-engine floor raised the state above the band.
  floorApplied: boolean;
  floorReason: string | null;
  // Sample timestamp used for decay math. Surfaced so consumers can debug
  // "why does my score look stale?" — the hook ticks every 60s but the
  // pure compute function uses whatever `nowMs` is passed in.
  sampledAtMs: number;
};

export type BehavioralStateInputs = {
  behaviorEvents: BehaviorEvent[];
  monitoringEvents: MonitoringEvent[];
  interventions: InterventionEvent[];
  detections: BehavioralDetection[];
  // Added in the realism pass — needed for the active-intervention
  // ceiling rule + recovery friction math. Optional so older callers
  // don't break; missing values are treated as "no active locks".
  closedTrades?: ClosedTrade[];
  sessionMetrics?: SessionMetrics;
  riskRules?: RiskRules;
  nowMs: number;
};

// -----------------------------------------------------------------------------
// Tunables — all weights, thresholds, decay knobs in one place.
// -----------------------------------------------------------------------------

export const STATE_AGGREGATOR_TUNABLES = {
  // Score bands. Each entry is the minimum score for that state. The state
  // is the highest band the netScore meets. Floors can raise the state
  // above the band-derived value.
  bands: {
    focused: 0,
    controlled: 6,
    stable: 14,
    escalating: 28,
    reactive: 45,
    impulsive: 65,
    lockedDown: 85,
    // `fatigued` is not band-driven — it's a pattern-specific override
    // applied when overtrading is at warning+ AND the score has already
    // entered the "stable" band or above.
  },

  // Age-decay curve. Events younger than `fullWeightMinutes` contribute
  // their full weight; events older than `negligibleMinutes` are dropped
  // entirely. Between the two, weight tapers linearly so the score smoothly
  // softens as a session ages.
  decay: {
    fullWeightMinutes: 5,
    halfWeightMinutes: 30,
    quarterWeightMinutes: 90,
    negligibleMinutes: 240,
  },

  // Behavior event weights — signed. Positive numbers add pressure; negative
  // numbers add recovery (subtract from net). Per-event-type table so the
  // most behaviorally meaningful events dominate the score. Unspecified
  // event types contribute 0 (neutral lifecycle events like
  // TRADE_PLAN_STARTED, RISK_CHECKED, etc.).
  behaviorEventWeights: {
    // Heavy pressure
    [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED]: 14,
    [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION]: 14,
    [BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED]: 12,
    [BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED]: 12,
    [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED]: 10,
    [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: 10,
    [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: 8,
    [BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED]: 8,
    [BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED]: 6,
    [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED]: 6,
    [BEHAVIOR_EVENT_TYPES.MISTAKE_MARKED]: 6,
    // Recovery
    [BEHAVIOR_EVENT_TYPES.TRADE_AVOIDED]: -8,
    [BEHAVIOR_EVENT_TYPES.TRADE_REVISED]: -5,
    [BEHAVIOR_EVENT_TYPES.STOP_TIGHTENED]: -4,
    [BEHAVIOR_EVENT_TYPES.TRADE_EXIT_REFLECTION_ADDED]: -3,
    [BEHAVIOR_EVENT_TYPES.TRADE_APPROVED]: -2,
  } as Partial<Record<string, number>>,

  // Monitoring-event severity → pressure. The deviation engine has already
  // classified severity for us; we just translate to weight. (BehaviorEvents
  // mirror these so the underlying signal could double-count if we summed
  // both. We DON'T sum both — `behaviorEvents` is the canonical source for
  // most signals; `monitoringEvents` is read only for critical/elevated
  // deviations that wouldn't otherwise be captured in the per-event-type
  // table above.)
  //
  // Set to 0 by default to avoid double-counting — the per-event-type
  // weights above already capture STOP_MOVED_FURTHER etc.
  monitoringSeverityWeights: {
    info: 0,
    caution: 0,
    elevated: 0,
    critical: 0,
  } as Record<DeviationSeverity, number>,

  // Intervention-decision weights.
  interventionWeights: {
    continue_anyway: 10,
    revise_trade: -4,
    cancel_trade: -6,
  },

  // Trade-closed metadata weights (read from BehaviorEvent metadata when
  // eventType === TRADE_CLOSED). Outcome shape:
  //   { outcome: "win" | "loss" | "breakeven", deviationCount: number, ... }
  tradeClosedWeights: {
    cleanWin: -6, // outcome === "win" && deviationCount === 0
    win: -2, // outcome === "win" with deviations
    loss: 4, // every loss carries a small pressure floor
    losingWithDeviations: 8, // outcome === "loss" && deviationCount > 0
  },
} as const;

// -----------------------------------------------------------------------------
// Per-state narrative + tone. UI consumers read from this map; nothing is
// hardcoded in the dashboard.
// -----------------------------------------------------------------------------

// Per-state copy. Each entry is intentionally distinct from its neighbors
// so the trader reads a clear progression as the state climbs, not nine
// re-wordings of "discipline weakening". Tone is clinical — describes the
// CONDITION, not the emotion.
//
//   focused       No behavioral signals; trader is executing the plan.
//   controlled    Minor signals present; trader is metabolizing them well.
//   stable        Signals accumulating; the session is no longer pristine.
//   overtrading   Trade pacing has hit configured limits without
//                 compounding behavioral collapse.
//   escalating    Multiple signals stacking; integrity is declining.
//   reactive      Decisions are responses to recent events, not setups.
//   impulsive     Rule adherence is breaking across multiple patterns.
//   fatigued      Compound pacing collapse — overtrading + losses or
//                 drawdown. Cognitive overload signal.
//   locked_down   Critical instability; trading access restricted.
export const BEHAVIORAL_STATE_NARRATIVE: Record<BehavioralStateLabel, string> =
  {
    focused:
      "Behavior stable. Trader is executing the plan with no behavioral signals present.",
    controlled:
      "Discipline holding. Minor behavioral signals present but contained — the trader is metabolizing them.",
    stable:
      "Behavioral signals are accumulating. The session is no longer pristine; awareness required before the next decision.",
    overtrading:
      "Trade pacing has reached the configured daily cap. Behavior is otherwise contained — review whether further entries are justified.",
    escalating:
      "Behavioral pressure rising. Multiple risk signals stacking — integrity is materially declining.",
    reactive:
      "Decisions are reactions to recent events rather than to setups. The trader is no longer leading the session.",
    impulsive:
      "Behavior unstable. Rule adherence deteriorating across multiple patterns simultaneously.",
    fatigued:
      "Cognitive overload pattern. Overtrading combined with losses or drawdown — signal quality is degrading.",
    locked_down:
      "Critical behavioral instability detected. Trading access restricted by system recommendation.",
  };

// Visual tone hint — the UI maps this to ring/text colors. Defined here
// instead of the component so the engine owns the full presentation
// vocabulary.
export type BehavioralStateTone =
  | "stable"
  | "watchful"
  | "elevated"
  | "critical"
  | "lockdown";

export const BEHAVIORAL_STATE_TONE: Record<
  BehavioralStateLabel,
  BehavioralStateTone
> = {
  focused: "stable",
  controlled: "stable",
  stable: "watchful",
  // Overtrading shares the watchful tone — a specific signal worth
  // noticing but not yet a destructive pattern by itself.
  overtrading: "watchful",
  escalating: "elevated",
  reactive: "elevated",
  impulsive: "critical",
  fatigued: "critical",
  locked_down: "lockdown",
};

// -----------------------------------------------------------------------------
// Time decay
//
// Piecewise-linear curve. Tuned so:
//   * Events under 5 min carry full weight (recent behavior dominates).
//   * At 30 min, weight halves.
//   * At 90 min, weight quarters.
//   * At 240 min (4 hours), weight is effectively zero.
//
// Linear interpolation between knots avoids the bouncy-thresholds problem
// where the score jumps as an event crosses an age boundary.
// -----------------------------------------------------------------------------
function decayFactor(ageMinutes: number): number {
  const D = STATE_AGGREGATOR_TUNABLES.decay;
  if (ageMinutes <= D.fullWeightMinutes) return 1;
  if (ageMinutes >= D.negligibleMinutes) return 0;
  if (ageMinutes <= D.halfWeightMinutes) {
    const span = D.halfWeightMinutes - D.fullWeightMinutes;
    const progressed = ageMinutes - D.fullWeightMinutes;
    return 1 - 0.5 * (progressed / span);
  }
  if (ageMinutes <= D.quarterWeightMinutes) {
    const span = D.quarterWeightMinutes - D.halfWeightMinutes;
    const progressed = ageMinutes - D.halfWeightMinutes;
    return 0.5 - 0.25 * (progressed / span);
  }
  // quarterWeightMinutes → negligibleMinutes : 0.25 → 0
  const span = D.negligibleMinutes - D.quarterWeightMinutes;
  const progressed = ageMinutes - D.quarterWeightMinutes;
  return 0.25 * (1 - progressed / span);
}

function ageMinutesFromIso(iso: string | undefined, nowMs: number): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Math.max(0, (nowMs - t) / 60_000);
}

// -----------------------------------------------------------------------------
// Per-event weight resolvers
// -----------------------------------------------------------------------------

function weightForBehaviorEvent(e: BehaviorEvent): number {
  const table = STATE_AGGREGATOR_TUNABLES.behaviorEventWeights;
  if (e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_CLOSED) {
    return weightForClosedTrade(e);
  }
  const direct = table[e.eventType];
  if (typeof direct === "number") return direct;
  return 0;
}

function weightForClosedTrade(e: BehaviorEvent): number {
  const W = STATE_AGGREGATOR_TUNABLES.tradeClosedWeights;
  const meta = e.metadata as Record<string, unknown> | undefined;
  if (!meta) return 0;
  const outcome = meta.outcome;
  const deviationCount =
    typeof meta.deviationCount === "number" ? meta.deviationCount : 0;
  if (outcome === "win") {
    return deviationCount === 0 ? W.cleanWin : W.win;
  }
  if (outcome === "loss") {
    return deviationCount > 0 ? W.losingWithDeviations : W.loss;
  }
  return 0;
}

function weightForIntervention(i: InterventionEvent): number {
  return STATE_AGGREGATOR_TUNABLES.interventionWeights[i.decision] ?? 0;
}

function weightForMonitoring(m: MonitoringEvent): number {
  return (
    STATE_AGGREGATOR_TUNABLES.monitoringSeverityWeights[m.severity] ?? 0
  );
}

// -----------------------------------------------------------------------------
// Detection-driven floor — REFACTORED (state-precedence fix)
//
// The state must NEVER read lower than what the active patterns demand.
// The previous floor ladder had overtrading-at-warning ranked ABOVE the
// multi-warning rule, so hitting the daily cap with NO rule-defiance
// patterns active was producing the same label (`fatigued`) as a
// genuine pacing-collapse session. That made the label psychologically
// inaccurate and obscured rule-defiance signals when overtrading was
// also present.
//
// New design:
//   1. Rule defiance + multi-warning patterns ALWAYS outrank
//      overtrading-alone. A session with stop widening + override +
//      overtrading reads as ESCALATING (the dominant behavioral arc),
//      not FATIGUED.
//   2. OVERTRADING is its own state — fires when the cap-hit signal is
//      the dominant pattern and nothing else is collapsing.
//   3. FATIGUED is reserved for COMPOUND pacing collapse — overtrading
//      paired with consecutive losses or significant drawdown. Real
//      cognitive overload, not just "you hit 3 trades".
//
// Priority ladder (first match wins, highest floor first):
//
//   1. position_size_escalation at CRITICAL              → locked_down
//      (daily risk cap breached)
//   2. ≥ 3 critical detections                           → locked_down
//   3. ≥ 2 critical detections                           → impulsive
//   4. overtrading CRITICAL + compound conditions        → fatigued
//      (compound = consecutiveLosses ≥ 2 OR
//                   dailyLossUsed > 50% of cap)
//   5. overtrading CRITICAL (no compound)                → overtrading
//      (cap blown past but no degradation evidence)
//   6. ≥ 1 critical detection                            → escalating
//   7. ≥ 3 warning detections                            → escalating
//      (rule defiance dominates — was rule 6 + 7 in
//      old order; overtrading-warning no longer preempts)
//   8. ≥ 2 warning detections                            → escalating
//      (was "stable" — bumped because two simultaneous
//      warning patterns is a real escalation signal)
//   9. overtrading WARNING + compound conditions        → fatigued
//  10. overtrading WARNING (no compound, no other warns) → overtrading
//
// `sessionMetrics` + `riskRules` are passed in so we can evaluate the
// compound condition (consecutive losses, drawdown threshold).
// -----------------------------------------------------------------------------

const FATIGUE_COMPOUND_CONSECUTIVE_LOSSES = 2;
// Fraction of `maxDailyLossPercent` that counts as "heavy drawdown"
// when combined with overtrading. 50% = trader is at/past half of
// their daily loss cap WHILE still trading at pacing limits.
const FATIGUE_COMPOUND_DAILY_LOSS_RATIO = 0.5;

function isFatigueCompound(
  sessionMetrics: SessionMetrics | undefined,
  riskRules: RiskRules | undefined,
): boolean {
  if (!sessionMetrics || !riskRules) return false;
  if (sessionMetrics.consecutiveLosses >= FATIGUE_COMPOUND_CONSECUTIVE_LOSSES) {
    return true;
  }
  const drawdownThreshold =
    Math.max(0, riskRules.maxDailyLossPercent) *
    FATIGUE_COMPOUND_DAILY_LOSS_RATIO;
  if (
    drawdownThreshold > 0 &&
    sessionMetrics.dailyLossUsedPercent >= drawdownThreshold
  ) {
    return true;
  }
  return false;
}

function detectionFloor(
  detections: BehavioralDetection[],
  sessionMetrics: SessionMetrics | undefined,
  riskRules: RiskRules | undefined,
): { floor: BehavioralStateLabel; reason: string } | null {
  const crit = detections.filter((d) => d.severity === "critical");
  // Warning detections, EXCLUDING overtrading. Overtrading is gated
  // through its own rules below (rules 9 + 10) — counting it as a
  // generic warning would re-introduce the precedence bug we just
  // fixed (3-warning-floor would fire from "overtrading + 2 unrelated
  // signals" when those 2 signals already get their own floor).
  const warnNonOvertrading = detections.filter(
    (d) => d.severity === "warning" && d.id !== "overtrading",
  );
  const overtrading = detections.find((d) => d.id === "overtrading");
  const compound = isFatigueCompound(sessionMetrics, riskRules);

  // Rule 1 — daily risk cap breached (catastrophic).
  const dailyBreach = detections.find(
    (d) => d.id === "position_size_escalation" && d.severity === "critical",
  );
  if (dailyBreach) {
    return {
      floor: "locked_down",
      reason: "Daily risk cap breached — trading restricted",
    };
  }

  // Rule 2 — 3+ critical patterns simultaneously.
  if (crit.length >= 3) {
    return {
      floor: "locked_down",
      reason: `${crit.length} critical patterns active simultaneously`,
    };
  }

  // Rule 3 — 2+ critical patterns (rule breakdown across categories).
  if (crit.length >= 2) {
    return {
      floor: "impulsive",
      reason: `${crit.length} critical patterns active`,
    };
  }

  // Rules 4 + 5 — overtrading at CRITICAL severity. Splits into
  // compound (fatigued) vs cap-blown-alone (overtrading state).
  if (overtrading?.severity === "critical") {
    if (compound) {
      return {
        floor: "fatigued",
        reason:
          "Overtrading critical + compound degradation (losses or drawdown)",
      };
    }
    return {
      floor: "overtrading",
      reason: "Daily trade cap exceeded — no compound degradation",
    };
  }

  // Rule 6 — single critical pattern.
  if (crit.length >= 1) {
    return { floor: "escalating", reason: crit[0].headline };
  }

  // Rules 7 + 8 — multi-warning rule defiance. These now outrank
  // overtrading-warning (the precedence-bug fix).
  if (warnNonOvertrading.length >= 3) {
    return {
      floor: "escalating",
      reason: `${warnNonOvertrading.length} warning patterns active`,
    };
  }
  if (warnNonOvertrading.length >= 2) {
    return {
      floor: "escalating",
      reason: `${warnNonOvertrading.length} warning patterns active`,
    };
  }

  // Rules 9 + 10 — overtrading at WARNING. Compound → fatigued;
  // otherwise → overtrading (the new dedicated state).
  if (overtrading?.severity === "warning") {
    if (compound) {
      return {
        floor: "fatigued",
        reason:
          "Overtrading + compound degradation (consecutive losses or drawdown)",
      };
    }
    // Cap hit alone — no other warnings, no compound conditions.
    // Reads as OVERTRADING, not FATIGUED.
    return {
      floor: "overtrading",
      reason: "Daily trade cap reached — no compound degradation",
    };
  }

  // Single warning detection (non-overtrading) — no floor; band state
  // stands. The band-derived value already reflects pressure
  // accumulation.
  return null;
}

// -----------------------------------------------------------------------------
// Band → state. Looks up the highest band the netScore satisfies.
// -----------------------------------------------------------------------------
function stateFromBand(netScore: number): BehavioralStateLabel {
  const B = STATE_AGGREGATOR_TUNABLES.bands;
  if (netScore >= B.lockedDown) return "locked_down";
  if (netScore >= B.impulsive) return "impulsive";
  if (netScore >= B.reactive) return "reactive";
  if (netScore >= B.escalating) return "escalating";
  if (netScore >= B.stable) return "stable";
  if (netScore >= B.controlled) return "controlled";
  return "focused";
}

// `applyFatiguedOverride` removed in the state-precedence refactor.
// Overtrading-driven promotion is now handled exclusively by the floor
// ladder above, which distinguishes between the new OVERTRADING state
// (cap hit, no compound degradation) and FATIGUED (overtrading +
// consecutive losses or significant drawdown).

// -----------------------------------------------------------------------------
// Contributor labels — explainability strings for the score breakdown.
// -----------------------------------------------------------------------------

function labelForBehaviorEvent(e: BehaviorEvent): string {
  const title = e.displayTitle?.trim();
  if (title) return title;
  return e.eventType.replace(/_/g, " ");
}

function labelForIntervention(i: InterventionEvent): string {
  switch (i.decision) {
    case "continue_anyway":
      return `Continue Anyway${i.symbol ? ` · ${i.symbol}` : ""}`;
    case "revise_trade":
      return `Trade revised${i.symbol ? ` · ${i.symbol}` : ""}`;
    case "cancel_trade":
      return `Trade canceled${i.symbol ? ` · ${i.symbol}` : ""}`;
  }
}

// =============================================================================
// Public entry point — pure computation
// =============================================================================

export function computeBehavioralStateAggregation(
  inputs: BehavioralStateInputs,
): BehavioralStateReading {
  const {
    behaviorEvents,
    monitoringEvents,
    interventions,
    detections,
    closedTrades,
    sessionMetrics,
    riskRules,
    nowMs,
  } = inputs;

  const contributors: ScoreContributor[] = [];

  // --- Behavior events ---
  for (const e of behaviorEvents) {
    const weight = weightForBehaviorEvent(e);
    if (weight === 0) continue;
    const ageMinutes = ageMinutesFromIso(e.timestamp, nowMs);
    const factor = decayFactor(ageMinutes);
    if (factor === 0) continue;
    contributors.push({
      source: "behavior_event",
      description: labelForBehaviorEvent(e),
      ageMinutes,
      weight,
      decayFactor: factor,
      netImpact: weight * factor,
    });
  }

  // --- Monitoring events (currently zero-weighted; reserved for V2) ---
  for (const m of monitoringEvents) {
    const weight = weightForMonitoring(m);
    if (weight === 0) continue;
    const ageMinutes = ageMinutesFromIso(m.timestamp, nowMs);
    const factor = decayFactor(ageMinutes);
    if (factor === 0) continue;
    contributors.push({
      source: "monitoring_event",
      description: `Deviation · ${m.severity}`,
      ageMinutes,
      weight,
      decayFactor: factor,
      netImpact: weight * factor,
    });
  }

  // --- Interventions ---
  for (const i of interventions) {
    const weight = weightForIntervention(i);
    if (weight === 0) continue;
    const ageMinutes = ageMinutesFromIso(i.timestamp, nowMs);
    const factor = decayFactor(ageMinutes);
    if (factor === 0) continue;
    contributors.push({
      source: "intervention",
      description: labelForIntervention(i),
      ageMinutes,
      weight,
      decayFactor: factor,
      netImpact: weight * factor,
    });
  }

  // --- Score aggregation ---
  let pressureScore = 0;
  let recoveryScore = 0;
  for (const c of contributors) {
    if (c.netImpact > 0) pressureScore += c.netImpact;
    else recoveryScore += Math.abs(c.netImpact);
  }
  const netScore = Math.max(0, pressureScore - recoveryScore);

  // --- State derivation ---
  // Two-step: bandState from the time-decayed score, then optionally
  // promoted by the detection-floor ladder. `applyFatiguedOverride` was
  // deleted in the state-precedence fix — overtrading is now handled
  // exclusively by the floor ladder (which knows about the compound
  // conditions distinguishing OVERTRADING from FATIGUED).
  const bandState = stateFromBand(netScore);
  const floor = detectionFloor(detections, sessionMetrics, riskRules);
  let state: BehavioralStateLabel = bandState;
  let floorApplied = false;
  let floorReason: string | null = null;
  if (floor && STATE_RANK[floor.floor] > STATE_RANK[state]) {
    state = floor.floor;
    floorApplied = true;
    floorReason = floor.reason;
  }

  // Surface the floor as a contributor so explainability shows why the
  // state is higher than the score band alone would imply.
  if (floorApplied && floorReason) {
    contributors.push({
      source: "detection_floor",
      description: `Active patterns · ${floorReason}`,
      ageMinutes: 0,
      weight: 0,
      decayFactor: 1,
      netImpact: 0,
    });
  }

  // Top contributors by absolute impact (and the floor entry if applied).
  // Cap at 8 — enough to explain the score without flooding any UI that
  // chooses to render them.
  const ranked = [...contributors].sort(
    (a, b) => Math.abs(b.netImpact) - Math.abs(a.netImpact),
  );
  const topContributors = ranked.slice(0, 8);

  // --- Behavioral momentum (refinement 3) ---
  // Compare the sum of positive (pressure-adding) contributor impact in
  // the last 5 min vs the 5–30 min window. If recent > prior, the session
  // is deteriorating. If recent < prior, it's improving. Used downstream
  // to drive intervention escalation and the arc summary.
  let recentPressure = 0;
  let priorPressure = 0;
  for (const c of contributors) {
    if (c.netImpact <= 0) continue;
    if (c.ageMinutes <= 5) recentPressure += c.netImpact;
    else if (c.ageMinutes <= 30) priorPressure += c.netImpact;
  }
  const momentum = deriveMomentum(recentPressure, priorPressure);

  // --- Recovery friction (refinement 2) ---
  // Sum the time-decayed weight of CRITICAL-grade contributors (anything
  // whose raw weight is in the heavy-penalty band: ≥ 10 pressure). Each
  // unit beyond `startsAfter` drags recovery efficiency down. Effect:
  // after a critical event, clean actions stop efficiently restoring
  // discipline — recovery must be earned over time as the critical event
  // ages out.
  let criticalPressure = 0;
  for (const c of contributors) {
    if (c.netImpact >= 10) criticalPressure += c.netImpact;
  }
  const friction = Math.max(
    0,
    criticalPressure - RECOVERY_FRICTION.startsAfter,
  );
  const recoveryEfficiency = Math.max(
    RECOVERY_FRICTION.floor,
    RECOVERY_EFFICIENCY_BASE - friction * RECOVERY_FRICTION.dragPerPoint,
  );

  // --- Behavioral Integrity (discipline) Score ---
  // Same time-decayed pressure / recovery math that drives state — score
  // and state are guaranteed consistent. Recovery is multiplied by the
  // DYNAMIC `recoveryEfficiency` (not a static constant) so the trader
  // earns less integrity-back per clean action after critical events.
  const rawIntegrity =
    100 - pressureScore + recoveryScore * recoveryEfficiency;
  const integrityBeforeCeiling = Math.max(0, Math.min(100, rawIntegrity));

  // Discipline ceiling stack — lowest applicable cap wins. State ceiling
  // is the primary cap; active intervention locks add a second floor of
  // defense so contradictions are impossible at the data level.
  const stateCeiling = STATE_DISCIPLINE_CEILING[state];
  const interventionCeiling = computeInterventionCeiling(
    closedTrades,
    sessionMetrics,
    riskRules,
    nowMs,
  );
  const disciplineCeiling = Math.min(stateCeiling, interventionCeiling);

  const disciplineScore = Math.round(
    Math.min(disciplineCeiling, integrityBeforeCeiling),
  );
  const disciplineBand = bandForDisciplineScore(disciplineScore);

  // --- Arc summary (refinement 8) ---
  // One-line narrative trajectory string. Templated, deterministic — same
  // inputs always yield the same arc.
  const arcSummary = buildArcSummary(state, momentum, disciplineBand);

  return {
    state,
    pressureScore: round1(pressureScore),
    recoveryScore: round1(recoveryScore),
    netScore: round1(netScore),
    disciplineScore,
    disciplineBand,
    disciplineCeiling,
    recoveryEfficiency: round1(recoveryEfficiency * 100) / 100,
    momentum,
    arcSummary,
    narrative: BEHAVIORAL_STATE_NARRATIVE[state],
    topContributors,
    floorApplied,
    floorReason,
    sampledAtMs: nowMs,
  };
}

// -----------------------------------------------------------------------------
// Momentum derivation
//
// Compares recent (≤ 5 min) pressure to prior (5–30 min) pressure. Trend:
//   deteriorating  recent meaningfully > prior
//   stable         recent ≈ prior (within ±25%)
//   improving      recent meaningfully < prior
// Magnitude 0–1 reflects the size of the gap.
// -----------------------------------------------------------------------------
function deriveMomentum(
  recent: number,
  prior: number,
): BehavioralMomentum {
  if (recent === 0 && prior === 0) {
    return {
      trend: "stable",
      magnitude: 0,
      recentPressure: 0,
      priorPressure: 0,
    };
  }
  const total = recent + prior;
  if (total === 0) {
    return {
      trend: "stable",
      magnitude: 0,
      recentPressure: 0,
      priorPressure: 0,
    };
  }
  const balance = (recent - prior) / total; // -1..+1
  const magnitude = Math.min(1, Math.abs(balance));
  let trend: MomentumTrend = "stable";
  if (balance > 0.25) trend = "deteriorating";
  else if (balance < -0.25) trend = "improving";
  return {
    trend,
    magnitude,
    recentPressure: round1(recent),
    priorPressure: round1(prior),
  };
}

// -----------------------------------------------------------------------------
// Intervention ceiling — defense-in-depth (refinement 6)
//
// Inlines lock detection logic (does NOT depend on
// active-interventions-engine to avoid a circular import). Lowest active
// ceiling wins; returns 100 (no cap) when no lock is active.
// -----------------------------------------------------------------------------
function computeInterventionCeiling(
  closedTrades: ClosedTrade[] | undefined,
  sessionMetrics: SessionMetrics | undefined,
  riskRules: RiskRules | undefined,
  nowMs: number,
): number {
  // If any required input is missing (older caller), don't apply a
  // ceiling — fall back to the state ceiling alone.
  if (!sessionMetrics || !riskRules) return 100;

  let ceiling = 100;

  if (sessionMetrics.dailyLossLimitBreached) {
    ceiling = Math.min(ceiling, ACTIVE_INTERVENTION_CEILING.daily_loss_lockout);
  }
  if (sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses) {
    ceiling = Math.min(
      ceiling,
      ACTIVE_INTERVENTION_CEILING.consecutive_loss_pause,
    );
  }

  // Loss-cooldown active: most recent loss within cool-off window.
  const lastLoss = (closedTrades ?? [])
    .filter((t) => t.outcome === "loss")
    .sort(
      (a, b) =>
        new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
    )[0];
  if (lastLoss) {
    const expiresAtMs =
      new Date(lastLoss.closedAt).getTime() +
      Math.max(1, riskRules.cooldownAfterLossMinutes) * 60_000;
    if (expiresAtMs > nowMs) {
      ceiling = Math.min(ceiling, ACTIVE_INTERVENTION_CEILING.loss_cooldown);
    }
  }

  return ceiling;
}

// -----------------------------------------------------------------------------
// Arc summary — one-line session trajectory (refinement 8)
//
// Templated, deterministic. Combines state + momentum + band into a single
// behaviorally readable string. The dashboard renders this as a subtitle so
// the trader reads the SESSION'S DIRECTION, not just its current point.
// -----------------------------------------------------------------------------
function buildArcSummary(
  state: BehavioralStateLabel,
  momentum: BehavioralMomentum,
  band: DisciplineBand,
): string {
  if (state === "focused" && momentum.trend === "stable") {
    return "Session has remained focused throughout.";
  }
  if (state === "locked_down") {
    return "Trading access restricted. Recovery requires sustained stability before access returns.";
  }
  if (momentum.trend === "deteriorating") {
    if (state === "impulsive" || state === "reactive") {
      return "Session deteriorating in real time. Pressure is compounding faster than recovery.";
    }
    if (state === "escalating" || state === "fatigued") {
      return "Behavioral pressure rising. Recent decisions are pulling the session away from baseline.";
    }
    return "Behavioral signals accumulating. Stay aware before the next decision.";
  }
  if (momentum.trend === "improving") {
    if (band === "critical" || band === "degrading") {
      return "Recent decisions trending cleaner. Recovery is gradual — sustained stability required.";
    }
    return "Behavioral pressure easing. Discipline recovering.";
  }
  // stable momentum, but state isn't focused
  if (state === "controlled") {
    return "Session holding. Minor signals present but contained.";
  }
  if (state === "stable") {
    return "Session holding under accumulated behavioral signals.";
  }
  return "Session holding at current pressure level.";
}

// Score → band mapping. Thresholds match the credibility-pass spec:
//   90–100 exceptional · 75–89 controlled · 55–74 unstable
//   35–54 degrading   · 0–34  critical
export function bandForDisciplineScore(score: number): DisciplineBand {
  if (score >= 90) return "exceptional";
  if (score >= 75) return "controlled";
  if (score >= 55) return "unstable";
  if (score >= 35) return "degrading";
  return "critical";
}

// Human-readable label for each band. The dashboard renders this next to
// the numeric score so the trader doesn't have to interpret the number on
// its own.
export const DISCIPLINE_BAND_LABEL: Record<DisciplineBand, string> = {
  exceptional: "Exceptional control",
  controlled: "Controlled",
  unstable: "Unstable discipline",
  degrading: "Behavior degrading",
  critical: "Critical deterioration",
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// =============================================================================
// React hook
// =============================================================================
//
// Internal time ticker keeps the decay curve advancing even when no new
// events have landed — a long quiet session needs the state to soften.
// 60-second granularity is plenty for behavioral UX; the score moves
// smoothly between ticks because the decay function is piecewise-linear.

const TICK_MS = 60_000;

export function useBehavioralStateAggregation(): BehavioralStateReading {
  const behaviorEvents = useCurrentSessionEvents();
  const monitoringEvents = useCurrentSessionMonitoringEvents();
  const interventions = useCurrentSessionInterventions();
  const { detections } = useBehavioralDetection();
  const { closedTrades } = useCurrentSessionTrades();
  const sessionMetrics = useAppStore((s) => s.session);
  const riskRules = useAppStore((s) => s.riskRules);

  // Lazy initializer — `Date.now()` runs once per environment (server +
  // client). The dashboard layout is `dynamic = "force-dynamic"` so there's
  // no static prerender window where the initial value could drift; the
  // interval below drives ongoing decay even when no events have landed.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return useMemo(
    () =>
      computeBehavioralStateAggregation({
        behaviorEvents,
        monitoringEvents,
        interventions,
        detections,
        closedTrades,
        sessionMetrics,
        riskRules,
        nowMs,
      }),
    [
      behaviorEvents,
      monitoringEvents,
      interventions,
      detections,
      closedTrades,
      sessionMetrics,
      riskRules,
      nowMs,
    ],
  );
}

// Helper used by UI consumers — given a tone, return whether it's a
// "warning-or-worse" state. Saves consumers from re-encoding the threshold.
export function stateIsAlert(state: BehavioralStateLabel): boolean {
  return STATE_RANK[state] >= STATE_RANK.escalating;
}

// `DetectionSeverity` is re-exported so consumers reading both detection
// and aggregated state from this module have a single import surface.
export type { DetectionSeverity };

// `BehavioralStateLabel` ranking surfaced for consumers that want to do
// their own floor math (e.g., a debug screen).
export const STATE_PRECEDENCE = { STATE_RANK, STATE_BY_RANK } as const;
