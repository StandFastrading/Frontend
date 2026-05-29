import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  BEHAVIOR_TAG_LABEL,
  type BehaviorTag,
  type TradeHistoryRow,
} from "@/features/trades/trade-history-engine";
import {
  isWithinTimeframe,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import {
  computeBehaviorProgress,
  PROGRESS_TREND_LABEL,
  type BehaviorProgressRecord,
  type BehaviorProgressSummary,
  type ComparisonWindowId,
  type ProgressTrend,
} from "@/lib/analytics/behavior-progress-engine";
import type { AnalyticsSliceInputs } from "@/lib/analytics/trend-series";
import type {
  BehaviorEvent,
  InterventionEvent,
  TradingSession,
} from "@/types";

// =============================================================================
// Reports — pure orchestration over existing engines
// =============================================================================
//
// PURPOSE
//   Produce one `ReportSnapshot` from the already-persisted slices for a
//   given timeframe. Every section is decision-oriented: trading
//   performance, behavioral performance, and how they correlate.
//
// SCOPE
//   PURE. No new analytics derivation; consumes:
//     * Trade History engine (rows + behavior tagging)
//     * Behavior Progress engine (improvement)
//     * Existing event vocabularies for behavioral counts
//
// AI-READY SHAPE
//   `ReportSnapshot` carries traderId, timeframe id, generatedAt and a
//   fully resolved set of sections so a future mentor query like
//   "what hurt me most in the last 30 days?" can answer without
//   re-deriving.
// =============================================================================

// -----------------------------------------------------------------------------
// Section types
// -----------------------------------------------------------------------------

export type TradingPerformance = {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  netPnL: number;
  netPnLLabel: string;
  averageR: number;
  averageRLabel: string;
  averageWinner: number;
  averageWinnerLabel: string;
  averageLoser: number;
  averageLoserLabel: string;
  profitFactor: number | null;
  profitFactorLabel: string;
};

export type SetupPerformanceRow = {
  setupType: string;
  totalTrades: number;
  winRate: number;
  averageR: number;
  averageRLabel: string;
  netPnL: number;
  netPnLLabel: string;
  // Composite ranking score. Higher = stronger setup.
  rankScore: number;
};

export type BehavioralPerformance = {
  totalSessions: number;
  stopWideningEvents: number;
  warningOverrideEvents: number;
  // Of all warnings encountered, what % did the trader override.
  warningOverrideRate: number;
  // Of all intervention decisions, what % were positive (cancel / revise).
  interventionResponseQuality: number;
  // 0-100 consistency-style score across closed sessions.
  disciplineStability: number;
  earlySessionDeteriorationEvents: number;
  // % of decisions that respected the warning.
  ruleAdherenceRate: number;
  // % of windowed sessions with zero destructive events.
  cleanSessionRate: number;
  mostCommonRuleBreak: BehaviorTag | null;
  mostCommonRuleBreakLabel: string | null;
};

export type CorrelationRow = {
  id: string;
  label: string;
  description: string;
  tradeCount: number;
  winRate: number;
  averageR: number;
  averageRLabel: string;
  netPnL: number;
  netPnLLabel: string;
  hasData: boolean;
};

export type CorrelationSection = {
  followingRules: CorrelationRow;
  afterStopWidening: CorrelationRow;
  afterWarningOverride: CorrelationRow;
  duringControlledSessions: CorrelationRow;
  duringEscalatingSessions: CorrelationRow;
};

export type LeakRow = {
  behaviorTag: BehaviorTag;
  behaviorLabel: string;
  observedSessions: number;
  observedTrades: number;
  // Net realized P/L on trades carrying this tag. Negative values indicate
  // damage. We report the absolute value as "estimated cost" when negative;
  // positive nets are surfaced as "neutral" because the trade still profited.
  netPnL: number;
  estimatedCost: number;
  estimatedCostLabel: string;
};

export type StrengthRow = {
  id: string;
  label: string;
  observation: string;
};

export type ReportSummary = {
  strongestArea: string;
  largestLeak: string;
  focus: string;
  overallTrend: ProgressTrend;
  overallLabel: string;
};

export type ReportSnapshot = {
  traderId: string;
  timeframeId: string;
  timeframeLabel: string;
  generatedAt: string;
  hasData: boolean;
  totalSessions: number;
  trading: TradingPerformance;
  setups: SetupPerformanceRow[];
  behavioral: BehavioralPerformance;
  correlations: CorrelationSection;
  progress: BehaviorProgressSummary;
  leaks: LeakRow[];
  strengths: StrengthRow[];
  summary: ReportSummary;
};

export type ReportsInputs = AnalyticsSliceInputs & {
  traderId: string;
  // Pre-derived once at the page level so per-section computations don't
  // re-derive behavior tags from raw events.
  rows: TradeHistoryRow[];
};

// -----------------------------------------------------------------------------
// Display helpers
// -----------------------------------------------------------------------------

function formatPnL(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatR(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}R`;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

// Destructive event types — the set used elsewhere to define a "clean"
// session. Mirrors behavior-progress-engine and intervention-outcomes-engine.
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
]);

const EARLY_SESSION_DETERIORATION_TYPES = new Set<string>([
  BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED,
  BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
  BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
]);

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeReportSnapshot(
  inputs: ReportsInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): ReportSnapshot {
  const windowedRows = inputs.rows.filter((r) =>
    isWithinTimeframe(r.closedAt, timeframe, nowMs),
  );
  const windowedSessions = inputs.sessions.filter((s) =>
    isWithinTimeframe(s.startedAt, timeframe, nowMs),
  );
  const sessionIds = new Set(windowedSessions.map((s) => s.sessionId));

  const windowedBehavior = inputs.behaviorEvents.filter((e) =>
    e.sessionId ? sessionIds.has(e.sessionId) : false,
  );
  const windowedInterventions = inputs.interventions.filter((i) =>
    i.sessionId ? sessionIds.has(i.sessionId) : false,
  );

  const trading = computeTradingPerformance(windowedRows);
  const setups = computeSetupPerformance(windowedRows);
  const behavioral = computeBehavioralPerformance({
    rows: windowedRows,
    sessions: windowedSessions,
    behaviorEvents: windowedBehavior,
    interventions: windowedInterventions,
  });
  const correlations = computeCorrelationSection({
    rows: windowedRows,
    sessions: windowedSessions,
    behaviorEvents: windowedBehavior,
  });

  const progress = computeBehaviorProgress(
    { ...inputs },
    progressWindowFor(timeframe.id),
    nowMs,
  );

  const leaks = computeBiggestLeaks(windowedRows);
  const strengths = computeBiggestStrengths(behavioral, windowedRows);
  const summary = computeReportSummary({
    behavioral,
    leaks,
    strengths,
    progress,
  });

  return {
    traderId: inputs.traderId,
    timeframeId: timeframe.id,
    timeframeLabel: timeframe.label,
    generatedAt: new Date(nowMs).toISOString(),
    hasData: windowedRows.length > 0 || windowedSessions.length > 0,
    totalSessions: windowedSessions.length,
    trading,
    setups,
    behavioral,
    correlations,
    progress,
    leaks,
    strengths,
    summary,
  };
}

// Map the page-level timeframe to the comparison window the Progress
// engine accepts. The engine only supports 7d and 30d natively, so
// shorter windows reuse 7d and longer ones reuse 30d.
function progressWindowFor(id: string): ComparisonWindowId {
  if (id === "today" || id === "7d") return "7d";
  return "30d";
}

// -----------------------------------------------------------------------------
// SECTION 1 — Trading Performance
// -----------------------------------------------------------------------------

function computeTradingPerformance(
  rows: TradeHistoryRow[],
): TradingPerformance {
  if (rows.length === 0) {
    return emptyTradingPerformance();
  }
  let winCount = 0;
  let lossCount = 0;
  let breakevenCount = 0;
  let netPnL = 0;
  let rSum = 0;
  let rDenom = 0;
  let winnerSum = 0;
  let winnerCount = 0;
  let loserSum = 0;
  let loserCount = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (const row of rows) {
    if (row.outcome === "win") winCount += 1;
    else if (row.outcome === "loss") lossCount += 1;
    else breakevenCount += 1;
    netPnL += row.realizedPnL;
    if (row.realizedR != null && Number.isFinite(row.realizedR)) {
      rSum += row.realizedR;
      rDenom += 1;
    }
    if (row.realizedPnL > 0) {
      winnerSum += row.realizedPnL;
      winnerCount += 1;
      grossProfit += row.realizedPnL;
    } else if (row.realizedPnL < 0) {
      loserSum += row.realizedPnL;
      loserCount += 1;
      grossLoss += Math.abs(row.realizedPnL);
    }
  }

  const totalTrades = rows.length;
  const winRate = roundOne((winCount / totalTrades) * 100);
  const averageR = rDenom > 0 ? rSum / rDenom : 0;
  const averageWinner = winnerCount > 0 ? winnerSum / winnerCount : 0;
  const averageLoser = loserCount > 0 ? loserSum / loserCount : 0;
  const profitFactor =
    grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : null;

  return {
    totalTrades,
    winCount,
    lossCount,
    breakevenCount,
    winRate,
    netPnL: Math.round(netPnL * 100) / 100,
    netPnLLabel: formatPnL(netPnL),
    averageR: Math.round(averageR * 100) / 100,
    averageRLabel: formatR(averageR),
    averageWinner: Math.round(averageWinner * 100) / 100,
    averageWinnerLabel: formatPnL(averageWinner),
    averageLoser: Math.round(averageLoser * 100) / 100,
    averageLoserLabel: formatPnL(averageLoser),
    profitFactor,
    profitFactorLabel:
      profitFactor == null ? "—" : profitFactor.toFixed(2),
  };
}

function emptyTradingPerformance(): TradingPerformance {
  return {
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    breakevenCount: 0,
    winRate: 0,
    netPnL: 0,
    netPnLLabel: formatPnL(0),
    averageR: 0,
    averageRLabel: formatR(0),
    averageWinner: 0,
    averageWinnerLabel: formatPnL(0),
    averageLoser: 0,
    averageLoserLabel: formatPnL(0),
    profitFactor: null,
    profitFactorLabel: "—",
  };
}

// -----------------------------------------------------------------------------
// SECTION 2 — Setup Performance
// -----------------------------------------------------------------------------

function computeSetupPerformance(
  rows: TradeHistoryRow[],
): SetupPerformanceRow[] {
  const byType = new Map<string, TradeHistoryRow[]>();
  for (const row of rows) {
    const key = row.setupType?.trim() ? row.setupType : "Uncategorized";
    const bucket = byType.get(key);
    if (bucket) bucket.push(row);
    else byType.set(key, [row]);
  }

  const result: SetupPerformanceRow[] = [];
  for (const [setupType, bucket] of byType) {
    let wins = 0;
    let netPnL = 0;
    let rSum = 0;
    let rDenom = 0;
    for (const r of bucket) {
      if (r.outcome === "win") wins += 1;
      netPnL += r.realizedPnL;
      if (r.realizedR != null && Number.isFinite(r.realizedR)) {
        rSum += r.realizedR;
        rDenom += 1;
      }
    }
    const totalTrades = bucket.length;
    const winRate = roundOne((wins / totalTrades) * 100);
    const averageR = rDenom > 0 ? rSum / rDenom : 0;
    // Rank score balances win rate and average R so a high-win-rate but
    // tiny-R setup doesn't outrank a moderate-win-rate, high-R setup.
    const rankScore = winRate * 0.5 + averageR * 25;
    result.push({
      setupType,
      totalTrades,
      winRate,
      averageR: Math.round(averageR * 100) / 100,
      averageRLabel: formatR(averageR),
      netPnL: Math.round(netPnL * 100) / 100,
      netPnLLabel: formatPnL(netPnL),
      rankScore,
    });
  }
  result.sort((a, b) => b.rankScore - a.rankScore);
  return result;
}

// -----------------------------------------------------------------------------
// SECTION 3 — Behavioral Performance
// -----------------------------------------------------------------------------

function computeBehavioralPerformance(input: {
  rows: TradeHistoryRow[];
  sessions: TradingSession[];
  behaviorEvents: BehaviorEvent[];
  interventions: InterventionEvent[];
}): BehavioralPerformance {
  const totalSessions = input.sessions.length;

  const stopWideningEvents = input.behaviorEvents.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  ).length;

  const warningEncounters = input.behaviorEvents.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  ).length;
  const warningOverrideEvents = input.behaviorEvents.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  ).length;
  const warningOverrideRate =
    warningEncounters > 0
      ? roundOne((warningOverrideEvents / warningEncounters) * 100)
      : 0;

  const totalDecisions = input.interventions.length;
  const positiveDecisions = input.interventions.filter(
    (i) => i.decision === "cancel_trade" || i.decision === "revise_trade",
  ).length;
  const overrideDecisions = input.interventions.filter(
    (i) => i.decision === "continue_anyway",
  ).length;
  const interventionResponseQuality =
    totalDecisions > 0
      ? roundOne((positiveDecisions / totalDecisions) * 100)
      : 0;
  const decidedTotal = positiveDecisions + overrideDecisions;
  const ruleAdherenceRate =
    decidedTotal > 0 ? roundOne((positiveDecisions / decidedTotal) * 100) : 0;

  // Discipline Stability proxy from clean-trade consistency across
  // sessions in the window. We avoid re-running the heavy
  // behavioral-state aggregator per session here; the trade-row tagging
  // already reflects the destructive events that drive the score.
  const disciplineStability = computeDisciplineStabilityProxy(
    input.rows,
    input.sessions,
  );

  const earlySessionDeteriorationEvents = countEarlySessionDeterioration(
    input.sessions,
    input.behaviorEvents,
  );

  // Clean Session Rate — fraction of sessions with no destructive
  // behavior events.
  const cleanSessions = input.sessions.filter((s) => {
    const events = input.behaviorEvents.filter((e) => e.sessionId === s.sessionId);
    return !events.some((e) => DESTRUCTIVE_EVENT_TYPES.has(e.eventType));
  }).length;
  const cleanSessionRate =
    totalSessions > 0 ? roundOne((cleanSessions / totalSessions) * 100) : 0;

  // Most Common Rule Break — drawn from the trade-row tag set so it
  // matches what Trade History surfaces.
  const tagCounts = new Map<BehaviorTag, number>();
  for (const row of input.rows) {
    for (const tag of row.tags) {
      if (tag === "clean" || tag === "reflection_missing") continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  let mostCommonRuleBreak: BehaviorTag | null = null;
  let topCount = 0;
  for (const [tag, count] of tagCounts) {
    if (count > topCount) {
      topCount = count;
      mostCommonRuleBreak = tag;
    }
  }

  return {
    totalSessions,
    stopWideningEvents,
    warningOverrideEvents,
    warningOverrideRate,
    interventionResponseQuality,
    disciplineStability,
    earlySessionDeteriorationEvents,
    ruleAdherenceRate,
    cleanSessionRate,
    mostCommonRuleBreak,
    mostCommonRuleBreakLabel: mostCommonRuleBreak
      ? BEHAVIOR_TAG_LABEL[mostCommonRuleBreak]
      : null,
  };
}

// A lightweight stability proxy: % of trades in the window that closed
// clean. Higher = steadier discipline. Returns 0-100. We use a 100-anchor
// when there are no trades so the surface doesn't read as "0" when the
// trader simply hasn't traded yet.
function computeDisciplineStabilityProxy(
  rows: TradeHistoryRow[],
  sessions: TradingSession[],
): number {
  if (rows.length === 0) {
    return sessions.length === 0 ? 0 : 100;
  }
  const clean = rows.filter((r) => r.tags.includes("clean")).length;
  return Math.round((clean / rows.length) * 100);
}

function countEarlySessionDeterioration(
  sessions: TradingSession[],
  events: BehaviorEvent[],
): number {
  const THIRTY_MIN_MS = 30 * 60_000;
  let total = 0;
  for (const session of sessions) {
    const startMs = new Date(session.startedAt).getTime();
    if (!Number.isFinite(startMs)) continue;
    const activations = events
      .filter(
        (e) =>
          e.sessionId === session.sessionId &&
          e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
      )
      .map((e) => new Date(e.timestamp).getTime())
      .sort((a, b) => a - b);
    const thirdActivation = activations[2] ?? null;
    const inWindow = events.filter((e) => {
      if (e.sessionId !== session.sessionId) return false;
      if (!EARLY_SESSION_DETERIORATION_TYPES.has(e.eventType)) return false;
      const t = new Date(e.timestamp).getTime();
      if (!Number.isFinite(t)) return false;
      const within30 = t - startMs <= THIRTY_MIN_MS;
      const withinFirst2 = thirdActivation == null ? true : t < thirdActivation;
      return within30 || withinFirst2;
    });
    total += inWindow.length;
  }
  return total;
}

// -----------------------------------------------------------------------------
// SECTION 4 — Correlation Report
// -----------------------------------------------------------------------------

function computeCorrelationSection(input: {
  rows: TradeHistoryRow[];
  sessions: TradingSession[];
  behaviorEvents: BehaviorEvent[];
}): CorrelationSection {
  const rows = input.rows;

  const followingRules = correlationRow(
    "following_rules",
    "Following Rules",
    "Trades that closed clean — no overrides, stop widening, or escalation",
    rows.filter((r) => r.tags.includes("clean")),
  );

  const afterStopWidening = correlationRow(
    "after_stop_widening",
    "After Stop Widening",
    "Trades on which the stop was moved further from entry",
    rows.filter((r) => r.tags.includes("stop_widened")),
  );

  const afterWarningOverride = correlationRow(
    "after_warning_override",
    "After Warning Override",
    "Trades that activated after the trader overrode a rule warning",
    rows.filter(
      (r) =>
        r.tags.includes("warning_ignored") ||
        r.tags.includes("override_accepted"),
    ),
  );

  // Sessions partitioned by destructive-event load. Top-tercile cutoff
  // mirrors the discipline-stability volatility tercile so the
  // interpretation stays consistent across pages.
  const sessionLoad = new Map<string, number>();
  for (const s of input.sessions) {
    const load = input.behaviorEvents.filter(
      (e) => e.sessionId === s.sessionId && DESTRUCTIVE_EVENT_TYPES.has(e.eventType),
    ).length;
    sessionLoad.set(s.sessionId, load);
  }
  const escalatingThreshold = topTercileThreshold(
    Array.from(sessionLoad.values()),
  );
  const controlledIds = new Set<string>();
  const escalatingIds = new Set<string>();
  for (const [sessionId, load] of sessionLoad) {
    if (load === 0) controlledIds.add(sessionId);
    if (escalatingThreshold > 0 && load >= escalatingThreshold) {
      escalatingIds.add(sessionId);
    }
  }

  const duringControlledSessions = correlationRow(
    "during_controlled",
    "During Controlled Sessions",
    "Trades from sessions with zero destructive behavior events",
    rows.filter((r) => r.sessionId && controlledIds.has(r.sessionId)),
  );

  const duringEscalatingSessions = correlationRow(
    "during_escalating",
    "During Escalating Sessions",
    "Trades from sessions in the top tercile of destructive event load",
    rows.filter((r) => r.sessionId && escalatingIds.has(r.sessionId)),
  );

  return {
    followingRules,
    afterStopWidening,
    afterWarningOverride,
    duringControlledSessions,
    duringEscalatingSessions,
  };
}

function correlationRow(
  id: string,
  label: string,
  description: string,
  rows: TradeHistoryRow[],
): CorrelationRow {
  if (rows.length === 0) {
    return {
      id,
      label,
      description,
      tradeCount: 0,
      winRate: 0,
      averageR: 0,
      averageRLabel: "—",
      netPnL: 0,
      netPnLLabel: "—",
      hasData: false,
    };
  }
  let wins = 0;
  let netPnL = 0;
  let rSum = 0;
  let rDenom = 0;
  for (const r of rows) {
    if (r.outcome === "win") wins += 1;
    netPnL += r.realizedPnL;
    if (r.realizedR != null && Number.isFinite(r.realizedR)) {
      rSum += r.realizedR;
      rDenom += 1;
    }
  }
  const winRate = roundOne((wins / rows.length) * 100);
  const averageR = rDenom > 0 ? rSum / rDenom : 0;
  return {
    id,
    label,
    description,
    tradeCount: rows.length,
    winRate,
    averageR: Math.round(averageR * 100) / 100,
    averageRLabel: formatR(averageR),
    netPnL: Math.round(netPnL * 100) / 100,
    netPnLLabel: formatPnL(netPnL),
    hasData: true,
  };
}

function topTercileThreshold(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length * 2) / 3);
  return sorted[idx] ?? 0;
}

// -----------------------------------------------------------------------------
// SECTION 6 — Biggest Leaks
// -----------------------------------------------------------------------------

const LEAK_TAGS: BehaviorTag[] = [
  "stop_widened",
  "warning_ignored",
  "override_accepted",
  "size_escalation",
  "rapid_reentry",
  "mistake_marked",
];

function computeBiggestLeaks(rows: TradeHistoryRow[]): LeakRow[] {
  const result: LeakRow[] = [];
  for (const tag of LEAK_TAGS) {
    const tagged = rows.filter((r) => r.tags.includes(tag));
    if (tagged.length === 0) continue;
    const sessionSet = new Set<string>();
    let netPnL = 0;
    for (const r of tagged) {
      if (r.sessionId) sessionSet.add(r.sessionId);
      netPnL += r.realizedPnL;
    }
    const estimatedCost = netPnL < 0 ? Math.abs(netPnL) : 0;
    result.push({
      behaviorTag: tag,
      behaviorLabel: BEHAVIOR_TAG_LABEL[tag],
      observedSessions: sessionSet.size,
      observedTrades: tagged.length,
      netPnL: Math.round(netPnL * 100) / 100,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      estimatedCostLabel:
        estimatedCost > 0 ? formatPnL(-estimatedCost) : "Neutral net",
    });
  }
  // Rank by trade count first, then by estimated cost so a behavior that
  // happened 8 times outranks one that happened twice even if the dollar
  // hit was similar.
  result.sort((a, b) => {
    if (b.observedTrades !== a.observedTrades) {
      return b.observedTrades - a.observedTrades;
    }
    return b.estimatedCost - a.estimatedCost;
  });
  return result.slice(0, 3);
}

// -----------------------------------------------------------------------------
// SECTION 7 — Biggest Strengths
// -----------------------------------------------------------------------------

function computeBiggestStrengths(
  behavioral: BehavioralPerformance,
  rows: TradeHistoryRow[],
): StrengthRow[] {
  const candidates: { id: string; score: number; row: StrengthRow }[] = [];

  if (rows.length > 0) {
    const cleanCount = rows.filter((r) => r.tags.includes("clean")).length;
    const cleanRate = roundOne((cleanCount / rows.length) * 100);
    if (cleanRate >= 60) {
      candidates.push({
        id: "clean_trades",
        score: cleanRate,
        row: {
          id: "clean_trades",
          label: "High Clean-Trade Rate",
          observation: `${cleanRate}% of ${rows.length} trade${rows.length === 1 ? "" : "s"} closed clean`,
        },
      });
    }
  }

  if (behavioral.cleanSessionRate >= 60 && behavioral.totalSessions > 0) {
    candidates.push({
      id: "clean_sessions",
      score: behavioral.cleanSessionRate,
      row: {
        id: "clean_sessions",
        label: "High Clean-Session Rate",
        observation: `${behavioral.cleanSessionRate}% of ${behavioral.totalSessions} session${behavioral.totalSessions === 1 ? "" : "s"} were free of destructive events`,
      },
    });
  }

  if (behavioral.ruleAdherenceRate >= 70) {
    candidates.push({
      id: "rule_adherence",
      score: behavioral.ruleAdherenceRate,
      row: {
        id: "rule_adherence",
        label: "Respects Warnings",
        observation: `${behavioral.ruleAdherenceRate}% of rule checks ended in cancel or revise`,
      },
    });
  }

  if (behavioral.interventionResponseQuality >= 60) {
    candidates.push({
      id: "intervention_response",
      score: behavioral.interventionResponseQuality,
      row: {
        id: "intervention_response",
        label: "Strong Intervention Response",
        observation: `${behavioral.interventionResponseQuality}% of interventions ended in positive action`,
      },
    });
  }

  // Zero-incident strengths — surface only when the trader actually had
  // sessions in the window. Otherwise "no rapid re-entries" is just an
  // empty data artifact.
  if (behavioral.totalSessions > 0) {
    const rapidReentries = rows.filter((r) => r.tags.includes("rapid_reentry"));
    if (rapidReentries.length === 0 && rows.length >= 3) {
      candidates.push({
        id: "no_rapid_reentry",
        score: 100,
        row: {
          id: "no_rapid_reentry",
          label: "No Rapid Re-Entries",
          observation: `Zero rapid post-loss re-entries across ${rows.length} trades`,
        },
      });
    }
    const stopWidening = rows.filter((r) => r.tags.includes("stop_widened"));
    if (stopWidening.length === 0 && rows.length >= 3) {
      candidates.push({
        id: "no_stop_widening",
        score: 95,
        row: {
          id: "no_stop_widening",
          label: "Holds the Original Stop",
          observation: `Zero stop-widening events across ${rows.length} trades`,
        },
      });
    }
    if (
      behavioral.earlySessionDeteriorationEvents === 0 &&
      behavioral.totalSessions >= 2
    ) {
      candidates.push({
        id: "calm_session_open",
        score: 80,
        row: {
          id: "calm_session_open",
          label: "Calm Session Opens",
          observation: `No deterioration events in the first 30 minutes / first two trades`,
        },
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 3).map((c) => c.row);
}

// -----------------------------------------------------------------------------
// SECTION 8 — Report Summary
// -----------------------------------------------------------------------------

function computeReportSummary(input: {
  behavioral: BehavioralPerformance;
  leaks: LeakRow[];
  strengths: StrengthRow[];
  progress: BehaviorProgressSummary;
}): ReportSummary {
  const topStrength = input.strengths[0];
  const topLeak = input.leaks[0];

  const strongestArea = topStrength?.label ?? "Not enough signal yet";
  const largestLeak = topLeak?.behaviorLabel ?? "No recurring leaks detected";
  const focus = buildFocusCopy(topLeak, input.behavioral);
  const overallTrend = input.progress.hasInsufficientHistory
    ? "stable"
    : input.progress.overallTrend;
  const overallLabel = input.progress.hasInsufficientHistory
    ? "Insufficient history"
    : PROGRESS_TREND_LABEL[overallTrend];

  return {
    strongestArea,
    largestLeak,
    focus,
    overallTrend,
    overallLabel,
  };
}

function buildFocusCopy(
  topLeak: LeakRow | undefined,
  behavioral: BehavioralPerformance,
): string {
  if (!topLeak) {
    if (behavioral.totalSessions === 0) {
      return "Trade a few sessions to surface a focus area";
    }
    return "Maintain the current process — no recurring leak";
  }
  switch (topLeak.behaviorTag) {
    case "stop_widened":
      return "Do not modify risk after activation";
    case "warning_ignored":
    case "override_accepted":
      return "Treat warnings as a hard stop — cancel or revise";
    case "size_escalation":
      return "Hold position size to the approved plan";
    case "rapid_reentry":
      return "Pause for a full review before re-entering after a loss";
    case "mistake_marked":
      return "Address the recurring mistake flagged on the journal";
    default:
      return `Reduce ${topLeak.behaviorLabel.toLowerCase()} frequency next session`;
  }
}

// -----------------------------------------------------------------------------
// Re-exports for convenience
// -----------------------------------------------------------------------------

export type { BehaviorProgressRecord, BehaviorProgressSummary, ProgressTrend };
