import { BEHAVIOR_EVENT_DISPLAY } from "@/lib/behavior-events";
import { computeBehavioralDetection } from "@/lib/detection/behavioral-detection-engine";
import { computeBehavioralStateAggregation } from "@/lib/state/behavioral-state-aggregator";
import type { BehavioralStateLabel } from "@/lib/state/behavioral-state-aggregator";
import type {
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  MonitoringEvent,
  RiskRules,
  SessionMetrics,
  TradingSession,
} from "@/types";

// =============================================================================
// Session Replay Builder
// =============================================================================
//
// Reconstructs the chronological behavioral story of a single session by
// merging four event streams into one unified timeline:
//
//   * behavior events       (the canonical feed)
//   * intervention decisions (Cancel / Revise / Continue Anyway)
//   * monitoring deviations (the per-update deviation engine output)
//   * derived state transitions (state changes between consecutive events)
//
// The resulting timeline is the "behavioral black box" — what the trader
// did, in order, with severity markers and state transitions. Everything
// is deterministic; we replay history without rewriting it.
// =============================================================================

export type ReplayEventSource =
  | "behavior"
  | "intervention"
  | "monitoring"
  | "state_transition";

export type ReplayEventSeverity = "info" | "caution" | "warning" | "critical";

export type ReplayEvent = {
  id: string;
  source: ReplayEventSource;
  timestamp: string;
  // Display strings — pre-resolved so the UI doesn't need to look anything
  // up. Title is the headline; description is the secondary line.
  title: string;
  description: string;
  severity: ReplayEventSeverity;
  // Optional state-transition payload — only set when source is
  // "state_transition".
  fromState?: BehavioralStateLabel;
  toState?: BehavioralStateLabel;
};

export type SessionReplay = {
  session: TradingSession;
  events: ReplayEvent[];
  // Highest severity reached during the session.
  peakSeverity: ReplayEventSeverity;
  // State the session peaked at (most severe state the aggregator
  // produced during the timeline).
  peakState: BehavioralStateLabel;
};

const SEVERITY_RANK: Record<ReplayEventSeverity, number> = {
  info: 0,
  caution: 1,
  warning: 2,
  critical: 3,
};

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
const STATE_BY_RANK: BehavioralStateLabel[] = [
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

function maxSeverity(
  a: ReplayEventSeverity,
  b: ReplayEventSeverity,
): ReplayEventSeverity {
  return SEVERITY_RANK[b] > SEVERITY_RANK[a] ? b : a;
}

function maxState(
  a: BehavioralStateLabel,
  b: BehavioralStateLabel,
): BehavioralStateLabel {
  return STATE_RANK[b] > STATE_RANK[a] ? b : a;
}

// Maps an analytic deviation severity to the replay's severity vocab.
const DEVIATION_TO_REPLAY: Record<string, ReplayEventSeverity> = {
  info: "info",
  caution: "caution",
  elevated: "warning",
  critical: "critical",
};

const BEHAVIOR_EVENT_TO_REPLAY: Record<string, ReplayEventSeverity> = {
  info: "info",
  warning: "caution",
  fail: "warning",
};

function severityForBehaviorEvent(e: BehaviorEvent): ReplayEventSeverity {
  return BEHAVIOR_EVENT_TO_REPLAY[e.severity] ?? "info";
}

function severityForIntervention(
  i: InterventionEvent,
): ReplayEventSeverity {
  if (i.decision === "continue_anyway") {
    return i.severity === "violation" ? "critical" : "warning";
  }
  return "info";
}

function severityForMonitoring(m: MonitoringEvent): ReplayEventSeverity {
  return DEVIATION_TO_REPLAY[m.severity] ?? "info";
}

function describeBehaviorEvent(e: BehaviorEvent): {
  title: string;
  description: string;
} {
  const display = BEHAVIOR_EVENT_DISPLAY[e.eventType];
  return {
    title: e.displayTitle || display?.displayTitle || e.eventType,
    description:
      e.displayDescription || display?.displayDescription || "—",
  };
}

function describeIntervention(i: InterventionEvent): {
  title: string;
  description: string;
} {
  const symbol = i.symbol ? ` · ${i.symbol}` : "";
  switch (i.decision) {
    case "continue_anyway":
      return {
        title: `Continue Anyway accepted${symbol}`,
        description: `Overrode ${i.warningCount ?? 0} warning${(i.warningCount ?? 0) === 1 ? "" : "s"} and ${i.violationCount ?? 0} violation${(i.violationCount ?? 0) === 1 ? "" : "s"}.`,
      };
    case "revise_trade":
      return {
        title: `Trade revised${symbol}`,
        description: "Returned to the plan after the rule check.",
      };
    case "cancel_trade":
      return {
        title: `Trade canceled${symbol}`,
        description: "Setup discarded after the rule check.",
      };
  }
}

function describeMonitoring(m: MonitoringEvent): {
  title: string;
  description: string;
} {
  const headline = m.deviations[0]?.description ?? "Deviation event";
  return {
    title: headline,
    description: `${m.deviations.length} deviation${m.deviations.length === 1 ? "" : "s"} logged · ${m.severity}`,
  };
}

// -----------------------------------------------------------------------------
// State-transition synthesis
//
// The store doesn't persist state transitions explicitly — they're a
// derived quantity. To synthesize them, we replay the session's events in
// order and re-run the aggregator after each event lands. Whenever the
// state changes between consecutive checkpoints, we emit a replay event.
// -----------------------------------------------------------------------------

function buildStateTransitions(
  session: TradingSession,
  inputs: {
    behaviorEvents: BehaviorEvent[];
    monitoringEvents: MonitoringEvent[];
    interventions: InterventionEvent[];
    closedTrades: ClosedTrade[];
    riskRules: RiskRules;
    liveSessionMetrics: SessionMetrics;
  },
): ReplayEvent[] {
  // Ordered list of checkpoints — every behavior event's timestamp is a
  // sampling moment.
  const checkpoints = [...inputs.behaviorEvents]
    .map((e) => ({ iso: e.timestamp, t: new Date(e.timestamp).getTime() }))
    .filter((c) => Number.isFinite(c.t))
    .sort((a, b) => a.t - b.t);

  let lastState: BehavioralStateLabel = "focused";
  const transitions: ReplayEvent[] = [];

  for (let i = 0; i < checkpoints.length; i += 1) {
    const checkpoint = checkpoints[i];
    // Only feed the engines events up to this point in time.
    const before = (e: { timestamp: string }) =>
      new Date(e.timestamp).getTime() <= checkpoint.t;
    const eventsSoFar = inputs.behaviorEvents.filter(before);
    const monitoringSoFar = inputs.monitoringEvents.filter(before);
    const interventionsSoFar = inputs.interventions.filter(before);
    const tradesSoFar = inputs.closedTrades.filter(
      (t) => new Date(t.closedAt).getTime() <= checkpoint.t,
    );

    const detection = computeBehavioralDetection({
      behaviorEvents: eventsSoFar,
      monitoringEvents: monitoringSoFar,
      interventions: interventionsSoFar,
      activeTrades: [],
      closedTrades: tradesSoFar,
      riskRules: inputs.riskRules,
      sessionMetrics: inputs.liveSessionMetrics,
    });
    const aggregation = computeBehavioralStateAggregation({
      behaviorEvents: eventsSoFar,
      monitoringEvents: monitoringSoFar,
      interventions: interventionsSoFar,
      detections: detection.detections,
      closedTrades: tradesSoFar,
      sessionMetrics: inputs.liveSessionMetrics,
      riskRules: inputs.riskRules,
      nowMs: checkpoint.t,
    });

    if (aggregation.state !== lastState) {
      transitions.push({
        id: `state-${session.sessionId}-${checkpoint.iso}`,
        source: "state_transition",
        timestamp: checkpoint.iso,
        title:
          STATE_RANK[aggregation.state] > STATE_RANK[lastState]
            ? `State escalated to ${STATE_BY_RANK[STATE_RANK[aggregation.state]]}`
            : `State softened to ${STATE_BY_RANK[STATE_RANK[aggregation.state]]}`,
        description: aggregation.narrative,
        severity:
          STATE_RANK[aggregation.state] >= STATE_RANK.impulsive
            ? "critical"
            : STATE_RANK[aggregation.state] >= STATE_RANK.escalating
              ? "warning"
              : STATE_RANK[aggregation.state] >= STATE_RANK.stable
                ? "caution"
                : "info",
        fromState: lastState,
        toState: aggregation.state,
      });
      lastState = aggregation.state;
    }
  }

  return transitions;
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function buildSessionReplay(
  session: TradingSession,
  inputs: {
    behaviorEvents: BehaviorEvent[];
    monitoringEvents: MonitoringEvent[];
    interventions: InterventionEvent[];
    closedTrades: ClosedTrade[];
    riskRules: RiskRules;
    liveSessionMetrics: SessionMetrics;
  },
): SessionReplay {
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

  const events: ReplayEvent[] = [];

  for (const e of sessionEvents) {
    const { title, description } = describeBehaviorEvent(e);
    events.push({
      id: `b-${e.id}`,
      source: "behavior",
      timestamp: e.timestamp,
      title,
      description,
      severity: severityForBehaviorEvent(e),
    });
  }

  for (const i of sessionInterventions) {
    const { title, description } = describeIntervention(i);
    events.push({
      id: `i-${i.id}`,
      source: "intervention",
      timestamp: i.timestamp,
      title,
      description,
      severity: severityForIntervention(i),
    });
  }

  for (const m of sessionMonitoring) {
    const { title, description } = describeMonitoring(m);
    events.push({
      id: `m-${m.id}`,
      source: "monitoring",
      timestamp: m.timestamp,
      title,
      description,
      severity: severityForMonitoring(m),
    });
  }

  // Synthesize state transitions using the session's own data — passing
  // the session-scoped slices in so the engine doesn't see anything
  // from other sessions.
  const transitions = buildStateTransitions(session, {
    behaviorEvents: sessionEvents,
    monitoringEvents: sessionMonitoring,
    interventions: sessionInterventions,
    closedTrades: sessionTrades,
    riskRules: inputs.riskRules,
    liveSessionMetrics: inputs.liveSessionMetrics,
  });
  events.push(...transitions);

  events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let peakSeverity: ReplayEventSeverity = "info";
  let peakState: BehavioralStateLabel = "focused";
  for (const e of events) {
    peakSeverity = maxSeverity(peakSeverity, e.severity);
    if (e.toState) peakState = maxState(peakState, e.toState);
  }

  return { session, events, peakSeverity, peakState };
}
