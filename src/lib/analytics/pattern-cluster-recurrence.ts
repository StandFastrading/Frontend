import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type { DetectionSeverity } from "@/lib/detection/behavioral-detection-engine";

import {
  bucketEvidence,
  classifyEvidence,
  type EvidenceBreakdown,
  type EvidenceClassifiedBehavior,
  type EvidenceObservation,
} from "@/lib/analytics/evidence-weighting-engine";

// Mutable working copy used while accumulating observations across the
// timeframe. We snapshot to a plain `EvidenceObservation` before
// classifying so the classifier always sees a stable record.
type MutableEvidenceObservation = {
  observedCount: number;
  sessionIds: Set<string>;
  eventIds: Set<string>;
  tradeIds: Set<string>;
  lastObservedAtMs: number;
};

function emptyMutableObservation(): MutableEvidenceObservation {
  return {
    observedCount: 0,
    sessionIds: new Set(),
    eventIds: new Set(),
    tradeIds: new Set(),
    lastObservedAtMs: 0,
  };
}

function freezeObservation(
  m: MutableEvidenceObservation,
): EvidenceObservation {
  return {
    observedCount: m.observedCount,
    sessionsAffected: m.sessionIds.size,
    supportingEventIds: Array.from(m.eventIds),
    supportingSessionIds: Array.from(m.sessionIds),
    supportingTradeIds: Array.from(m.tradeIds),
    lastObservedAt:
      m.lastObservedAtMs > 0
        ? new Date(m.lastObservedAtMs).toISOString()
        : null,
  };
}

// MonitoringEvent deviation flavor → BehaviorEventType. Used to
// attribute tradeIds to a candidate behavior when we accumulate
// observations. Only narrow, 1:1 mappings appear here — anything fuzzy
// is omitted rather than guessed.
function deviationMatchesBehavior(
  m: import("@/types").MonitoringEvent,
  behaviorType: string,
): boolean {
  return m.deviations.some((d) => {
    if (
      d.type === "stop_moved_further" &&
      behaviorType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER
    )
      return true;
    if (
      d.type === "position_size_increased" &&
      behaviorType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED
    )
      return true;
    if (
      d.type === "risk_exposure_increased" &&
      behaviorType === BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED
    )
      return true;
    if (
      d.type === "averaging_down" &&
      behaviorType === BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED
    )
      return true;
    if (
      d.type === "excessive_adds" &&
      behaviorType === BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED
    )
      return true;
    if (
      d.type === "reward_risk_degraded" &&
      behaviorType === BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED
    )
      return true;
    return false;
  });
}
import { type TimeframeDefinition } from "@/lib/analytics/timeframe";
import {
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";
import type {
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  MonitoringEvent,
  TradingSession,
} from "@/types";

// =============================================================================
// Behavioral Pattern Cluster Recurrence — multi-formation cross-session engine
// =============================================================================
//
// PURPOSE
//   Behavioral Pattern *Cards* answer "WHAT keeps happening?" (a recurring
//   detection id across sessions). This module answers a different
//   question:
//
//     "HOW does the trader break down?"
//
//   It produces named cross-session BEHAVIOR FORMATIONS — multi-session
//   formations of related behavior that recur even when a single session
//   has only one related detection. A session with just `stop_widening`
//   was previously invisible to the cluster layer because the older
//   `detectionReading.activeClusters` array required 2+ detections inside
//   the same session. That created the "No recurring clusters" gap on
//   Analytics even when the Cross-Session Pattern Engine clearly showed
//   stop discipline recurring across 3 sessions.
//
// FORMATIONS COVERED IN V1
//   1. stop_discipline             — stop widening recurs across sessions
//   2. risk_mutation               — risk expands after trade activation
//   3. early_session_deterioration — deterioration inside first 2 trades
//                                    OR first 30 min of session
//   4. clean_to_decay              — clean first trade then later decay
//   5. rule_defiance               — stop widening + warning override
//                                    in the same session
//
// DESIGN PRINCIPLES (kept verbatim from the deterministic-engine doctrine)
//   * PURE — no I/O, no Date.now(); the timeframe filter takes nowMs as
//     a parameter.
//   * EXPLAINABLE — every formation lists its `supportingEventIds`,
//     `supportingSessionIds`, and `supportingTradeIds`. The trader (and
//     the future AI mentor layer) can always trace why a formation fired.
//   * AI-READY — every emitted record carries a stable shape suitable for
//     retrieval queries like "show me recurring stop discipline clusters."
// =============================================================================

export const BEHAVIOR_FORMATION_TYPES = [
  "stop_discipline",
  "risk_mutation",
  "early_session_deterioration",
  "clean_to_decay",
  "rule_defiance",
] as const;
export type BehaviorFormationType = (typeof BEHAVIOR_FORMATION_TYPES)[number];

export type FormationConfidence = "low" | "moderate" | "high";

export type ClusterChainStep = {
  eventType: string;
  // Human label rendered in the dashboard's "common chain" pill row.
  label: string;
};

// AI-ready cluster record. Field names are intentionally explicit so a
// future retrieval layer can pattern-match by type / severity / confidence
// without having to interpret abbreviations.
export type BehaviorClusterFormation = {
  clusterId: string;
  type: BehaviorFormationType;
  title: string;
  explanation: string;
  severity: DetectionSeverity;
  confidence: FormationConfidence;
  // Number of sessions in the active window that exhibited the formation.
  sessionsAffected: number;
  // Total raw occurrences across all qualifying sessions. Used for
  // confidence weighting + display ("contributing detections").
  occurrences: number;
  // BehaviorEventType strings DIRECTLY OBSERVED in the contributing
  // sessions. This used to be a static per-formation list, which let
  // event types we'd merely associated with the cluster (e.g.
  // averaging_down on a risk_mutation card) surface even when the
  // trader never produced that event. It is now derived from
  // `evidenceBreakdown.primary` so callers that only want a flat list
  // of confirmed behaviors keep the same shape, without false
  // positives.
  linkedBehaviorTypes: string[];
  // Full evidence breakdown — every CANDIDATE behavior type considered
  // for this formation, classified by what was actually observed.
  // `primary` = directly observed. `correlated` = strongly correlated
  // (the common chain etc.). `possible` = loose associations the
  // surface may render under a secondary header. Behaviors that were
  // not observed are intentionally omitted — the UI rule is "don't
  // show what didn't happen".
  evidenceBreakdown: EvidenceBreakdown;
  // Most common short chain observed inside the qualifying sessions.
  commonSequence: ClusterChainStep[];
  // ISO timestamps bracketing every session that contributed.
  firstObservedAt: string;
  lastObservedAt: string;
  // Tracebacks. Every id here originates from a record already in the
  // store, so the AI layer can pull full context on demand.
  supportingEventIds: string[];
  supportingSessionIds: string[];
  supportingTradeIds: string[];
};

// -----------------------------------------------------------------------------
// Static formation metadata
// -----------------------------------------------------------------------------

const FORMATION_TITLE: Record<BehaviorFormationType, string> = {
  stop_discipline: "Stop Discipline Cluster",
  risk_mutation: "Risk Mutation Pattern",
  early_session_deterioration: "Early-Session Deterioration",
  clean_to_decay: "Clean Start, Discipline Decay",
  rule_defiance: "Rule Boundary Drift",
};

const FORMATION_EXPLANATION: Record<BehaviorFormationType, string> = {
  stop_discipline:
    "Stops were widened beyond the approved invalidation level across multiple sessions.",
  risk_mutation:
    "Risk expanded after trade activation, showing that the plan changed while money was already at risk.",
  early_session_deterioration:
    "Behavioral deterioration repeatedly appears early in the session before the trader has built enough decision stability.",
  clean_to_decay:
    "Sessions often begin controlled, then discipline weakens after the first completed trade.",
  rule_defiance:
    "Rule boundaries are being adjusted after the trade is active instead of being honored as invalidation points.",
};

// Baseline severity per formation. The compute function bumps this with
// confidence so a formation observed in 5+ sessions reads more urgently
// than the same formation observed in 2 sessions.
const FORMATION_BASE_SEVERITY: Record<BehaviorFormationType, DetectionSeverity> =
  {
    stop_discipline: "warning",
    risk_mutation: "warning",
    early_session_deterioration: "warning",
    clean_to_decay: "caution",
    rule_defiance: "critical",
  };

// CANDIDATE behavior event types per formation. These are the types the
// engine will look up observation counts for; only the ones that
// actually fired in contributing sessions surface on the card. A static
// "linked behaviors" list used to live here, but it caused
// over-association — e.g. `averaging_down` showing on a risk_mutation
// card the trader had never produced. With evidence weighting, the
// formation declares "here are the types I care about", and the
// classifier decides which of those are directly observed vs.
// loosely-associated-not-recorded.
const FORMATION_CANDIDATE_BEHAVIORS: Record<BehaviorFormationType, string[]> = {
  stop_discipline: [
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  ],
  risk_mutation: [
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED,
    BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
    BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  ],
  early_session_deterioration: [
    BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
    BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  ],
  clean_to_decay: [
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  ],
  rule_defiance: [
    BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  ],
};

// Event types we treat as cluster-relevant chain links per formation. The
// chain extractor scans qualifying sessions for the most common 2-/3-step
// ordered sub-sequence of these types.
const FORMATION_CHAIN_EVENT_TYPES: Record<BehaviorFormationType, string[]> = {
  stop_discipline: [
    BEHAVIOR_EVENT_TYPES.TRADE_CLOSED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  ],
  risk_mutation: [
    BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED,
  ],
  early_session_deterioration: [
    BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
    BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  ],
  clean_to_decay: [
    BEHAVIOR_EVENT_TYPES.TRADE_CLOSED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  ],
  rule_defiance: [
    BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  ],
};

// Human chain labels — kept here (not in the UI) so chain wording stays
// consistent across surfaces (today's dashboard, future AI summaries).
const EVENT_LABEL: Record<string, string> = {
  [BEHAVIOR_EVENT_TYPES.TRADE_CLOSED]: "Trade closed",
  [BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED]: "Warning",
  [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED]: "Warning ignored",
  [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED]: "Override accepted",
  [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: "Size increased",
  [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION]: "Rapid re-entry",
  [BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED]: "Risk exposure up",
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: "Stop widened",
  [BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE]: "Clean trade",
  [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED]: "Mistake logged",
  [BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED]: "Reward/risk degraded",
  [BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED]: "Averaging down",
  [BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED]: "Excessive adds",
  [BEHAVIOR_EVENT_TYPES.TRADE_PLAN_STARTED]: "Trade plan started",
};

// -----------------------------------------------------------------------------
// Per-session detection — fingerprint a single session for each formation
// -----------------------------------------------------------------------------

type SessionContext = {
  session: TradingSession;
  events: BehaviorEvent[];
  monitoring: MonitoringEvent[];
  interventions: InterventionEvent[];
  trades: ClosedTrade[];
};

type FormationMatch = {
  // Behavior event ids that satisfied the rule in this session.
  eventIds: string[];
  // Trade ids touched by the formation (sourced from monitoring events +
  // closed trades). Empty when no trade-scoped record applies.
  tradeIds: string[];
  // Raw occurrence count contributed by this session.
  occurrences: number;
};

function detectStopDiscipline(ctx: SessionContext): FormationMatch | null {
  const wideningEvents = ctx.events.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  );
  if (wideningEvents.length === 0) return null;

  const tradeIds = new Set<string>();
  for (const m of ctx.monitoring) {
    if (m.deviations.some((d) => d.type === "stop_moved_further")) {
      tradeIds.add(m.tradeId);
    }
  }

  return {
    eventIds: wideningEvents.map((e) => e.id),
    tradeIds: Array.from(tradeIds),
    occurrences: wideningEvents.length,
  };
}

function detectRiskMutation(ctx: SessionContext): FormationMatch | null {
  const MUTATION_TYPES = new Set<string>([
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED,
    BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
    BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  ]);
  const events = ctx.events.filter((e) => MUTATION_TYPES.has(e.eventType));
  if (events.length === 0) return null;

  const tradeIds = new Set<string>();
  for (const m of ctx.monitoring) {
    if (
      m.deviations.some(
        (d) =>
          d.type === "stop_moved_further" ||
          d.type === "position_size_increased" ||
          d.type === "risk_exposure_increased" ||
          d.type === "averaging_down" ||
          d.type === "excessive_adds" ||
          d.type === "reward_risk_degraded",
      )
    ) {
      tradeIds.add(m.tradeId);
    }
  }

  return {
    eventIds: events.map((e) => e.id),
    tradeIds: Array.from(tradeIds),
    occurrences: events.length,
  };
}

function detectEarlySessionDeterioration(
  ctx: SessionContext,
): FormationMatch | null {
  const sessionStartMs = new Date(ctx.session.startedAt).getTime();
  if (!Number.isFinite(sessionStartMs)) return null;

  const THIRTY_MIN_MS = 30 * 60_000;

  // Timestamp of the third trade activation — anything before it is "in
  // the first 2 trades". A session with ≤ 2 activations counts every
  // event as still inside the early window by definition.
  const activationsAsc = ctx.events
    .filter((e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE)
    .map((e) => new Date(e.timestamp).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  const thirdActivationMs = activationsAsc[2] ?? null;

  const DETERIORATION_TYPES = new Set<string>([
    BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
    BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
    BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
    BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  ]);

  const earlyEvents = ctx.events.filter((e) => {
    if (!DETERIORATION_TYPES.has(e.eventType)) return false;
    const t = new Date(e.timestamp).getTime();
    if (!Number.isFinite(t)) return false;
    const withinFirst30Min = t - sessionStartMs <= THIRTY_MIN_MS;
    const withinFirst2Trades =
      thirdActivationMs == null ? true : t < thirdActivationMs;
    return withinFirst30Min || withinFirst2Trades;
  });
  if (earlyEvents.length === 0) return null;

  return {
    eventIds: earlyEvents.map((e) => e.id),
    tradeIds: [],
    occurrences: earlyEvents.length,
  };
}

function detectCleanToDecay(ctx: SessionContext): FormationMatch | null {
  if (ctx.trades.length < 2) return null;
  const sorted = [...ctx.trades].sort(
    (a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime(),
  );
  const first = sorted[0];
  // Treat zero deviations + zero mistakes as a "clean" first trade. The
  // archive records both counts at close time so this is a reliable proxy
  // for "no in-flight monitoring drama".
  const isCleanFirst = first.deviationCount === 0 && first.mistakeCount === 0;
  if (!isCleanFirst) return null;

  const decayTrades = sorted
    .slice(1)
    .filter((t) => t.deviationCount > 0 || t.mistakeCount > 0);
  if (decayTrades.length === 0) return null;

  const firstClosedMs = new Date(first.closedAt).getTime();
  const DECAY_EVENT_TYPES = new Set<string>([
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  ]);
  const decayEvents = ctx.events.filter((e) => {
    if (!DECAY_EVENT_TYPES.has(e.eventType)) return false;
    const t = new Date(e.timestamp).getTime();
    return Number.isFinite(t) && t > firstClosedMs;
  });

  return {
    // Include the closing event for the clean trade as the anchor so the
    // common-chain extractor can pick up the "clean trade → decay" arc.
    eventIds: [
      ...ctx.events
        .filter(
          (e) =>
            e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_CLOSED &&
            new Date(e.timestamp).getTime() === firstClosedMs,
        )
        .map((e) => e.id),
      ...decayEvents.map((e) => e.id),
    ],
    tradeIds: [first.id, ...decayTrades.map((t) => t.id)],
    occurrences: decayTrades.length,
  };
}

function detectRuleDefiance(ctx: SessionContext): FormationMatch | null {
  const widening = ctx.events.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  );
  const overrides = ctx.events.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  );
  if (widening.length === 0 || overrides.length === 0) return null;

  const tradeIds = new Set<string>();
  for (const m of ctx.monitoring) {
    if (m.deviations.some((d) => d.type === "stop_moved_further")) {
      tradeIds.add(m.tradeId);
    }
  }

  return {
    eventIds: [...widening.map((e) => e.id), ...overrides.map((e) => e.id)],
    tradeIds: Array.from(tradeIds),
    occurrences: widening.length + overrides.length,
  };
}

const DETECTORS: Record<
  BehaviorFormationType,
  (ctx: SessionContext) => FormationMatch | null
> = {
  stop_discipline: detectStopDiscipline,
  risk_mutation: detectRiskMutation,
  early_session_deterioration: detectEarlySessionDeterioration,
  clean_to_decay: detectCleanToDecay,
  rule_defiance: detectRuleDefiance,
};

// -----------------------------------------------------------------------------
// Common-chain extractor — most common ordered 2-/3-step sub-sequence
// drawn from the formation's chain event types, scanned across all
// qualifying sessions.
// -----------------------------------------------------------------------------

function findCommonChain(
  type: BehaviorFormationType,
  events: BehaviorEvent[],
  qualifyingSessionIds: Set<string>,
): ClusterChainStep[] {
  const relevant = new Set(FORMATION_CHAIN_EVENT_TYPES[type]);
  const chainCounts = new Map<string, number>();

  for (const sessionId of qualifyingSessionIds) {
    const ordered = events
      .filter((e) => e.sessionId === sessionId && relevant.has(e.eventType))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const a = ordered[i].eventType;
      const b = ordered[i + 1].eventType;
      const key2 = `${a}|${b}`;
      chainCounts.set(key2, (chainCounts.get(key2) ?? 0) + 1);
      if (i + 2 < ordered.length) {
        const c = ordered[i + 2].eventType;
        const key3 = `${a}|${b}|${c}`;
        chainCounts.set(key3, (chainCounts.get(key3) ?? 0) + 1);
      }
    }
  }

  if (chainCounts.size === 0) return [];

  // Prefer longer chains when frequencies tie — they're more informative.
  let bestKey: string | null = null;
  let bestScore = -1;
  for (const [key, count] of chainCounts) {
    const length = key.split("|").length;
    const score = count * Math.sqrt(length);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  if (!bestKey) return [];
  return bestKey.split("|").map((eventType) => ({
    eventType,
    label: EVENT_LABEL[eventType] ?? eventType.replace(/_/g, " "),
  }));
}

// -----------------------------------------------------------------------------
// Confidence + severity derivation
// -----------------------------------------------------------------------------

function confidenceFor(sessionsAffected: number): FormationConfidence {
  if (sessionsAffected >= 5) return "high";
  if (sessionsAffected >= 3) return "moderate";
  return "low";
}

const SEVERITY_RANK: Record<DetectionSeverity, number> = {
  info: 0,
  caution: 1,
  warning: 2,
  critical: 3,
};

function bumpSeverity(s: DetectionSeverity, delta: number): DetectionSeverity {
  const order: DetectionSeverity[] = ["info", "caution", "warning", "critical"];
  const idx = Math.max(0, Math.min(order.length - 1, SEVERITY_RANK[s] + delta));
  return order[idx];
}

function severityFor(
  type: BehaviorFormationType,
  confidence: FormationConfidence,
): DetectionSeverity {
  const base = FORMATION_BASE_SEVERITY[type];
  if (confidence === "high") return bumpSeverity(base, 1);
  if (confidence === "low") return bumpSeverity(base, -1);
  return base;
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeBehaviorClusterFormations(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): BehaviorClusterFormation[] {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);

  // Per-formation accumulators.
  type Accumulator = {
    sessionIds: Set<string>;
    eventIds: Set<string>;
    tradeIds: Set<string>;
    occurrences: number;
    firstObservedAtMs: number;
    lastObservedAtMs: number;
    // Per-candidate-event-type observation totals for THIS formation.
    // Driven only by events recorded in qualifying sessions, so the
    // classifier never sees an event the trader didn't actually
    // produce.
    candidateObservations: Map<string, MutableEvidenceObservation>;
  };
  const init: Record<BehaviorFormationType, Accumulator> = {
    stop_discipline: newAcc(),
    risk_mutation: newAcc(),
    early_session_deterioration: newAcc(),
    clean_to_decay: newAcc(),
    rule_defiance: newAcc(),
  };

  for (const session of windowed) {
    const ctx: SessionContext = {
      session,
      events: inputs.behaviorEvents.filter(
        (e) => e.sessionId === session.sessionId,
      ),
      monitoring: inputs.monitoringEvents.filter(
        (e) => e.sessionId === session.sessionId,
      ),
      interventions: inputs.interventions.filter(
        (e) => e.sessionId === session.sessionId,
      ),
      trades: inputs.closedTrades.filter(
        (t) => t.sessionId === session.sessionId,
      ),
    };
    const sessionStartMs = new Date(session.startedAt).getTime();

    for (const type of BEHAVIOR_FORMATION_TYPES) {
      const match = DETECTORS[type](ctx);
      if (!match) continue;
      const acc = init[type];
      acc.sessionIds.add(session.sessionId);
      for (const id of match.eventIds) acc.eventIds.add(id);
      for (const id of match.tradeIds) acc.tradeIds.add(id);
      acc.occurrences += match.occurrences;
      if (Number.isFinite(sessionStartMs)) {
        if (
          acc.firstObservedAtMs === 0 ||
          sessionStartMs < acc.firstObservedAtMs
        ) {
          acc.firstObservedAtMs = sessionStartMs;
        }
        if (sessionStartMs > acc.lastObservedAtMs) {
          acc.lastObservedAtMs = sessionStartMs;
        }
      }
      // Evidence accumulation — for each candidate behavior type
      // declared for this formation, record only what we actually
      // observed in this qualifying session. Types with zero
      // observations are intentionally never inserted into the map,
      // so the emit step has no false-positive surface area.
      for (const candidateType of FORMATION_CANDIDATE_BEHAVIORS[type]) {
        const matching = ctx.events.filter(
          (e) => e.eventType === candidateType,
        );
        if (matching.length === 0) continue;
        let obs = acc.candidateObservations.get(candidateType);
        if (!obs) {
          obs = emptyMutableObservation();
          acc.candidateObservations.set(candidateType, obs);
        }
        obs.observedCount += matching.length;
        obs.sessionIds.add(session.sessionId);
        for (const e of matching) {
          obs.eventIds.add(e.id);
          const t = new Date(e.timestamp).getTime();
          if (Number.isFinite(t) && t > obs.lastObservedAtMs) {
            obs.lastObservedAtMs = t;
          }
        }
        // Trade ids — pull from monitoring events of the matching
        // session whose deviation type maps to this candidate. The
        // mapping is intentionally narrow: only deviation flavors
        // that correspond 1:1 to the behavior event type.
        for (const m of ctx.monitoring) {
          if (deviationMatchesBehavior(m, candidateType)) {
            obs.tradeIds.add(m.tradeId);
          }
        }
      }
    }
  }

  const out: BehaviorClusterFormation[] = [];
  for (const type of BEHAVIOR_FORMATION_TYPES) {
    const acc = init[type];
    // Cross-session formation: needs at least 2 sessions to qualify as
    // recurring. A single-session match is interesting but lives in the
    // existing "Today's Patterns" surface, not here.
    if (acc.sessionIds.size < 2) continue;
    const confidence = confidenceFor(acc.sessionIds.size);
    const severity = severityFor(type, confidence);
    const firstObservedAt =
      acc.firstObservedAtMs > 0
        ? new Date(acc.firstObservedAtMs).toISOString()
        : new Date(0).toISOString();
    const lastObservedAt =
      acc.lastObservedAtMs > 0
        ? new Date(acc.lastObservedAtMs).toISOString()
        : firstObservedAt;
    // Build the evidence breakdown. Only candidate behaviors that
    // actually fired contribute rows; the classifier never sees a
    // type we didn't observe. The common sequence (cross-event
    // ordering) is emitted as a single `strongly_correlated` row when
    // it spans 2+ sessions — that's the formation's relationship
    // signal, distinct from any individual event count.
    const evidenceRows: EvidenceClassifiedBehavior[] = [];
    for (const [behaviorType, mutable] of acc.candidateObservations) {
      evidenceRows.push(
        classifyEvidence({
          behaviorType,
          label: EVENT_LABEL[behaviorType] ?? behaviorType.replace(/_/g, " "),
          observation: freezeObservation(mutable),
        }),
      );
    }
    const commonSequence = findCommonChain(
      type,
      inputs.behaviorEvents,
      acc.sessionIds,
    );
    if (commonSequence.length >= 2) {
      const chainLabel = commonSequence
        .map((s) => s.label)
        .join(" → ");
      evidenceRows.push(
        classifyEvidence({
          behaviorType: `chain:${commonSequence.map((s) => s.eventType).join("|")}`,
          label: chainLabel,
          observation: {
            observedCount: acc.sessionIds.size,
            sessionsAffected: acc.sessionIds.size,
            supportingEventIds: Array.from(acc.eventIds),
            supportingSessionIds: Array.from(acc.sessionIds),
            supportingTradeIds: Array.from(acc.tradeIds),
            lastObservedAt,
          },
          relationshipObservation: true,
          explanation: `${chainLabel} repeated across ${acc.sessionIds.size} sessions.`,
        }),
      );
    }
    const evidenceBreakdown = bucketEvidence(evidenceRows);
    // `linkedBehaviorTypes` is now derived from directly-observed rows
    // only — no event the trader didn't produce will leak through.
    const linkedBehaviorTypes = evidenceBreakdown.primary.map(
      (row) => row.behaviorType,
    );

    out.push({
      clusterId: `formation_${type}_${acc.firstObservedAtMs}`,
      type,
      title: FORMATION_TITLE[type],
      explanation: FORMATION_EXPLANATION[type],
      severity,
      confidence,
      sessionsAffected: acc.sessionIds.size,
      occurrences: acc.occurrences,
      linkedBehaviorTypes,
      evidenceBreakdown,
      commonSequence,
      firstObservedAt,
      lastObservedAt,
      supportingEventIds: Array.from(acc.eventIds),
      supportingSessionIds: Array.from(acc.sessionIds),
      supportingTradeIds: Array.from(acc.tradeIds),
    });
  }

  out.sort((a, b) => {
    const sevDelta = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sevDelta !== 0) return sevDelta;
    return b.sessionsAffected - a.sessionsAffected;
  });
  return out;
}

// Display vocabulary exported so the section component can render linked
// behavior pills + common-chain steps without re-deriving labels.
export const BEHAVIOR_EVENT_LABEL = EVENT_LABEL;

function newAcc(): {
  sessionIds: Set<string>;
  eventIds: Set<string>;
  tradeIds: Set<string>;
  occurrences: number;
  firstObservedAtMs: number;
  lastObservedAtMs: number;
  candidateObservations: Map<string, MutableEvidenceObservation>;
} {
  return {
    sessionIds: new Set(),
    eventIds: new Set(),
    tradeIds: new Set(),
    occurrences: 0,
    firstObservedAtMs: 0,
    lastObservedAtMs: 0,
    candidateObservations: new Map(),
  };
}
