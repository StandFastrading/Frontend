import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
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
import type {
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  MonitoringEvent,
} from "@/types";

// =============================================================================
// Intervention Outcome Tracking + Estimated Risk Avoided
// =============================================================================
//
// PURPOSE
//   Quantify what *behavioral* damage may have been avoided because the
//   trader listened to the system. The output is intentionally cautious:
//
//     * dollar figures are PLANNED exposure — what the trader was about
//       to put at risk — not realized P/L, not modeled "profit prevented",
//       and not a promise of money saved.
//     * percent figures are derived from observed before/after risk on
//       revisions where both readings are present. Records missing either
//       reading are excluded rather than guessed.
//     * confidence scales with sample size (per `timeframe`) so the
//       Analytics surface never speaks with certainty after a single
//       session.
//
// THE THREE TRACKED OUTCOMES
//   1. CANCELED       trader fully abandoned the trade after the rule
//                     check. Estimated risk avoided = the planned `totalRisk`
//                     captured on the InterventionEvent at decision time.
//   2. REVISED        trader changed the trade after intervention. Paired
//                     against the next decision/approval inside the same
//                     session; risk reduction = original - revised when
//                     revised < original. Records where the trader revised
//                     and then *increased* risk are not counted as "avoided".
//   3. CONTINUE       trader overrode the warning. Tracked alongside what
//      ANYWAY         happened next inside `WINDOW_MIN`:
//                       * deteriorationFollowed — any destructive event
//                       * escalationFollowed   — high-severity monitoring
//                                                event or a losing close
//
// AI-READY STRUCTURE
//   Every record carries sessionId, tradeId (when available), traderId,
//   interventionType, originalRisk, revisedRisk, timestamp, and the
//   resulting behavior signals. A future retrieval layer can pattern-match
//   ("show me all revisions where account exposure dropped > 30%") without
//   re-deriving anything.
//
// FUTURE BROKER HISTORY
//   `InterventionOutcomesInputs` accepts an optional `historicalBaselines`
//   slot. When broker history is wired up, we can pass average loss after
//   stop widening / averaging down / etc., and the engine can refine the
//   risk-avoided estimate. The slot is unused in V1 but the type is the
//   contract the future layer plugs into.
// =============================================================================

// Window inside which a post-decision destructive/escalating event still
// counts as "the override caused this". 30 min matches the existing
// intervention-effectiveness engine so the two readings stay coherent.
export const OVERRIDE_OUTCOME_WINDOW_MIN = 30;

const DESTRUCTIVE_EVENT_TYPES = new Set<string>([
  BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
  BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
  BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  BEHAVIOR_EVENT_TYPES.MISTAKE_MARKED,
]);

// -----------------------------------------------------------------------------
// Public types — AI-retrieval-shaped
// -----------------------------------------------------------------------------

export type InterventionOutcomeKind = "cancel" | "revise" | "continue_anyway";

export type ResultingBehaviorState =
  | "deteriorated"
  | "stabilized"
  | "neutral";

// Optional shape the future broker-integration layer can populate. Left
// here as a typed contract — V1 ignores it. When historical broker data
// arrives the engine can blend it into the risk-avoided estimate.
export type HistoricalBaselines = {
  // Average realized $ loss per losing trade after a stop widening event.
  avgLossAfterStopWideningUSD?: number;
  // Average realized $ loss per losing trade after a continue_anyway.
  avgLossAfterOverrideUSD?: number;
  // Average realized $ loss per losing trade after averaging down.
  avgLossAfterAveragingDownUSD?: number;
  // Average severity escalation step (0-3) after an override decision.
  avgEscalationSeverityAfterOverride?: number;
};

export type InterventionOutcomesInputs = AnalyticsSliceInputs & {
  // Stable trader identifier — stamped on every emitted record so a
  // future per-trader retrieval layer can scope cleanly.
  traderId: string;
  // Future broker-history hook. Unused in V1; populate when broker
  // history becomes available to refine $-avoided estimates.
  historicalBaselines?: HistoricalBaselines | null;
};

export type CanceledTradeRecord = {
  recordType: "canceled";
  interventionId: string;
  traderId: string;
  sessionId: string | null;
  tradeId: null; // No trade was ever created — the cancel happened pre-activation.
  tradingDate: string | null;
  timestamp: string;
  symbol: string | null;
  setupType: string | null;
  marketType: string | null;
  // Planned exposure the trader was about to take on. NOT realized loss.
  plannedRiskUSD: number | null;
  plannedAccountRiskPercent: number | null;
  triggeredRuleIds: string[];
  // Future broker layer can fill these. V1 emits null.
  resultingBehaviorState: ResultingBehaviorState;
  deteriorationFollowed: false;
  escalationFollowed: false;
};

export type RevisedTradeRecord = {
  recordType: "revised";
  interventionId: string;
  traderId: string;
  sessionId: string | null;
  tradeId: string | null;
  tradingDate: string | null;
  timestamp: string;
  symbol: string | null;
  setupType: string | null;
  marketType: string | null;
  // Risk on the revise intervention.
  originalRiskUSD: number | null;
  originalAccountRiskPercent: number | null;
  // Risk on the next decision / approval inside the same session.
  revisedRiskUSD: number | null;
  revisedAccountRiskPercent: number | null;
  // Positive when revised < original.
  riskReductionUSD: number | null;
  riskReductionPercent: number | null;
  // Human-readable signals describing what changed. Derived only when
  // both source records carry the underlying field so we never invent.
  changes: string[];
  resultingBehaviorState: ResultingBehaviorState;
  deteriorationFollowed: boolean;
  escalationFollowed: boolean;
};

export type ContinueAnywayRecord = {
  recordType: "continue_anyway";
  interventionId: string;
  traderId: string;
  sessionId: string | null;
  tradeId: string | null;
  tradingDate: string | null;
  timestamp: string;
  symbol: string | null;
  setupType: string | null;
  marketType: string | null;
  // Warnings the trader chose to bypass.
  triggeredRuleIds: string[];
  // Inside OVERRIDE_OUTCOME_WINDOW_MIN of the override timestamp.
  deteriorationFollowed: boolean;
  escalationFollowed: boolean;
  resultingBehaviorState: ResultingBehaviorState;
};

export type InterventionOutcomeRecord =
  | CanceledTradeRecord
  | RevisedTradeRecord
  | ContinueAnywayRecord;

// Tone for the qualitative "Behavioral Response Quality" card. Derived
// from the cancel/revise mix vs. override-deterioration ratio so the
// wording stays grounded in observed events.
export type ResponseQualityTone =
  | "insufficient"
  | "improving"
  | "mixed"
  | "deteriorating";

export type InterventionOutcomeSummary = {
  traderId: string;
  timeframeId: string;
  timeframeLabel: string;
  windowSessionCount: number;

  canceledTradeCount: number;
  revisedTradeCount: number;
  continueAnywayCount: number;

  // Estimated PLANNED exposure avoided. Not realized loss; not profit
  // prevented. Sum of:
  //   * plannedRiskUSD on cancels
  //   * riskReductionUSD on revisions where revised < original
  estimatedRiskAvoidedUSD: number;
  estimatedRiskAvoidedFromCancelsUSD: number;
  estimatedRiskAvoidedFromRevisionsUSD: number;

  // Average % reduction across revisions where both readings are known.
  // Zero when no qualifying revisions exist (consumer should hide the
  // value rather than rendering "0% reduction").
  averageRiskReductionPercent: number;
  qualifyingRevisionCount: number;

  // % of continue_anyway records where deterioration OR escalation
  // followed inside the window.
  overrideConsequenceRate: number;

  // Sample-size awareness. Drives the user-facing certainty wording.
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  confidenceCopy: string;

  responseQuality: ResponseQualityTone;
  responseQualityCopy: string;

  // Underlying records — AI-retrieval surface.
  canceledTrades: CanceledTradeRecord[];
  revisedTrades: RevisedTradeRecord[];
  continueAnywayOutcomes: ContinueAnywayRecord[];
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function withinMinutes(fromIso: string, toIso: string, mins: number): boolean {
  const f = new Date(fromIso).getTime();
  const t = new Date(toIso).getTime();
  if (!Number.isFinite(f) || !Number.isFinite(t)) return false;
  if (t < f) return false;
  return (t - f) / 60_000 <= mins;
}

function symbolOf(i: InterventionEvent): string | null {
  return i.symbol ?? i.tradeContext?.symbol ?? null;
}

function setupOf(i: InterventionEvent): string | null {
  return i.setupType ?? i.tradeContext?.setupType ?? null;
}

function marketOf(i: InterventionEvent): string | null {
  return i.marketType ?? null;
}

function triggeredRuleIdsOf(i: InterventionEvent): string[] {
  return i.triggeredRules.map((r) => r.id);
}

// -----------------------------------------------------------------------------
// Revise-pair detection — finds the "after" reading for a revise decision
// inside the same session.
//
// The trader's flow after picking Revise:
//   1. The intervention modal closes.
//   2. The form re-opens; the trader edits inputs.
//   3. Trader hits Check Trade again.
//      → Either a new intervention modal opens (we get a fresh
//        InterventionEvent), OR the trade is approved (we get a
//        TRADE_APPROVED behavior event with totalRisk + accountRiskPercent).
//
// We pair the revise to whichever of those lands first in the same
// session. If neither exists (the session ended without a follow-up),
// the revise still counts as a record but originalRisk/revisedRisk
// reductions are nulled out so they can't be misread.
// -----------------------------------------------------------------------------

type ReviseFollowUp = {
  timestamp: string;
  totalRisk: number | null;
  accountRiskPercent: number | null;
  // Optional structural info — only present when the follow-up is itself
  // a fresh InterventionEvent. The follow-up TRADE_APPROVED behavior
  // event lacks per-field price/size details.
  positionSize: number | null;
  rewardRiskRatio: number | null;
};

function findReviseFollowUp(
  revise: InterventionEvent,
  laterInterventions: InterventionEvent[],
  laterApprovals: BehaviorEvent[],
): ReviseFollowUp | null {
  const reviseMs = new Date(revise.timestamp).getTime();
  if (!Number.isFinite(reviseMs)) return null;

  const candidates: ReviseFollowUp[] = [];
  for (const i of laterInterventions) {
    if (i.sessionId !== revise.sessionId) continue;
    if (i.id === revise.id) continue;
    const t = new Date(i.timestamp).getTime();
    if (!Number.isFinite(t) || t <= reviseMs) continue;
    candidates.push({
      timestamp: i.timestamp,
      totalRisk: i.totalRisk ?? null,
      accountRiskPercent: i.accountRiskPercent ?? null,
      positionSize: i.positionSize ?? null,
      rewardRiskRatio: i.rewardRiskRatio ?? null,
    });
  }
  for (const e of laterApprovals) {
    if (e.sessionId !== revise.sessionId) continue;
    const t = new Date(e.timestamp).getTime();
    if (!Number.isFinite(t) || t <= reviseMs) continue;
    candidates.push({
      timestamp: e.timestamp,
      totalRisk: e.totalRisk ?? null,
      accountRiskPercent: e.accountRiskPercent ?? null,
      positionSize: null,
      rewardRiskRatio: null,
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  return candidates[0];
}

function describeChanges(
  original: InterventionEvent,
  followUp: ReviseFollowUp,
): string[] {
  const out: string[] = [];
  // Size reduction.
  if (
    original.positionSize != null &&
    followUp.positionSize != null &&
    followUp.positionSize < original.positionSize
  ) {
    out.push("Reduced size");
  }
  // Reward:risk improvement.
  if (
    original.rewardRiskRatio != null &&
    followUp.rewardRiskRatio != null &&
    followUp.rewardRiskRatio > original.rewardRiskRatio
  ) {
    out.push("Improved reward:risk");
  }
  // Account exposure reduction.
  if (
    original.accountRiskPercent != null &&
    followUp.accountRiskPercent != null &&
    followUp.accountRiskPercent < original.accountRiskPercent
  ) {
    out.push("Reduced account exposure");
  }
  // Total risk reduction (catch-all).
  if (
    original.totalRisk != null &&
    followUp.totalRisk != null &&
    followUp.totalRisk < original.totalRisk &&
    out.length === 0
  ) {
    out.push("Reduced planned risk");
  }
  return out;
}

// -----------------------------------------------------------------------------
// Post-decision outcome — destructive event within window?
// -----------------------------------------------------------------------------

function deteriorationAfter(
  decisionIso: string,
  sessionId: string | undefined,
  behaviorEvents: BehaviorEvent[],
): boolean {
  if (!sessionId) return false;
  return behaviorEvents.some(
    (e) =>
      e.sessionId === sessionId &&
      DESTRUCTIVE_EVENT_TYPES.has(e.eventType) &&
      withinMinutes(decisionIso, e.timestamp, OVERRIDE_OUTCOME_WINDOW_MIN),
  );
}

function escalationAfter(
  decisionIso: string,
  sessionId: string | undefined,
  monitoringEvents: MonitoringEvent[],
  closedTrades: ClosedTrade[],
): boolean {
  if (!sessionId) return false;
  const monitoringEscalated = monitoringEvents.some(
    (e) =>
      e.sessionId === sessionId &&
      (e.severity === "elevated" || e.severity === "critical") &&
      withinMinutes(decisionIso, e.timestamp, OVERRIDE_OUTCOME_WINDOW_MIN),
  );
  if (monitoringEscalated) return true;
  // A losing close inside the window is also an escalation outcome — the
  // override didn't just risk discipline, it transitioned to a realized
  // negative outcome.
  return closedTrades.some(
    (t) =>
      t.sessionId === sessionId &&
      t.outcome === "loss" &&
      withinMinutes(decisionIso, t.closedAt, OVERRIDE_OUTCOME_WINDOW_MIN),
  );
}

function resultingState(
  deteriorationFollowed: boolean,
  escalationFollowed: boolean,
): ResultingBehaviorState {
  if (escalationFollowed) return "deteriorated";
  if (deteriorationFollowed) return "deteriorated";
  return "stabilized";
}

// -----------------------------------------------------------------------------
// Response quality + confidence copy
// -----------------------------------------------------------------------------

function deriveResponseQuality(
  cancels: number,
  revisesWithReduction: number,
  overrides: number,
  overrideConsequenceRate: number,
): ResponseQualityTone {
  const positive = cancels + revisesWithReduction;
  const total = positive + overrides;
  if (total < 3) return "insufficient";
  // "Improving" when >60% of resolved interventions led to risk-down
  // outcomes and override consequence rate is < 60%.
  if (positive / total >= 0.6 && overrideConsequenceRate < 60) {
    return "improving";
  }
  // "Deteriorating" when overrides dominate and most led to bad outcomes.
  if (overrides / total >= 0.6 && overrideConsequenceRate >= 60) {
    return "deteriorating";
  }
  return "mixed";
}

const RESPONSE_QUALITY_COPY: Record<ResponseQualityTone, string> = {
  insufficient: "Not enough intervention data yet to characterize response quality.",
  improving:
    "Most interventions resulted in improved discipline before activation.",
  mixed:
    "Interventions show mixed responses — discipline improved on some, deteriorated on others.",
  deteriorating:
    "Most warnings were overridden and discipline deteriorated afterwards.",
};

function deriveConfidenceCopy(
  confidence: ConfidenceLevel,
  sessionsAffected: number,
): string {
  switch (confidence) {
    case "insufficient":
      return "Emerging estimate — not enough sessions in this window yet.";
    case "emerging":
      return "Emerging estimate — based on a small sample so far.";
    case "moderate":
      return `Modeled from ${sessionsAffected} session${sessionsAffected === 1 ? "" : "s"} in this window.`;
    case "high":
      return `Modeled from ${sessionsAffected} historical sessions.`;
  }
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeInterventionOutcomes(
  inputs: InterventionOutcomesInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): InterventionOutcomeSummary {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const windowedSessionIds = new Set(windowed.map((s) => s.sessionId));

  const windowInterventions = inputs.interventions.filter((i) =>
    windowedSessionIds.has(i.sessionId ?? ""),
  );
  const windowBehaviorEvents = inputs.behaviorEvents.filter((e) =>
    windowedSessionIds.has(e.sessionId ?? ""),
  );
  const windowMonitoringEvents = inputs.monitoringEvents.filter((e) =>
    windowedSessionIds.has(e.sessionId ?? ""),
  );
  const windowClosedTrades = inputs.closedTrades.filter((t) =>
    windowedSessionIds.has(t.sessionId ?? ""),
  );

  const tradeApprovalEvents = windowBehaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_APPROVED,
  );

  // -- Canceled ---------------------------------------------------------------
  const canceledTrades: CanceledTradeRecord[] = windowInterventions
    .filter((i) => i.decision === "cancel_trade")
    .map<CanceledTradeRecord>((i) => ({
      recordType: "canceled",
      interventionId: i.id,
      traderId: inputs.traderId,
      sessionId: i.sessionId ?? null,
      tradeId: null,
      tradingDate: i.tradingDate ?? null,
      timestamp: i.timestamp,
      symbol: symbolOf(i),
      setupType: setupOf(i),
      marketType: marketOf(i),
      plannedRiskUSD: i.totalRisk ?? null,
      plannedAccountRiskPercent: i.accountRiskPercent ?? null,
      triggeredRuleIds: triggeredRuleIdsOf(i),
      resultingBehaviorState: "neutral",
      deteriorationFollowed: false,
      escalationFollowed: false,
    }));

  // -- Revised ----------------------------------------------------------------
  const revisedTrades: RevisedTradeRecord[] = windowInterventions
    .filter((i) => i.decision === "revise_trade")
    .map<RevisedTradeRecord>((revise) => {
      const followUp = findReviseFollowUp(
        revise,
        windowInterventions,
        tradeApprovalEvents,
      );
      const originalRiskUSD = revise.totalRisk ?? null;
      const originalAccountRiskPercent = revise.accountRiskPercent ?? null;
      const revisedRiskUSD = followUp?.totalRisk ?? null;
      const revisedAccountRiskPercent = followUp?.accountRiskPercent ?? null;

      let riskReductionUSD: number | null = null;
      let riskReductionPercent: number | null = null;
      if (
        originalRiskUSD != null &&
        revisedRiskUSD != null &&
        revisedRiskUSD < originalRiskUSD
      ) {
        riskReductionUSD = originalRiskUSD - revisedRiskUSD;
        riskReductionPercent =
          originalRiskUSD > 0
            ? Math.round((riskReductionUSD / originalRiskUSD) * 1000) / 10
            : null;
      }
      const changes = followUp ? describeChanges(revise, followUp) : [];
      const deteriorationFollowed = deteriorationAfter(
        revise.timestamp,
        revise.sessionId,
        windowBehaviorEvents,
      );
      const escalationFollowed = escalationAfter(
        revise.timestamp,
        revise.sessionId,
        windowMonitoringEvents,
        windowClosedTrades,
      );
      return {
        recordType: "revised",
        interventionId: revise.id,
        traderId: inputs.traderId,
        sessionId: revise.sessionId ?? null,
        tradeId: null,
        tradingDate: revise.tradingDate ?? null,
        timestamp: revise.timestamp,
        symbol: symbolOf(revise),
        setupType: setupOf(revise),
        marketType: marketOf(revise),
        originalRiskUSD,
        originalAccountRiskPercent,
        revisedRiskUSD,
        revisedAccountRiskPercent,
        riskReductionUSD,
        riskReductionPercent,
        changes,
        resultingBehaviorState: resultingState(
          deteriorationFollowed,
          escalationFollowed,
        ),
        deteriorationFollowed,
        escalationFollowed,
      };
    });

  // -- Continue Anyway --------------------------------------------------------
  const continueAnywayOutcomes: ContinueAnywayRecord[] = windowInterventions
    .filter((i) => i.decision === "continue_anyway")
    .map<ContinueAnywayRecord>((i) => {
      const deteriorationFollowed = deteriorationAfter(
        i.timestamp,
        i.sessionId,
        windowBehaviorEvents,
      );
      const escalationFollowed = escalationAfter(
        i.timestamp,
        i.sessionId,
        windowMonitoringEvents,
        windowClosedTrades,
      );
      return {
        recordType: "continue_anyway",
        interventionId: i.id,
        traderId: inputs.traderId,
        sessionId: i.sessionId ?? null,
        tradeId: null,
        tradingDate: i.tradingDate ?? null,
        timestamp: i.timestamp,
        symbol: symbolOf(i),
        setupType: setupOf(i),
        marketType: marketOf(i),
        triggeredRuleIds: triggeredRuleIdsOf(i),
        deteriorationFollowed,
        escalationFollowed,
        resultingBehaviorState: resultingState(
          deteriorationFollowed,
          escalationFollowed,
        ),
      };
    });

  // -- Aggregates -------------------------------------------------------------
  const estimatedRiskAvoidedFromCancelsUSD = canceledTrades.reduce(
    (sum, r) => sum + (r.plannedRiskUSD ?? 0),
    0,
  );
  const estimatedRiskAvoidedFromRevisionsUSD = revisedTrades.reduce(
    (sum, r) => sum + (r.riskReductionUSD ?? 0),
    0,
  );
  const estimatedRiskAvoidedUSD =
    estimatedRiskAvoidedFromCancelsUSD + estimatedRiskAvoidedFromRevisionsUSD;

  const qualifyingRevisions = revisedTrades.filter(
    (r) => r.riskReductionPercent != null,
  );
  const averageRiskReductionPercent =
    qualifyingRevisions.length > 0
      ? Math.round(
          qualifyingRevisions.reduce(
            (sum, r) => sum + (r.riskReductionPercent ?? 0),
            0,
          ) / qualifyingRevisions.length,
        )
      : 0;

  const overrideConsequenceCount = continueAnywayOutcomes.filter(
    (r) => r.deteriorationFollowed || r.escalationFollowed,
  ).length;
  const overrideConsequenceRate = pct(
    overrideConsequenceCount,
    continueAnywayOutcomes.length,
  );

  const confidence = confidenceFromSampleSize(windowed.length, timeframe);
  const confidenceLabel = CONFIDENCE_LABEL[confidence];
  const confidenceCopy = deriveConfidenceCopy(confidence, windowed.length);

  const responseQuality = deriveResponseQuality(
    canceledTrades.length,
    qualifyingRevisions.length,
    continueAnywayOutcomes.length,
    overrideConsequenceRate,
  );

  return {
    traderId: inputs.traderId,
    timeframeId: timeframe.id,
    timeframeLabel: timeframe.label,
    windowSessionCount: windowed.length,
    canceledTradeCount: canceledTrades.length,
    revisedTradeCount: revisedTrades.length,
    continueAnywayCount: continueAnywayOutcomes.length,
    estimatedRiskAvoidedUSD: Math.round(estimatedRiskAvoidedUSD * 100) / 100,
    estimatedRiskAvoidedFromCancelsUSD:
      Math.round(estimatedRiskAvoidedFromCancelsUSD * 100) / 100,
    estimatedRiskAvoidedFromRevisionsUSD:
      Math.round(estimatedRiskAvoidedFromRevisionsUSD * 100) / 100,
    averageRiskReductionPercent,
    qualifyingRevisionCount: qualifyingRevisions.length,
    overrideConsequenceRate,
    confidence,
    confidenceLabel,
    confidenceCopy,
    responseQuality,
    responseQualityCopy: RESPONSE_QUALITY_COPY[responseQuality],
    canceledTrades,
    revisedTrades,
    continueAnywayOutcomes,
  };
}
