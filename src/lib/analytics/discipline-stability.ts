import { computeBehavioralDetection } from "@/lib/detection/behavioral-detection-engine";
import { computeBehavioralStateAggregation } from "@/lib/state/behavioral-state-aggregator";

import { type TimeframeDefinition } from "@/lib/analytics/timeframe";
import {
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";

// =============================================================================
// Discipline Stability Analysis
// =============================================================================
//
// A trader behaving well while winning is NOT equivalent to discipline
// under pressure. This file computes context-aware discipline metrics
// that weight pressure environments more heavily than calm sessions.
//
// Output:
//   * overallAdherenceRate           % of trades that closed clean (0
//                                    deviations + 0 mistakes)
//   * consistencyScore               0–100; higher = steadier discipline
//                                    across sessions (low CV)
//   * disciplineUnderDrawdown        avg discipline score across sessions
//                                    where at least one losing trade
//                                    closed
//   * disciplineAfterLosses          avg discipline score across sessions
//                                    where consecutive losses ≥ 2
//   * disciplineAfterWins            avg discipline score across sessions
//                                    where at least one winning trade
//                                    closed AND no losing trades
//   * disciplineDuringVolatility     avg discipline score across sessions
//                                    where deterioration event count was
//                                    elevated (top tercile)
// =============================================================================

export type DisciplineStability = {
  overallAdherenceRate: number;
  consistencyScore: number;
  disciplineUnderDrawdown: number | null;
  disciplineAfterLosses: number | null;
  disciplineAfterWins: number | null;
  disciplineDuringVolatility: number | null;
  // Sample sizes — UI can render "N sessions" to ground the numbers.
  sampleCounts: {
    overall: number;
    drawdown: number;
    afterLosses: number;
    afterWins: number;
    volatility: number;
  };
};

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function consistencyFromValues(values: number[]): number {
  if (values.length < 2) return values[0] ?? 100;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdev = Math.sqrt(variance);
  const cv = stdev / mean;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - Math.min(1, cv)))));
}

function topTercileThreshold(values: number[]): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length * 2) / 3);
  return sorted[idx] ?? 0;
}

export function computeDisciplineStability(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): DisciplineStability {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);

  // Per-session aggregates we'll need: discipline score, loss count,
  // win count, deterioration event count.
  type PerSession = {
    sessionId: string;
    discipline: number;
    lossCount: number;
    winCount: number;
    deteriorationEventCount: number;
    cleanTradeCount: number;
    totalClosedTrades: number;
  };

  const perSession: PerSession[] = [];

  for (const session of windowed) {
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

    const detection = computeBehavioralDetection({
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
      detections: detection.detections,
      closedTrades: sessionTrades,
      sessionMetrics: inputs.liveSessionMetrics,
      riskRules: inputs.riskRules,
      nowMs: sampleMs,
    });

    const lossCount = sessionTrades.filter((t) => t.outcome === "loss").length;
    const winCount = sessionTrades.filter((t) => t.outcome === "win").length;
    const cleanTradeCount = sessionTrades.filter(
      (t) => t.deviationCount === 0 && t.mistakeCount === 0,
    ).length;
    const deteriorationEventCount = sessionEvents.filter(
      (e) =>
        e.severity === "fail" ||
        e.eventType === "stop_moved_further" ||
        e.eventType === "warning_ignored" ||
        e.eventType === "position_size_increased",
    ).length;

    perSession.push({
      sessionId: session.sessionId,
      discipline: aggregation.disciplineScore,
      lossCount,
      winCount,
      deteriorationEventCount,
      cleanTradeCount,
      totalClosedTrades: sessionTrades.length,
    });
  }

  // Overall adherence — fraction of all closed trades that were clean.
  const totalTrades = perSession.reduce(
    (s, p) => s + p.totalClosedTrades,
    0,
  );
  const totalClean = perSession.reduce((s, p) => s + p.cleanTradeCount, 0);
  const overallAdherenceRate =
    totalTrades === 0
      ? 100
      : Math.round((totalClean / totalTrades) * 1000) / 10;

  // Consistency = how steady the discipline score is across sessions.
  const consistencyScore = consistencyFromValues(
    perSession.map((p) => p.discipline),
  );

  // Slice the sample set into context-aware buckets.
  const drawdownBucket = perSession.filter((p) => p.lossCount >= 1);
  const afterLossesBucket = perSession.filter((p) => p.lossCount >= 2);
  const afterWinsBucket = perSession.filter(
    (p) => p.winCount >= 1 && p.lossCount === 0,
  );
  const deteriorationCounts = perSession.map((p) => p.deteriorationEventCount);
  const volatilityThreshold = topTercileThreshold(deteriorationCounts);
  const volatilityBucket = perSession.filter(
    (p) => p.deteriorationEventCount >= volatilityThreshold && volatilityThreshold > 0,
  );

  return {
    overallAdherenceRate,
    consistencyScore,
    disciplineUnderDrawdown: avg(drawdownBucket.map((p) => p.discipline)),
    disciplineAfterLosses: avg(afterLossesBucket.map((p) => p.discipline)),
    disciplineAfterWins: avg(afterWinsBucket.map((p) => p.discipline)),
    disciplineDuringVolatility: avg(volatilityBucket.map((p) => p.discipline)),
    sampleCounts: {
      overall: perSession.length,
      drawdown: drawdownBucket.length,
      afterLosses: afterLossesBucket.length,
      afterWins: afterWinsBucket.length,
      volatility: volatilityBucket.length,
    },
  };
}
