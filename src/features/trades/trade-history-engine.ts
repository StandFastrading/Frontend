import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type {
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  MonitoringEvent,
  TradeReflection,
} from "@/types";

// =============================================================================
// Trade History — derivation, filtering, sorting, summary
// =============================================================================
//
// Pure orchestration. Consumes the already-persisted ClosedTrade
// archive + the session-scoped event streams + tradeReflections, and
// produces:
//   * A behavior-enriched row per closed trade (`TradeHistoryRow`)
//   * A filtered + sorted view based on the UI's filter / sort state
//   * A rollup summary (total / win-rate / net P&L / avg R / rule-break
//     rate / most common behavior tag)
//
// No new behavioral analytics — every signal comes from a record that's
// already in the store. The Journal's existing TradesTab uses a thin
// version of this; the Trade History page builds the richer table on
// top of the same data, so cross-page reads stay coherent.
// =============================================================================

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export const BEHAVIOR_TAGS = [
  "clean",
  "stop_widened",
  "warning_ignored",
  "override_accepted",
  "size_escalation",
  "rapid_reentry",
  "mistake_marked",
  "reflection_missing",
] as const;
export type BehaviorTag = (typeof BEHAVIOR_TAGS)[number];

export const BEHAVIOR_TAG_LABEL: Record<BehaviorTag, string> = {
  clean: "Clean Trade",
  stop_widened: "Stop Widened",
  warning_ignored: "Warning Ignored",
  override_accepted: "Override Accepted",
  size_escalation: "Size Escalation",
  rapid_reentry: "Rapid Re-Entry",
  mistake_marked: "Mistake Marked",
  reflection_missing: "Reflection Missing",
};

export const BEHAVIOR_TAG_TONE: Record<
  BehaviorTag,
  "emerald" | "amber" | "rose" | "muted"
> = {
  clean: "emerald",
  stop_widened: "amber",
  warning_ignored: "rose",
  override_accepted: "rose",
  size_escalation: "amber",
  rapid_reentry: "rose",
  mistake_marked: "rose",
  reflection_missing: "muted",
};

// AI-retrieval-shaped row record. Extends ClosedTrade with the
// derivations the table + filters need.
export type TradeHistoryRow = ClosedTrade & {
  traderId: string;
  tags: BehaviorTag[];
  ruleBreakCount: number;
  overrideCount: number;
  stopWideningCount: number;
  sizeEscalationCount: number;
  rapidReentryCount: number;
  warningIgnoredCount: number;
  reflectionCompleted: boolean;
  reflectionId: string | null;
  durationSeconds: number;
  // Pre-formatted display strings for the table.
  pnlLabel: string;
  rLabel: string;
  durationLabel: string;
};

export type TradeHistorySummary = {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  netPnL: number;
  averageR: number;
  ruleBreakRate: number;
  mostCommonTag: BehaviorTag | null;
  mostCommonTagLabel: string | null;
  // Pre-formatted for display.
  netPnLLabel: string;
  averageRLabel: string;
};

export type OutcomeFilter = "all" | "win" | "loss" | "breakeven";
export type DirectionFilter = "all" | "Long" | "Short";
export type DateRangeFilter = "all" | "today" | "7d" | "30d" | "90d";

export type TradeHistoryFilters = {
  searchSymbol: string;
  outcome: OutcomeFilter;
  direction: DirectionFilter;
  setupType: string; // "all" or specific setup
  marketType: string; // "all" or specific market
  dateRange: DateRangeFilter;
  // Quick-filter chip set. Members must satisfy the named condition.
  quickFilters: BehaviorTag[];
};

export type TradeHistorySortKey =
  | "newest"
  | "oldest"
  | "highest_pnl"
  | "lowest_pnl"
  | "best_r"
  | "worst_r"
  | "most_rule_breaks"
  | "longest_duration"
  | "ticker_az";

export const TRADE_HISTORY_SORT_LABEL: Record<TradeHistorySortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  highest_pnl: "Highest P/L",
  lowest_pnl: "Lowest P/L",
  best_r: "Best R",
  worst_r: "Worst R",
  most_rule_breaks: "Most rule breaks",
  longest_duration: "Longest duration",
  ticker_az: "Ticker A–Z",
};

export const DEFAULT_TRADE_HISTORY_FILTERS: TradeHistoryFilters = {
  searchSymbol: "",
  outcome: "all",
  direction: "all",
  setupType: "all",
  marketType: "all",
  dateRange: "all",
  quickFilters: [],
};

// -----------------------------------------------------------------------------
// Row derivation
// -----------------------------------------------------------------------------

export type TradeHistoryInputs = {
  traderId: string;
  closedTrades: ClosedTrade[];
  behaviorEvents: BehaviorEvent[];
  monitoringEvents: MonitoringEvent[];
  interventions: InterventionEvent[];
  tradeReflections: TradeReflection[];
};

export function deriveTradeHistoryRows(
  inputs: TradeHistoryInputs,
): TradeHistoryRow[] {
  // Index reflections by tradeId once.
  const reflectionIndex = new Map<string, TradeReflection>();
  for (const r of inputs.tradeReflections) reflectionIndex.set(r.tradeId, r);

  return inputs.closedTrades.map((trade) =>
    deriveRow(trade, inputs, reflectionIndex),
  );
}

function deriveRow(
  trade: ClosedTrade,
  inputs: TradeHistoryInputs,
  reflectionIndex: Map<string, TradeReflection>,
): TradeHistoryRow {
  const tradeMonitoring = inputs.monitoringEvents.filter(
    (m) => m.tradeId === trade.id,
  );

  const stopWideningCount = tradeMonitoring.filter((m) =>
    m.deviations.some((d) => d.type === "stop_moved_further"),
  ).length;
  const sizeEscalationCount = tradeMonitoring.filter((m) =>
    m.deviations.some(
      (d) =>
        d.type === "position_size_increased" ||
        d.type === "averaging_down" ||
        d.type === "excessive_adds",
    ),
  ).length;

  // Session/symbol-scoped events. Interventions and behavior events
  // don't carry a tradeId, so we link by session + symbol like the
  // existing TradeDetailView does.
  const sessionScopedBehavior = inputs.behaviorEvents.filter(
    (e) => e.sessionId === trade.sessionId && e.symbol === trade.symbol,
  );
  const sessionScopedInterventions = inputs.interventions.filter(
    (i) => i.sessionId === trade.sessionId && i.symbol === trade.symbol,
  );

  const warningIgnoredCount = sessionScopedBehavior.filter(
    (e) =>
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  ).length;
  const overrideCount = sessionScopedInterventions.filter(
    (i) => i.decision === "continue_anyway",
  ).length;

  // Rapid re-entry — bracket the trade's activation by 10 minutes.
  const activatedMs = new Date(trade.activatedAt).getTime();
  const rapidReentryCount = sessionScopedBehavior.filter((e) => {
    if (e.eventType !== BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION)
      return false;
    const t = new Date(e.timestamp).getTime();
    if (!Number.isFinite(t)) return false;
    return Math.abs(t - activatedMs) < 10 * 60_000;
  }).length;

  const reflectionEntry = reflectionIndex.get(trade.id);
  const reflectionCompleted =
    reflectionEntry != null ||
    (trade.exitReflection != null && trade.exitReflection.trim().length > 0);
  const reflectionId = reflectionEntry?.id ?? null;

  // Tag set — mistake_marked / reflection_missing are derived in addition
  // to monitoring-driven tags.
  const tags: BehaviorTag[] = [];
  if (stopWideningCount > 0) tags.push("stop_widened");
  if (warningIgnoredCount > 0) tags.push("warning_ignored");
  if (overrideCount > 0) tags.push("override_accepted");
  if (sizeEscalationCount > 0) tags.push("size_escalation");
  if (rapidReentryCount > 0) tags.push("rapid_reentry");
  if (trade.mistakeCount > 0) tags.push("mistake_marked");
  if (!reflectionCompleted) tags.push("reflection_missing");

  // Clean tag — only when the trade had zero meaningful negative
  // signals. "reflection_missing" is a process gap, not a behavior
  // problem, so it doesn't block the Clean tag.
  const meaningfulNegative = tags.filter(
    (t) => t !== "reflection_missing",
  ).length;
  if (meaningfulNegative === 0) tags.unshift("clean");

  // Rule break count — every separately-classified negative tag except
  // reflection_missing counts as one rule break.
  const ruleBreakCount = tags.filter(
    (t) => t !== "clean" && t !== "reflection_missing",
  ).length;

  // Duration.
  const openedMs = new Date(trade.activatedAt).getTime();
  const closedMs = new Date(trade.closedAt).getTime();
  const durationSeconds =
    Number.isFinite(openedMs) && Number.isFinite(closedMs)
      ? Math.max(0, Math.round((closedMs - openedMs) / 1000))
      : 0;

  return {
    ...trade,
    traderId: inputs.traderId,
    tags,
    ruleBreakCount,
    overrideCount,
    stopWideningCount,
    sizeEscalationCount,
    rapidReentryCount,
    warningIgnoredCount,
    reflectionCompleted,
    reflectionId,
    durationSeconds,
    pnlLabel: formatPnL(trade.realizedPnL),
    rLabel: formatR(trade.realizedR),
    durationLabel: formatDuration(durationSeconds),
  };
}

// -----------------------------------------------------------------------------
// Filtering
// -----------------------------------------------------------------------------

export function applyFilters(
  rows: TradeHistoryRow[],
  filters: TradeHistoryFilters,
  nowMs: number,
): TradeHistoryRow[] {
  const search = filters.searchSymbol.trim().toUpperCase();
  const cutoffMs = dateRangeCutoffMs(filters.dateRange, nowMs);
  const quick = new Set(filters.quickFilters);
  return rows.filter((row) => {
    if (search && !row.symbol.toUpperCase().includes(search)) return false;
    if (filters.outcome !== "all" && row.outcome !== filters.outcome)
      return false;
    if (
      filters.direction !== "all" &&
      row.direction !== filters.direction
    ) {
      return false;
    }
    if (filters.setupType !== "all" && row.setupType !== filters.setupType)
      return false;
    if (
      filters.marketType !== "all" &&
      row.marketType !== filters.marketType
    ) {
      return false;
    }
    if (cutoffMs != null) {
      const t = new Date(row.closedAt).getTime();
      if (!Number.isFinite(t) || t < cutoffMs) return false;
    }
    for (const tag of quick) {
      if (!row.tags.includes(tag)) return false;
    }
    return true;
  });
}

function dateRangeCutoffMs(
  range: DateRangeFilter,
  nowMs: number,
): number | null {
  const dayMs = 24 * 60 * 60 * 1000;
  switch (range) {
    case "today":
      return nowMs - dayMs;
    case "7d":
      return nowMs - 7 * dayMs;
    case "30d":
      return nowMs - 30 * dayMs;
    case "90d":
      return nowMs - 90 * dayMs;
    case "all":
    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// Sorting
// -----------------------------------------------------------------------------

export function applySort(
  rows: TradeHistoryRow[],
  sortKey: TradeHistorySortKey,
): TradeHistoryRow[] {
  const copy = [...rows];
  const closedAtMs = (r: TradeHistoryRow) =>
    new Date(r.closedAt).getTime() || 0;
  switch (sortKey) {
    case "newest":
      copy.sort((a, b) => closedAtMs(b) - closedAtMs(a));
      break;
    case "oldest":
      copy.sort((a, b) => closedAtMs(a) - closedAtMs(b));
      break;
    case "highest_pnl":
      copy.sort((a, b) => b.realizedPnL - a.realizedPnL);
      break;
    case "lowest_pnl":
      copy.sort((a, b) => a.realizedPnL - b.realizedPnL);
      break;
    case "best_r":
      copy.sort((a, b) => (b.realizedR ?? -Infinity) - (a.realizedR ?? -Infinity));
      break;
    case "worst_r":
      copy.sort((a, b) => (a.realizedR ?? Infinity) - (b.realizedR ?? Infinity));
      break;
    case "most_rule_breaks":
      copy.sort((a, b) => b.ruleBreakCount - a.ruleBreakCount);
      break;
    case "longest_duration":
      copy.sort((a, b) => b.durationSeconds - a.durationSeconds);
      break;
    case "ticker_az":
      copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
      break;
  }
  return copy;
}

// -----------------------------------------------------------------------------
// Summary aggregation
// -----------------------------------------------------------------------------

export function computeTradeHistorySummary(
  rows: TradeHistoryRow[],
): TradeHistorySummary {
  if (rows.length === 0) {
    return {
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      breakevenCount: 0,
      winRate: 0,
      netPnL: 0,
      averageR: 0,
      ruleBreakRate: 0,
      mostCommonTag: null,
      mostCommonTagLabel: null,
      netPnLLabel: formatPnL(0),
      averageRLabel: formatR(0),
    };
  }

  let winCount = 0;
  let lossCount = 0;
  let breakevenCount = 0;
  let netPnL = 0;
  let rSum = 0;
  let rDenom = 0;
  let ruleBreakRows = 0;
  const tagCounts = new Map<BehaviorTag, number>();

  for (const row of rows) {
    if (row.outcome === "win") winCount += 1;
    else if (row.outcome === "loss") lossCount += 1;
    else breakevenCount += 1;
    netPnL += row.realizedPnL;
    if (row.realizedR != null && Number.isFinite(row.realizedR)) {
      rSum += row.realizedR;
      rDenom += 1;
    }
    if (row.ruleBreakCount > 0) ruleBreakRows += 1;
    for (const tag of row.tags) {
      // Skip `clean` — it's a positive marker, not a "most common
      // problem". Skip `reflection_missing` — that's a process gap.
      if (tag === "clean" || tag === "reflection_missing") continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const winRate = Math.round((winCount / rows.length) * 1000) / 10;
  const ruleBreakRate = Math.round((ruleBreakRows / rows.length) * 1000) / 10;
  const averageR = rDenom > 0 ? rSum / rDenom : 0;

  let mostCommonTag: BehaviorTag | null = null;
  let topCount = 0;
  for (const [tag, count] of tagCounts) {
    if (count > topCount) {
      topCount = count;
      mostCommonTag = tag;
    }
  }
  // If no negative tags appeared but the trader has trades, surface
  // "clean" as the standout signal.
  if (!mostCommonTag) {
    const cleanCount = rows.filter((r) => r.tags.includes("clean")).length;
    if (cleanCount > 0) mostCommonTag = "clean";
  }

  return {
    totalTrades: rows.length,
    winCount,
    lossCount,
    breakevenCount,
    winRate,
    netPnL: Math.round(netPnL * 100) / 100,
    averageR: Math.round(averageR * 100) / 100,
    ruleBreakRate,
    mostCommonTag,
    mostCommonTagLabel: mostCommonTag
      ? BEHAVIOR_TAG_LABEL[mostCommonTag]
      : null,
    netPnLLabel: formatPnL(netPnL),
    averageRLabel: formatR(averageR),
  };
}

// -----------------------------------------------------------------------------
// Distinct setups + market types — fed to the filter dropdowns
// -----------------------------------------------------------------------------

export function distinctSetupTypes(rows: TradeHistoryRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.setupType && r.setupType.trim().length > 0) set.add(r.setupType);
  }
  return Array.from(set).sort();
}

export function distinctMarketTypes(rows: TradeHistoryRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.marketType) set.add(r.marketType);
  }
  return Array.from(set).sort();
}

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

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remM = minutes % 60;
  if (hours < 24)
    return remM > 0 ? `${hours}h ${remM}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
}
