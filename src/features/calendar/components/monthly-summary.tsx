"use client";

import type { MonthlyCalendarSummary } from "@/features/calendar/calendar-engine";
import { cn } from "@/lib/utils";

// Top-of-page summary strip. Monthly Net P/L + day-level rollups.
// Compact, single row on wide screens.

export function MonthlySummary({
  summary,
}: {
  summary: MonthlyCalendarSummary;
}) {
  const pnlTone =
    summary.monthlyNetPnL > 0
      ? "text-emerald-300"
      : summary.monthlyNetPnL < 0
        ? "text-rose-300"
        : "text-foreground";
  const bestPnLTone =
    summary.bestDay && summary.bestDay.netPnL > 0
      ? "text-emerald-300"
      : "text-foreground";
  const worstPnLTone =
    summary.worstDay && summary.worstDay.netPnL < 0
      ? "text-rose-300"
      : "text-foreground";

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-card/40 p-3 backdrop-blur sm:grid-cols-3 lg:grid-cols-6">
      <Cell
        label="Monthly Total"
        value={summary.monthlyNetPnLLabel}
        toneClass={pnlTone}
      />
      <Cell label="Total Trades" value={String(summary.totalTrades)} />
      <Cell
        label="Winning Days"
        value={String(summary.winningDays)}
        toneClass={
          summary.winningDays > 0 ? "text-emerald-300" : "text-foreground"
        }
      />
      <Cell
        label="Losing Days"
        value={String(summary.losingDays)}
        toneClass={
          summary.losingDays > 0 ? "text-rose-300" : "text-foreground"
        }
      />
      <Cell
        label="Best Day"
        value={summary.bestDay ? summary.bestDay.netPnLLabel : "—"}
        secondary={summary.bestDay ? formatDayLabel(summary.bestDay.date) : undefined}
        toneClass={bestPnLTone}
      />
      <Cell
        label="Worst Day"
        value={summary.worstDay ? summary.worstDay.netPnLLabel : "—"}
        secondary={summary.worstDay ? formatDayLabel(summary.worstDay.date) : undefined}
        toneClass={worstPnLTone}
      />
    </div>
  );
}

function Cell({
  label,
  value,
  secondary,
  toneClass,
}: {
  label: string;
  value: string;
  secondary?: string;
  toneClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          toneClass ?? "text-foreground",
        )}
      >
        {value}
      </span>
      {secondary ? (
        <span className="text-[0.6rem] text-muted-foreground">{secondary}</span>
      ) : null}
    </div>
  );
}

function formatDayLabel(key: string): string {
  // YYYY-MM-DD → "Mon DD"
  const parts = key.split("-");
  if (parts.length !== 3) return key;
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return key;
  const date = new Date(Number(parts[0]), month - 1, day);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
