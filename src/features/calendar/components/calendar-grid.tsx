"use client";

import { AlertTriangle } from "lucide-react";

import type {
  CalendarDayCell,
  CalendarWeekRow,
  MonthlyCalendarSummary,
} from "@/features/calendar/calendar-engine";
import { cn } from "@/lib/utils";

const DAY_HEADERS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

// Standard month grid + weekly totals on the right.
//
// Layout:
//   [ day-of-week labels x7 | "Week" header ]
//   [ 6 rows × (7 day cells + 1 weekly total cell) ]
//
// Each day cell shows the date number, net P/L, and the top tickers.
// Non-current-month cells render as muted spillover so the week math
// still adds up visually.

export function CalendarGrid({
  summary,
  onSelectDay,
}: {
  summary: MonthlyCalendarSummary;
  onSelectDay: (cell: CalendarDayCell) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/40 backdrop-blur">
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_auto] border-b border-white/10">
        {DAY_HEADERS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
          >
            {label}
          </div>
        ))}
        <div className="px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 sm:min-w-[7.5rem]">
          Week
        </div>
      </div>
      <div className="flex flex-col divide-y divide-white/5">
        {summary.weeks.map((row) => (
          <WeekRow key={row.weekStart} row={row} onSelectDay={onSelectDay} />
        ))}
      </div>
    </div>
  );
}

function WeekRow({
  row,
  onSelectDay,
}: {
  row: CalendarWeekRow;
  onSelectDay: (cell: CalendarDayCell) => void;
}) {
  const pnlTone =
    row.weekly.weeklyNetPnL > 0
      ? "text-emerald-300"
      : row.weekly.weeklyNetPnL < 0
        ? "text-rose-300"
        : "text-muted-foreground";

  return (
    <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_auto]">
      {row.days.map((cell) => (
        <DayCell key={cell.date} cell={cell} onSelect={onSelectDay} />
      ))}
      <div className="flex flex-col justify-center gap-0.5 border-l border-white/10 bg-background/20 px-3 py-2 leading-tight sm:min-w-[7.5rem]">
        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          Week Total
        </span>
        <span className={cn("text-sm font-semibold tabular-nums", pnlTone)}>
          {row.weekly.weeklyNetPnLLabel}
        </span>
        <span className="text-[0.6rem] text-muted-foreground">
          {row.weekly.totalTrades} trade{row.weekly.totalTrades === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function DayCell({
  cell,
  onSelect,
}: {
  cell: CalendarDayCell;
  onSelect: (cell: CalendarDayCell) => void;
}) {
  const summary = cell.summary;
  const hasTrades = summary != null;
  const pnl = summary?.dailyNetPnL ?? 0;
  const pnlTone =
    pnl > 0 ? "text-emerald-300" : pnl < 0 ? "text-rose-300" : "text-foreground";

  const cellBackground = !cell.inCurrentMonth
    ? "bg-background/[0.02]"
    : hasTrades
      ? pnl > 0
        ? "bg-emerald-500/[0.06] hover:bg-emerald-500/[0.1]"
        : pnl < 0
          ? "bg-rose-500/[0.06] hover:bg-rose-500/[0.1]"
          : "bg-foreground/[0.03] hover:bg-foreground/[0.05]"
      : "hover:bg-foreground/[0.03]";

  const todayRing = cell.isToday
    ? "ring-1 ring-inset ring-brand/40"
    : "";

  const muted = !cell.inCurrentMonth ? "text-muted-foreground/40" : "";

  // Render up to 3 tickers + "+N more" — keeps cell density readable.
  const tickerLines = summary?.tickerBreakdown.slice(0, 3) ?? [];
  const overflow = summary
    ? Math.max(0, summary.tickerBreakdown.length - tickerLines.length)
    : 0;

  const hasLeak =
    summary != null && summary.ruleBreakCount > 0 && cell.inCurrentMonth;

  return (
    <button
      type="button"
      onClick={() => onSelect(cell)}
      disabled={!hasTrades}
      aria-label={
        hasTrades
          ? `Open ${cell.date} — ${summary?.totalTrades} trades, ${summary?.dailyNetPnLLabel}`
          : `No trades on ${cell.date}`
      }
      className={cn(
        "flex min-h-[6rem] flex-col gap-1 border-r border-white/5 px-2 py-2 text-left text-xs transition-colors last:border-r-0",
        cellBackground,
        todayRing,
        hasTrades
          ? "cursor-pointer"
          : "cursor-default focus:outline-none",
      )}
    >
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "text-[0.7rem] font-semibold tabular-nums",
            muted || (cell.isToday ? "text-brand" : "text-foreground/80"),
          )}
        >
          {cell.dayOfMonth}
        </span>
        {hasLeak ? (
          <AlertTriangle
            className="ml-auto size-3 text-amber-400/80"
            aria-label="Rule break observed"
          />
        ) : null}
      </div>
      {hasTrades ? (
        <>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums leading-none",
              pnlTone,
            )}
          >
            {summary?.dailyNetPnLLabel}
          </span>
          <ul className="flex flex-col gap-0.5 leading-tight">
            {tickerLines.map((t) => (
              <li
                key={t.symbol}
                className="flex items-baseline justify-between gap-1"
              >
                <span className="truncate text-[0.65rem] font-medium text-foreground/85">
                  {t.symbol}
                </span>
                <span
                  className={cn(
                    "text-[0.6rem] tabular-nums",
                    t.netPnL > 0
                      ? "text-emerald-300/80"
                      : t.netPnL < 0
                        ? "text-rose-300/80"
                        : "text-muted-foreground",
                  )}
                >
                  {t.netPnLLabel}
                </span>
              </li>
            ))}
            {overflow > 0 ? (
              <li className="text-[0.6rem] text-muted-foreground/70">
                +{overflow} more
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </button>
  );
}
