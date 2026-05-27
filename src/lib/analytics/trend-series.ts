import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import { computeBehavioralStateAggregation } from "@/lib/state/behavioral-state-aggregator";
import { computeBehavioralDetection } from "@/lib/detection/behavioral-detection-engine";
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

import {
  isWithinTimeframe,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";

// =============================================================================
// Trend series builders
// =============================================================================
//
// Builds per-session time-series arrays for the analytics page's charts.
// Every series is computed deterministically from the existing slices —
// behavior events, monitoring events, interventions, closed trades, and
// the sessions log — filtered through the active timeframe.
//
// Each series is an array of `{ sessionId, tradingDate, value }` points,
// ordered chronologically. Charts render against the same x-axis ordering
// so multiple series can be compared visually if the page evolves to
// overlay them.
// =============================================================================

export type TrendPoint = {
  sessionId: string;
  tradingDate: string;
  startedAt: string;
  value: number;
};

export type TrendSeries = {
  id: string;
  label: string;
  points: TrendPoint[];
  // For the chart's axis hint — the median value is a steadier reference
  // than mean (resistant to one bad session blowing up the scale).
  median: number;
  // Direction the series is trending across the window — derived by
  // comparing the first-half average to the second-half average. Avoids
  // claiming a trend after a single point.
  direction: "improving" | "declining" | "stable" | "insufficient";
};

// Coarse "behavioral cost" weight per behavior event type. Used by the
// "Behavioral deterioration progression" series — a higher value means a
// session produced more deterioration. Mirrors the aggregator's pressure
// weights but at a coarser granularity (this is a trend signal, not a
// score).
const DETERIORATION_WEIGHT: Partial<Record<string, number>> = {
  [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED]: 4,
  [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION]: 4,
  [BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED]: 3,
  [BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED]: 3,
  [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED]: 3,
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: 3,
  [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: 2,
  [BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED]: 2,
  [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED]: 2,
  [BEHAVIOR_EVENT_TYPES.MISTAKE_MARKED]: 2,
  [BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED]: 1,
};

// -----------------------------------------------------------------------------
// Inputs — all the slices the engines below read from. Centralized so
// page composition only needs to pass them once.
// -----------------------------------------------------------------------------

export type AnalyticsSliceInputs = {
  sessions: TradingSession[];
  behaviorEvents: BehaviorEvent[];
  monitoringEvents: MonitoringEvent[];
  interventions: InterventionEvent[];
  closedTrades: ClosedTrade[];
  riskRules: RiskRules;
  liveSessionMetrics: SessionMetrics;
  activeSessionId: string | null;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function directionFor(points: TrendPoint[]): TrendSeries["direction"] {
  if (points.length < 4) return "insufficient";
  const mid = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, mid).map((p) => p.value);
  const secondHalf = points.slice(mid).map((p) => p.value);
  const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const a = avg(firstHalf);
  const b = avg(secondHalf);
  // Default semantics: higher value = WORSE behavior (more deterioration,
  // more overrides, etc.). Per-series consumers that have inverse
  // semantics (e.g., discipline score, where higher is better) override
  // by calling `invertDirection(direction)`.
  if (b > a * 1.15) return "declining";
  if (b < a * 0.85) return "improving";
  return "stable";
}

export function invertDirection(d: TrendSeries["direction"]): TrendSeries["direction"] {
  if (d === "improving") return "declining";
  if (d === "declining") return "improving";
  return d;
}

// Filters sessions to the timeframe window, sorted oldest-first.
export function sessionsInWindow(
  sessions: TradingSession[],
  timeframe: TimeframeDefinition,
  nowMs: number,
): TradingSession[] {
  return sessions
    .filter((s) => isWithinTimeframe(s.startedAt, timeframe, nowMs))
    .sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
}

function pointFor(session: TradingSession, value: number): TrendPoint {
  return {
    sessionId: session.sessionId,
    tradingDate: session.tradingDate,
    startedAt: session.startedAt,
    value,
  };
}

// -----------------------------------------------------------------------------
// Series builders. Each takes the inputs + timeframe + nowMs and returns
// a TrendSeries. Pure functions — no React, no I/O.
// -----------------------------------------------------------------------------

export function buildDisciplineSeries(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): TrendSeries {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const points: TrendPoint[] = windowed.map((session) => {
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

    // Detect patterns first (the aggregator depends on them for the
    // detection-floor rule).
    const detectionReading = computeBehavioralDetection({
      behaviorEvents: sessionEvents,
      monitoringEvents: sessionMonitoring,
      interventions: sessionInterventions,
      activeTrades: [],
      closedTrades: sessionTrades,
      riskRules: inputs.riskRules,
      sessionMetrics: inputs.liveSessionMetrics,
    });

    // For a closed session we sample at the session's last-event timestamp
    // so decay applies consistently; for the active session we use nowMs.
    const isLive = session.sessionId === inputs.activeSessionId;
    const sampleMs = isLive
      ? nowMs
      : session.endedAt
        ? new Date(session.endedAt).getTime()
        : nowMs;

    const aggregation = computeBehavioralStateAggregation({
      behaviorEvents: sessionEvents,
      monitoringEvents: sessionMonitoring,
      interventions: sessionInterventions,
      detections: detectionReading.detections,
      closedTrades: sessionTrades,
      sessionMetrics: inputs.liveSessionMetrics,
      riskRules: inputs.riskRules,
      nowMs: sampleMs,
    });

    return pointFor(session, aggregation.disciplineScore);
  });

  return {
    id: "discipline",
    label: "Discipline score",
    points,
    median: median(points.map((p) => p.value)),
    // Discipline = higher is better, so invert the default semantics.
    direction: invertDirection(directionFor(points)),
  };
}

function countEvents(
  events: BehaviorEvent[],
  predicate: (e: BehaviorEvent) => boolean,
): number {
  let n = 0;
  for (const e of events) if (predicate(e)) n += 1;
  return n;
}

function buildSimpleSeries(
  id: string,
  label: string,
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
  perSession: (
    sessionEvents: BehaviorEvent[],
    sessionInterventions: InterventionEvent[],
  ) => number,
): TrendSeries {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const points: TrendPoint[] = windowed.map((session) => {
    const sessionEvents = inputs.behaviorEvents.filter(
      (e) => e.sessionId === session.sessionId,
    );
    const sessionInterventions = inputs.interventions.filter(
      (e) => e.sessionId === session.sessionId,
    );
    return pointFor(session, perSession(sessionEvents, sessionInterventions));
  });
  return {
    id,
    label,
    points,
    median: median(points.map((p) => p.value)),
    direction: directionFor(points),
  };
}

export function buildWarningOverrideSeries(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): TrendSeries {
  return buildSimpleSeries(
    "warning_override",
    "Warning override frequency",
    inputs,
    timeframe,
    nowMs,
    (_events, ints) =>
      ints.filter((i) => i.decision === "continue_anyway").length,
  );
}

export function buildStopWideningSeries(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): TrendSeries {
  return buildSimpleSeries(
    "stop_widening",
    "Stop widening frequency",
    inputs,
    timeframe,
    nowMs,
    (events) =>
      countEvents(
        events,
        (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
      ),
  );
}

export function buildReentrySeries(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): TrendSeries {
  return buildSimpleSeries(
    "rapid_reentry",
    "Rapid re-entry frequency",
    inputs,
    timeframe,
    nowMs,
    (events) =>
      countEvents(
        events,
        (e) =>
          e.eventType === BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
      ),
  );
}

export function buildRiskEscalationSeries(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): TrendSeries {
  return buildSimpleSeries(
    "risk_escalation",
    "Risk escalation events",
    inputs,
    timeframe,
    nowMs,
    (events) =>
      countEvents(
        events,
        (e) =>
          e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
          e.eventType === BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
      ),
  );
}

export function buildInterventionFrequencySeries(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): TrendSeries {
  return buildSimpleSeries(
    "interventions",
    "Intervention frequency",
    inputs,
    timeframe,
    nowMs,
    (_events, ints) => ints.length,
  );
}

export function buildDeteriorationSeries(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): TrendSeries {
  return buildSimpleSeries(
    "deterioration",
    "Behavioral deterioration",
    inputs,
    timeframe,
    nowMs,
    (events) =>
      events.reduce(
        (sum, e) => sum + (DETERIORATION_WEIGHT[e.eventType] ?? 0),
        0,
      ),
  );
}

// -----------------------------------------------------------------------------
// Session state history — non-numeric series (one peak state per session).
// Renders as a heatmap rather than a line chart.
// -----------------------------------------------------------------------------

export type StatePoint = {
  sessionId: string;
  tradingDate: string;
  startedAt: string;
  peakState: BehavioralStateLabel;
};

export function buildStateHistory(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): StatePoint[] {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  return windowed.map((session) => {
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

    const detectionReading = computeBehavioralDetection({
      behaviorEvents: sessionEvents,
      monitoringEvents: sessionMonitoring,
      interventions: sessionInterventions,
      activeTrades: [],
      closedTrades: sessionTrades,
      riskRules: inputs.riskRules,
      sessionMetrics: inputs.liveSessionMetrics,
    });

    const isLive = session.sessionId === inputs.activeSessionId;
    const sampleMs = isLive
      ? nowMs
      : session.endedAt
        ? new Date(session.endedAt).getTime()
        : nowMs;

    const aggregation = computeBehavioralStateAggregation({
      behaviorEvents: sessionEvents,
      monitoringEvents: sessionMonitoring,
      interventions: sessionInterventions,
      detections: detectionReading.detections,
      closedTrades: sessionTrades,
      sessionMetrics: inputs.liveSessionMetrics,
      riskRules: inputs.riskRules,
      nowMs: sampleMs,
    });

    return {
      sessionId: session.sessionId,
      tradingDate: session.tradingDate,
      startedAt: session.startedAt,
      peakState: aggregation.state,
    };
  });
}
