import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  BEHAVIOR_TAG_LABEL,
  type BehaviorTag,
  type TradeHistoryRow,
} from "@/features/trades/trade-history-engine";
import type { BehaviorEvent } from "@/types";

// =============================================================================
// Calendar — month / week / day aggregation over closed trade rows
// =============================================================================
//
// PURPOSE
//   Bucket closed trades into a calendar month grid so the trader can
//   answer "what happened each trading day" at a glance. P/L first;
//   behavior is a small adornment, not the focus.
//
// SCOPE
//   PURE orchestration over the Trade History row stream. No new trade
//   records, no behavior derivation. Behavior tags + rule-break counts
//   come pre-attached on each `TradeHistoryRow`.
//
// AI-READY SHAPE
//   Every aggregate carries the underlying `tradeIds` so a future mentor
//   query like "what was my best day this month?" can resolve to the
//   actual trade records without re-bucketing.
// =============================================================================

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type CalendarSessionState = "focused" | "controlled" | "escalating";

export const CALENDAR_SESSION_STATE_LABEL: Record<
  CalendarSessionState,
  string
> = {
  focused: "Focused",
  controlled: "Controlled",
  escalating: "Escalating",
};

export type DailyCalendarSummary = {
  // YYYY-MM-DD local date — same vocabulary as TradingSession.tradingDate.
  date: string;
  dailyNetPnL: number;
  dailyNetPnLLabel: string;
  totalTrades: number;
  // Distinct ticker symbols traded, ordered by absolute realizedPnL desc.
  tickers: string[];
  // Tickers with their net P/L for the day; used by the calendar cell
  // when there's room to render the top contributors.
  tickerBreakdown: Array<{
    symbol: string;
    netPnL: number;
    netPnLLabel: string;
  }>;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  averageR: number;
  averageRLabel: string;
  bestTradeId: string | null;
  worstTradeId: string | null;
  ruleBreakCount: number;
  // Distinct behavior tags present across the day's trades (excluding
  // `clean` / `reflection_missing` which are informational, not leaks).
  behaviorTags: BehaviorTag[];
  // Derived session state from destructive event load on the trading day.
  sessionState: CalendarSessionState | null;
  tradeIds: string[];
};

export type WeeklyCalendarSummary = {
  // YYYY-MM-DD of the Sunday that opens this calendar week.
  weekStart: string;
  weekEnd: string;
  weeklyNetPnL: number;
  weeklyNetPnLLabel: string;
  totalTrades: number;
  wins: number;
  losses: number;
  tradeIds: string[];
};

export type CalendarDayCell = {
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  summary: DailyCalendarSummary | null;
};

export type CalendarWeekRow = {
  weekStart: string;
  weekEnd: string;
  days: CalendarDayCell[];
  weekly: WeeklyCalendarSummary;
};

export type MonthlyCalendarSummary = {
  // YYYY-MM string for the active month.
  month: string;
  monthLabel: string;
  monthlyNetPnL: number;
  monthlyNetPnLLabel: string;
  totalTrades: number;
  winningDays: number;
  losingDays: number;
  bestDay: { date: string; netPnL: number; netPnLLabel: string } | null;
  worstDay: { date: string; netPnL: number; netPnLLabel: string } | null;
  weeks: CalendarWeekRow[];
  days: DailyCalendarSummary[];
};

export type CalendarInputs = {
  rows: TradeHistoryRow[];
  behaviorEvents: BehaviorEvent[];
  // Active month — first-of-month in local time. Day buckets are local-date
  // based; this anchors the grid.
  monthAnchor: Date;
  // Trading "today" — drives the today-highlight on a cell. Pass `null`
  // outside the active month to suppress the highlight.
  todayDate: string;
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

// Local YYYY-MM-DD — matches TradingSession.tradingDate semantics.
export function localDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function todayLocalKey(nowMs: number): string {
  return localDateKey(new Date(nowMs));
}

// Anchor a local YYYY-MM-DD string to a Date at local midnight. Used to
// derive a stable week-start key from a tradingDate without surfacing TZ
// drift.
function parseLocalDate(key: string): Date {
  const [yStr, mStr, dStr] = key.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  return new Date(y, m - 1, d);
}

// Sunday-anchored week start. Returns YYYY-MM-DD.
function weekStartKey(key: string): string {
  const d = parseLocalDate(key);
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - dow);
  return localDateKey(d);
}

function addDaysKey(key: string, days: number): string {
  const d = parseLocalDate(key);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

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

// -----------------------------------------------------------------------------
// Trading-date resolution for a TradeHistoryRow
// -----------------------------------------------------------------------------

// Prefer the persisted `tradingDate` (session-scoped, set at archive
// time). Legacy records can omit it; derive from `closedAt` in local
// time as a fallback.
function rowTradingDate(row: TradeHistoryRow): string | null {
  if (row.tradingDate) return row.tradingDate;
  const t = new Date(row.closedAt);
  if (Number.isNaN(t.getTime())) return null;
  return localDateKey(t);
}

function eventTradingDate(event: BehaviorEvent): string | null {
  if (event.tradingDate) return event.tradingDate;
  const t = new Date(event.timestamp);
  if (Number.isNaN(t.getTime())) return null;
  return localDateKey(t);
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function computeMonthlyCalendar(
  inputs: CalendarInputs,
): MonthlyCalendarSummary {
  const monthYear = inputs.monthAnchor.getFullYear();
  const monthIndex = inputs.monthAnchor.getMonth();
  const monthKey = `${monthYear}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthLabel = inputs.monthAnchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Group rows by trading date.
  const rowsByDate = new Map<string, TradeHistoryRow[]>();
  for (const row of inputs.rows) {
    const key = rowTradingDate(row);
    if (!key) continue;
    const bucket = rowsByDate.get(key);
    if (bucket) bucket.push(row);
    else rowsByDate.set(key, [row]);
  }

  // Group destructive behavior events by trading date so we can label
  // session state on the day modal without re-running the aggregator.
  const destructiveByDate = new Map<string, number>();
  for (const event of inputs.behaviorEvents) {
    if (!DESTRUCTIVE_EVENT_TYPES.has(event.eventType)) continue;
    const key = eventTradingDate(event);
    if (!key) continue;
    destructiveByDate.set(key, (destructiveByDate.get(key) ?? 0) + 1);
  }

  // Build the 6-row grid. Start at the Sunday on/before the 1st of the
  // month; end at the Saturday on/after the last day of the month.
  const firstOfMonth = new Date(monthYear, monthIndex, 1);
  const firstOfMonthKey = localDateKey(firstOfMonth);
  const gridStartKey = weekStartKey(firstOfMonthKey);

  // Total grid days — always 6 weeks (42 cells) so the layout doesn't
  // jump between 5-row and 6-row months. Empty cells are still inside
  // the calendar but flagged `inCurrentMonth: false`.
  const TOTAL_CELLS = 42;

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < TOTAL_CELLS; i += 1) {
    const key = addDaysKey(gridStartKey, i);
    const dayDate = parseLocalDate(key);
    const inCurrentMonth = dayDate.getMonth() === monthIndex;
    const summary = buildDailySummary(
      key,
      rowsByDate.get(key) ?? [],
      destructiveByDate.get(key) ?? 0,
    );
    cells.push({
      date: key,
      dayOfMonth: dayDate.getDate(),
      inCurrentMonth,
      isToday: key === inputs.todayDate,
      summary,
    });
  }

  // Partition cells into 6 weekly rows.
  const weeks: CalendarWeekRow[] = [];
  for (let w = 0; w < 6; w += 1) {
    const days = cells.slice(w * 7, w * 7 + 7);
    const weekly = buildWeeklySummary(days);
    weeks.push({
      weekStart: weekly.weekStart,
      weekEnd: weekly.weekEnd,
      days,
      weekly,
    });
  }

  // Monthly rollup is computed off ONLY the days inside the current
  // month so the spillover Sun/Sat cells from adjacent months don't
  // bleed into the monthly total.
  const inMonthSummaries: DailyCalendarSummary[] = [];
  for (const cell of cells) {
    if (cell.inCurrentMonth && cell.summary) {
      inMonthSummaries.push(cell.summary);
    }
  }

  let monthlyNetPnL = 0;
  let totalTrades = 0;
  let winningDays = 0;
  let losingDays = 0;
  let bestDay: MonthlyCalendarSummary["bestDay"] = null;
  let worstDay: MonthlyCalendarSummary["worstDay"] = null;
  for (const s of inMonthSummaries) {
    monthlyNetPnL += s.dailyNetPnL;
    totalTrades += s.totalTrades;
    if (s.dailyNetPnL > 0) winningDays += 1;
    else if (s.dailyNetPnL < 0) losingDays += 1;
    if (!bestDay || s.dailyNetPnL > bestDay.netPnL) {
      bestDay = {
        date: s.date,
        netPnL: s.dailyNetPnL,
        netPnLLabel: s.dailyNetPnLLabel,
      };
    }
    if (!worstDay || s.dailyNetPnL < worstDay.netPnL) {
      worstDay = {
        date: s.date,
        netPnL: s.dailyNetPnL,
        netPnLLabel: s.dailyNetPnLLabel,
      };
    }
  }
  // Suppress best/worst when nothing was traded — surfaces should
  // render "—" rather than a 0 anchor.
  if (totalTrades === 0) {
    bestDay = null;
    worstDay = null;
  }

  return {
    month: monthKey,
    monthLabel,
    monthlyNetPnL: Math.round(monthlyNetPnL * 100) / 100,
    monthlyNetPnLLabel: formatPnL(monthlyNetPnL),
    totalTrades,
    winningDays,
    losingDays,
    bestDay,
    worstDay,
    weeks,
    days: inMonthSummaries,
  };
}

// -----------------------------------------------------------------------------
// Per-day aggregation
// -----------------------------------------------------------------------------

function buildDailySummary(
  date: string,
  rows: TradeHistoryRow[],
  destructiveCount: number,
): DailyCalendarSummary | null {
  if (rows.length === 0) return null;
  let netPnL = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let rSum = 0;
  let rDenom = 0;
  let bestTradeId: string | null = null;
  let worstTradeId: string | null = null;
  let bestPnL = -Infinity;
  let worstPnL = Infinity;
  let ruleBreakCount = 0;
  const tagSet = new Set<BehaviorTag>();
  const tickerNet = new Map<string, number>();
  const tradeIds: string[] = [];

  for (const row of rows) {
    netPnL += row.realizedPnL;
    if (row.outcome === "win") wins += 1;
    else if (row.outcome === "loss") losses += 1;
    else breakeven += 1;
    if (row.realizedR != null && Number.isFinite(row.realizedR)) {
      rSum += row.realizedR;
      rDenom += 1;
    }
    if (row.realizedPnL > bestPnL) {
      bestPnL = row.realizedPnL;
      bestTradeId = row.id;
    }
    if (row.realizedPnL < worstPnL) {
      worstPnL = row.realizedPnL;
      worstTradeId = row.id;
    }
    ruleBreakCount += row.ruleBreakCount;
    for (const tag of row.tags) {
      if (tag === "clean" || tag === "reflection_missing") continue;
      tagSet.add(tag);
    }
    tickerNet.set(
      row.symbol,
      (tickerNet.get(row.symbol) ?? 0) + row.realizedPnL,
    );
    tradeIds.push(row.id);
  }

  const tickerBreakdown = Array.from(tickerNet.entries())
    .map(([symbol, netPnLValue]) => ({
      symbol,
      netPnL: Math.round(netPnLValue * 100) / 100,
      netPnLLabel: formatPnL(netPnLValue),
    }))
    .sort((a, b) => Math.abs(b.netPnL) - Math.abs(a.netPnL));

  const averageR = rDenom > 0 ? rSum / rDenom : 0;
  const winRate = Math.round((wins / rows.length) * 1000) / 10;

  const sessionState = deriveSessionState(rows, destructiveCount);

  return {
    date,
    dailyNetPnL: Math.round(netPnL * 100) / 100,
    dailyNetPnLLabel: formatPnL(netPnL),
    totalTrades: rows.length,
    tickers: tickerBreakdown.map((t) => t.symbol),
    tickerBreakdown,
    wins,
    losses,
    breakeven,
    winRate,
    averageR: Math.round(averageR * 100) / 100,
    averageRLabel: formatR(averageR),
    bestTradeId,
    worstTradeId,
    ruleBreakCount,
    behaviorTags: Array.from(tagSet),
    sessionState,
    tradeIds,
  };
}

// Day-level session state heuristic. Avoids running the full behavioral
// aggregator on every calendar render; the cheap proxy is "how many
// destructive events fired today vs. how disciplined did the closed
// trades look."
function deriveSessionState(
  rows: TradeHistoryRow[],
  destructiveCount: number,
): CalendarSessionState | null {
  if (rows.length === 0 && destructiveCount === 0) return null;
  const ruleBreakSum = rows.reduce((s, r) => s + r.ruleBreakCount, 0);
  const totalSignal = destructiveCount + ruleBreakSum;
  if (totalSignal === 0) return "focused";
  if (totalSignal <= 2) return "controlled";
  return "escalating";
}

// -----------------------------------------------------------------------------
// Per-week aggregation
// -----------------------------------------------------------------------------

function buildWeeklySummary(days: CalendarDayCell[]): WeeklyCalendarSummary {
  const weekStart = days[0]?.date ?? "";
  const weekEnd = days[days.length - 1]?.date ?? weekStart;
  let netPnL = 0;
  let totalTrades = 0;
  let wins = 0;
  let losses = 0;
  const tradeIds: string[] = [];
  for (const day of days) {
    if (!day.summary) continue;
    netPnL += day.summary.dailyNetPnL;
    totalTrades += day.summary.totalTrades;
    wins += day.summary.wins;
    losses += day.summary.losses;
    for (const id of day.summary.tradeIds) tradeIds.push(id);
  }
  return {
    weekStart,
    weekEnd,
    weeklyNetPnL: Math.round(netPnL * 100) / 100,
    weeklyNetPnLLabel: formatPnL(netPnL),
    totalTrades,
    wins,
    losses,
    tradeIds,
  };
}

// -----------------------------------------------------------------------------
// Display helpers exported for the UI
// -----------------------------------------------------------------------------

export function formatMonthAnchor(anchor: Date): string {
  return anchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function addMonths(anchor: Date, delta: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
}

export function startOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function behaviorTagLabel(tag: BehaviorTag): string {
  return BEHAVIOR_TAG_LABEL[tag];
}

// Parse YYYY-MM-DD into a friendly long-form label.
export function formatLongDate(key: string): string {
  const d = parseLocalDate(key);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Parse YYYY-MM-DD into "Mon, May 28" — used in weekly summary headers.
export function formatShortDate(key: string): string {
  const d = parseLocalDate(key);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export { parseLocalDate };
