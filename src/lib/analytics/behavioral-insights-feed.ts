import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  confidenceFromSampleSize,
  type ConfidenceLevel,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import {
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";

// =============================================================================
// Behavioral Insights Feed
// =============================================================================
//
// Generates deterministic, rule-based observations about the trader's
// behavior across the active timeframe. Every insight has a CONDITION,
// a CONFIDENCE level, and a SUPPORTING COUNT — so the trader can trace
// the claim back to literal events, not AI inference.
//
// Each insight is a one-line observation. Tone is clinical — describes
// what the data shows, not what the trader should feel.
// =============================================================================

export const INSIGHT_SEVERITIES = [
  "info",
  "caution",
  "warning",
  "critical",
] as const;
export type InsightSeverity = (typeof INSIGHT_SEVERITIES)[number];

export type BehavioralInsight = {
  id: string;
  headline: string;
  // Trace string — describes the literal rule condition that fired.
  // Surfaced in a smaller font under the headline so the trader can
  // verify the claim.
  trace: string;
  severity: InsightSeverity;
  confidence: ConfidenceLevel;
  supportingCount: number;
};

// -----------------------------------------------------------------------------
// Insight generators
//
// Each generator returns either an insight or null (when no observable
// condition exists). They take the timeframe-windowed events + sessions
// so the signals only count current-timeframe activity.
// -----------------------------------------------------------------------------

function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

export function computeInsightsFeed(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): BehavioralInsight[] {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const sessionIds = new Set(windowed.map((s) => s.sessionId));
  const sessionCount = windowed.length;
  const confidence = confidenceFromSampleSize(sessionCount, timeframe);

  const behaviorEvents = inputs.behaviorEvents.filter((e) =>
    sessionIds.has(e.sessionId ?? ""),
  );
  const interventions = inputs.interventions.filter((i) =>
    sessionIds.has(i.sessionId ?? ""),
  );
  const closedTrades = inputs.closedTrades.filter((t) =>
    sessionIds.has(t.sessionId ?? ""),
  );

  const insights: BehavioralInsight[] = [];

  // -- 1. Stop widening primarily after red trades?
  const stopWidenings = behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  );
  if (stopWidenings.length >= 2) {
    const lossTimes = closedTrades
      .filter((t) => t.outcome === "loss")
      .map((t) => new Date(t.closedAt).getTime())
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b);
    let afterLoss = 0;
    for (const widen of stopWidenings) {
      const widenT = new Date(widen.timestamp).getTime();
      // Counted as "after a loss" if there's a loss within the last 60 min.
      const withinHour = lossTimes.some(
        (lt) => widenT > lt && (widenT - lt) / 60_000 <= 60,
      );
      if (withinHour) afterLoss += 1;
    }
    const rate = pct(afterLoss, stopWidenings.length);
    if (rate >= 60) {
      insights.push({
        id: "stop_widening_post_loss",
        headline: "Stop widening appears primarily after losing trades.",
        trace: `${afterLoss} of ${stopWidenings.length} stop widening events landed within 60 min of a losing close (${rate}%).`,
        severity: "warning",
        confidence,
        supportingCount: afterLoss,
      });
    }
  }

  // -- 2. Behavior stable during first 2 trades of each session?
  const activations = behaviorEvents
    .filter((e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  const earlyTradesBySession = new Map<string, number>();
  const earlyDeteriorationBySession = new Map<string, number>();
  for (const e of activations) {
    if (!e.sessionId) continue;
    const idx = (earlyTradesBySession.get(e.sessionId) ?? 0) + 1;
    earlyTradesBySession.set(e.sessionId, idx);
    if (idx <= 2) {
      const tT = new Date(e.timestamp).getTime();
      const deteriorationFollowed = behaviorEvents.some(
        (d) =>
          d.sessionId === e.sessionId &&
          (d.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
            d.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER ||
            d.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED) &&
          new Date(d.timestamp).getTime() >= tT &&
          new Date(d.timestamp).getTime() - tT <= 30 * 60_000,
      );
      if (deteriorationFollowed) {
        earlyDeteriorationBySession.set(
          e.sessionId,
          (earlyDeteriorationBySession.get(e.sessionId) ?? 0) + 1,
        );
      }
    }
  }
  const earlyTradeSessions = Array.from(earlyTradesBySession.keys()).length;
  const earlyDeteriorationSessions = Array.from(
    earlyDeteriorationBySession.keys(),
  ).length;
  if (earlyTradeSessions >= 3) {
    const cleanRate = pct(
      earlyTradeSessions - earlyDeteriorationSessions,
      earlyTradeSessions,
    );
    if (cleanRate >= 75) {
      insights.push({
        id: "early_session_stable",
        headline: "Behavior remains stable during the first 2 trades.",
        trace: `${earlyTradeSessions - earlyDeteriorationSessions} of ${earlyTradeSessions} sessions produced no deterioration within 30 min of the first two activations (${cleanRate}%).`,
        severity: "info",
        confidence,
        supportingCount: earlyTradeSessions - earlyDeteriorationSessions,
      });
    } else if (cleanRate <= 40) {
      insights.push({
        id: "early_session_unstable",
        headline:
          "Discipline drift is common — patterns appear within the first two trades.",
        trace: `${earlyDeteriorationSessions} of ${earlyTradeSessions} sessions produced deterioration within 30 min of the first two activations (${100 - cleanRate}%).`,
        severity: "warning",
        confidence,
        supportingCount: earlyDeteriorationSessions,
      });
    }
  }

  // -- 3. Risk escalation following warning overrides
  const overrides = interventions.filter(
    (i) => i.decision === "continue_anyway",
  );
  if (overrides.length >= 2) {
    let escalatedAfter = 0;
    for (const o of overrides) {
      const t = new Date(o.timestamp).getTime();
      const escalated = behaviorEvents.some(
        (e) =>
          (e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
            e.eventType === BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED) &&
          new Date(e.timestamp).getTime() >= t &&
          new Date(e.timestamp).getTime() - t <= 30 * 60_000,
      );
      if (escalated) escalatedAfter += 1;
    }
    const rate = pct(escalatedAfter, overrides.length);
    if (rate >= 50) {
      insights.push({
        id: "risk_escalation_after_overrides",
        headline: "Risk escalation occurs most often after warning overrides.",
        trace: `${escalatedAfter} of ${overrides.length} overrides were followed by a position size or risk-exposure increase within 30 min (${rate}%).`,
        severity: "warning",
        confidence,
        supportingCount: escalatedAfter,
      });
    }
  }

  // -- 4. Discipline deteriorates during rapid pacing
  // Approximation: count sessions where the median minutes-between-trades is
  // under 5 AND deterioration events occurred. Compare to sessions with
  // slower pacing.
  type Pacing = {
    sessionId: string;
    avgGapMin: number;
    deteriorationEvents: number;
  };
  const pacingPerSession: Pacing[] = [];
  for (const sessionId of sessionIds) {
    const sessionActivations = activations.filter(
      (e) => e.sessionId === sessionId,
    );
    if (sessionActivations.length < 3) continue;
    const times = sessionActivations.map((e) =>
      new Date(e.timestamp).getTime(),
    );
    const first = times[0];
    const last = times[times.length - 1];
    const avgGapMin = (last - first) / 60_000 / (times.length - 1);
    const deteriorationEvents = behaviorEvents.filter(
      (e) =>
        e.sessionId === sessionId &&
        (e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
          e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER ||
          e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED),
    ).length;
    pacingPerSession.push({ sessionId, avgGapMin, deteriorationEvents });
  }
  if (pacingPerSession.length >= 4) {
    const fast = pacingPerSession.filter((p) => p.avgGapMin < 5);
    const slow = pacingPerSession.filter((p) => p.avgGapMin >= 10);
    if (fast.length >= 2 && slow.length >= 2) {
      const fastDet =
        fast.reduce((s, p) => s + p.deteriorationEvents, 0) / fast.length;
      const slowDet =
        slow.reduce((s, p) => s + p.deteriorationEvents, 0) / slow.length;
      if (fastDet >= slowDet * 1.5 && fastDet >= 1) {
        insights.push({
          id: "pacing_discipline",
          headline:
            "Discipline deteriorates during rapid trade pacing.",
          trace: `Fast-paced sessions (avg gap < 5 min) averaged ${fastDet.toFixed(1)} deterioration events vs ${slowDet.toFixed(1)} for slower sessions.`,
          severity: "caution",
          confidence,
          supportingCount: fast.length,
        });
      }
    }
  }

  // -- 5. Most overrides happen late in session (post 60-min mark)
  if (overrides.length >= 3) {
    let late = 0;
    for (const o of overrides) {
      const sessionStart = windowed.find(
        (s) => s.sessionId === o.sessionId,
      )?.startedAt;
      if (!sessionStart) continue;
      const elapsed =
        (new Date(o.timestamp).getTime() -
          new Date(sessionStart).getTime()) /
        60_000;
      if (elapsed >= 60) late += 1;
    }
    const rate = pct(late, overrides.length);
    if (rate >= 60) {
      insights.push({
        id: "late_session_overrides",
        headline:
          "Warning overrides cluster late in session, past the 60-minute mark.",
        trace: `${late} of ${overrides.length} overrides occurred at or after 60 min into the session (${rate}%).`,
        severity: "caution",
        confidence,
        supportingCount: late,
      });
    }
  }

  // -- 6. Clean approval streak — positive signal worth surfacing
  const cleanApprovals = behaviorEvents.filter(
    (e) => e.decision === "approved",
  ).length;
  const cancelDecisions = interventions.filter(
    (i) => i.decision === "cancel_trade",
  ).length;
  if (cleanApprovals >= 10 && cleanApprovals > overrides.length * 3) {
    insights.push({
      id: "clean_approval_streak",
      headline:
        "Trade checks are mostly resolving cleanly without intervention.",
      trace: `${cleanApprovals} clean approvals vs ${overrides.length} overrides and ${cancelDecisions} cancels in this window.`,
      severity: "info",
      confidence,
      supportingCount: cleanApprovals,
    });
  }

  // Sort: critical > warning > caution > info, then supportingCount desc.
  const SEVERITY_RANK: Record<InsightSeverity, number> = {
    info: 0,
    caution: 1,
    warning: 2,
    critical: 3,
  };
  insights.sort((a, b) => {
    const sevDelta = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sevDelta !== 0) return sevDelta;
    return b.supportingCount - a.supportingCount;
  });
  return insights;
}
