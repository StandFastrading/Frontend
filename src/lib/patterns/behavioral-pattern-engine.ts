import {
  BEHAVIOR_EVENT_TYPES,
  type BehaviorEventType,
} from "@/lib/behavior-events";
import {
  isWithinTimeframe,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import type { AnalyticsSliceInputs } from "@/lib/analytics/trend-series";
import {
  REFLECTION_THEME_IDS,
  themeLabel,
  themesForNote,
  themesForReflection,
  type ReflectionThemeId,
} from "@/lib/patterns/reflection-themes";
import type {
  BehaviorEvent,
  ClosedTrade,
  DailyReflection,
  InterventionEvent,
  SessionNote,
  TradingSession,
} from "@/types";

// =============================================================================
// StandFast Cross-Session Behavioral Pattern Engine
// =============================================================================
//
// PURPOSE
//   First-generation cross-session behavioral intelligence. This engine
//   extracts STRUCTURED BEHAVIORAL MEMORY from the trader's session
//   history — recurring rule breaks, escalation chains, time-of-day
//   deterioration windows, improvement trends, reflection themes, and
//   dangerous conditions.
//
//   It is NOT AI. There are no language models, no generative summaries,
//   no predictions. Everything below is deterministic counting +
//   correlation over the persisted event log.
//
//   The output shape IS the contract. Future AI mentor integration will
//   read this engine's output as its grounded memory layer; the engine's
//   internals can be rewritten freely as long as the public types hold.
//
// HOW IT FITS
//
//     BehaviorDeviationEngine     per-update deviations  (live)
//     BehavioralDetectionEngine   named patterns         (live)
//     BehavioralStateAggregator   net psychological state (live)
//     BehavioralPatternEngine     CROSS-SESSION memory   (this file)
//
//   The first three answer "what is the trader doing right now?". This
//   engine answers "how does this trader USUALLY deteriorate?".
//
// EVERY PATTERN IS RELATIONAL
//   Every BehavioralPattern carries linked IDs to the sessions, trades,
//   behavior events, interventions, and reflections that produced it.
//   This is the AI-ready contract: a future mentor service can query
//   "show me patterns linked to session X" or "show me sessions where
//   the revenge theme appeared".
//
// CONFIDENCE-AWARE
//   Patterns carry a confidence rating (low / moderate / high) derived
//   from observation count + session breadth. The engine NEVER promotes
//   a single observation to "high confidence" — sample-size awareness
//   is built into the public type.
//
// V1 PATTERN CATEGORIES
//   1. recurring_rule_break    — same rule break across multiple sessions
//   2. escalation_chain        — recurring 2-3 step deterioration sequences
//   3. time_of_day             — clustering of deterioration in a window
//   4. improvement             — second-half improvement vs first-half
//   5. reflection_theme        — recurring emotional language
//   6. dangerous_condition     — cross-correlated breakdown setups
// =============================================================================

// -----------------------------------------------------------------------------
// Public memory structures (the AI-ready contract)
// -----------------------------------------------------------------------------

export const PATTERN_CATEGORIES = [
  "recurring_rule_break",
  "escalation_chain",
  "time_of_day",
  "improvement",
  "reflection_theme",
  "dangerous_condition",
] as const;
export type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

export const PATTERN_CATEGORY_LABEL: Record<PatternCategory, string> = {
  recurring_rule_break: "Recurring Rule Break",
  escalation_chain: "Escalation Chain",
  time_of_day: "Time-of-Day Discipline Drift",
  improvement: "Improvement Trend",
  reflection_theme: "Reflection Theme",
  dangerous_condition: "Dangerous Condition",
};

export const PATTERN_CONFIDENCE_LEVELS = ["low", "moderate", "high"] as const;
export type PatternConfidence = (typeof PATTERN_CONFIDENCE_LEVELS)[number];

export const PATTERN_CONFIDENCE_LABEL: Record<PatternConfidence, string> = {
  low: "Low Confidence",
  moderate: "Moderate Confidence",
  high: "High Confidence",
};

export type PatternSeverity = "info" | "caution" | "warning" | "critical";

// Coarse behavioral context tag attached to a pattern. Stable wire ids so
// future AI queries can filter on conditions (e.g., "show me all patterns
// linked to the post_loss condition").
export const BEHAVIORAL_CONDITION_KINDS = [
  "post_loss",
  "consecutive_losses",
  "after_override",
  "after_stop_widen",
  "after_size_increase",
  "after_warning_ignored",
  "near_market_open",
  "midday",
  "late_session",
  "after_green_morning",
  "during_overtrading",
  "during_rapid_reentry",
] as const;
export type BehavioralConditionKind =
  (typeof BEHAVIORAL_CONDITION_KINDS)[number];

export const CONDITION_LABEL: Record<BehavioralConditionKind, string> = {
  post_loss: "Post-loss",
  consecutive_losses: "After consecutive losses",
  after_override: "After override",
  after_stop_widen: "After stop widening",
  after_size_increase: "After size increase",
  after_warning_ignored: "After ignored warning",
  near_market_open: "Near market open",
  midday: "Midday",
  late_session: "Late session",
  after_green_morning: "After a green morning",
  during_overtrading: "During overtrading",
  during_rapid_reentry: "During rapid re-entry",
};

export type BehavioralCondition = {
  kind: BehavioralConditionKind;
  label: string;
};

// The normalized pattern record. Every pattern is queryable by:
//   * category + id
//   * any linked session / trade / event / intervention / reflection id
//   * theme (when applicable)
//   * severity / confidence
//
// Designed so a future "pattern memory store" can be persisted by id and
// queried relationally without restructuring.
export type BehavioralPattern = {
  id: string;
  category: PatternCategory;
  title: string;
  description: string;
  severity: PatternSeverity;
  confidence: PatternConfidence;
  // Counters. `occurrenceCount` = how many TIMES the pattern fired;
  // `sessionCount` = how many DISTINCT sessions it appeared in. These
  // can diverge (3 stop widenings in 1 session = occurrenceCount 3,
  // sessionCount 1).
  occurrenceCount: number;
  sessionCount: number;
  // Human-readable window label ("last 7 days", "all time", etc.) so
  // the UI doesn't have to re-derive it.
  timeWindowLabel: string;
  firstObservedAt?: string;
  lastObservedAt?: string;
  // Linked record ids. ALL are arrays even when there's at most one
  // matching record, so the AI query path stays uniform.
  linkedSessionIds: string[];
  linkedTradeIds: string[];
  linkedBehaviorEventIds: string[];
  linkedInterventionIds: string[];
  linkedReflectionIds: string[];
  linkedThemes: ReflectionThemeId[];
  conditions: BehavioralCondition[];
};

// Per-session escalation sequence record. Surfaced both as an individual
// pattern AND embedded in the result for downstream consumers that want to
// query "show me every escalation chain in this window."
export type EscalationSequence = {
  id: string;
  sessionId: string;
  steps: EscalationStep[];
  startedAt: string;
  endedAt: string;
  // Linked records that made up the sequence.
  linkedBehaviorEventIds: string[];
  linkedInterventionIds: string[];
};

export type EscalationStep = {
  // Stable wire id for the step KIND — used by future AI queries to
  // group "all sequences that contain a stop_widen step".
  kind:
    | "loss"
    | "override"
    | "stop_widen"
    | "size_increase"
    | "risk_increase"
    | "rapid_reentry"
    | "averaging_down"
    | "warning_ignored"
    | "green_morning";
  label: string;
  timestamp: string;
};

// Reflection-theme aggregate. Computed once across the timeframe; consumed
// by both the reflection_theme patterns AND any future AI surface that
// needs "what emotional language did the trader use this month".
export type ReflectionThemeSummary = {
  id: ReflectionThemeId;
  label: string;
  occurrenceCount: number;
  linkedReflectionIds: string[];
  linkedSessionIds: string[];
  linkedNoteIds: string[];
  // Behavior event types observed in the SAME sessions as this theme.
  // Lets the future AI cross-reference "revenge language → what behaviors
  // followed?".
  correlatedBehaviorEventTypes: BehaviorEventType[];
};

export type BehavioralPatternsResult = {
  patterns: BehavioralPattern[];
  escalationSequences: EscalationSequence[];
  reflectionThemes: ReflectionThemeSummary[];
  // Total sessions analyzed inside the window — the denominator behind
  // every confidence rating. Surfaced so the UI can render "Across N
  // sessions".
  sessionsAnalyzed: number;
  timeWindowLabel: string;
};

// -----------------------------------------------------------------------------
// Inputs
// -----------------------------------------------------------------------------

export type PatternEngineInputs = AnalyticsSliceInputs & {
  reflections: DailyReflection[];
  sessionNotes: SessionNote[];
};

// -----------------------------------------------------------------------------
// Confidence
//
// Pattern-level confidence is derived from BOTH occurrence count AND the
// breadth of sessions the pattern was observed in. The engine deliberately
// caps confidence at "low" for single-session observations so a single
// hot streak can't get promoted to "high confidence" by sheer volume.
// -----------------------------------------------------------------------------
function confidenceFromObservation(
  occurrenceCount: number,
  sessionCount: number,
): PatternConfidence {
  if (sessionCount < 2) return "low";
  if (occurrenceCount < 3) return "low";
  if (sessionCount >= 5 && occurrenceCount >= 5) return "high";
  if (sessionCount >= 3 && occurrenceCount >= 3) return "moderate";
  return "low";
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function uniqueSorted<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function eventTradeId(e: BehaviorEvent): string | null {
  const meta = e.metadata as Record<string, unknown> | undefined;
  const id = meta?.tradeId;
  return typeof id === "string" ? id : null;
}

function isoToMs(iso: string | undefined): number {
  if (!iso) return NaN;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function hourFromIso(iso: string): number | null {
  const t = isoToMs(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).getHours();
}

// -----------------------------------------------------------------------------
// Window filtering
// -----------------------------------------------------------------------------

type FilteredInputs = {
  sessions: TradingSession[];
  behaviorEvents: BehaviorEvent[];
  interventions: InterventionEvent[];
  closedTrades: ClosedTrade[];
  reflections: DailyReflection[];
  sessionNotes: SessionNote[];
};

function filterToWindow(
  inputs: PatternEngineInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): FilteredInputs {
  return {
    sessions: inputs.sessions.filter((s) =>
      isWithinTimeframe(s.startedAt, timeframe, nowMs),
    ),
    behaviorEvents: inputs.behaviorEvents.filter((e) =>
      isWithinTimeframe(e.timestamp, timeframe, nowMs),
    ),
    interventions: inputs.interventions.filter((i) =>
      isWithinTimeframe(i.timestamp, timeframe, nowMs),
    ),
    closedTrades: inputs.closedTrades.filter((t) =>
      isWithinTimeframe(t.closedAt, timeframe, nowMs),
    ),
    reflections: inputs.reflections.filter((r) =>
      isWithinTimeframe(r.savedAt, timeframe, nowMs),
    ),
    sessionNotes: inputs.sessionNotes.filter((n) =>
      isWithinTimeframe(n.createdAt, timeframe, nowMs),
    ),
  };
}

// -----------------------------------------------------------------------------
// 1. Recurring rule breaks
//
// Counts how many times each "rule break" behavior event fired across the
// timeframe. Each pattern groups by event type + reports cross-session
// frequency. A post-loss subset is reported as a separate pattern when the
// majority of occurrences land within 30 min of a closed loss.
// -----------------------------------------------------------------------------

const RULE_BREAK_EVENT_TYPES: ReadonlyArray<{
  type: BehaviorEventType;
  title: string;
  description: string;
  severity: PatternSeverity;
}> = [
  {
    type: BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    title: "Stop discipline breaks recur",
    description:
      "Stops were widened beyond the approved invalidation across multiple sessions.",
    severity: "warning",
  },
  {
    type: BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    title: "Warning overrides recur",
    description:
      "Rule-check warnings were ignored or overridden across multiple sessions.",
    severity: "warning",
  },
  {
    type: BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    title: "Continue Anyway taken repeatedly",
    description:
      "The Continue Anyway override has been used across multiple sessions.",
    severity: "warning",
  },
  {
    type: BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    title: "Mid-trade size adds recur",
    description:
      "Position size has been added in-trade across multiple sessions.",
    severity: "caution",
  },
  {
    type: BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
    title: "Averaging down recurs",
    description:
      "Position has been added in the adverse direction across multiple sessions.",
    severity: "critical",
  },
  {
    type: BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
    title: "Rapid post-loss re-entry recurs",
    description:
      "Re-entry inside the post-loss cool-off window has happened across multiple sessions.",
    severity: "warning",
  },
];

function detectRecurringRuleBreaks(
  filtered: FilteredInputs,
  timeWindowLabel: string,
): BehavioralPattern[] {
  const patterns: BehavioralPattern[] = [];

  // Closed-loss timestamps per session — used to compute the
  // "post-loss" subset.
  const lossTimesBySession = new Map<string, number[]>();
  for (const t of filtered.closedTrades) {
    if (t.outcome !== "loss") continue;
    if (!t.sessionId) continue;
    const ts = isoToMs(t.closedAt);
    if (!Number.isFinite(ts)) continue;
    const list = lossTimesBySession.get(t.sessionId) ?? [];
    list.push(ts);
    lossTimesBySession.set(t.sessionId, list);
  }

  for (const spec of RULE_BREAK_EVENT_TYPES) {
    const matching = filtered.behaviorEvents.filter(
      (e) => e.eventType === spec.type,
    );
    if (matching.length < 2) continue;

    const sessionIds = uniqueSorted(
      matching.map((e) => e.sessionId).filter((s): s is string => !!s),
    );
    const tradeIds = uniqueSorted(
      matching.map(eventTradeId).filter((id): id is string => !!id),
    );

    const timestamps = matching.map((e) => isoToMs(e.timestamp)).filter(Number.isFinite);
    const firstObservedAt =
      timestamps.length > 0
        ? new Date(Math.min(...timestamps)).toISOString()
        : undefined;
    const lastObservedAt =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps)).toISOString()
        : undefined;

    // Post-loss check. An event counts as post-loss if it lands within
    // 30 minutes of a closed loss in the same session.
    const postLossOccurrences = matching.filter((e) => {
      const sessionLosses = lossTimesBySession.get(e.sessionId ?? "") ?? [];
      if (sessionLosses.length === 0) return false;
      const ts = isoToMs(e.timestamp);
      if (!Number.isFinite(ts)) return false;
      return sessionLosses.some((l) => ts >= l && ts - l <= 30 * 60_000);
    });
    const postLossRatio = postLossOccurrences.length / matching.length;
    const conditions: BehavioralCondition[] = [];
    if (postLossRatio >= 0.5 && postLossOccurrences.length >= 2) {
      conditions.push({
        kind: "post_loss",
        label: CONDITION_LABEL.post_loss,
      });
    }

    patterns.push({
      id: `rule-break-${spec.type}`,
      category: "recurring_rule_break",
      title: spec.title,
      description:
        conditions.some((c) => c.kind === "post_loss")
          ? `${spec.description} Majority of occurrences fall within 30 min of a closed loss.`
          : spec.description,
      severity: spec.severity,
      confidence: confidenceFromObservation(matching.length, sessionIds.length),
      occurrenceCount: matching.length,
      sessionCount: sessionIds.length,
      timeWindowLabel,
      firstObservedAt,
      lastObservedAt,
      linkedSessionIds: sessionIds,
      linkedTradeIds: tradeIds,
      linkedBehaviorEventIds: matching.map((e) => e.id),
      linkedInterventionIds: [],
      linkedReflectionIds: [],
      linkedThemes: [],
      conditions,
    });
  }

  return patterns;
}

// -----------------------------------------------------------------------------
// 2. Escalation chains
//
// Walks each session's chronologically-sorted events and detects recurring
// 2-3 step sequences ("override → stop widen", "loss → rapid re-entry",
// etc.). Sequences across multiple sessions promote to a pattern.
// -----------------------------------------------------------------------------

type SequenceStepMatcher = (
  context: {
    behaviorEventType?: BehaviorEventType;
    closedTradeOutcome?: ClosedTrade["outcome"];
  },
) => boolean;

type SequenceDefinition = {
  id: string;
  label: string;
  steps: Array<{ kind: EscalationStep["kind"]; match: SequenceStepMatcher; label: string }>;
  // Sequence must complete within this window from first step to last.
  windowMs: number;
  description: string;
  severity: PatternSeverity;
  conditions?: BehavioralConditionKind[];
};

const SEQUENCE_DEFINITIONS: SequenceDefinition[] = [
  {
    id: "loss_then_override",
    label: "Loss → Override",
    steps: [
      {
        kind: "loss",
        match: ({ closedTradeOutcome }) => closedTradeOutcome === "loss",
        label: "Loss",
      },
      {
        kind: "override",
        match: ({ behaviorEventType }) =>
          behaviorEventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED ||
          behaviorEventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
        label: "Override accepted",
      },
    ],
    windowMs: 30 * 60_000,
    description: "After a loss, the next trade was taken through an override.",
    severity: "warning",
    conditions: ["post_loss", "after_override"],
  },
  {
    id: "override_then_stop_widen",
    label: "Override → Stop widening",
    steps: [
      {
        kind: "override",
        match: ({ behaviorEventType }) =>
          behaviorEventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED ||
          behaviorEventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
        label: "Override accepted",
      },
      {
        kind: "stop_widen",
        match: ({ behaviorEventType }) =>
          behaviorEventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
        label: "Stop widened",
      },
    ],
    windowMs: 60 * 60_000,
    description:
      "After an override, the stop was widened beyond the approved invalidation.",
    severity: "warning",
    conditions: ["after_override", "after_stop_widen"],
  },
  {
    id: "loss_then_rapid_reentry",
    label: "Loss → Rapid re-entry",
    steps: [
      {
        kind: "loss",
        match: ({ closedTradeOutcome }) => closedTradeOutcome === "loss",
        label: "Loss",
      },
      {
        kind: "rapid_reentry",
        match: ({ behaviorEventType }) =>
          behaviorEventType ===
          BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
        label: "Rapid re-entry",
      },
    ],
    windowMs: 15 * 60_000,
    description:
      "A new trade was activated inside the post-loss cool-off window.",
    severity: "critical",
    conditions: ["post_loss", "during_rapid_reentry"],
  },
  {
    id: "override_then_risk_escalation",
    label: "Override → Risk escalation",
    steps: [
      {
        kind: "override",
        match: ({ behaviorEventType }) =>
          behaviorEventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED ||
          behaviorEventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
        label: "Override accepted",
      },
      {
        kind: "risk_increase",
        match: ({ behaviorEventType }) =>
          behaviorEventType ===
            BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED ||
          behaviorEventType ===
            BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
          behaviorEventType ===
            BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
        label: "Risk escalated",
      },
    ],
    windowMs: 60 * 60_000,
    description: "Risk exposure rose after an override at the rule check.",
    severity: "warning",
    conditions: ["after_override"],
  },
];

type SessionTimeline = {
  sessionId: string;
  events: Array<{
    timestamp: number;
    behaviorEventType?: BehaviorEventType;
    behaviorEventId?: string;
    closedTradeOutcome?: ClosedTrade["outcome"];
    closedTradeId?: string;
    interventionId?: string;
  }>;
};

function buildSessionTimelines(filtered: FilteredInputs): SessionTimeline[] {
  const bySession = new Map<string, SessionTimeline>();
  const ensure = (sid: string): SessionTimeline => {
    let t = bySession.get(sid);
    if (!t) {
      t = { sessionId: sid, events: [] };
      bySession.set(sid, t);
    }
    return t;
  };

  for (const e of filtered.behaviorEvents) {
    if (!e.sessionId) continue;
    const ts = isoToMs(e.timestamp);
    if (!Number.isFinite(ts)) continue;
    ensure(e.sessionId).events.push({
      timestamp: ts,
      behaviorEventType: e.eventType as BehaviorEventType,
      behaviorEventId: e.id,
    });
  }
  for (const t of filtered.closedTrades) {
    if (!t.sessionId) continue;
    const ts = isoToMs(t.closedAt);
    if (!Number.isFinite(ts)) continue;
    ensure(t.sessionId).events.push({
      timestamp: ts,
      closedTradeOutcome: t.outcome,
      closedTradeId: t.id,
    });
  }
  for (const i of filtered.interventions) {
    if (!i.sessionId) continue;
    const ts = isoToMs(i.timestamp);
    if (!Number.isFinite(ts)) continue;
    // Interventions inform the override step; we model them as a
    // behavior-event mirror with no eventType so the matcher only
    // catches them via the linked override events. We DO record them
    // so the linkage carries forward.
    ensure(i.sessionId).events.push({
      timestamp: ts,
      interventionId: i.id,
    });
  }

  // Sort each session's events chronologically.
  for (const t of bySession.values()) {
    t.events.sort((a, b) => a.timestamp - b.timestamp);
  }
  return Array.from(bySession.values());
}

type SequenceMatch = {
  sessionId: string;
  startedAt: number;
  endedAt: number;
  steps: EscalationStep[];
  linkedBehaviorEventIds: string[];
  linkedInterventionIds: string[];
};

function matchSequenceInSession(
  timeline: SessionTimeline,
  def: SequenceDefinition,
): SequenceMatch[] {
  const out: SequenceMatch[] = [];
  const { events } = timeline;
  // Sliding scan — for each event matching step 0, try to find step 1
  // within the window; recursively for step 2 if defined. Simple greedy
  // walk; performance is fine for the scales involved (single-session
  // event counts are small).
  for (let i = 0; i < events.length; i++) {
    if (!def.steps[0].match(events[i])) continue;
    const startedAt = events[i].timestamp;
    const matchedSteps: EscalationStep[] = [
      {
        kind: def.steps[0].kind,
        label: def.steps[0].label,
        timestamp: new Date(events[i].timestamp).toISOString(),
      },
    ];
    const linkedBehavior: string[] = [];
    const linkedIntervention: string[] = [];
    if (events[i].behaviorEventId) linkedBehavior.push(events[i].behaviorEventId!);
    if (events[i].interventionId)
      linkedIntervention.push(events[i].interventionId!);

    let cursor = i;
    let stepIdx = 1;
    let endedAt = events[i].timestamp;
    while (stepIdx < def.steps.length) {
      // Find the next event in window that matches this step.
      let found = -1;
      for (let j = cursor + 1; j < events.length; j++) {
        if (events[j].timestamp - startedAt > def.windowMs) break;
        if (def.steps[stepIdx].match(events[j])) {
          found = j;
          break;
        }
      }
      if (found < 0) break;
      matchedSteps.push({
        kind: def.steps[stepIdx].kind,
        label: def.steps[stepIdx].label,
        timestamp: new Date(events[found].timestamp).toISOString(),
      });
      if (events[found].behaviorEventId)
        linkedBehavior.push(events[found].behaviorEventId!);
      if (events[found].interventionId)
        linkedIntervention.push(events[found].interventionId!);
      endedAt = events[found].timestamp;
      cursor = found;
      stepIdx += 1;
    }

    if (stepIdx === def.steps.length) {
      out.push({
        sessionId: timeline.sessionId,
        startedAt,
        endedAt,
        steps: matchedSteps,
        linkedBehaviorEventIds: linkedBehavior,
        linkedInterventionIds: linkedIntervention,
      });
      // Move past this match so we don't redetect overlapping ones.
      i = cursor;
    }
  }
  return out;
}

function detectEscalationChains(
  filtered: FilteredInputs,
  timeWindowLabel: string,
): { patterns: BehavioralPattern[]; sequences: EscalationSequence[] } {
  const timelines = buildSessionTimelines(filtered);
  const allSequences: EscalationSequence[] = [];
  const patterns: BehavioralPattern[] = [];

  for (const def of SEQUENCE_DEFINITIONS) {
    const matches: SequenceMatch[] = [];
    for (const tl of timelines) {
      matches.push(...matchSequenceInSession(tl, def));
    }
    if (matches.length === 0) continue;

    const sessionIds = uniqueSorted(matches.map((m) => m.sessionId));
    const linkedBehavior = uniqueSorted(
      matches.flatMap((m) => m.linkedBehaviorEventIds),
    );
    const linkedIntervention = uniqueSorted(
      matches.flatMap((m) => m.linkedInterventionIds),
    );

    // Lift each match into a public EscalationSequence record.
    for (let idx = 0; idx < matches.length; idx++) {
      const m = matches[idx];
      allSequences.push({
        id: `${def.id}-${m.sessionId}-${idx}`,
        sessionId: m.sessionId,
        steps: m.steps,
        startedAt: new Date(m.startedAt).toISOString(),
        endedAt: new Date(m.endedAt).toISOString(),
        linkedBehaviorEventIds: m.linkedBehaviorEventIds,
        linkedInterventionIds: m.linkedInterventionIds,
      });
    }

    // Promote to pattern only if it recurred — same sequence in 2+
    // sessions OR 3+ occurrences in a single session.
    if (sessionIds.length < 2 && matches.length < 3) continue;

    const timestamps = matches.map((m) => m.startedAt);
    patterns.push({
      id: `seq-${def.id}`,
      category: "escalation_chain",
      title: def.label,
      description: def.description,
      severity: def.severity,
      confidence: confidenceFromObservation(matches.length, sessionIds.length),
      occurrenceCount: matches.length,
      sessionCount: sessionIds.length,
      timeWindowLabel,
      firstObservedAt: new Date(Math.min(...timestamps)).toISOString(),
      lastObservedAt: new Date(Math.max(...timestamps)).toISOString(),
      linkedSessionIds: sessionIds,
      linkedTradeIds: [],
      linkedBehaviorEventIds: linkedBehavior,
      linkedInterventionIds: linkedIntervention,
      linkedReflectionIds: [],
      linkedThemes: [],
      conditions: (def.conditions ?? []).map((k) => ({
        kind: k,
        label: CONDITION_LABEL[k],
      })),
    });
  }

  return { patterns, sequences: allSequences };
}

// -----------------------------------------------------------------------------
// 3. Time-of-day deterioration
//
// Buckets deterioration events into broad windows (open / mid-morning /
// midday / afternoon / late). If a single window holds >= 40% of the
// deterioration events AND there are at least 4 deterioration events,
// surface a pattern.
// -----------------------------------------------------------------------------

const TIME_BUCKETS: ReadonlyArray<{
  id: BehavioralConditionKind;
  label: string;
  // Short prefix used to build the pattern title — joined with
  // "Discipline Drift Pattern" so the card reads as one phrase
  // (e.g. "Midday Discipline Drift Pattern").
  patternPrefix: string;
  hourRange: [number, number]; // inclusive lower, exclusive upper
}> = [
  { id: "near_market_open", label: "Near market open (before 11am)", patternPrefix: "Opening Hour", hourRange: [0, 11] },
  { id: "midday", label: "Midday (11am–2pm)", patternPrefix: "Midday", hourRange: [11, 14] },
  { id: "late_session", label: "Late session (after 2pm)", patternPrefix: "Late Session", hourRange: [14, 24] },
];

const DETERIORATION_TYPES: ReadonlySet<BehaviorEventType> = new Set([
  BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
  BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
  BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
]);

function detectTimeOfDay(
  filtered: FilteredInputs,
  timeWindowLabel: string,
): BehavioralPattern[] {
  const det = filtered.behaviorEvents.filter((e) =>
    DETERIORATION_TYPES.has(e.eventType as BehaviorEventType),
  );
  if (det.length < 4) return [];

  // Bucket counts.
  const counts = new Map<
    BehavioralConditionKind,
    { count: number; events: BehaviorEvent[] }
  >();
  for (const e of det) {
    const h = hourFromIso(e.timestamp);
    if (h == null) continue;
    const bucket = TIME_BUCKETS.find(
      (b) => h >= b.hourRange[0] && h < b.hourRange[1],
    );
    if (!bucket) continue;
    const entry = counts.get(bucket.id) ?? { count: 0, events: [] };
    entry.count += 1;
    entry.events.push(e);
    counts.set(bucket.id, entry);
  }

  const patterns: BehavioralPattern[] = [];
  for (const bucket of TIME_BUCKETS) {
    const entry = counts.get(bucket.id);
    if (!entry) continue;
    const ratio = entry.count / det.length;
    if (ratio < 0.4) continue;
    if (entry.count < 3) continue;

    const sessionIds = uniqueSorted(
      entry.events.map((e) => e.sessionId).filter((s): s is string => !!s),
    );
    const timestamps = entry.events.map((e) => isoToMs(e.timestamp));
    patterns.push({
      id: `tod-${bucket.id}`,
      category: "time_of_day",
      title: `${bucket.patternPrefix} Discipline Drift Pattern`,
      description: `${Math.round(ratio * 100)}% of discipline drift events occurred during this time window.`,
      severity: "caution",
      confidence: confidenceFromObservation(entry.count, sessionIds.length),
      occurrenceCount: entry.count,
      sessionCount: sessionIds.length,
      timeWindowLabel,
      firstObservedAt: new Date(Math.min(...timestamps)).toISOString(),
      lastObservedAt: new Date(Math.max(...timestamps)).toISOString(),
      linkedSessionIds: sessionIds,
      linkedTradeIds: uniqueSorted(
        entry.events.map(eventTradeId).filter((id): id is string => !!id),
      ),
      linkedBehaviorEventIds: entry.events.map((e) => e.id),
      linkedInterventionIds: [],
      linkedReflectionIds: [],
      linkedThemes: [],
      conditions: [{ kind: bucket.id, label: CONDITION_LABEL[bucket.id] }],
    });
  }
  return patterns;
}

// -----------------------------------------------------------------------------
// 4. Improvement trends
//
// Compares the FIRST half of the window to the SECOND half across a few
// behaviorally-meaningful event types. If second-half rate is ≥ 25% lower
// than first-half rate, surface as an improvement pattern.
// -----------------------------------------------------------------------------

const IMPROVEMENT_METRICS: ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  eventTypes: ReadonlyArray<BehaviorEventType>;
}> = [
  {
    id: "overrides",
    title: "Warning overrides trending down",
    description: "Override frequency has dropped in the second half of the window.",
    eventTypes: [
      BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
      BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    ],
  },
  {
    id: "stop_widening",
    title: "Stop discipline improving",
    description:
      "Stop-widening incidents are less frequent in the second half of the window.",
    eventTypes: [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER],
  },
  {
    id: "size_adds",
    title: "Position discipline improving",
    description:
      "Mid-trade size adds are less frequent in the second half of the window.",
    eventTypes: [
      BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
      BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
    ],
  },
  {
    id: "rapid_reentry",
    title: "Post-loss patience improving",
    description:
      "Rapid post-loss re-entries are less frequent in the second half of the window.",
    eventTypes: [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION],
  },
];

function detectImprovementTrends(
  filtered: FilteredInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
  timeWindowLabel: string,
): BehavioralPattern[] {
  if (timeframe.windowMs == null) return []; // no half-vs-half for "all time"
  if (filtered.sessions.length < 4) return []; // not enough data

  const midpointMs = nowMs - timeframe.windowMs / 2;
  const patterns: BehavioralPattern[] = [];

  for (const metric of IMPROVEMENT_METRICS) {
    const matching = filtered.behaviorEvents.filter((e) =>
      metric.eventTypes.includes(e.eventType as BehaviorEventType),
    );
    if (matching.length < 4) continue;
    const firstHalf = matching.filter((e) => isoToMs(e.timestamp) < midpointMs);
    const secondHalf = matching.filter(
      (e) => isoToMs(e.timestamp) >= midpointMs,
    );
    // Drop noise — at least 2 events in the first half so a 0→0 jump
    // doesn't look like progress.
    if (firstHalf.length < 2) continue;
    const drop = (firstHalf.length - secondHalf.length) / firstHalf.length;
    if (drop < 0.25) continue;

    const sessionIds = uniqueSorted(
      matching.map((e) => e.sessionId).filter((s): s is string => !!s),
    );
    const timestamps = matching.map((e) => isoToMs(e.timestamp));
    patterns.push({
      id: `improvement-${metric.id}`,
      category: "improvement",
      title: metric.title,
      description: `${metric.description} Second-half rate ${Math.round(drop * 100)}% lower than first half.`,
      severity: "info",
      confidence: confidenceFromObservation(
        matching.length,
        sessionIds.length,
      ),
      occurrenceCount: matching.length,
      sessionCount: sessionIds.length,
      timeWindowLabel,
      firstObservedAt: new Date(Math.min(...timestamps)).toISOString(),
      lastObservedAt: new Date(Math.max(...timestamps)).toISOString(),
      linkedSessionIds: sessionIds,
      linkedTradeIds: [],
      linkedBehaviorEventIds: matching.map((e) => e.id),
      linkedInterventionIds: [],
      linkedReflectionIds: [],
      linkedThemes: [],
      conditions: [],
    });
  }

  return patterns;
}

// -----------------------------------------------------------------------------
// 5. Reflection themes + theme patterns
//
// Extracts theme occurrences from every reflection + note in the window.
// Returns:
//   * `themes`   — full ReflectionThemeSummary[] for AI consumers
//   * `patterns` — promoted-to-pattern themes (theme observed in 2+
//                  reflections OR with high session correlation)
// -----------------------------------------------------------------------------

function detectReflectionThemes(
  filtered: FilteredInputs,
  timeWindowLabel: string,
): { patterns: BehavioralPattern[]; themes: ReflectionThemeSummary[] } {
  const themes: ReflectionThemeSummary[] = [];
  const patterns: BehavioralPattern[] = [];

  // Map sessions → behavior event types observed in them. Used for the
  // theme correlation column.
  const behaviorTypesBySession = new Map<string, Set<BehaviorEventType>>();
  for (const e of filtered.behaviorEvents) {
    if (!e.sessionId) continue;
    const set = behaviorTypesBySession.get(e.sessionId) ?? new Set();
    set.add(e.eventType as BehaviorEventType);
    behaviorTypesBySession.set(e.sessionId, set);
  }

  for (const themeId of REFLECTION_THEME_IDS) {
    const reflectionsWithTheme = filtered.reflections.filter((r) =>
      themesForReflection(r).has(themeId),
    );
    const notesWithTheme = filtered.sessionNotes.filter((n) =>
      themesForNote(n).has(themeId),
    );
    const occurrenceCount =
      reflectionsWithTheme.length + notesWithTheme.length;
    if (occurrenceCount === 0) continue;

    const sessionIds = uniqueSorted(
      [
        ...reflectionsWithTheme.map((r) => r.sessionId).filter((s): s is string => !!s),
        ...notesWithTheme.map((n) => n.sessionId).filter((s): s is string => !!s),
      ],
    );
    const correlated: BehaviorEventType[] = [];
    for (const sid of sessionIds) {
      const types = behaviorTypesBySession.get(sid);
      if (!types) continue;
      for (const t of types) {
        if (DETERIORATION_TYPES.has(t)) correlated.push(t);
      }
    }
    const correlatedUnique = uniqueSorted(correlated);

    const summary: ReflectionThemeSummary = {
      id: themeId,
      label: themeLabel(themeId),
      occurrenceCount,
      linkedReflectionIds: reflectionsWithTheme.map((r) => r.id),
      linkedSessionIds: sessionIds,
      linkedNoteIds: notesWithTheme.map((n) => n.id),
      correlatedBehaviorEventTypes: correlatedUnique,
    };
    themes.push(summary);

    // Promote to pattern: appears in 2+ reflections OR 1 reflection with
    // a strong correlated-behavior signal (≥ 2 distinct deterioration
    // event types in the same session).
    const correlationStrong = correlatedUnique.length >= 2;
    if (occurrenceCount < 2 && !correlationStrong) continue;

    patterns.push({
      id: `theme-${themeId}`,
      category: "reflection_theme",
      title: `"${themeLabel(themeId)}" appears in reflections`,
      description: correlationStrong
        ? `Theme observed in ${occurrenceCount} reflection${occurrenceCount === 1 ? "" : "s"} and correlates with ${correlatedUnique.length} distinct discipline drift event types in the same sessions.`
        : `Theme observed in ${occurrenceCount} reflection${occurrenceCount === 1 ? "" : "s"} during this window.`,
      severity: correlationStrong ? "warning" : "caution",
      confidence: confidenceFromObservation(occurrenceCount, sessionIds.length),
      occurrenceCount,
      sessionCount: sessionIds.length,
      timeWindowLabel,
      firstObservedAt: undefined,
      lastObservedAt: undefined,
      linkedSessionIds: sessionIds,
      linkedTradeIds: [],
      linkedBehaviorEventIds: [],
      linkedInterventionIds: [],
      linkedReflectionIds: reflectionsWithTheme.map((r) => r.id),
      linkedThemes: [themeId],
      conditions: [],
    });
  }

  return { patterns, themes };
}

// -----------------------------------------------------------------------------
// 6. Dangerous conditions
//
// Cross-correlations the user spec asks for explicitly:
//   * Most destructive sessions follow consecutive losses
//   * Stop widening correlates with override behavior
//   * Overtrading frequently follows a green morning
// -----------------------------------------------------------------------------

function deteriorationScoreForSession(
  events: BehaviorEvent[],
): number {
  let s = 0;
  for (const e of events) {
    if (DETERIORATION_TYPES.has(e.eventType as BehaviorEventType)) s += 1;
  }
  return s;
}

function detectDangerousConditions(
  filtered: FilteredInputs,
  timeWindowLabel: string,
): BehavioralPattern[] {
  const patterns: BehavioralPattern[] = [];

  // ---- A. Stop widening + override co-occurrence ------------------------
  const stopSessions = new Set(
    filtered.behaviorEvents
      .filter((e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER)
      .map((e) => e.sessionId)
      .filter((s): s is string => !!s),
  );
  const overrideSessions = new Set(
    filtered.behaviorEvents
      .filter(
        (e) =>
          e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED ||
          e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
      )
      .map((e) => e.sessionId)
      .filter((s): s is string => !!s),
  );
  const intersect = Array.from(stopSessions).filter((s) =>
    overrideSessions.has(s),
  );
  if (intersect.length >= 2) {
    const totalRelevant = new Set([
      ...Array.from(stopSessions),
      ...Array.from(overrideSessions),
    ]).size;
    const correlationRate =
      totalRelevant > 0 ? intersect.length / totalRelevant : 0;
    patterns.push({
      id: "dangerous-stop-override",
      category: "dangerous_condition",
      title: "Stop widening correlates with override behavior",
      description: `${intersect.length} of ${totalRelevant} sessions with either signal contained BOTH a warning override and a stop widening (${Math.round(correlationRate * 100)}%).`,
      severity: "warning",
      confidence: confidenceFromObservation(
        intersect.length * 2,
        intersect.length,
      ),
      occurrenceCount: intersect.length,
      sessionCount: intersect.length,
      timeWindowLabel,
      linkedSessionIds: intersect,
      linkedTradeIds: [],
      linkedBehaviorEventIds: filtered.behaviorEvents
        .filter(
          (e) =>
            (e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER ||
              e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED ||
              e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED) &&
            e.sessionId &&
            intersect.includes(e.sessionId),
        )
        .map((e) => e.id),
      linkedInterventionIds: [],
      linkedReflectionIds: [],
      linkedThemes: [],
      conditions: [
        { kind: "after_override", label: CONDITION_LABEL.after_override },
        {
          kind: "after_stop_widen",
          label: CONDITION_LABEL.after_stop_widen,
        },
      ],
    });
  }

  // ---- B. Destructive sessions follow consecutive losses ---------------
  // Sort closed trades chronologically, walk per session, count
  // consecutive-loss streaks PRECEDING the most destructive session in
  // the window. If the top-3 destructive sessions share a "≥2 prior
  // losses" condition, surface the pattern.
  const eventsBySession = new Map<string, BehaviorEvent[]>();
  for (const e of filtered.behaviorEvents) {
    if (!e.sessionId) continue;
    const list = eventsBySession.get(e.sessionId) ?? [];
    list.push(e);
    eventsBySession.set(e.sessionId, list);
  }
  const sessionScores: Array<{ sessionId: string; score: number }> = [];
  for (const s of filtered.sessions) {
    const evts = eventsBySession.get(s.sessionId) ?? [];
    sessionScores.push({
      sessionId: s.sessionId,
      score: deteriorationScoreForSession(evts),
    });
  }
  sessionScores.sort((a, b) => b.score - a.score);
  const topDestructive = sessionScores
    .filter((s) => s.score >= 3)
    .slice(0, 3);
  if (topDestructive.length >= 2) {
    // For each destructive session, count the consecutive losses that
    // occurred IN that session before the first deterioration event.
    let qualifying = 0;
    const qualifyingSessionIds: string[] = [];
    for (const top of topDestructive) {
      const sessionEvents = eventsBySession.get(top.sessionId) ?? [];
      const firstDetMs = Math.min(
        ...sessionEvents
          .filter((e) =>
            DETERIORATION_TYPES.has(e.eventType as BehaviorEventType),
          )
          .map((e) => isoToMs(e.timestamp))
          .filter(Number.isFinite),
      );
      if (!Number.isFinite(firstDetMs)) continue;
      const priorLosses = filtered.closedTrades.filter(
        (t) =>
          t.sessionId === top.sessionId &&
          t.outcome === "loss" &&
          isoToMs(t.closedAt) < firstDetMs,
      ).length;
      if (priorLosses >= 2) {
        qualifying += 1;
        qualifyingSessionIds.push(top.sessionId);
      }
    }
    if (qualifying >= 2) {
      patterns.push({
        id: "dangerous-losses-precede-destruction",
        category: "dangerous_condition",
        title: "Destructive sessions follow consecutive losses",
        description: `${qualifying} of the ${topDestructive.length} most destructive sessions in this window saw 2+ losses before the discipline drift began.`,
        severity: "critical",
        confidence: confidenceFromObservation(qualifying, qualifying),
        occurrenceCount: qualifying,
        sessionCount: qualifying,
        timeWindowLabel,
        linkedSessionIds: qualifyingSessionIds,
        linkedTradeIds: [],
        linkedBehaviorEventIds: [],
        linkedInterventionIds: [],
        linkedReflectionIds: [],
        linkedThemes: [],
        conditions: [
          {
            kind: "consecutive_losses",
            label: CONDITION_LABEL.consecutive_losses,
          },
        ],
      });
    }
  }

  // ---- C. Overtrading after green morning -------------------------------
  // Heuristic: for each session, sum the morning P/L (closed trades
  // closed before 12pm) and count afternoon size-up / overtrading
  // events (after 12pm). If 2+ sessions show green morning + afternoon
  // size escalation, surface the pattern.
  let afternoonSessions = 0;
  const afternoonSessionIds: string[] = [];
  for (const s of filtered.sessions) {
    const sTrades = filtered.closedTrades.filter(
      (t) => t.sessionId === s.sessionId,
    );
    const morningPnL = sTrades
      .filter((t) => {
        const h = hourFromIso(t.closedAt);
        return h != null && h < 12;
      })
      .reduce((acc, t) => acc + t.realizedPnL, 0);
    if (morningPnL <= 0) continue;
    const afternoonEscalation = (eventsBySession.get(s.sessionId) ?? []).some(
      (e) => {
        const h = hourFromIso(e.timestamp);
        if (h == null || h < 12) return false;
        return (
          e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
          e.eventType === BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED ||
          e.eventType === BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED
        );
      },
    );
    if (afternoonEscalation) {
      afternoonSessions += 1;
      afternoonSessionIds.push(s.sessionId);
    }
  }
  if (afternoonSessions >= 2) {
    patterns.push({
      id: "dangerous-green-morning-overtrading",
      category: "dangerous_condition",
      title: "Risk escalation follows green mornings",
      description: `${afternoonSessions} sessions opened green in the morning and showed afternoon size or risk escalation.`,
      severity: "warning",
      confidence: confidenceFromObservation(afternoonSessions, afternoonSessions),
      occurrenceCount: afternoonSessions,
      sessionCount: afternoonSessions,
      timeWindowLabel,
      linkedSessionIds: afternoonSessionIds,
      linkedTradeIds: [],
      linkedBehaviorEventIds: [],
      linkedInterventionIds: [],
      linkedReflectionIds: [],
      linkedThemes: [],
      conditions: [
        {
          kind: "after_green_morning",
          label: CONDITION_LABEL.after_green_morning,
        },
      ],
    });
  }

  return patterns;
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeBehavioralPatterns(
  inputs: PatternEngineInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): BehavioralPatternsResult {
  const filtered = filterToWindow(inputs, timeframe, nowMs);
  const timeWindowLabel = `Window: ${timeframe.label.toLowerCase()}`;

  const ruleBreaks = detectRecurringRuleBreaks(filtered, timeWindowLabel);
  const escalation = detectEscalationChains(filtered, timeWindowLabel);
  const timeOfDay = detectTimeOfDay(filtered, timeWindowLabel);
  const improvements = detectImprovementTrends(
    filtered,
    timeframe,
    nowMs,
    timeWindowLabel,
  );
  const reflectionThemes = detectReflectionThemes(filtered, timeWindowLabel);
  const dangerous = detectDangerousConditions(filtered, timeWindowLabel);

  const patterns: BehavioralPattern[] = [
    ...ruleBreaks,
    ...escalation.patterns,
    ...timeOfDay,
    ...improvements,
    ...reflectionThemes.patterns,
    ...dangerous,
  ];

  return {
    patterns,
    escalationSequences: escalation.sequences,
    reflectionThemes: reflectionThemes.themes,
    sessionsAnalyzed: filtered.sessions.length,
    timeWindowLabel,
  };
}

// Convenience: query helpers a future AI mentor (or any consumer) can use
// against the result. Kept here so the QUERY shape is paired with the data
// shape and stays consistent.

export function patternsForSession(
  result: BehavioralPatternsResult,
  sessionId: string,
): BehavioralPattern[] {
  return result.patterns.filter((p) =>
    p.linkedSessionIds.includes(sessionId),
  );
}

export function patternsForTheme(
  result: BehavioralPatternsResult,
  themeId: ReflectionThemeId,
): BehavioralPattern[] {
  return result.patterns.filter((p) => p.linkedThemes.includes(themeId));
}

export function patternsForCondition(
  result: BehavioralPatternsResult,
  conditionKind: BehavioralConditionKind,
): BehavioralPattern[] {
  return result.patterns.filter((p) =>
    p.conditions.some((c) => c.kind === conditionKind),
  );
}
