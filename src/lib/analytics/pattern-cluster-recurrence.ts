import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  BEHAVIOR_CLUSTER_DESCRIPTION,
  BEHAVIOR_CLUSTER_LABEL,
  computeBehavioralDetection,
  type BehaviorCluster,
  type DetectionId,
  type DetectionSeverity,
} from "@/lib/detection/behavioral-detection-engine";

import { type TimeframeDefinition } from "@/lib/analytics/timeframe";
import {
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";

// =============================================================================
// Pattern Cluster Recurrence
// =============================================================================
//
// Aggregates the behavioral-detection-engine output across every session in
// the active timeframe and surfaces recurring clusters with:
//   - frequency (how many sessions exhibited the cluster)
//   - peak severity within the window
//   - most recent occurrence
//   - common sequence chain (the order events typically fired in)
//   - associated triggers (events that immediately preceded the cluster)
//
// Every claim is deterministic — built from observed event ordering, no
// inference, no AI.
// =============================================================================

export type ClusterChainStep = {
  eventType: string;
  // Human label for the dashboard. Derived from BEHAVIOR_EVENT_DISPLAY in
  // the calling code; we keep this string-only here to avoid pulling icon
  // dependencies into a pure-compute module.
  label: string;
};

export type ClusterRecurrence = {
  cluster: BehaviorCluster;
  label: string;
  description: string;
  severity: DetectionSeverity;
  // Sessions where 2+ detections in this cluster fired.
  sessionFrequency: number;
  // Total detection count across all sessions in the cluster.
  totalDetectionCount: number;
  // ISO timestamp of the most recent session in which the cluster fired.
  lastOccurredAt: string | null;
  // Detection ids that participated, sorted by total count desc.
  contributingDetectionIds: DetectionId[];
  // Most common sequence chain inside this cluster (longest observed run
  // of related event types, summarized).
  commonChain: ClusterChainStep[];
};

// Event types we treat as cluster-relevant "links in the chain" — used
// for the sequence chain summary.
const CLUSTER_EVENT_TYPES_BY_CLUSTER: Record<BehaviorCluster, string[]> = {
  emotional_escalation: [
    BEHAVIOR_EVENT_TYPES.TRADE_CLOSED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  ],
  rule_defiance: [
    BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
    BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
    BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  ],
  fatigue_overuse: [
    BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
    BEHAVIOR_EVENT_TYPES.TRADE_CLOSED,
    BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  ],
};

const SEVERITY_RANK: Record<DetectionSeverity, number> = {
  info: 0,
  caution: 1,
  warning: 2,
  critical: 3,
};

function severityFromRank(rank: number): DetectionSeverity {
  if (rank >= 3) return "critical";
  if (rank === 2) return "warning";
  if (rank === 1) return "caution";
  return "info";
}

// Human-readable labels for the chain step. Keeps the cluster compute
// pure but matches the dashboard's vocabulary.
const EVENT_LABEL: Record<string, string> = {
  [BEHAVIOR_EVENT_TYPES.TRADE_CLOSED]: "Trade closed",
  [BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED]: "Warning",
  [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED]: "Warning ignored",
  [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED]: "Override accepted",
  [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: "Size increased",
  [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION]: "Rapid re-entry",
  [BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED]: "Risk exposure up",
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: "Stop widened",
  [BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE]: "Trade marked active",
  [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED]: "Mistake logged",
};

// Find the most common contiguous chain (length ≥ 2) of cluster-relevant
// events that occurred within sessions exhibiting this cluster.
function findCommonChain(
  cluster: BehaviorCluster,
  inputs: AnalyticsSliceInputs,
  sessionIds: Set<string>,
): ClusterChainStep[] {
  const relevant = new Set(CLUSTER_EVENT_TYPES_BY_CLUSTER[cluster]);
  const chainCounts = new Map<string, number>();

  for (const sessionId of sessionIds) {
    const sessionEvents = inputs.behaviorEvents
      .filter((e) => e.sessionId === sessionId)
      .filter((e) => relevant.has(e.eventType))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    // Slide a window over the ordered sequence; record every 2- and 3-step
    // sub-chain so we can pick the most common.
    for (let i = 0; i < sessionEvents.length - 1; i += 1) {
      const a = sessionEvents[i].eventType;
      const b = sessionEvents[i + 1].eventType;
      const key2 = `${a}|${b}`;
      chainCounts.set(key2, (chainCounts.get(key2) ?? 0) + 1);
      if (i + 2 < sessionEvents.length) {
        const c = sessionEvents[i + 2].eventType;
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
    // Score = count × √length so 3-step ties beat 2-step ties.
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
// Public entry point
// -----------------------------------------------------------------------------

export function computeClusterRecurrence(
  inputs: AnalyticsSliceInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): ClusterRecurrence[] {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);

  // Per-cluster accumulators.
  type Accumulator = {
    sessionIds: Set<string>;
    totalCount: number;
    peakSeverityRank: number;
    lastOccurredAtMs: number;
    detectionCounts: Record<DetectionId, number>;
  };
  const init: Record<BehaviorCluster, Accumulator> = {
    emotional_escalation: {
      sessionIds: new Set(),
      totalCount: 0,
      peakSeverityRank: 0,
      lastOccurredAtMs: 0,
      detectionCounts: {
        revenge_trading: 0,
        position_size_escalation: 0,
        rapid_reentry: 0,
        stop_widening: 0,
        intervention_override: 0,
        overtrading: 0,
      },
    },
    rule_defiance: {
      sessionIds: new Set(),
      totalCount: 0,
      peakSeverityRank: 0,
      lastOccurredAtMs: 0,
      detectionCounts: {
        revenge_trading: 0,
        position_size_escalation: 0,
        rapid_reentry: 0,
        stop_widening: 0,
        intervention_override: 0,
        overtrading: 0,
      },
    },
    fatigue_overuse: {
      sessionIds: new Set(),
      totalCount: 0,
      peakSeverityRank: 0,
      lastOccurredAtMs: 0,
      detectionCounts: {
        revenge_trading: 0,
        position_size_escalation: 0,
        rapid_reentry: 0,
        stop_widening: 0,
        intervention_override: 0,
        overtrading: 0,
      },
    },
  };

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

    const detectionReading = computeBehavioralDetection({
      behaviorEvents: sessionEvents,
      monitoringEvents: sessionMonitoring,
      interventions: sessionInterventions,
      activeTrades: [],
      closedTrades: sessionTrades,
      riskRules: inputs.riskRules,
      sessionMetrics: inputs.liveSessionMetrics,
    });

    const startedAtMs = new Date(session.startedAt).getTime();
    for (const cluster of detectionReading.activeClusters) {
      const acc = init[cluster.cluster];
      acc.sessionIds.add(session.sessionId);
      acc.totalCount += cluster.detectionIds.length;
      acc.peakSeverityRank = Math.max(
        acc.peakSeverityRank,
        SEVERITY_RANK[cluster.dominantSeverity],
      );
      if (Number.isFinite(startedAtMs) && startedAtMs > acc.lastOccurredAtMs) {
        acc.lastOccurredAtMs = startedAtMs;
      }
      for (const id of cluster.detectionIds) {
        acc.detectionCounts[id] += 1;
      }
    }
  }

  const out: ClusterRecurrence[] = [];
  for (const cluster of Object.keys(init) as BehaviorCluster[]) {
    const acc = init[cluster];
    if (acc.sessionIds.size === 0) continue;
    const contributingDetectionIds = (
      Object.keys(acc.detectionCounts) as DetectionId[]
    )
      .filter((id) => acc.detectionCounts[id] > 0)
      .sort((a, b) => acc.detectionCounts[b] - acc.detectionCounts[a]);

    out.push({
      cluster,
      label: BEHAVIOR_CLUSTER_LABEL[cluster],
      description: BEHAVIOR_CLUSTER_DESCRIPTION[cluster],
      severity: severityFromRank(acc.peakSeverityRank),
      sessionFrequency: acc.sessionIds.size,
      totalDetectionCount: acc.totalCount,
      lastOccurredAt:
        acc.lastOccurredAtMs > 0
          ? new Date(acc.lastOccurredAtMs).toISOString()
          : null,
      contributingDetectionIds,
      commonChain: findCommonChain(cluster, inputs, acc.sessionIds),
    });
  }

  // Sort: severity desc, then frequency desc.
  out.sort((a, b) => {
    const sevDelta = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sevDelta !== 0) return sevDelta;
    return b.sessionFrequency - a.sessionFrequency;
  });
  return out;
}
