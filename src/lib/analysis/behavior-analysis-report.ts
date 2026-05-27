import { useMemo } from "react";

import {
  BEHAVIOR_SCORING_WEIGHTS,
  BEHAVIORAL_TAGS,
  computeBehaviorAnalysis,
  type BehaviorAnalysisInputs,
  type BehaviorAnalysisResult,
  type BehavioralTag,
  type BehaviorScoringKey,
} from "@/lib/analysis/behavior-analysis-engine";
import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type {
  ActiveTrade,
  BehaviorEvent,
  ClosedTrade,
  InterventionDecision,
  InterventionEvent,
  MarketType,
  MonitoringEvent,
  TradeDirection,
  TriggeredRule,
  ValidationResult,
} from "@/types";
import { useAppStore } from "@/store";

// =============================================================================
// StandFast Behavior Analysis Report
// =============================================================================
//
// Pre-aggregated, serializable bundle for the future Reports page. Every
// projection here is computed ONCE — Reports renders straight from the
// shape below, never re-derives logic from raw events.
//
// CONSUMES the full behavior pipeline:
//   - behaviorEvents
//   - monitoringEvents
//   - interventions
//   - validationHistory
//   - closedTrades
//   - activeTrades
//   - riskRules
//   - sessionMetrics
//
// PRODUCES `BehaviorAnalysisReport`:
//   - meta              when the report was built + period coverage
//   - summary           the live `BehaviorAnalysisResult` (score, tags…)
//   - driverBreakdown   one row per scoring key with count + weight + Δscore
//   - tradeReports      one row per active/closed trade with behavior context
//   - ruleReports       one row per validation rule with trigger counts
//   - patternReports    one row per behavioral tag with first/last seen
//   - interventionReports per-decision aggregates (Cancel/Revise/Continue)
//
// Every row is sorted by significance so the Reports page can render a
// list without re-sorting. All timestamps are ISO; all numbers are raw
// (rounding happens at the render layer).
//
// FUTURE EXTENSIONS:
//   - Period filtering (today / week / month / custom range) lands by
//     filtering each input array at the boundaries of the chosen window
//     before passing into `computeBehaviorAnalysisReport`.
//   - CSV / JSON export: this whole object is already JSON-safe — pass it
//     straight to `JSON.stringify` or a CSV serializer.

// -----------------------------------------------------------------------------
// Report-level types
// -----------------------------------------------------------------------------

export type ReportMeta = {
  generatedAt: string;
  // Earliest and latest event timestamps observed in the inputs. Null when
  // no events exist yet. Reports header reads "Period · {start} → {end}".
  periodStart: string | null;
  periodEnd: string | null;
  // Currently always "Current Session" — placeholder for the future
  // period selector. Persisted on the report so an exported snapshot
  // still labels itself correctly.
  periodLabel: string;
  totalEvents: number;
};

export type DriverKind = "positive" | "negative";

export type DriverBreakdownRow = {
  key: BehaviorScoringKey;
  label: string;
  count: number;
  weight: number;
  // count × weight — negative weights produce negative contributions.
  contribution: number;
  kind: DriverKind;
};

export type TradeReportOutcome = "win" | "loss" | "breakeven" | "open";

export type TradeReport = {
  tradeId: string;
  symbol: string;
  setupType: string;
  marketType: MarketType;
  direction: TradeDirection;
  approvalStatus: "approved" | "approved_with_warnings";
  overrideAccepted: boolean;
  approvalWarnings: TriggeredRule[];
  approvedAt: string;
  activatedAt: string;
  closedAt: string | null;
  outcome: TradeReportOutcome;
  // Risk frozen at approval + realized at close. Both nullable to honor
  // override activations that lacked a defined stop.
  originalRisk: number | null;
  realizedPnL: number | null;
  realizedR: number | null;
  // Behavioral aggregates over this trade's lifetime.
  deviationCount: number;
  mistakeCount: number;
  exitReflection: string | null;
};

export type RuleViolationReport = {
  ruleId: string;
  // Stable display label — taken from the most recent ValidationResult
  // entry that triggered this rule.
  label: string;
  triggerCount: number;
  warningCount: number;
  violationCount: number;
};

export type PatternReport = {
  tag: BehavioralTag;
  label: string;
  occurrences: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  kind: DriverKind;
};

export type InterventionReport = {
  decision: InterventionDecision;
  label: string;
  count: number;
  // 0–100 percentage of total interventions. 0 when there are no
  // interventions at all.
  rate: number;
  // Mean of `warningCount` / `violationCount` across decisions of this
  // type. 0 when no events of this type.
  averageWarnings: number;
  averageViolations: number;
};

export type BehaviorAnalysisReport = {
  meta: ReportMeta;
  summary: BehaviorAnalysisResult;
  driverBreakdown: DriverBreakdownRow[];
  tradeReports: TradeReport[];
  ruleReports: RuleViolationReport[];
  patternReports: PatternReport[];
  interventionReports: InterventionReport[];
};

// -----------------------------------------------------------------------------
// Input shape — wider than `BehaviorAnalysisInputs` because the report
// projects across monitoring events, interventions, and validation history
// in addition to the engine inputs.
// -----------------------------------------------------------------------------
export type BehaviorAnalysisReportInputs = BehaviorAnalysisInputs & {
  monitoringEvents: MonitoringEvent[];
  interventions: InterventionEvent[];
  validationHistory: ValidationResult[];
};

// -----------------------------------------------------------------------------
// Plain-English labels — single source of truth for the Reports page.
// -----------------------------------------------------------------------------

const DRIVER_LABELS: Record<BehaviorScoringKey, string> = {
  warning_ignored: "Warnings ignored",
  trade_activated_with_warnings: "Trades activated with acknowledged warnings",
  stop_widened: "Stops widened beyond approved risk",
  position_size_increased: "Position size increased beyond approval",
  mistake_logged: "Mistakes logged",
  daily_risk_exceeded: "Daily risk limit exceeded",
  max_trades_exceeded: "Daily trade limit exceeded",
  losing_trade_after_ignored_warning: "Losing trades after ignored warnings",
  trade_avoided: "Trades avoided after intervention",
  trade_revised: "Trades revised after warning",
  clean_approved_trade: "Clean approved trades",
  clean_exit_at_plan: "Clean exits at plan",
  reflection_added: "Reflections added",
};

const PATTERN_LABELS: Record<BehavioralTag, string> = {
  warning_ignored: "Warnings ignored",
  risk_escalation: "Risk escalation",
  stop_widening: "Stop widening",
  oversized_position: "Oversized position",
  revenge_risk: "Post-loss re-entry",
  overtrading: "Overtrading",
  mistake_logged: "Mistakes logged",
  plan_followed: "Plan followed",
  trade_avoided: "Trades avoided after intervention",
  trade_revised: "Trades revised after warning",
  clean_execution: "Clean executions at plan",
};

const NEGATIVE_TAGS: ReadonlySet<BehavioralTag> = new Set([
  "warning_ignored",
  "risk_escalation",
  "stop_widening",
  "oversized_position",
  "revenge_risk",
  "overtrading",
  "mistake_logged",
]);

const NEGATIVE_DRIVERS: ReadonlySet<BehaviorScoringKey> = new Set([
  "warning_ignored",
  "trade_activated_with_warnings",
  "stop_widened",
  "position_size_increased",
  "mistake_logged",
  "daily_risk_exceeded",
  "max_trades_exceeded",
  "losing_trade_after_ignored_warning",
]);

const INTERVENTION_LABELS: Record<InterventionDecision, string> = {
  cancel_trade: "Cancel Trade",
  revise_trade: "Revise Trade",
  continue_anyway: "Continue Anyway",
};

// -----------------------------------------------------------------------------
// Meta
// -----------------------------------------------------------------------------

function buildMeta(
  behaviorEvents: BehaviorEvent[],
  monitoringEvents: MonitoringEvent[],
  interventions: InterventionEvent[],
): ReportMeta {
  const allTimestamps = [
    ...behaviorEvents.map((e) => e.timestamp),
    ...monitoringEvents.map((e) => e.timestamp),
    ...interventions.map((e) => e.timestamp),
  ].filter((t): t is string => typeof t === "string" && t.length > 0);

  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  for (const t of allTimestamps) {
    if (periodStart === null || t < periodStart) periodStart = t;
    if (periodEnd === null || t > periodEnd) periodEnd = t;
  }

  return {
    generatedAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    periodLabel: "Current Session",
    totalEvents: behaviorEvents.length,
  };
}

// -----------------------------------------------------------------------------
// Driver breakdown — turns the engine's raw counts into a one-row-per-key
// table with each row's contribution to the score.
// -----------------------------------------------------------------------------

function buildDriverBreakdown(
  counts: Record<BehaviorScoringKey, number>,
): DriverBreakdownRow[] {
  const rows: DriverBreakdownRow[] = (
    Object.keys(BEHAVIOR_SCORING_WEIGHTS) as BehaviorScoringKey[]
  ).map((key) => {
    const weight = BEHAVIOR_SCORING_WEIGHTS[key];
    const count = counts[key];
    return {
      key,
      label: DRIVER_LABELS[key],
      count,
      weight,
      contribution: count * weight,
      kind: NEGATIVE_DRIVERS.has(key) ? "negative" : "positive",
    };
  });
  // Sort: largest |contribution| first so Reports renders the most-
  // significant rows at the top. Zero-count rows still surface (with a
  // contribution of 0) so the table is a complete view.
  rows.sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );
  return rows;
}

// -----------------------------------------------------------------------------
// Trade reports — one row per active + closed trade, with behavior context.
// -----------------------------------------------------------------------------

function buildTradeReports(
  activeTrades: ActiveTrade[],
  closedTrades: ClosedTrade[],
  monitoringEvents: MonitoringEvent[],
): TradeReport[] {
  const monitoringByTrade = new Map<string, MonitoringEvent[]>();
  for (const event of monitoringEvents) {
    const list = monitoringByTrade.get(event.tradeId) ?? [];
    list.push(event);
    monitoringByTrade.set(event.tradeId, list);
  }

  // Active trades come first (sorted by activation time desc), then
  // closed trades (sorted by close time desc). Reports usually wants the
  // most-recent activity at the top.
  const activeRows: TradeReport[] = [...activeTrades]
    .filter((t) => t.status === "active")
    .sort((a, b) => (a.activatedAt < b.activatedAt ? 1 : -1))
    .map((t) => {
      const events = monitoringByTrade.get(t.id) ?? [];
      const deviationCount = events.reduce(
        (n, e) => n + e.deviations.length,
        0,
      );
      const mistakeCount = events.filter(
        (e) => e.update.type === "mark_mistake",
      ).length;
      return {
        tradeId: t.id,
        symbol: t.symbol,
        setupType: t.setupType,
        marketType: t.marketType,
        direction: t.direction,
        approvalStatus: t.approvalStatus,
        overrideAccepted: t.overrideAccepted,
        approvalWarnings: t.approvalWarnings,
        approvedAt: t.approvedAt,
        activatedAt: t.activatedAt,
        closedAt: null,
        outcome: "open" as const,
        originalRisk: t.originalRisk,
        realizedPnL: null,
        realizedR: null,
        deviationCount,
        mistakeCount,
        exitReflection: null,
      };
    });

  const closedRows: TradeReport[] = [...closedTrades]
    .sort((a, b) => (a.closedAt < b.closedAt ? 1 : -1))
    .map((t) => {
      // Closed trades don't carry approvalStatus/approvalWarnings (the
      // ActiveTrade record was removed at archive time). Reach back to the
      // monitoring history for deviation/mistake counts that the archive
      // also stores — prefer the archive value when present.
      return {
        tradeId: t.id,
        symbol: t.symbol,
        setupType: t.setupType,
        marketType: t.marketType,
        direction: t.direction,
        // Closed records pre-date the approval-status field — we can't
        // reconstruct without an extra hop. Reports treats this as
        // "approved" unless the archive explicitly carried otherwise.
        approvalStatus: "approved",
        overrideAccepted: false,
        approvalWarnings: [],
        approvedAt: t.approvedAt,
        activatedAt: t.activatedAt,
        closedAt: t.closedAt,
        outcome: t.outcome,
        originalRisk: t.originalRisk,
        realizedPnL: t.realizedPnL,
        realizedR: t.realizedR,
        deviationCount: t.deviationCount,
        mistakeCount: t.mistakeCount,
        exitReflection: t.exitReflection,
      };
    });

  return [...activeRows, ...closedRows];
}

// -----------------------------------------------------------------------------
// Rule reports — aggregated trigger counts per validation rule.
// -----------------------------------------------------------------------------

function buildRuleReports(
  validationHistory: ValidationResult[],
): RuleViolationReport[] {
  const byRule = new Map<
    string,
    { label: string; trigger: number; warning: number; violation: number }
  >();

  for (const result of validationHistory) {
    for (const rule of result.triggeredRules) {
      const entry = byRule.get(rule.id) ?? {
        // Use the latest seen label so wording rewrites flow through.
        label: rule.label,
        trigger: 0,
        warning: 0,
        violation: 0,
      };
      entry.label = rule.label;
      entry.trigger += 1;
      if (rule.status === "warning") entry.warning += 1;
      else if (rule.status === "fail") entry.violation += 1;
      byRule.set(rule.id, entry);
    }
  }

  const rows: RuleViolationReport[] = Array.from(byRule.entries()).map(
    ([ruleId, e]) => ({
      ruleId,
      label: e.label,
      triggerCount: e.trigger,
      warningCount: e.warning,
      violationCount: e.violation,
    }),
  );
  // Sort by violations desc, then warnings desc — the worst offenders
  // surface first.
  rows.sort(
    (a, b) =>
      b.violationCount - a.violationCount || b.warningCount - a.warningCount,
  );
  return rows;
}

// -----------------------------------------------------------------------------
// Pattern reports — one row per behavioral tag with first/last seen.
// -----------------------------------------------------------------------------

// Maps each tag to the BehaviorEvent types whose presence indicates the
// pattern fired. Used to compute first/last seen timestamps. A tag that
// rolls up multiple underlying events lists them all.
const TAG_EVENT_TYPES: Partial<
  Record<BehavioralTag, ReadonlyArray<string>>
> = {
  warning_ignored: [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED],
  risk_escalation: [
    BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
    BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  ],
  stop_widening: [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER],
  oversized_position: [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED],
  revenge_risk: [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION],
  overtrading: [], // derived from session metrics, no specific event
  mistake_logged: [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED],
  plan_followed: [BEHAVIOR_EVENT_TYPES.TRADE_APPROVED],
  trade_avoided: [BEHAVIOR_EVENT_TYPES.TRADE_AVOIDED],
  trade_revised: [BEHAVIOR_EVENT_TYPES.TRADE_REVISED],
  clean_execution: [BEHAVIOR_EVENT_TYPES.TRADE_CLOSED],
};

function buildPatternReports(
  analysis: BehaviorAnalysisResult,
  behaviorEvents: BehaviorEvent[],
): PatternReport[] {
  const rows: PatternReport[] = BEHAVIORAL_TAGS.map((tag) => {
    const occurrences = analysisCountForTag(analysis, tag);
    const eventTypes = TAG_EVENT_TYPES[tag] ?? [];
    let firstSeenAt: string | null = null;
    let lastSeenAt: string | null = null;
    if (eventTypes.length > 0) {
      const eventTypeSet = new Set(eventTypes);
      for (const e of behaviorEvents) {
        if (!eventTypeSet.has(e.eventType)) continue;
        if (firstSeenAt === null || e.timestamp < firstSeenAt) {
          firstSeenAt = e.timestamp;
        }
        if (lastSeenAt === null || e.timestamp > lastSeenAt) {
          lastSeenAt = e.timestamp;
        }
      }
    }
    return {
      tag,
      label: PATTERN_LABELS[tag],
      occurrences,
      firstSeenAt,
      lastSeenAt,
      kind: NEGATIVE_TAGS.has(tag) ? "negative" : "positive",
    };
  });
  // Patterns with occurrences first, sorted by count desc; zero-count
  // patterns trail behind so Reports can render a "no recent X" footer.
  rows.sort((a, b) => b.occurrences - a.occurrences);
  return rows;
}

// Mirror of the same helper in `TodaysPatterns` — kept here too so this
// module is self-contained for downstream consumers.
function analysisCountForTag(
  analysis: BehaviorAnalysisResult,
  tag: BehavioralTag,
): number {
  const { counts } = analysis;
  switch (tag) {
    case "warning_ignored":
      return counts.warning_ignored;
    case "risk_escalation":
      return counts.stop_widened + counts.position_size_increased;
    case "stop_widening":
      return counts.stop_widened;
    case "oversized_position":
      return counts.position_size_increased;
    case "revenge_risk":
      return counts.losing_trade_after_ignored_warning;
    case "overtrading":
      return counts.max_trades_exceeded;
    case "mistake_logged":
      return counts.mistake_logged;
    case "plan_followed":
      return counts.clean_approved_trade;
    case "trade_avoided":
      return counts.trade_avoided;
    case "trade_revised":
      return counts.trade_revised;
    case "clean_execution":
      return counts.clean_exit_at_plan;
  }
}

// -----------------------------------------------------------------------------
// Intervention reports — per-decision aggregates.
// -----------------------------------------------------------------------------

function buildInterventionReports(
  interventions: InterventionEvent[],
): InterventionReport[] {
  const total = interventions.length;
  const decisions: InterventionDecision[] = [
    "cancel_trade",
    "revise_trade",
    "continue_anyway",
  ];

  return decisions.map((decision) => {
    const rows = interventions.filter((it) => it.decision === decision);
    const count = rows.length;
    const rate =
      total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    const averageWarnings =
      count > 0
        ? rows.reduce((n, it) => n + (it.warningCount ?? 0), 0) / count
        : 0;
    const averageViolations =
      count > 0
        ? rows.reduce((n, it) => n + (it.violationCount ?? 0), 0) / count
        : 0;
    return {
      decision,
      label: INTERVENTION_LABELS[decision],
      count,
      rate,
      averageWarnings: Math.round(averageWarnings * 100) / 100,
      averageViolations: Math.round(averageViolations * 100) / 100,
    };
  });
}

// =============================================================================
// Public entry point
// =============================================================================

export function computeBehaviorAnalysisReport(
  inputs: BehaviorAnalysisReportInputs,
): BehaviorAnalysisReport {
  const {
    behaviorEvents,
    closedTrades,
    activeTrades,
    monitoringEvents,
    interventions,
    validationHistory,
    riskRules,
    sessionMetrics,
  } = inputs;

  const summary = computeBehaviorAnalysis({
    behaviorEvents,
    closedTrades,
    activeTrades,
    monitoringEvents,
    riskRules,
    sessionMetrics,
  });

  return {
    meta: buildMeta(behaviorEvents, monitoringEvents, interventions),
    summary,
    driverBreakdown: buildDriverBreakdown(summary.counts),
    tradeReports: buildTradeReports(
      activeTrades,
      closedTrades,
      monitoringEvents,
    ),
    ruleReports: buildRuleReports(validationHistory),
    patternReports: buildPatternReports(summary, behaviorEvents),
    interventionReports: buildInterventionReports(interventions),
  };
}

// =============================================================================
// React hook — same memoization shape as the engine hook.
// =============================================================================

export function useBehaviorAnalysisReport(): BehaviorAnalysisReport {
  const behaviorEvents = useAppStore((s) => s.behaviorEvents);
  const monitoringEvents = useAppStore((s) => s.monitoringEvents);
  const interventions = useAppStore((s) => s.interventions);
  const validationHistory = useAppStore((s) => s.validationHistory);
  const closedTrades = useAppStore((s) => s.closedTrades);
  const activeTrades = useAppStore((s) => s.activeTrades);
  const riskRules = useAppStore((s) => s.riskRules);
  const sessionMetrics = useAppStore((s) => s.session);

  return useMemo(
    () =>
      computeBehaviorAnalysisReport({
        behaviorEvents,
        monitoringEvents,
        interventions,
        validationHistory,
        closedTrades,
        activeTrades,
        riskRules,
        sessionMetrics,
      }),
    [
      behaviorEvents,
      monitoringEvents,
      interventions,
      validationHistory,
      closedTrades,
      activeTrades,
      riskRules,
      sessionMetrics,
    ],
  );
}
